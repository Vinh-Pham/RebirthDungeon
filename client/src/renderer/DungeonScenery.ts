export interface DungeonSceneMap {
  width: number;
  height: number;
  tileSize: number;
  tiles: readonly number[];
  objects?: readonly { x: number; y: number }[];
  spawns?: readonly { x: number; y: number }[];
}

export interface DungeonSceneryBatch {
  id: string;
  positions: { x: number; y: number }[];
}

/** Derive cosmetic scenery from geometry, including maps already stored in saves. */
export function dungeonScenery(map: DungeonSceneMap): DungeonSceneryBatch[] {
  const terrain = new Map<string, DungeonSceneryBatch>();
  const props = new Map<string, DungeonSceneryBatch>();
  const occupied = new Set(
    [...(map.objects ?? []), ...(map.spawns ?? [])].map(({ x, y }) => `${x},${y}`),
  );
  const wall = (x: number, y: number) =>
    x < 0 || y < 0 || x >= map.width || y >= map.height || map.tiles[y * map.width + x] === 1;
  function add(groups: Map<string, DungeonSceneryBatch>, name: string, x: number, y: number) {
    const id = `dungeon-${name}`;
    const batch = groups.get(id) ?? { id, positions: [] };
    batch.positions.push({ x, y });
    groups.set(id, batch);
  }
  map.tiles.forEach((tile, index) => {
    const x = index % map.width;
    const y = Math.floor(index / map.width);
    const variation = (x * 19 + y * 31 + x * y * 3) % 11;
    add(terrain, tile === 1 ? 'stone-wall' : variation < 2 ? 'cracked-floor' : 'stone-floor', x, y);
    if (occupied.has(`${x},${y}`)) return;
    if (tile === 1) {
      if (y + 1 < map.height && !wall(x, y + 1)) {
        if (x % 7 === 3) add(props, 'hanging-web', x, y);
        else if (x % 7 === 5) add(props, 'stone-brazier', x, y);
      }
    } else if (wall(x, y - 1) && wall(x - 1, y)) {
      add(props, 'cobweb-corner', x, y);
    } else if (wall(x, y - 1) && wall(x + 1, y)) {
      add(props, 'hanging-web', x, y);
    } else if (wall(x, y + 1) && wall(x - 1, y)) {
      add(props, 'spider-eggs', x, y);
    } else if (wall(x, y + 1) && wall(x + 1, y)) {
      add(props, 'bone-pile', x, y);
    }
  });
  return [...terrain.values(), ...props.values()];
}
