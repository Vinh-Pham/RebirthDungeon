import projectSource from "../../../assets/maps/towns.ldtk?raw";
import type { Landmark, WorldMap } from "./world";

type RecordValue = Record<string, unknown>;

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`LDtk town import failed. ${message}`);
}

const isObject = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isInteger = (value: unknown): value is number => Number.isSafeInteger(value);

function objects(value: unknown, message: string): RecordValue[] {
  requireValue(Array.isArray(value) && value.every(isObject), message);
  return value;
}

function field(fields: unknown, identifier: string): string {
  const matches = objects(fields, `Missing fields for ${identifier}.`).filter(
    (value) => value.__identifier === identifier,
  );
  const value = matches[0]?.__value;
  requireValue(
    matches.length === 1 && typeof value === "string" && value.trim(),
    `Expected one nonempty ${identifier} field.`,
  );
  return value;
}

function revision(value: unknown) {
  const data = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < data.length; index++) {
    hash = Math.imul(hash ^ data.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function importLdtkTowns(source: string): Map<string, WorldMap> {
  let project: unknown;
  try {
    project = JSON.parse(source);
  } catch {
    throw new Error("LDtk town import failed. The project must contain valid JSON.");
  }
  requireValue(isObject(project), "Expected an LDtk project.");
  requireValue(!project.externalLevels, "Disable Separate level files in LDtk before saving towns.ldtk.");
  const levels = [
    ...objects(project.levels ?? [], "Invalid project levels."),
    ...objects(project.worlds ?? [], "Invalid project worlds.").flatMap((world) =>
      objects(world.levels ?? [], "Invalid world levels."),
    ),
  ];
  const maps = new Map<string, WorldMap>();
  for (const level of levels) {
    const id = field(level.fieldInstances, "TownId");
    requireValue(["lantern_rest", "spindle_hollow"].includes(id), `Unknown TownId "${id}".`);
    requireValue(!maps.has(id), `Duplicate TownId "${id}".`);
    const layers = objects(level.layerInstances, `${id} needs inline layers.`);
    const terrains = layers.filter((layer) => layer.__identifier === "Terrain" && layer.__type === "IntGrid");
    const entityLayers = layers.filter((layer) => layer.__identifier === "Entities" && layer.__type === "Entities");
    requireValue(
      terrains.length === 1 && entityLayers.length === 1,
      `${id} needs one Terrain IntGrid and one Entities layer.`,
    );
    const terrain = terrains[0];
    const entities = entityLayers[0];
    const width = terrain.__cWid,
      height = terrain.__cHei,
      grid = terrain.__gridSize;
    requireValue(
      isInteger(width) &&
        width > 0 &&
        width <= 128 &&
        isInteger(height) &&
        height > 0 &&
        height <= 128 &&
        isInteger(grid) &&
        grid > 0,
      `${id} needs a grid between 1 and 128 cells per dimension.`,
    );
    requireValue(
      level.pxWid === width * grid && level.pxHei === height * grid,
      `${id} level dimensions must align with Terrain cells.`,
    );
    for (const layer of [terrain, entities]) {
      requireValue(
        layer.__gridSize === grid &&
          layer.__cWid === width &&
          layer.__cHei === height &&
          !layer.__pxTotalOffsetX &&
          !layer.__pxTotalOffsetY &&
          !layer.pxOffsetX &&
          !layer.pxOffsetY,
        `${id} Terrain and Entities must share grid size, dimensions and zero offsets.`,
      );
    }
    requireValue(
      Array.isArray(terrain.intGridCsv) &&
        terrain.intGridCsv.length === width * height &&
        terrain.intGridCsv.every((value: unknown) => isInteger(value) && value >= 0 && value <= 8),
      `${id} Terrain must use values 1 Ground, 2 Wall, 3 Rough_Ground, 4 Interior_Floor, 5 Water, 6 Grass, 7 Bush, 8 Dirt_Path, or 0 empty.`,
    );
    const positions = objects(entities.entityInstances, `${id} needs entity instances.`).map((entity) => {
      const point = entity.__grid;
      requireValue(Array.isArray(point) && point.length === 2, `${id} has an entity without grid coordinates.`);
      const [x, y]: unknown[] = point;
      requireValue(
        isInteger(x) && isInteger(y) && x >= 0 && x < width && y >= 0 && y < height,
        `${id} has an entity outside its grid.`,
      );
      const px = entity.px;
      requireValue(
        Array.isArray(px) && px[0] === x * grid && px[1] === y * grid,
        `${id} entities must snap to the grid with a top-left pivot.`,
      );
      return { entity, x, y };
    });
    const starts = positions.filter(({ entity }) => entity.__identifier === "PlayerStart");
    requireValue(starts.length === 1, `${id} needs exactly one PlayerStart.`);
    const markers = positions
      .filter(({ entity }) => entity.__identifier === "Landmark")
      .map<Landmark>(({ entity, x, y }) => ({
        id: field(entity.fieldInstances, "ServiceId"),
        name: field(entity.fieldInstances, "DisplayName"),
        x,
        y,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : Number(a.id !== b.id)));
    requireValue(
      new Set(markers.map((place) => place.id)).size === markers.length,
      `${id} has duplicate ServiceId values.`,
    );
    const terrainCells = terrain.intGridCsv;
    const wolfSpawns = markers
      .filter((place) => place.id.startsWith("wolf_spawn_"))
      .map((place) => {
        requireValue(/^wolf_spawn_(gray|white)_[a-zA-Z0-9_]+$/.test(place.id), `${id} has an invalid wolf spawn.`);
        requireValue(terrainCells[place.y * width + place.x] === 6, `${id} wolf spawns need Grass terrain.`);
        return {
          id: place.id,
          kind: place.id.startsWith("wolf_spawn_gray_") ? ("gray_wolf" as const) : ("white_wolf" as const),
          x: place.x,
          y: place.y,
        };
      });
    const residentSpawns = markers
      .filter((place) => place.id.startsWith("town_resident_"))
      .map(({ id: residentId, x, y }) => {
        requireValue(/^town_resident_(0[1-9]|10)$/.test(residentId), `${id} has an invalid town resident.`);
        requireValue([0, 1, 3, 6, 8].includes(terrainCells[y * width + x]), `${id} residents need exterior ground.`);
        requireValue(
          markers.filter((place) => place.x === x && place.y === y).length === 1 &&
            (starts[0].x !== x || starts[0].y !== y),
          `${id} residents need an unoccupied spawn.`,
        );
        return { id: residentId, x, y };
      });
    const landmarks = markers.filter(
      (place) => !place.id.startsWith("wolf_spawn_") && !place.id.startsWith("town_resident_"),
    );
    const dungeon = landmarks.find((place) => place.id === "dungeon");
    requireValue(dungeon, `${id} needs a dungeon Landmark.`);
    requireValue(
      landmarks.some((place) => place.id === "gate"),
      `${id} needs a gate Landmark.`,
    );
    const tiles = terrain.intGridCsv.map((value: number) => (value <= 4 ? Math.max(0, value - 1) : value));
    const { x, y } = starts[0];
    requireValue(
      ![1, 5, 7].includes(tiles[y * width + x]) && !landmarks.some((place) => place.x === x && place.y === y),
      `${id} PlayerStart must occupy free walkable ground.`,
    );
    const map: WorldMap = {
      id,
      width,
      height,
      tiles,
      landmarks,
      enemies: [],
      ...(wolfSpawns.length ? { wolfSpawns } : {}),
      ...(residentSpawns.length ? { residentSpawns } : {}),
      entry: { x, y },
      exit: { x: dungeon.x, y: dungeon.y },
      generator: "",
    };
    map.generator = `ldtk-town-v1-${revision(map)}`;
    maps.set(id, map);
  }
  requireValue(maps.has("lantern_rest") && maps.has("spindle_hollow"), "Both towns must exist in towns.ldtk.");
  return maps;
}

let towns: Map<string, WorldMap> | undefined;

export function createLdtkTown(id: string): WorldMap {
  const town = (towns ??= importLdtkTowns(projectSource)).get(id);
  requireValue(town, `Unknown town "${id}".`);
  return structuredClone(town);
}
