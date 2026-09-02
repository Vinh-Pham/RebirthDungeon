import { TileId, type DungeonGrid } from '@/game/grid/dungeon-grid';
import { buildTileRules } from '@/game/grid/tile-rules';
import { computeFovCells } from '@/game/rot/rot-fov';

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
  { id: TileId.Wall, name: 'wall', walkable: true, blocksVision: true },
]);

describe('computeFovCells (PreciseShadowcasting adapter, topology 4)', () => {
  // A wall column with a gap seals the right side of the map.
  const map = gridFrom(['...#.', '...#.', '...#.', '...#.', '.....']);
  const opaque = (x: number, y: number): boolean =>
    rules.blocksVision[map.tiles[y * map.width + x]] === 1;

  it('includes the origin and cells with line of sight', () => {
    const cells = computeFovCells({
      originX: 1,
      originY: 2,
      radius: 4,
      isOpaque: opaque,
    });
    const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
    expect(keys.has('1,2')).toBe(true); // origin
    expect(keys.has('2,2')).toBe(true); // open floor before the wall
    expect(keys.has('0,0')).toBe(true); // diagonal-ish lit floor
  });

  it('does not see through the wall column', () => {
    const cells = computeFovCells({
      originX: 1,
      originY: 2,
      radius: 4,
      isOpaque: opaque,
    });
    const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
    // Right side of the sealed wall is hidden…
    expect(keys.has('4,0')).toBe(false);
    expect(keys.has('4,1')).toBe(false);
    // …except through the gap at the bottom.
    expect(keys.has('4,4')).toBe(true);
  });

  it('honors the radius bound', () => {
    const cells = computeFovCells({
      originX: 1,
      originY: 2,
      radius: 1,
      isOpaque: opaque,
    });
    const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
    expect(keys.has('2,2')).toBe(true);
    expect(keys.has('2,0')).toBe(false);
  });

  it('honors dynamic opacity such as a closed door', () => {
    // All-open floor with a single door cell between origin and far side.
    let doorClosed = true;
    const withDoor = (x: number, y: number): boolean =>
      x === 2 && y === 1 && doorClosed;

    const closedCells = computeFovCells({
      originX: 0,
      originY: 1,
      radius: 4,
      isOpaque: withDoor,
    });
    const closedKeys = new Set(
      closedCells.map((cell) => `${cell.x},${cell.y}`),
    );
    expect(closedKeys.has('3,1')).toBe(false);
    expect(closedKeys.has('4,1')).toBe(false);

    doorClosed = false;
    const openCells = computeFovCells({
      originX: 0,
      originY: 1,
      radius: 4,
      isOpaque: withDoor,
    });
    const openKeys = new Set(openCells.map((cell) => `${cell.x},${cell.y}`));
    expect(openKeys.has('3,1')).toBe(true);
    expect(openKeys.has('4,1')).toBe(true);
  });
});
