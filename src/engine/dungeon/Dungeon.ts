import { z } from 'zod';
import { WorldMapSchema, type WorldMap } from '../../data/schemas/world';
import { MapSchema } from '../../data/schemas/content';
import { DungeonDefinitionSchema, type DungeonDefinition } from '../../data/schemas/dungeon';
import type { ContentRegistry } from '../data/ContentRegistry';
import { createGameRandom, type GameRandom } from '../Random';
import { distance, isWalkable, type GridPoint } from '../world/TileMap';

const id = z.string().min(1);
const seed = z.number().int().min(-2147483648).max(2147483647);
const point = z.strictObject({ x: z.number().int().min(0), y: z.number().int().min(0) });
const roomKind = z.enum(['start', 'monster', 'chest', 'mimic', 'fountain', 'boss', 'treasure']);
export const DungeonBlueprintSchema = z.strictObject({
  version: z.literal(1), definitionId: id, seed, world: WorldMapSchema,
  rooms: z.array(z.strictObject({ id, kind: roomKind, ...point.shape, width: z.number().int().min(5).max(12), height: z.number().int().min(5).max(12) })).min(7).max(15),
  encounters: z.array(z.strictObject({ objectId: id, roomId: id, kind: z.enum(['monster', 'mimic', 'boss']), seed, map: MapSchema })).min(3).max(13),
  fountains: z.array(z.strictObject({ objectId: id, statusId: id })).min(1).max(12),
});
const keySchema = z.strictObject({ status: z.enum(['absent', 'dropped', 'held', 'spent']), position: point.optional() });
export const DungeonRunSchema = z.strictObject({
  blueprint: DungeonBlueprintSchema, returnTo: z.strictObject({ worldId: id, position: point }),
  cleared: z.array(id).max(13), opened: z.array(id).max(17), revealedMimics: z.array(id).max(12), usedFountains: z.array(id).max(12),
  effects: z.array(z.strictObject({ statusId: id, stacks: z.number().int().min(1).max(10) })).max(12),
  bossKey: keySchema, treasureKey: keySchema, bossDoorOpened: z.boolean(), selectedChest: id.optional(),
});
export type DungeonBlueprint = z.infer<typeof DungeonBlueprintSchema>;
export type DungeonRun = z.infer<typeof DungeonRunSchema>;
export type DungeonEffects = DungeonRun['effects'];
export type DungeonRoom = DungeonBlueprint['rooms'][number];
type ObjectKind = WorldMap['objects'][number]['kind'];
export function freezeDungeonBlueprint(blueprint: DungeonBlueprint): void {
  const freeze = (value: unknown) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
    Object.values(value).forEach(freeze); Object.freeze(value);
  };
  freeze(blueprint);
}
const directions = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const;
export const inRoom = (room: DungeonRoom, p: GridPoint) => p.x >= room.x && p.y >= room.y && p.x < room.x + room.width && p.y < room.y + room.height;
export const bossCleared = (run: DungeonRun) => run.cleared.includes(run.blueprint.encounters.find((encounter) => encounter.kind === 'boss')!.objectId);
export const remainingEnemies = (run: DungeonRun) => run.blueprint.encounters.filter((encounter) => encounter.kind !== 'boss' && !run.cleared.includes(encounter.objectId))
  .reduce((sum, encounter) => sum + encounter.map.spawns.filter((spawn) => spawn.kind === 'enemy').length, 0);

function weighted<T>(random: GameRandom, values: readonly { value: T; weight: number }[]): T {
  let roll = random.float() * values.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of values) { roll -= entry.weight; if (roll < 0) return entry.value; }
  return values[values.length - 1].value;
}

/** A bounded connected room graph; geometry never depends on wall-clock time or gameplay RNG. */
export function generateDungeon(rawDefinition: DungeonDefinition, dungeonSeed: number, classId = 'warden'): DungeonBlueprint {
  const definition = DungeonDefinitionSchema.parse(rawDefinition);
  const random = createGameRandom(dungeonSeed);
  const worldId = 'dungeon:' + definition.id + ':' + dungeonSeed;
  const count = random.int(definition.minRooms, definition.maxRooms) + 1;
  const cells = [0]; const edges: [number, number][] = [];
  const neighbors = (cell: number) => directions.map(([dx, dy]) => ({ x: cell % 4 + dx, y: Math.floor(cell / 4) + dy }))
    .filter((p) => p.x >= 0 && p.x < 4 && p.y >= 0 && p.y < 4).map((p) => p.y * 4 + p.x);
  while (cells.length < count) {
    const frontier = cells.flatMap((cell) => neighbors(cell).filter((next) => !cells.includes(next)).map((next) => [cell, next] as [number, number]));
    const edge = random.pick(frontier); edges.push(edge); cells.push(edge[1]);
  }
  for (const cell of cells) for (const next of neighbors(cell)) {
    if (cell < next && cells.includes(next) && !edges.some(([a, b]) => (a === cell && b === next) || (a === next && b === cell)) && random.chance(0.15)) edges.push([cell, next]);
  }
  const width = 72; const height = 48; const tiles = Array<number>(width * height).fill(1);
  const dig = (x: number, y: number) => { tiles[y * width + x] = 0; };
  const center = (cell: number) => ({ x: cell % 4 * 12 + 6, y: Math.floor(cell / 4) * 12 + 6 });
  const corridor = (a: GridPoint, b: GridPoint) => {
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) dig(x, a.y);
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) dig(b.x, y);
  };
  const rooms: DungeonRoom[] = [];
  const addRoom = (roomId: string, kind: DungeonRoom['kind'], c: GridPoint, w: number, h: number) => {
    const room = { id: roomId, kind, x: c.x - Math.floor(w / 2), y: c.y - Math.floor(h / 2), width: w, height: h };
    rooms.push(room);
    for (let y = room.y; y < room.y + h; y++) for (let x = room.x; x < room.x + w; x++) dig(x, y);
    return room;
  };
  const kinds: DungeonRoom['kind'][] = ['monster', 'chest', 'mimic', 'fountain'];
  while (kinds.length < count - 1) kinds.push(weighted(random, Object.entries(definition.roomWeights).map(([value, weight]) => ({ value: value as DungeonRoom['kind'], weight }))));
  for (let i = kinds.length - 1; i > 0; i--) { const j = random.int(0, i); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  cells.forEach((cell, index) => addRoom('room-' + cell, index === 0 ? 'start' : kinds[index - 1], center(cell), random.int(5, 9), random.int(5, 9)));
  edges.forEach(([a, b]) => corridor(center(a), center(b)));
  const graphDistances = new Map<number, number>([[0, 0]]); const queue = [0];
  for (let i = 0; i < queue.length; i++) for (const [a, b] of edges) {
    const next = a === queue[i] ? b : b === queue[i] ? a : undefined;
    if (next !== undefined && !graphDistances.has(next)) { graphDistances.set(next, graphDistances.get(queue[i])! + 1); queue.push(next); }
  }
  const rightmost = Math.max(...cells.map((cell) => cell % 4));
  const attachment = cells.filter((cell) => cell % 4 === rightmost).sort((a, b) => graphDistances.get(b)! - graphDistances.get(a)! || a - b)[0];
  const wingY = center(attachment).y;
  addRoom('boss-room', 'boss', { x: 54, y: wingY }, 9, 9);
  addRoom('treasure-room', 'treasure', { x: 66, y: wingY }, 9, 9);
  corridor(center(attachment), { x: 54, y: wingY }); corridor({ x: 54, y: wingY }, { x: 66, y: wingY });
  const objects: Record<string, unknown>[] = [];
  const encounters: DungeonBlueprint['encounters'] = []; const fountains: DungeonBlueprint['fountains'] = [];
  const object = (objectId: string, kind: ObjectKind, p: GridPoint, name: string, extra: Record<string, unknown> = {}) => objects.push({ id: objectId, kind, ...p, name, ...extra });
  const reward = (table: DungeonDefinition['ordinaryRewards']) => {
    const chosen = weighted(random, table.map((entry) => ({ value: entry, weight: entry.weight })));
    return { itemId: chosen.itemId, quantity: random.int(chosen.min, chosen.max) };
  };
  const encounter = (room: DungeonRoom, p: GridPoint, enemyIds: string[]) => {
    const objectId = room.id + '-encounter'; const mapId = worldId + '/' + objectId;
    const map = MapSchema.parse({ id: mapId, name: room.kind === 'boss' ? 'The elder guardian' : room.kind === 'mimic' ? 'Hungry mimic' : 'Moss guardians', width: 10, height: 7, tileSize: 32,
      tiles: Array.from({ length: 70 }, (_, i) => i % 10 === 0 || i % 10 === 9 || i < 10 || i >= 60 ? 1 : 0),
      spawns: [{ entityId: 'player', kind: 'player', definitionId: classId, x: 2, y: 3 }, ...enemyIds.map((definitionId, i) => ({ entityId: objectId + '-enemy-' + i, kind: 'enemy', definitionId, x: 7, y: i + 2 }))] });
    encounters.push({ objectId, roomId: room.id, kind: room.kind as 'monster' | 'mimic' | 'boss', seed: random.int(-2147483648, 2147483647), map });
    object(objectId, room.kind === 'mimic' ? 'mimic' : 'encounter', p, room.kind === 'mimic' ? 'Treasure chest' : map.name, { encounterMap: mapId });
  };
  rooms.forEach((room, index) => {
    const c = index < cells.length ? center(cells[index]) : { x: room.x + 4, y: room.y + 4 };
    const beside = { x: c.x + 1, y: c.y - 1 };
    switch (room.kind) {
      case 'start': object('goddess-statue', 'statue', { x: c.x + 1, y: c.y }, 'Goddess statue · leave dungeon'); break;
      case 'monster': encounter(room, c, Array.from({ length: random.int(1, 3) }, () => random.pick(definition.monsterIds))); break;
      case 'mimic': encounter(room, beside, [definition.mimicId]); break;
      case 'chest': object(room.id + '-chest', 'chest', beside, 'Treasure chest', reward(definition.ordinaryRewards)); break;
      case 'fountain': {
        const objectId = room.id + '-fountain'; object(objectId, 'fountain', beside, 'Mysterious fountain');
        fountains.push({ objectId, statusId: random.pick(definition.fountainIds) }); break;
      }
      case 'boss': encounter(room, c, [definition.bossId, ...Array.from({ length: random.int(0, 2) }, () => random.pick(definition.companionIds))]); break;
      case 'treasure': [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, 0]].forEach(([dx, dy], i) => object('final-chest-' + (i + 1), 'finalChest', { x: c.x + dx, y: c.y + dy }, 'Sealed chest ' + (i + 1), reward(definition.finalRewards))); break;
    }
  });
  object('boss-gate', 'gate', { x: 49, y: wingY }, 'Boss room door', { gateType: 'boss', blocked: true });
  object('treasure-gate', 'gate', { x: 60, y: wingY }, 'Treasure room passage', { gateType: 'treasure', blocked: true });
  return DungeonBlueprintSchema.parse({ version: 1, definitionId: definition.id, seed: dungeonSeed, rooms, encounters, fountains,
    world: { id: worldId, name: definition.name, width, height, tileSize: 32, tiles, entry: center(0), objects } });
}

export function createDungeonRun(blueprint: DungeonBlueprint, returnTo: DungeonRun['returnTo']): DungeonRun {
  return { blueprint, returnTo, cleared: [], opened: [], revealedMimics: [], usedFountains: [], effects: [], bossKey: { status: 'absent' }, treasureKey: { status: 'absent' }, bossDoorOpened: false };
}

/** Hide mimic identity and update physical gates and drops from authoritative run progress. */
export function projectDungeonMap(run: DungeonRun): WorldMap {
  const drops = (['boss', 'treasure'] as const).flatMap((keyType) => {
    const key = keyType === 'boss' ? run.bossKey : run.treasureKey;
    return key.status === 'dropped' ? [{ id: keyType + '-key', kind: 'key' as const, name: keyType === 'boss' ? 'Boss room key' : 'Treasure chest key', ...key.position!, keyType, quantity: 1, dialogue: '', blocked: false }] : [];
  });
  const objects = run.blueprint.world.objects.filter((obj) => !drops.some((drop) => distance(drop, obj) === 0)).map((obj) => {
    if (obj.kind === 'mimic') return { ...obj, kind: run.revealedMimics.includes(obj.id) ? 'encounter' as const : 'chest' as const,
      name: run.revealedMimics.includes(obj.id) ? 'Hungry mimic' : 'Treasure chest', encounterMap: undefined };
    if (obj.kind === 'gate') return { ...obj, blocked: obj.gateType === 'boss' ? !run.bossDoorOpened : !bossCleared(run) };
    if (['chest', 'finalChest'].includes(obj.kind)) return { ...obj, itemId: undefined };
    return obj;
  });
  return Object.freeze({ ...run.blueprint.world, objects: Object.freeze([...objects, ...drops].map((obj) => Object.freeze(obj))) }) as WorldMap;
}

export function dungeonObjectClaimed(run: DungeonRun, objectId: string): boolean {
  return run.opened.includes(objectId) || run.cleared.includes(objectId) || run.usedFountains.includes(objectId) ||
    (!!run.selectedChest && run.blueprint.world.objects.some((obj) => obj.id === objectId && obj.kind === 'finalChest'));
}

export function reachableTiles(map: WorldMap): Set<string> {
  const key = (p: GridPoint) => p.x + ',' + p.y;
  const reached = new Set<string>(); const queue: GridPoint[] = [];
  if (isWalkable(map, map.entry)) { reached.add(key(map.entry)); queue.push(map.entry); }
  for (let cursor = 0; cursor < queue.length; cursor++) for (const [dx, dy] of directions) {
    const next = { x: queue[cursor].x + dx, y: queue[cursor].y + dy };
    if (isWalkable(map, next) && !reached.has(key(next))) { reached.add(key(next)); queue.push(next); }
  }
  return reached;
}

/** Validate saved geometry and progress without regenerating layouts or rolling any outcomes. */
export function validateDungeon(run: DungeonRun, content: ContentRegistry): void {
  const fail = (condition: boolean, message: string) => { if (condition) throw new Error('Invalid dungeon: ' + message); };
  const { blueprint } = run; const { world, rooms, encounters, fountains } = blueprint;
  fail(!content.data.dungeons.some((definition) => definition.id === blueprint.definitionId), 'unknown definition');
  for (const values of [rooms.map((room) => room.id), encounters.map((encounter) => encounter.objectId), encounters.map((encounter) => encounter.map.id), fountains.map((f) => f.objectId), run.cleared, run.opened, run.revealedMimics, run.usedFountains, run.effects.map((e) => e.statusId)]) fail(new Set(values).size !== values.length, 'duplicate identifiers');
  for (const kind of ['start', 'boss', 'treasure'] as const) fail(rooms.filter((room) => room.kind === kind).length !== 1, 'special rooms');
  for (const kind of ['monster', 'chest', 'mimic', 'fountain'] as const) fail(!rooms.some((room) => room.kind === kind), 'missing room type');
  fail(!inRoom(rooms.find((room) => room.kind === 'start')!, world.entry), 'entry room');
  for (const room of rooms) {
    fail(room.x + room.width >= world.width || room.y + room.height >= world.height, 'room bounds');
    fail(rooms.some((other) => room.id !== other.id && room.x < other.x + other.width && room.x + room.width > other.x && room.y < other.y + other.height && room.y + room.height > other.y), 'overlapping rooms');
    for (let y = room.y; y < room.y + room.height; y++) for (let x = room.x; x < room.x + room.width; x++) fail(world.tiles[y * world.width + x] === 1, 'room floor');
    const expected = room.kind === 'start' ? 'statue' : room.kind === 'treasure' ? 'finalChest' : room.kind === 'monster' || room.kind === 'boss' ? 'encounter' : room.kind;
    const members = world.objects.filter((obj) => inRoom(room, obj));
    fail(members.length !== (room.kind === 'treasure' ? 5 : 1) || members.some((obj) => obj.kind !== expected), 'room contents');
  }
  fail(world.objects.filter((obj) => obj.kind === 'gate').length !== 2 || world.objects.some((obj) => !['gate', 'statue', 'chest', 'finalChest', 'encounter', 'mimic', 'fountain'].includes(obj.kind)), 'objects');
  for (const obj of world.objects) {
    fail(['player', 'boss-key', 'treasure-key'].includes(obj.id), 'reserved object identifier');
    if (obj.itemId) content.item(obj.itemId);
    if (['encounter', 'mimic'].includes(obj.kind)) fail(encounters.filter((encounter) => encounter.objectId === obj.id).length !== 1, 'encounter object');
    if (obj.kind === 'fountain') fail(fountains.filter((f) => f.objectId === obj.id).length !== 1, 'fountain object');
    if (obj.kind === 'gate') fail(!obj.blocked || !['boss-gate', 'treasure-gate'].includes(obj.id) || obj.gateType !== (obj.id === 'boss-gate' ? 'boss' : 'treasure'), 'gate');
  }
  for (const encounter of encounters) {
    const obj = world.objects.find((obj) => obj.id === encounter.objectId); const room = rooms.find((room) => room.id === encounter.roomId);
    fail(!obj || !room || !inRoom(room!, obj!) || room!.kind !== encounter.kind || obj!.encounterMap !== encounter.map.id, 'encounter references');
    fail(encounter.map.spawns.filter((spawn) => spawn.kind === 'player').length !== 1 || encounter.map.spawns.find((spawn) => spawn.kind === 'player')?.entityId !== 'player', 'player spawn');
    for (const spawn of encounter.map.spawns) content.spawn(spawn.definitionId, spawn.entityId, spawn.kind, spawn.x, spawn.y);
  }
  for (const fountain of fountains) fail(!world.objects.some((obj) => obj.id === fountain.objectId && obj.kind === 'fountain') || content.status(fountain.statusId).effect !== 'stat', 'fountain references');
  const bossRoom = rooms.find((room) => room.kind === 'boss')!; const treasureRoom = rooms.find((room) => room.kind === 'treasure')!;
  const reachedRoom = (reached: Set<string>, room: DungeonRoom) => Array.from(reached).some((key) => { const [x, y] = key.split(',').map(Number); return inRoom(room, { x, y }); });
  const closed = reachableTiles(world);
  const bossOpen = reachableTiles({ ...world, objects: world.objects.map((obj) => ({ ...obj, blocked: obj.id === 'boss-gate' ? false : obj.blocked })) });
  const allOpen = reachableTiles({ ...world, objects: world.objects.map((obj) => ({ ...obj, blocked: false })) });
  fail(reachedRoom(closed, bossRoom) || reachedRoom(closed, treasureRoom) || !reachedRoom(bossOpen, bossRoom) || reachedRoom(bossOpen, treasureRoom) || !reachedRoom(allOpen, treasureRoom), 'gate bypass or disconnected wing');
  const approach = (reached: Set<string>, p: GridPoint) => directions.some(([dx, dy]) => reached.has((p.x + dx) + ',' + (p.y + dy))) || reached.has(p.x + ',' + p.y);
  fail(world.objects.some((obj) => !approach(allOpen, obj)), 'unreachable object');
  fail(rooms.filter((room) => !['boss', 'treasure'].includes(room.kind)).some((room) => !reachedRoom(closed, room)), 'disconnected ordinary room');
  const hasKind = (objectId: string, kinds: ObjectKind[]) => world.objects.some((obj) => obj.id === objectId && kinds.includes(obj.kind));
  fail(run.cleared.some((id) => !encounters.some((e) => e.objectId === id)) || run.opened.some((id) => !hasKind(id, ['chest', 'finalChest'])) || run.usedFountains.some((id) => !hasKind(id, ['fountain'])) || run.revealedMimics.some((id) => !hasKind(id, ['mimic'])), 'unknown progress');
  fail(encounters.some((e) => e.kind === 'mimic' && run.cleared.includes(e.objectId) && !run.revealedMimics.includes(e.objectId)), 'unrevealed defeated mimic');
  const expectedEffects = new Map<string, number>();
  for (const objectId of run.usedFountains) { const statusId = fountains.find((f) => f.objectId === objectId)!.statusId; expectedEffects.set(statusId, Math.min(10, (expectedEffects.get(statusId) ?? 0) + 1)); }
  fail(run.effects.length !== expectedEffects.size || run.effects.some((effect) => expectedEffects.get(effect.statusId) !== effect.stacks), 'fountain stacks');
  const last = run.cleared.filter((id) => encounters.some((e) => e.objectId === id && e.kind !== 'boss')).at(-1);
  const boss = encounters.find((e) => e.kind === 'boss')!;
  for (const [key, sourceId, available] of [[run.bossKey, last, remainingEnemies(run) === 0], [run.treasureKey, boss.objectId, bossCleared(run)]] as const) {
    fail(available === (key.status === 'absent'), 'key availability');
    const source = world.objects.find((obj) => obj.id === sourceId);
    fail(key.status === 'dropped' ? !key.position || !source || distance(key.position, source) !== 0 : !!key.position, 'key drop location');
  }
  fail(run.bossDoorOpened !== (run.bossKey.status === 'spent') || (bossCleared(run) && !run.bossDoorOpened), 'boss door progress');
  const finalOpened = run.opened.filter((id) => hasKind(id, ['finalChest']));
  fail(finalOpened.length > 1 || (run.selectedChest ? finalOpened[0] !== run.selectedChest || !bossCleared(run) : finalOpened.length !== 0) || !!run.selectedChest !== (run.treasureKey.status === 'spent'), 'final reward progress');
  const destination = content.data.worlds.find((map) => map.id === run.returnTo.worldId);
  fail(!destination || !isWalkable(destination, run.returnTo.position), 'return location');
}
