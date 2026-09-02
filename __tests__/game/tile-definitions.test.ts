import manifestJson from '@/assets/atlases/manifest.json';
import tileDefinitionsJson from '@/assets/data/tile-definitions.json';
import { TILE_ID_NAMES, TileId } from '@/game/grid/dungeon-grid';
import {
  tileDefinitionsFileSchema,
  type TileDefinition,
} from '@/domain/content/schemas';

const tileDefinitions: readonly TileDefinition[] =
  tileDefinitionsFileSchema.parse(tileDefinitionsJson).tileDefinitions;

describe('tile definitions ↔ simulation grid contract', () => {
  it('covers exactly the simulation TileId space in order', () => {
    const expectedIds = Object.values(TileId).sort((a, b) => a - b);
    expect(tileDefinitions.map((tile) => tile.id)).toEqual(expectedIds);
  });

  it('names tiles to match the grid constants and atlas manifest order', () => {
    expect(tileDefinitions.map((tile) => tile.name)).toEqual(TILE_ID_NAMES);
    expect(TILE_ID_NAMES).toEqual(manifestJson.tileNames);
  });

  it('marks floor-family tiles walkable and wall-family blocking', () => {
    const byId = new Map(tileDefinitions.map((tile) => [tile.id, tile]));
    for (const id of [
      TileId.Floor,
      TileId.FloorAlt,
      TileId.Door,
      TileId.Stairs,
      TileId.Crack,
      TileId.Rubble,
    ]) {
      expect(byId.get(id)?.walkable).toBe(true);
      expect(byId.get(id)?.blocksVision).toBe(false);
    }
    for (const id of [TileId.Wall, TileId.WallTop]) {
      expect(byId.get(id)?.walkable).toBe(false);
      expect(byId.get(id)?.blocksVision).toBe(true);
    }
  });
});
