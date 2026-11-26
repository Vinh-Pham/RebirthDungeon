import swords from "../content/data/swords.json";
import { deriveStats } from "./stats";
import { skillSlotKeys, type CharacterForm, type Point } from "../../app/contracts";
import type { SavedDialogue } from "../content/ink";
import { isWolfKind } from "../content/enemies";
import { ageInterval } from "../content/character-aging";
import { startingAp } from "../content/character-growth";
import { levelForXp, maxExperience, maxLevel, xpForLevel } from "../content/level-experience";
import { Combat } from "../systems/combat";
import { canPlace, type Inventory, type InventoryItem } from "../systems/inventory";
import { skillCommands, type RankedSkill } from "../content/skills";
import {
  CLOSED_DUNGEON_GATE,
  createDungeon,
  createDungeonFloor,
  createTown,
  DUNGEON_FLOOR_GENERATOR,
  generateName,
  openDungeonGates,
  THRESHOLD_ROOM_COUNT,
  walkable,
  type WorldMap,
} from "../world/world";
import { createLegacyDungeon } from "../world/legacy-threshold";

export type Town = "lantern_rest" | "spindle_hollow";
export type Location = "arrival" | Town | "threshold";
export const townNames = {
  lantern_rest: "Lantern Rest",
  spindle_hollow: "Spindle Hollow",
} as const;
export type Battle = ReturnType<Combat["snapshot"]>;
export const emptySkillSlots = () => skillSlotKeys.map(() => null);
export type Material = "fish" | "grain" | "flour" | "fiber" | "thread" | "cloth" | "cobweb" | "firewood" | "bread";
export interface Profile {
  version: 1;
  form: CharacterForm;
  seed: number;
  location: Location;
  origin: Town;
  position: Point;
  map?: WorldMap;
  layouts: Record<string, WorldMap>;
  explored: Record<string, string[]>;
  room: number;
  run: number;
  thresholdVersion?: 2 | 3;
  cleared: number[];
  links: string[];
  treasure: boolean;
  completions: number;
  gates: Town[];
  quest: number;
  level: number;
  xp: number;
  xpCurveVersion?: 1;
  ap: number;
  hp: number;
  mp?: number;
  stamina?: number;
  wounds?: number;
  deadly?: boolean;
  age?: number;
  ageBoundary?: number;
  gold: number;
  bank: number;
  tonics: number;
  quickSlots: string[];
  skillSlots?: (string | null)[];
  inventory: Inventory;
  materials: Record<Material, number>;
  pending: Record<string, number>;
  skills: Record<string, RankedSkill>;
  harvests: Record<string, { count: number; at: number; gathers?: number }>;
  log: string[];
  battle?: Battle;
  wolfOpponent?: string;
  wolfRespawns?: Record<string, number>;
  dialogue?: SavedDialogue;
  arrivalText?: string;
}

const materials: Profile["materials"] = {
  fish: 0,
  grain: 0,
  flour: 0,
  fiber: 0,
  thread: 0,
  cloth: 0,
  cobweb: 0,
  firewood: 0,
  bread: 0,
};

export function thresholdCleared(profile: Profile) {
  const required = profile.thresholdVersion ? THRESHOLD_ROOM_COUNT : 8;
  return new Set(profile.cleared).size === required;
}

export function canLeaveForSpindleHollow(profile: Profile) {
  return (
    Object.keys(profile.pending).length === 0 &&
    (profile.origin === "spindle_hollow" || (profile.treasure && thresholdCleared(profile)))
  );
}
export const starterItems = {
  sword: {
    id: "ashen_arcblade",
    name: "Ashen Arcblade",
    width: 1,
    height: 4,
    x: 0,
    y: 0,
    quantity: 1,
    stackLimit: 1,
    slot: "main_hand",
    durability: 10000,
  },
  armor: {
    id: "riveted_jack",
    name: "Riveted Jack",
    width: 2,
    height: 2,
    x: 0,
    y: 0,
    quantity: 1,
    stackLimit: 1,
    slot: "armor",
    durability: 15000,
  },
} satisfies Record<string, InventoryItem>;

export const maxDurability = (item: InventoryItem) =>
  item.id === "riveted_jack"
    ? 15000
    : ({ light: 10000, rapier: 9000, heavy: 15000, piercing: 12000 }[
        swords.find((sword) => sword.id === item.id)?.family ?? ""
      ] ?? 10000);

export const swordItems = swords
  .map((sword) => ({
    id: sword.id,
    name: sword.name,
    width: sword.width,
    height: sword.height,
    x: 0,
    y: 0,
    quantity: 1,
    stackLimit: 1,
    slot: "main_hand",
    durability: 10000,
  }))
  .map((sword) => ({ ...sword, durability: maxDurability(sword) }));

export function maxHealth(form: CharacterForm, level: number, skills?: Profile["skills"], age?: number) {
  return deriveStats(form, level, skills, undefined, 0, { age }).health;
}

export function migrateExperience(profile: Profile) {
  const { level, xp } = profile;
  profile.level = Math.min(level, maxLevel);
  if (level >= maxLevel) {
    profile.xp = maxExperience;
  } else {
    const oldThreshold = 50 * level * (level - 1);
    const start = xpForLevel(level);
    const span = xpForLevel(level + 1) - start;
    const oldSpan = 100 * level;
    const oldProgress = Math.min(oldSpan, Math.max(0, xp - oldThreshold));
    profile.xp = start + Math.min(span - 1, Math.floor((oldProgress * span) / oldSpan));
  }
  if (level > maxLevel) {
    const health = maxHealth(profile.form, maxLevel, profile.skills);
    profile.hp = Math.min(profile.hp, health);
    if (profile.battle) profile.battle.health = Math.min(profile.battle.health, health);
  }
  profile.xpCurveVersion = 1;
}

export function layout(profile: Profile, location: Town | "threshold", room = 1) {
  if (location !== "threshold") {
    const town = createTown(location);
    profile.layouts[location] = structuredClone(town);
    return town;
  }
  const id = thresholdMapKey(profile, room);
  const existing = profile.layouts[id];
  const seed = profile.seed + profile.run * 7919;
  if (profile.thresholdVersion === 3) {
    const map = existing ? structuredClone(existing) : createDungeonFloor(seed);
    map.enemies = map.enemies.filter((enemy) => enemy.room === undefined || !profile.cleared.includes(enemy.room));
    openDungeonGates(map, profile.cleared);
    profile.layouts[id] = structuredClone(map);
    return map;
  }
  if (existing) {
    const map = structuredClone(existing);
    if (profile.cleared.includes(room)) map.enemies = [];
    return map;
  }
  const variants = ["digger", "uniform", "cellular"] as const;
  const map =
    profile.thresholdVersion === 2
      ? createDungeon(seed, room)
      : createLegacyDungeon(seed, room, variants[(room - 1) % variants.length]);
  if (profile.cleared.includes(room)) map.enemies = [];
  if (room < (profile.thresholdVersion === 2 ? THRESHOLD_ROOM_COUNT : 9))
    map.subtitle = generateName(profile.seed + profile.run * 31 + room);
  profile.layouts[id] = structuredClone(map);
  return map;
}

export function newProfile(form: CharacterForm, seed: number, now = Date.now()): Profile {
  const skills: Profile["skills"] = {
    combat_mastery: { rank: "novice", training: {} },
    defense: { rank: "novice", training: {} },
  };
  const stats = deriveStats(form, 1, skills);
  return {
    version: 1,
    form,
    seed,
    location: "arrival",
    origin: "lantern_rest",
    position: { x: 0, y: 0 },
    layouts: {},
    explored: {},
    room: 1,
    run: 0,
    thresholdVersion: 3,
    cleared: [],
    links: [],
    treasure: false,
    completions: 0,
    gates: [],
    quest: 0,
    level: 1,
    xp: 0,
    xpCurveVersion: 1,
    ap: startingAp,
    hp: stats.health,
    mp: stats.mana,
    stamina: stats.stamina,
    wounds: 0,
    age: form.age,
    ageBoundary: ageInterval(now, now).boundary,
    gold: 24,
    bank: 0,
    tonics: 0,
    quickSlots: ["", "", "", ""],
    skillSlots: emptySkillSlots(),
    inventory: { width: 8, height: 7, items: [] },
    materials: { ...materials },
    pending: {},
    skills,
    harvests: {},
    log: [],
  };
}

export function restoreCombat(snapshot: Battle) {
  const combat = new Combat(
    snapshot.player,
    snapshot.enemies.map((enemy) => enemy.stats),
    snapshot.seed,
  );
  Object.assign(combat, structuredClone(snapshot));
  return combat;
}

export function arrive(profile: Profile, location: Town | "threshold", room = 1, position?: Point) {
  profile.location = location;
  profile.room = room;
  profile.map = layout(profile, location, room);
  profile.position = position && walkable(profile.map, position.x, position.y) ? position : profile.map.entry;
  delete profile.battle;
  delete profile.wolfOpponent;
}

function thresholdMapKey(profile: Profile, room: number) {
  return `threshold-${profile.run}-${profile.thresholdVersion === 3 ? "floor" : room}`;
}

export function mapKey(profile: Profile) {
  return profile.location === "threshold" ? thresholdMapKey(profile, profile.room) : profile.location;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;
const uint = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const isTown = (value: unknown): value is Town => value === "lantern_rest" || value === "spindle_hollow";
const isLocation = (value: unknown): value is Location => value === "arrival" || value === "threshold" || isTown(value);
const asciiName = (value: unknown): value is string =>
  typeof value === "string" && Array.from(value).length <= 24 && Boolean(value.trim());
const isPoint = (value: unknown): value is Point => record(value) && uint(value.x) && uint(value.y);

export function validForm(form: unknown): form is CharacterForm {
  if (!record(form) || !asciiName(form.name)) return false;
  const bounds = {
    race: 2,
    gender: 2,
    age: 17,
    talent: 23,
    body: 2,
    skin: 3,
    hair: 11,
    hairColor: 9,
    eyes: 2,
    eyeColor: 9,
    face: 2,
  };
  return (
    Object.entries(bounds).every(([key, max]) => uint(form[key]) && Number(form[key]) <= max) &&
    Number(form.age) >= 10 &&
    form.talent !== 2 &&
    !(form.race === 1 && form.talent === 13) &&
    !(form.race === 2 && form.talent === 3)
  );
}

function validMap(value: unknown): value is WorldMap {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    typeof value.generator !== "string" ||
    !uint(value.width) ||
    !uint(value.height) ||
    value.width === 0 ||
    value.width > 128 ||
    value.height === 0 ||
    value.height > 128 ||
    !Array.isArray(value.tiles) ||
    value.tiles.length !== value.width * value.height ||
    !value.tiles.every(
      (tile) =>
        uint(tile) &&
        (tile <= 3 ||
          (tile >= 5 && tile <= 8) ||
          (tile === CLOSED_DUNGEON_GATE && value.generator === DUNGEON_FLOOR_GENERATOR)),
    ) ||
    !isPoint(value.entry) ||
    !isPoint(value.exit) ||
    !Array.isArray(value.landmarks) ||
    !Array.isArray(value.enemies)
  )
    return false;
  const width = value.width,
    height = value.height;
  const inBounds = (point: Point) => point.x < width && point.y < height;
  const isRoomId = (id: unknown) => uint(id) && id >= 1 && id <= THRESHOLD_ROOM_COUNT;
  if (
    value.generator === DUNGEON_FLOOR_GENERATOR &&
    (!Array.isArray(value.rooms) ||
      value.rooms.length !== THRESHOLD_ROOM_COUNT ||
      !value.rooms.every(
        (room) =>
          record(room) &&
          isPoint(room) &&
          isRoomId(room.id) &&
          uint(room.width) &&
          uint(room.height) &&
          room.width > 0 &&
          room.height > 0 &&
          room.x + room.width <= width &&
          room.y + room.height <= height,
      ) ||
      !Array.isArray(value.gates) ||
      value.gates.length !== THRESHOLD_ROOM_COUNT - 1 ||
      !value.gates.every((gate) => record(gate) && isPoint(gate) && inBounds(gate) && isRoomId(gate.room)))
  )
    return false;
  const validEntity = (entity: unknown) =>
    record(entity) &&
    isPoint(entity) &&
    inBounds(entity) &&
    "id" in entity &&
    typeof entity.id === "string" &&
    "name" in entity &&
    typeof entity.name === "string";
  return (
    inBounds(value.entry) &&
    inBounds(value.exit) &&
    (value.wolfSpawns === undefined ||
      (Array.isArray(value.wolfSpawns) &&
        value.wolfSpawns.every(
          (spawn) =>
            record(spawn) &&
            isPoint(spawn) &&
            inBounds(spawn) &&
            "id" in spawn &&
            typeof spawn.id === "string" &&
            "kind" in spawn &&
            typeof spawn.kind === "string" &&
            isWolfKind(spawn.kind),
        ))) &&
    value.landmarks.every(validEntity) &&
    value.enemies.every(
      (entity) =>
        validEntity(entity) &&
        typeof entity.sprite === "string" &&
        Number.isFinite(entity.speed) &&
        entity.speed > 0 &&
        (value.generator !== DUNGEON_FLOOR_GENERATOR || isRoomId(entity.room)),
    ) &&
    (value.doors === undefined ||
      (Array.isArray(value.doors) &&
        value.doors.every(
          (door) =>
            isPoint(door) &&
            inBounds(door) &&
            "target" in door &&
            uint(door.target) &&
            door.target >= 1 &&
            door.target <= 9 &&
            "arrival" in door &&
            isPoint(door.arrival),
        )))
  );
}

export function validateProfile(value: unknown): value is Profile {
  if (
    !record(value) ||
    value.version !== 1 ||
    !validForm(value.form) ||
    !isLocation(value.location) ||
    !isTown(value.origin) ||
    (value.thresholdVersion !== undefined && value.thresholdVersion !== 2 && value.thresholdVersion !== 3) ||
    !isPoint(value.position) ||
    !record(value.layouts) ||
    !Object.values(value.layouts).every(validMap) ||
    !record(value.explored) ||
    (value.location !== "arrival" &&
      (!validMap(value.map) || !walkable(value.map, value.position.x, value.position.y))) ||
    !Array.isArray(value.gates) ||
    !value.gates.every(isTown) ||
    !record(value.inventory) ||
    !Array.isArray(value.log) ||
    !value.log.every((line) => typeof line === "string")
  )
    return false;
  const roomCount = value.thresholdVersion ? THRESHOLD_ROOM_COUNT : 9;
  const encounterCount = value.thresholdVersion ? roomCount : roomCount - 1;
  if (
    !["seed", "room", "run", "level", "xp", "ap", "gold", "bank", "tonics", "quest", "completions"].every((key) =>
      uint(value[key]),
    ) ||
    !finite(value.hp) ||
    (value.hp < 0 && value.deadly !== true) ||
    (value.deadly !== undefined && typeof value.deadly !== "boolean") ||
    ![value.mp, value.stamina, value.wounds].every((pool) => pool === undefined || nonnegative(pool)) ||
    (value.age !== undefined && (!uint(value.age) || value.age < value.form.age)) ||
    (value.ageBoundary !== undefined && !uint(value.ageBoundary)) ||
    (value.xpCurveVersion !== undefined &&
      (value.xpCurveVersion !== 1 ||
        Number(value.xp) > maxExperience ||
        value.level !== levelForXp(Number(value.xp)))) ||
    !Array.isArray(value.cleared) ||
    !value.cleared.every((room) => uint(room) && room >= 1 && room <= encounterCount) ||
    typeof value.treasure !== "boolean" ||
    !Array.isArray(value.quickSlots) ||
    (value.skillSlots !== undefined &&
      (!Array.isArray(value.skillSlots) ||
        value.skillSlots.length !== skillSlotKeys.length ||
        !value.skillSlots.every(
          (slot) =>
            slot === null ||
            (typeof slot === "string" && Object.hasOwn(skillCommands, slot) && Object.hasOwn(value.skills ?? {}, slot)),
        ))) ||
    !Array.isArray(value.links) ||
    !record(value.materials) ||
    !record(value.skills) ||
    !record(value.pending) ||
    !record(value.harvests) ||
    (value.wolfRespawns !== undefined &&
      (!record(value.wolfRespawns) || !Object.values(value.wolfRespawns).every(uint)))
  )
    return false;
  const inv = value.inventory;
  if (
    !uint(inv.width) ||
    inv.width < 1 ||
    inv.width > 20 ||
    !uint(inv.height) ||
    inv.height < 1 ||
    inv.height > 20 ||
    !Array.isArray(inv.items)
  )
    return false;
  if (
    !inv.items.every(
      (item) =>
        record(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        isPoint(item) &&
        "width" in item &&
        uint(item.width) &&
        item.width > 0 &&
        "height" in item &&
        uint(item.height) &&
        item.height > 0 &&
        "quantity" in item &&
        uint(item.quantity) &&
        item.quantity > 0 &&
        "stackLimit" in item &&
        uint(item.stackLimit) &&
        item.quantity <= item.stackLimit,
    )
  )
    return false;
  if (
    value.room === 0 ||
    Number(value.room) > roomCount ||
    value.level === 0 ||
    Number(value.quest) > 3 ||
    value.quickSlots.length !== 4 ||
    !value.quickSlots.every((slot) => slot === "" || slot === "tonic") ||
    !value.links.every((link) => typeof link === "string" && /^[1-9]:[1-9]$/.test(link)) ||
    !Object.values(value.explored).every(
      (cells) => Array.isArray(cells) && cells.every((cell) => typeof cell === "string"),
    ) ||
    !Object.values(value.materials).every(uint) ||
    !Object.values(value.pending).every(uint) ||
    !Object.values(value.skills).every(
      (skill) =>
        record(skill) &&
        typeof skill.rank === "string" &&
        record(skill.training) &&
        Object.values(skill.training).every(uint),
    )
  )
    return false;
  if (
    value.dialogue !== undefined &&
    (!record(value.dialogue) ||
      typeof value.dialogue.state !== "string" ||
      !["arrival", "blacksmith", "bank", "gate", "grocery", "healer", "shop"].includes(String(value.dialogue.id)))
  )
    return false;
  const inventory = inv as unknown as Inventory;
  if (value.wolfOpponent !== undefined) {
    const map = value.map as WorldMap | undefined;
    if (
      typeof value.wolfOpponent !== "string" ||
      !isTown(value.location) ||
      !record(value.battle) ||
      !Array.isArray(value.battle.enemies) ||
      value.battle.enemies.length !== 1 ||
      !map?.enemies.some((enemy) => enemy.id === value.wolfOpponent && isWolfKind(enemy.sprite))
    )
      return false;
  }
  return (
    new Set(inventory.items.map((item) => item.id)).size === inventory.items.length &&
    inventory.items.every((item) => item.equipped || canPlace(inventory, item, item.x, item.y)) &&
    (value.battle === undefined || validBattle(value.battle))
  );
}

function validBattle(value: unknown): boolean {
  if (
    !record(value) ||
    !record(value.player) ||
    !Array.isArray(value.enemies) ||
    !value.enemies.length ||
    !uint(value.target) ||
    value.target >= value.enemies.length ||
    !uint(value.seed)
  )
    return false;
  const actions = ["attack", "defend", "smash", "counterattack", "windmill"];
  return (
    finite(value.health) &&
    (value.health >= 0 || value.playerDeadly === true) &&
    (value.playerDeadly === undefined || typeof value.playerDeadly === "boolean") &&
    (value.playerWounds === undefined || nonnegative(value.playerWounds)) &&
    nonnegative(value.stamina) &&
    nonnegative(value.playerGauge) &&
    typeof value.player.name === "string" &&
    nonnegative(value.player.health) &&
    (value.queuedAction === null || actions.includes(String(value.queuedAction))) &&
    value.enemies.every(
      (enemy) =>
        record(enemy) &&
        nonnegative(enemy.health) &&
        nonnegative(enemy.gauge) &&
        nonnegative(enemy.actions) &&
        (enemy.wounds === undefined || nonnegative(enemy.wounds)) &&
        actions.includes(String(enemy.intent)) &&
        record(enemy.stats) &&
        typeof enemy.stats.name === "string" &&
        nonnegative(enemy.stats.health),
    )
  );
}
