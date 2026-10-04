import { ContentRepository } from './content.js';
import { sqlFeatureTables, projectFeature } from './projections.js';
import { jsonColumns } from './sql.js';
import {
  FeatureNameSchema,
  type GameFeature,
} from '@rebirth/game-core/online/Features';
import {
  auditStatement,
  commitRecord,
  type CommitAudit,
} from '../audit/repository.js';
import { HTTPException } from 'hono/http-exception';
import {
  MetadataSchema,
  ReceiptSchema,
  type CharacterMetadata,
  type CommandReceipt,
} from '@rebirth/game-core/online/Contracts';
import {
  createOnlineRuntime,
  type OnlineState,
} from '@rebirth/game-core/online/Runtime';
import { decodeState, encodeState } from './codec.js';
import { gameTables, type Row, type Rows, type TableName } from './tables.js';

const stateTables = gameTables.filter(
  (t) => t.name !== 'game_characters' && t.name !== 'game_command_receipts',
);
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

export function metadata(row: Row): CharacterMetadata {
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
    readonly catalogs = new ContentRepository(db),
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
      const state = decodeState(rows, character.talent);
      const content = await this.catalogs.load(character.contentVersion);
      const runtime = createOnlineRuntime(content);
      runtime.validateOnlineState(state, character.name);
      return {
        character,
        content,
        runtime,
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
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(503, {
        message: 'Stored game state unavailable',
      });
    }
  }
  async feature<K extends GameFeature>(
    id: string,
    feature: K,
    expectedRevision?: number,
  ) {
    const names = new Set(['game_characters', ...sqlFeatureTables(feature)]);
    const selected = gameTables.filter((table) => names.has(table.name));
    const filters: Record<string, string> = {
      game_equipment_instances: 'instance_id',
      game_equipment_enchants: 'instance_id',
      game_equipment_enchant_values: 'instance_id',
    };
    const statements = Array.from(
      { length: Math.ceil(selected.length / 5) },
      (_, i) =>
        `WITH owned AS (SELECT * FROM game_characters WHERE id=? AND user_id=?) ${selected
          .slice(i * 5, (i + 1) * 5)
          .map((table) => {
            if (table.name === 'game_characters')
              return `SELECT '${table.name}' AS kind,${jsonColumns(table.columns, 'owned')} AS row FROM owned`;
            const filter =
              feature === 'stats'
                ? filters[table.name]
                  ? ` AND ${table.name}.${filters[table.name]} IN (SELECT weapon_id FROM game_loadouts WHERE character_id=owned.id UNION ALL SELECT armor_id FROM game_loadouts WHERE character_id=owned.id)`
                  : table.name === 'game_inventory_stacks'
                    ? ` AND ${table.name}.item_id IN (SELECT ammunition_id FROM game_loadouts WHERE character_id=owned.id)`
                    : table.name === 'game_character_skills'
                      ? ` AND ${table.name}.rank IS NOT NULL`
                      : ''
                : '';
            return `SELECT '${table.name}' AS kind,${jsonColumns(table.columns, table.name)} AS row FROM ${table.name} JOIN owned ON ${table.name}.character_id=owned.id${filter}`;
          })
          .join(' UNION ALL ')}`,
    );
    let results: D1Result<{ kind: string; row: string }>[];
    try {
      results = await this.db.batch(
        statements.map((sql) => this.db.prepare(sql).bind(id, this.userId)),
      );
    } catch {
      throw new HTTPException(503, { message: 'Game storage unavailable' });
    }
    const rows: Rows = Object.fromEntries(
      gameTables.map((table) => [table.name, []]),
    );
    for (const result of results)
      for (const record of result.results)
        rows[record.kind].push(JSON.parse(record.row));
    if (!rows.game_characters.length)
      throw new HTTPException(404, { message: 'Character not found' });
    const character = metadata(rows.game_characters[0]);
    if (
      expectedRevision !== undefined &&
      character.revision !== expectedRevision
    )
      throw new HTTPException(409, { message: 'Character revision changed' });
    try {
      const content = ['stats', 'journey', 'encounter'].includes(feature)
        ? await this.catalogs.load(character.contentVersion)
        : undefined;
      return {
        apiVersion: 2 as const,
        characterId: id,
        revision: character.revision,
        contentVersion: character.contentVersion,
        data: projectFeature(feature, rows, character, content),
      };
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(503, {
        message: 'Stored game feature unavailable',
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
  ): Promise<
    | { hash: string; receipt: CommandReceipt; features: GameFeature[] }
    | undefined
  > {
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
        features: (
          await this.db
            .prepare(
              'SELECT feature FROM game_command_receipt_features WHERE user_id=? AND command_id=?',
            )
            .bind(this.userId, commandId)
            .all<{ feature: string }>()
        ).results.map((row) => FeatureNameSchema.parse(row.feature)),
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
    audit: CommitAudit,
    features: readonly GameFeature[] = ['character'],
    candidateRows?: Rows,
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
    statements.push(
      auditStatement(
        this.db,
        commitRecord(
          this.userId,
          character.id,
          receipt.commandId,
          receipt.committedRevision,
          receipt.createdAt,
          audit,
          state.campaign.encounterCount,
        ),
      ),
    );
    const writes = stateDiff(
      this.db,
      previous,
      candidateRows ??
        encodeState(character.id, state, character.contentVersion),
    );
    statements.push(
      this.db
        .prepare(
          'INSERT INTO game_command_receipt_features(user_id,command_id,feature) SELECT ?,?,value FROM json_each(?)',
        )
        .bind(
          this.userId,
          receipt.commandId,
          JSON.stringify([...new Set(['character', ...features])]),
        ),
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
            replayed: true,
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
          statements.length * 2 +
            5 +
            readSQL.length * 2 +
            this.catalogs.queryCount >
            50
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
export { requestHash } from './hash.js';
