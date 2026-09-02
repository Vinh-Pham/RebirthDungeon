import { TileId, type DungeonGrid } from '@/game/grid/dungeon-grid';
import { buildTileRules } from '@/game/grid/tile-rules';
import { findPathAStar } from '@/game/rot/rot-pathfinder';

function gridFrom(rows: string[]): DungeonGrid {
  const legend: Record<string, number> = {
    '.': TileId.Floor,
    '#': TileId.Wall,
  };
  const width = rows[0].length;
  const tiles = new Uint16Array(
    rows.flatMap((row) => [...row].map((ch) => legend[ch])),
  );
  return { width, height: rows.length, tiles };
}

const rules = buildTileRules([
  { id: TileId.Floor, name: 'floor', walkable: true, blocksVision: false },
  { id: TileId.Wall, name: 'wall', walkable: false, blocksVision: true },
]);

describe('findPathAStar (ROT.Path.AStar adapter, topology 4)', () => {
  const map = gridFrom(['.....', '.###.', '.....', '.....', '.....']);
  const passable = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < map.width &&
    y < map.height &&
    rules.walkable[map.tiles[y * map.width + x]] === 1;

  it('routes around walls and returns origin→target steps', () => {
    const path = findPathAStar({
      fromX: 0,
      fromY: 0,
      toX: 4,
      toY: 0,
      isPassable: passable,
    });
    expect(path).not.toBeNull();
    // With the wall row, the path must detour through row 2 or row 4… here 0.
    const first = path![0];
    expect(Math.abs(first.x - 0) + Math.abs(first.y - 0)).toBe(1);
    const last = path![path!.length - 1];
    expect(last).toEqual({ x: 4, y: 0 });
    // Every step is cardinal-adjacent.
    let previous = { x: 0, y: 0 };
    for (const step of path!) {
      const distance =
        Math.abs(step.x - previous.x) + Math.abs(step.y - previous.y);
      expect(distance).toBe(1);
      previous = step;
    }
  });

  it('returns null when no path exists', () => {
    const walled = gridFrom(['.#..', '#.#.', '.#..', '....', '....']);
    const walledPassable = (x: number, y: number): boolean =>
      x >= 0 &&
      y >= 0 &&
      x < walled.width &&
      y < walled.height &&
      rules.walkable[walled.tiles[y * walled.width + x]] === 1;
    // (0,0) is sealed off from (3,0).
    const path = findPathAStar({
      fromX: 0,
      fromY: 0,
      toX: 3,
      toY: 0,
      isPassable: walledPassable,
    });
    expect(path).toBeNull();
  });

  it('allows the target cell through the caller predicate for bumps', () => {
    // Target holds another actor: allow just the target cell.
    const path = findPathAStar({
      fromX: 0,
      fromY: 2,
      toX: 2,
      toY: 2,
      isPassable: (x, y) => passable(x, y) || (x === 2 && y === 2), // pretend (2,2) is the player
    });
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 2 });
  });
});
