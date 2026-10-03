import { HTTPException } from 'hono/http-exception';
import {
  MetadataSchema,
  ReceiptSchema,
  GAME_CONTENT_VERSION,
  type CharacterMetadata,
  type CommandReceipt,
} from '@rebirth/game-core/online/Contracts';
import {
  validateOnlineState,
  type OnlineState,
} from '@rebirth/game-core/online/Runtime';
import { decodeState, encodeState } from './codec.js';
import { gameTables, type Row, type Rows, type TableName } from './tables.js';

const stateTables = gameTables.filter(
  (t) => t.name !== 'game_characters' && t.name !== 'game_command_receipts',
);
// D1 has a 32-argument function limit. Split large row objects into at most 16 fields.
const jsonColumns = (columns: readonly string[], alias: string) => {
  const parts = Array.from(
    { length: Math.ceil(columns.length / 16) },
    (_, i) =>
      `json_object(${columns
        .slice(i * 16, (i + 1) * 16)
        .map((c) => `'${c}',${alias}.${c}`)
        .join(',')})`,
  );
  return parts.reduce((left, right) => `json_patch(${left},${right})`);
};
// A read-only D1 batch supplies one transaction snapshot. Each statement stays below D1's
// five-term compound-SELECT limit. Return individual rows rather than aggregating a table into one
// JSON value: legal large enchanted collections can exceed D1's 2 MiB value limit.
const readTables = [gameTables[0], ...stateTables];
const readSQL = Array.from(
  { length: Math.ceil(readTables.length / 5) },
  (_, index) =>
    `WITH owned AS (SELECT * FROM game_characters WHERE id = ? AND user_id = ?) ${readTables
      .slice(index * 5, (index + 1) * 5)
      .map((table) =>
        table.name === 'game_characters'
          ? `SELECT '${table.name}' AS kind, ${jsonColumns(table.columns, 'owned')} AS row FROM owned`
          : `SELECT '${table.name}' AS kind, ${jsonColumns(table.columns, table.name)} AS row FROM ${table.name} JOIN owned ON ${table.name}.character_id = owned.id`,
      )
      .join(' UNION ALL ')}`,
);

function metadata(row: Row): CharacterMetadata {
  return MetadataSchema.parse({
    id: row.id,
    name: row.name,
    talent: row.talent,
    age: row.age,
    revision: row.revision,
    contentVersion: row.content_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
export class GameRepository {
  constructor(
    readonly db: D1Database,
    readonly userId: string,
  ) {}
  async load(id: string) {
    let results: D1Result<{ kind: TableName; row: string }>[];
    try {
      results = await this.db.batch<{ kind: TableName; row: string }>(
        readSQL.map((sql) => this.db.prepare(sql).bind(id, this.userId)),
      );
    } catch {
      throw new HTTPException(503, { message: 'Game storage unavailable' });
    }
    const rows = Object.fromEntries(
      gameTables.map((t) => [t.name, []]),
    ) as unknown as Rows;
    results
      .flatMap((result) => result.results)
      .forEach((record) =>
        rows[record.kind].push(JSON.parse(record.row) as Row),
      );
    if (!rows.game_characters.length)
      throw new HTTPException(404, { message: 'Character not found' });
    try {
      const character = metadata(rows.game_characters[0]);
      if (character.contentVersion !== GAME_CONTENT_VERSION)
        throw new Error('Unsupported content version');
      const state = decodeState(rows, character.talent);
      validateOnlineState(state, character.name);
      return {
        character,
        state,
        rows,
        metrics: {
          rowsRead: results.reduce(
            (sum, result) => sum + result.meta.rows_read,
            0,
          ),
          sqlBytes: Math.max(...readSQL.map((sql) => sql.length)),
          readQueries: readSQL.length,
        },
      };
    } catch {
      throw new HTTPException(503, {
        message: 'Stored game state unavailable',
      });
    }
  }
  async list() {
    try {
      const result = await this.db
        .prepare(
          'SELECT * FROM game_characters WHERE user_id = ? ORDER BY created_at, id',
        )
        .bind(this.userId)
        .all<Row>();
      return result.results.map(metadata);
    } catch {
      throw new HTTPException(503, { message: 'Game storage unavailable' });
    }
  }
  async receipt(
    commandId: string,
  ): Promise<{ hash: string; receipt: CommandReceipt } | undefined> {
    try {
      const row = await this.db
        .prepare(
          'SELECT * FROM game_command_receipts WHERE user_id = ? AND command_id = ?',
        )
        .bind(this.userId, commandId)
        .first<Row>();
      if (!row) return;
      return {
        hash: String(row.request_hash),
        receipt: ReceiptSchema.parse({
          commandId: row.command_id,
          characterId: row.character_id,
          baseRevision: row.base_revision,
          committedRevision: row.committed_revision,
          createdAt: row.created_at,
          outcome: JSON.parse(String(row.outcome)),
        }),
      };
    } catch {
      throw new HTTPException(503, { message: 'Game storage unavailable' });
    }
  }
  async commit(
    character: CharacterMetadata,
    previous: Rows | undefined,
    state: OnlineState,
    receipt: CommandReceipt,
    hash: string,
  ) {
    const statements: D1PreparedStatement[] = [];
    if (!previous)
      statements.push(
        this.db
          .prepare(
            'INSERT INTO game_characters (id,user_id,name,talent,age,revision,content_version,created_at,updated_at) VALUES (?,?,?,?,?,0,?,?,?)',
          )
          .bind(
            character.id,
            this.userId,
            character.name,
            character.talent,
            character.age,
            character.contentVersion,
            character.createdAt,
            character.updatedAt,
          ),
      );
    // Creation first establishes ownership at revision zero. For existing characters the receipt is first.
    statements.push(
      this.db
        .prepare(
          'INSERT INTO game_command_receipts (user_id,command_id,character_id,request_hash,base_revision,committed_revision,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          this.userId,
          receipt.commandId,
          character.id,
          hash,
          receipt.baseRevision,
          receipt.committedRevision,
          JSON.stringify(receipt.outcome),
          receipt.createdAt,
        ),
    );
    const writes = stateDiff(
      this.db,
      previous,
      encodeState(character.id, state),
    );
    statements.push(...writes);
    // Every failed attempt reuses this exact candidate and SQL. Never resolve RNG/game rules again.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await this.db.batch(statements);
        return {
          receipt,
          metrics: {
            queries: statements.length,
            rowsWritten: result.reduce(
              (sum, r) => sum + r.meta.rows_written,
              0,
            ),
          },
        };
      } catch {
        const committed = await this.receipt(receipt.commandId);
        if (committed) {
          if (committed.hash !== hash)
            throw new HTTPException(409, {
              message: 'Command ID was already used with different input',
            });
          return {
            receipt: committed.receipt,
            metrics: { queries: statements.length, rowsWritten: 0 },
          };
        }
        if (previous) {
          const row = await this.db
            .prepare(
              'SELECT revision FROM game_characters WHERE id = ? AND user_id = ?',
            )
            .bind(character.id, this.userId)
            .first<{ revision: number }>()
            .catch(() => null);
          if (row && row.revision !== receipt.baseRevision)
            throw new HTTPException(409, {
              message: 'Character revision changed',
            });
        }
        if (
          attempt === 1 ||
          statements.length * 2 + 5 + readSQL.length * 2 > 50
        )
          throw new HTTPException(503, { message: 'Game storage unavailable' });
      }
    }
    throw new HTTPException(503, { message: 'Game storage unavailable' });
  }
}
export function stateDiff(
  db: D1Database,
  previous: Rows | undefined,
  candidate: Rows,
): D1PreparedStatement[] {
  const removals: D1PreparedStatement[] = [],
    updates: D1PreparedStatement[] = [];
  for (const table of stateTables) {
    const key = (r: Row) => JSON.stringify(table.keys.map((k) => r[k]));
    const before = new Map(
      (previous?.[table.name] ?? []).map((r) => [key(r), r]),
    );
    const after = new Map(candidate[table.name].map((r) => [key(r), r]));
    const removed = [...before.entries()]
      .filter(([id]) => !after.has(id))
      .map(([, row]) => row);
    for (const chunk of bulkChunks(
      removed.map((row) =>
        Object.fromEntries(table.keys.map((key) => [key, row[key]])),
      ),
    ))
      removals.unshift(
        db
          .prepare(
            `DELETE FROM ${table.name} WHERE (${table.keys.join(',')}) IN (SELECT ${table.keys.map((k) => `json_extract(old.value,'$.${k}')`).join(',')} FROM json_each(?) AS old)`,
          )
          .bind(JSON.stringify(chunk)),
      );
    const changed = [...after.entries()]
      .filter(
        ([id, row]) => JSON.stringify(before.get(id)) !== JSON.stringify(row),
      )
      .map(([, row]) => row);
    if (changed.length) {
      const nonKeys = table.columns.filter(
        (c) => !table.keys.some((k) => k === c),
      );
      const conflict = nonKeys.length
        ? `DO UPDATE SET ${nonKeys.map((c) => `${c}=excluded.${c}`).join(',')}`
        : 'DO NOTHING';
      // JSON is only a transient bulk parameter; SQLite stores individual typed relational columns.
      for (const chunk of bulkChunks(changed))
        updates.push(
          db
            .prepare(
              `INSERT INTO ${table.name} (${table.columns.join(',')}) SELECT ${table.columns.map((c) => `json_extract(value,'$.${c}')`).join(',')} FROM json_each(?) WHERE true ON CONFLICT (${table.keys.join(',')}) ${conflict}`,
            )
            .bind(JSON.stringify(chunk)),
        );
    }
  }
  return [...removals, ...updates];
}
function* bulkChunks(rows: Row[]) {
  const encoder = new TextEncoder();
  let chunk: Row[] = [],
    bytes = 2;
  // Keep every bound JSON transport parameter comfortably below D1's 2 MiB value limit.
  for (const row of rows) {
    const size = encoder.encode(JSON.stringify(row)).length + 1;
    if (size + 2 > 1024 * 1024)
      throw new HTTPException(503, {
        message: 'Game storage value exceeds its supported size',
      });
    if (bytes + size > 1024 * 1024) {
      yield chunk;
      chunk = [];
      bytes = 2;
    }
    chunk.push(row);
    bytes += size;
  }
  if (chunk.length) yield chunk;
}
export async function requestHash(value: unknown): Promise<string> {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => [key, canonical(value)]),
          )
        : v;
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(canonical(value))),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
