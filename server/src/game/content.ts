import { HTTPException } from 'hono/http-exception';
import { ContentSchema } from '@rebirth/game-core/data/schemas/content';
import { ContentRegistry } from '@rebirth/game-core/engine/data/ContentRegistry';
import { GAME_CONTENT_VERSION } from '@rebirth/game-core/online/Contracts';
import {
  CONTENT_COLLECTIONS,
  contentProperty,
  type ContentCollection,
} from '@rebirth/game-core/online/Features';
import { catalogModels, catalogTables } from '../db/schema/game/catalog.js';
import {
  encodeModel,
  decodeModel,
  type ModelRows,
  type RelationalModel,
} from '../db/relational-model.js';
import { grouped, jsonColumns, tableDescriptor } from './sql.js';
import { requestHash } from './hash.js';

const tables = catalogTables.map(tableDescriptor);
const properties = Object.keys(catalogModels) as (keyof typeof catalogModels)[];
const emptyRows = (): ModelRows =>
  Object.fromEntries(tables.map((table) => [table.name, []]));
function modelTables(model: RelationalModel) {
  const names = new Set([model.table]);
  const walk = (fields: RelationalModel['fields']) => {
    for (const field of fields) {
      if (field.table) names.add(field.table);
      if (field.fields) walk(field.fields);
      if (field.element) walk([field.element]);
    }
  };
  walk(model.fields);
  return tables.filter((table) => names.has(table.name));
}
function decodeCollection(
  property: keyof typeof catalogModels,
  version: string,
  rows: ModelRows,
) {
  const model = catalogModels[property];
  const entries = [...rows[model.table]]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((row) =>
      decodeModel(
        model,
        {
          content_version: version,
          definition_id: row.definition_id,
          position: row.position,
        },
        rows,
      ),
    );
  if (property === 'enchantingRules') return entries[0]?.value;
  if (property === 'questFlags') return entries.map((entry) => entry.value);
  return entries;
}

export class ContentRepository {
  queryCount = 0;
  private registries = new Map<string, Promise<ContentRegistry>>();
  constructor(
    readonly db: D1Database,
    readonly cache?: KVNamespace,
  ) {}
  async release(version?: string) {
    this.queryCount++;
    try {
      const result = await this.db
        .prepare(
          version
            ? 'SELECT * FROM game_content_releases WHERE content_version=? AND published=1'
            : "SELECT r.* FROM game_content_releases r JOIN game_content_configuration c ON c.content_version=r.content_version WHERE c.key='active' AND r.published=1",
        )
        .bind(...(version ? [version] : []))
        .first<{
          content_version: string;
          checksum: string;
          schema_version: number;
        }>();
      if (!result || result.schema_version !== 1)
        throw new Error('Missing supported release');
      return result;
    } catch {
      throw new HTTPException(503, {
        message: 'Game content release unavailable',
      });
    }
  }
  async manifest() {
    const release = await this.release();
    return {
      apiVersion: 2 as const,
      activeVersion: release.content_version,
      checksum: release.checksum,
      schemaVersion: 1 as const,
      collections: [...CONTENT_COLLECTIONS],
    };
  }
  async read(version: string, selected = tables, publishedOnly = true) {
    const rows = emptyRows();
    const queries = grouped(selected, 5).map((group) =>
      group
        .map(
          (table) =>
            `SELECT '${table.name}' AS kind,${jsonColumns(table.columns, 'd')} AS row FROM ${table.name} d JOIN game_content_releases r ON r.content_version=d.content_version WHERE d.content_version=? ${publishedOnly ? 'AND r.published=1' : ''}`,
        )
        .join(' UNION ALL '),
    );
    this.queryCount += queries.length;
    const results = await this.db.batch<{ kind: string; row: string }>(
      queries.map((sql, i) =>
        this.db
          .prepare(sql)
          .bind(...grouped(selected, 5)[i].map(() => version)),
      ),
    );
    for (const result of results)
      for (const record of result.results)
        rows[record.kind].push(JSON.parse(record.row));
    return rows;
  }
  load(version: string): Promise<ContentRegistry> {
    let registry = this.registries.get(version);
    if (!registry) {
      registry = this.loadRelease(version);
      this.registries.set(version, registry);
    }
    return registry;
  }
  private async loadRelease(version: string) {
    const release = await this.release(version);
    const key = `game:catalog:v1:${version}:${release.checksum}`;
    try {
      if (this.cache) {
        try {
          const cached = await this.cache.get(key, 'json');
          if (cached) {
            const data = ContentSchema.parse(cached);
            if ((await requestHash(data)) === release.checksum)
              return new ContentRegistry(data);
          }
        } catch {
          /* Cache misses and invalid cache entries fall back to D1. */
        }
      }
      const rows = await this.read(version);
      const data = ContentSchema.parse(
        Object.fromEntries(
          properties.map((property) => [
            property,
            decodeCollection(property, version, rows),
          ]),
        ),
      );
      if ((await requestHash(data)) !== release.checksum)
        throw new Error('Catalog checksum mismatch');
      const registry = new ContentRegistry(data);
      if (this.cache)
        try {
          await this.cache.put(key, JSON.stringify(data));
        } catch {
          /* Immutable content caching is optional. */
        }
      return registry;
    } catch {
      throw new HTTPException(503, {
        message: 'Stored game content unavailable',
      });
    }
  }
  async collection(version: string, collection: ContentCollection) {
    await this.release(version);
    const property = contentProperty(collection);
    try {
      const rows = await this.read(
        version,
        modelTables(catalogModels[property]),
      );
      return ContentSchema.shape[property].parse(
        decodeCollection(property, version, rows),
      );
    } catch {
      throw new HTTPException(503, {
        message: 'Stored game content unavailable',
      });
    }
  }
}

/** Publishes only a complete validated release. Interrupted unpublished seeds can be resumed. */
async function publishCatalog(
  db: D1Database,
  raw: unknown,
  version = GAME_CONTENT_VERSION,
) {
  const data = new ContentRegistry(raw).data;
  const checksum = await requestHash(data);
  const prior = await db
    .prepare(
      'SELECT checksum,published FROM game_content_releases WHERE content_version=?',
    )
    .bind(version)
    .first<{ checksum: string; published: number }>();
  if (prior && prior.checksum !== checksum)
    throw new Error(
      'A content version cannot be reused with different definitions',
    );
  if (prior?.published) {
    await new ContentRepository(db).load(version);
    return false;
  }
  await db
    .prepare(
      'INSERT INTO game_content_releases(content_version,checksum,schema_version,created_at,published) VALUES (?,?,1,?,0) ON CONFLICT(content_version) DO NOTHING',
    )
    .bind(version, checksum, Date.now())
    .run();
  const stored = await db
    .prepare(
      'SELECT checksum FROM game_content_releases WHERE content_version=?',
    )
    .bind(version)
    .first<string>('checksum');
  if (stored !== checksum)
    throw new Error(
      'A content version cannot be reused with different definitions',
    );
  const rows = emptyRows();
  for (const property of properties) {
    const value = data[property];
    const entries =
      property === 'enchantingRules'
        ? value
          ? [{ value }]
          : []
        : property === 'questFlags'
          ? (value as string[]).map((value) => ({ value }))
          : (value as Record<string, unknown>[]);
    entries.forEach((entry, position) =>
      encodeModel(
        catalogModels[property],
        entry,
        {
          content_version: version,
          definition_id: String(
            entry.id ??
              (typeof entry.value === 'string' ? entry.value : property),
          ),
          position,
        },
        rows,
      ),
    );
  }
  // Each transport parameter is bounded; values are stored as typed columns, not JSON documents.
  const rootStatements: D1PreparedStatement[] = [];
  const childStatements: D1PreparedStatement[] = [];
  const roots = new Set<string>(
    properties.map((property) => catalogModels[property].table),
  );
  for (const table of tables) {
    const chunks: (typeof rows)[string][] = [];
    let chunk: (typeof rows)[string] = [];
    let bytes = 2;
    for (const row of rows[table.name]) {
      const size = new TextEncoder().encode(JSON.stringify(row)).length + 1;
      if (size > 1024 * 1024)
        throw new Error('Content row exceeds storage limit');
      if (bytes + size > 1024 * 1024) {
        chunks.push(chunk);
        chunk = [];
        bytes = 2;
      }
      chunk.push(row);
      bytes += size;
    }
    if (chunk.length) chunks.push(chunk);
    for (const chunk of chunks)
      (roots.has(table.name) ? rootStatements : childStatements).push(
        db
          .prepare(
            `INSERT INTO ${table.name} (${table.columns.join(',')}) SELECT ${table.columns.map((column) => `json_extract(value,'$.${column}')`).join(',')} FROM json_each(?) WHERE true ON CONFLICT DO NOTHING`,
          )
          .bind(JSON.stringify(chunk)),
      );
  }
  await db.batch([
    db.prepare('PRAGMA defer_foreign_keys=ON'),
    ...rootStatements,
  ]);
  for (const batch of grouped(childStatements, 20)) await db.batch(batch);
  const repository = new ContentRepository(db);
  const readback = await repository.read(version, tables, false);
  const restored = ContentSchema.parse(
    Object.fromEntries(
      properties.map((property) => [
        property,
        decodeCollection(property, version, readback),
      ]),
    ),
  );
  new ContentRegistry(restored);
  if ((await requestHash(restored)) !== checksum)
    throw new Error('Seeded catalog checksum mismatch');
  const [publication] = await db.batch([
    db
      .prepare(
        'UPDATE game_content_releases SET published=1 WHERE content_version=? AND checksum=? AND published=0',
      )
      .bind(version, checksum),
    db
      .prepare(
        "INSERT INTO game_content_configuration(key,content_version) VALUES ('active',?) ON CONFLICT(key) DO UPDATE SET content_version=excluded.content_version",
      )
      .bind(version),
  ]);
  return publication.meta.changes > 0;
}

/** Concurrent identical seeds may encounter the publication trigger; validate the winner before returning. */
export async function seedCatalog(
  db: D1Database,
  raw: unknown,
  version = GAME_CONTENT_VERSION,
) {
  try {
    return await publishCatalog(db, raw, version);
  } catch (error) {
    const data = new ContentRegistry(raw).data;
    const checksum = await requestHash(data);
    const release = await db
      .prepare(
        'SELECT checksum,published FROM game_content_releases WHERE content_version=?',
      )
      .bind(version)
      .first<{ checksum: string; published: number }>();
    if (release?.published && release.checksum === checksum) {
      await new ContentRepository(db).load(version);
      return false;
    }
    throw error;
  }
}
