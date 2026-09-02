/**
 * Tile rules as data: built from the validated `TileDefinition` content
 * (assets/data/tile-definitions.json via the content catalog). Simulation
 * code never hardcodes tile semantics — walkability and opacity always come
 * from this table.
 */

import type { TileDefinition } from '@/domain/content/schemas';

export interface TileRules {
  /** Indexed by tile id: 1 = walkable, 0 = blocking. */
  readonly walkable: Uint8Array;
  /** Indexed by tile id: 1 = blocks vision, 0 = transparent. */
  readonly blocksVision: Uint8Array;
  readonly maxTileId: number;
}

export function buildTileRules(
  definitions: Iterable<TileDefinition>,
): TileRules {
  let maxTileId = -1;
  const defs: TileDefinition[] = [];
  for (const definition of definitions) {
    defs.push(definition);
    if (definition.id > maxTileId) maxTileId = definition.id;
  }
  const walkable = new Uint8Array(maxTileId + 1);
  const blocksVision = new Uint8Array(maxTileId + 1);
  for (const definition of defs) {
    walkable[definition.id] = definition.walkable ? 1 : 0;
    blocksVision[definition.id] = definition.blocksVision ? 1 : 0;
  }
  return { walkable, blocksVision, maxTileId };
}
