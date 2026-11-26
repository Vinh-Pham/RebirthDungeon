import { addPouch, pouchKind, pouches, syncStacks } from "./stacks";
import { createStore } from "zustand/vanilla";
import { skillSlotKeys } from "../../app/contracts";
import type {
  ActionOption,
  CharacterForm,
  CombatCommand,
  GameActions,
  GameView,
  InventoryItem,
  Panel,
  Point,
  Screen,
} from "../../app/contracts";
import { dungeonEnemies } from "../content/enemies";
import swords from "../content/data/swords.json";
import { deriveStats, levelForXp, xpForLevel } from "./stats";
import {
  advanceDialogue,
  chooseDialogue,
  createDialogue,
  restoreDialogue,
  saveDialogue,
  type DialogueView,
} from "../content/ink";
import { rankData, rankUp, recordTraining, skillCatalog, skillCommands } from "../content/skills";
import { SaveService, type SaveRecord } from "../persistence";
import { Combat, tonicHealing } from "../systems/combat";
import { craft, transferGold } from "../systems/economy";
import {
  addItem,
  equipItem,
  equipmentSlot,
  moveItem,
  removeItem,
  type InventoryItem as StoredInventoryItem,
} from "../systems/inventory";
import {
  advanceWorldActors,
  createEntities,
  createTown,
  doorBlocked,
  findPath,
  lightCells,
  occupied,
  openDungeonGates,
  roomAt,
  THRESHOLD_ROOM_COUNT,
  visibleCells,
  walkable,
  type Landmark,
  type MapEnemy,
  type WorldMap,
} from "../world/world";
import { legacyDoorBlocked } from "../world/legacy-threshold";
import {
  arrive,
  canLeaveForSpindleHollow,
  emptySkillSlots,
  mapKey,
  maxDurability,
  maxHealth,
  newProfile,
  restoreCombat,
  starterItems,
  swordItems,
  townNames,
  thresholdCleared,
  validForm,
  validateProfile,
  type Material,
  type Profile,
  type Town,
} from "./profile";
import { describeService, option, serviceOptions, serviceStory, shopItems, type ServiceId } from "./services";

const bindings = {
  up: "w",
  down: "s",
  left: "a",
  right: "d",
  interact: "e",
  character: "c",
  inventory: "i",
  skills: "k",
  journal: "q",
  gates: "g",
};
const reservedKey = (key: string) => /^(?:[0-9]|f[1-4]|arrow(?:up|down|left|right)|escape|tab|enter| )$/.test(key);

function restoreBindings(saved: Record<string, string> = {}) {
  const restored = Object.fromEntries(
    Object.entries(bindings).map(([id, fallback]) => {
      const key = saved[id]?.toLowerCase();
      return [id, key && !reservedKey(key) ? key : fallback];
    }),
  );
  // Restoring a now-reserved binding can collide with another customized key.
  return new Set(Object.values(restored)).size === Object.keys(bindings).length ? restored : { ...bindings };
}
const defaultSettings: GameView["settings"] = {
  reducedMotion: false,
  bindings,
};
const emptyDetails = { title: "", body: "", options: [] as ActionOption[] };
const emptyInventory: GameView["inventory"] = {
  width: 8,
  height: 7,
  items: [],
  equipment: {},
  tonics: 0,
  quickSlots: [],
};
const range = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const maxLife = (p: Profile) => maxHealth(p.form, p.level, p.skills);
const link = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(":");

function roomEnemies(p: Profile, room = p.room) {
  const enemies = p.map?.enemies ?? [];
  return p.thresholdVersion === 3 ? enemies.filter((enemy) => enemy.room === room) : enemies;
}

function rememberThresholdVisibility(p: Profile) {
  if (p.location !== "threshold" || !p.map) return;
  const id = mapKey(p);
  p.explored[id] = [...new Set([...(p.explored[id] ?? []), ...visibleCells(p.map, p.position)])];
}
const itemName = (id: string) => id.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const lootIcons: Partial<Record<string, string>> = {
  gold: "frames/gold.png",
  cobweb: "frames/cobweb.png",
  tonic: "items/consumables/hp-30-potion.png",
  cloth: "frames/loot_cloth.png",
  fish: "frames/loot_fish.png",
  fiber: "frames/loot_fiber.png",
};
function inventoryFrame({ id }: StoredInventoryItem) {
  if (id.startsWith("stack-gold-")) return "gold";
  if (id.startsWith("stack-cobweb-")) return "cobweb";
  if (id === "riveted_jack") return "item_full_leather_armor_set";
  const sword = swords.find((entry) => entry.id === id);
  if (sword) return `sword_atlas_${sword.sprite}`;
  if (shopItems.some((entry) => entry.id === id)) return `item_${id}`;
  return pouchKind(id);
}

function inventoryView(profile: Profile): GameView["inventory"] {
  const { width, height } = profile.inventory;
  const items: InventoryItem[] = [];
  const equipment: GameView["inventory"]["equipment"] = {};
  for (const item of profile.inventory.items) {
    const slot = equipmentSlot(item);
    const projected = {
      ...item,
      amount: pouchKind(item.id) ? item.quantity - 1 : item.quantity,
      texture: inventoryFrame(item),
      equipmentSlot: slot,
    };
    if (!item.equipped) items.push(projected);
    else if (slot) equipment[slot] = projected;
  }
  return {
    width,
    height,
    items,
    equipment,
    tonics: profile.tonics,
    quickSlots: profile.quickSlots.map((slot) => slot === "tonic"),
  };
}

const append = (p: Profile, ...lines: string[]) => {
  p.log = [...p.log, ...lines].slice(-100);
};
const gateOptions = (p: Profile) =>
  p.gates.filter((town) => town !== p.location).map((town) => option(`travel:${town}`, `Travel to ${townNames[town]}`));

export interface MapView {
  map: WorldMap;
  position: Point;
  appearance: CharacterForm;
  visible?: Set<string>;
  explored?: string[];
  lighting?: Map<string, number[]>;
}
interface State {
  view: GameView;
  mapView?: MapView;
}
type Update = (profile: Profile) => void;

export class GameSession {
  readonly store = createStore<State>(() => ({
    view: {
      screen: "title",
      busy: true,
      error: "",
      characters: [],
      location: "",
      locationDetail: "",
      log: [],
      arrival: { text: "", options: [] },
      details: emptyDetails,
      loot: [],
      inventory: emptyInventory,
      skillSlots: Array(10).fill(null),
      skills: [],
      settings: defaultSettings,
    },
  }));
  private profile?: SaveRecord<Profile>;
  private records: SaveRecord<Profile>[] = [];
  private screen: Screen = "title";
  private panel?: Panel;
  private service?: Landmark;
  private serviceMode: "options" | "shop" | "study" = "options";
  private dialogueView?: DialogueView;
  private combat?: Combat;
  private route: Point[] = [];
  private routeTarget?: Landmark;
  private movementTime = 0;
  private hudTime = 0;
  private mapView?: MapView;
  private indexedMap?: WorldMap;
  private entities?: ReturnType<typeof createEntities>;
  private settings = structuredClone(defaultSettings);
  private busy = false;
  private error = "";

  constructor(private readonly saves = new SaveService<Profile>()) {}

  async initialize() {
    await this.perform(async () => {
      const [records, settings, active] = await Promise.all([
        this.saves.list(),
        this.saves.getSetting("preferences", defaultSettings),
        this.saves.getSetting<string | null>("active", null),
      ]);
      this.records = records.filter((entry) => validateProfile(entry.snapshot));
      this.settings = {
        reducedMotion: settings.reducedMotion ?? defaultSettings.reducedMotion,
        bindings: restoreBindings(settings.bindings),
      };
      const record = this.records.find((entry) => entry.id === active);
      if (record) await this.openCharacter(record);
    });
  }

  private async perform(operation: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.publish();
    try {
      await operation();
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.route = [];
      this.combat = this.profile?.snapshot.battle ? restoreCombat(this.profile.snapshot.battle) : undefined;
    } finally {
      this.busy = false;
      this.publish();
    }
  }

  private adopt(record: SaveRecord<Profile>, reopen = false) {
    if (record.snapshot.location === "threshold" && record.snapshot.room === 1) {
      const entrance = record.snapshot.map?.landmarks.find((place) => place.id === "return");
      if (entrance) entrance.name = "Dungeon Entrance";
    }
    this.profile = record;
    if (reopen) this.screen = record.snapshot.location === "arrival" ? "arrival" : "world";
    this.combat = record.snapshot.battle ? restoreCombat(record.snapshot.battle) : undefined;
    this.records = [...this.records.filter((entry) => entry.id !== record.id), record];
    this.mapView = undefined;
  }

  private async openCharacter(record: SaveRecord<Profile>, select = false) {
    const { snapshot, id, name, revision } = record;
    const { location } = snapshot;
    if (location !== "arrival" && location !== "threshold") {
      const map = createTown(location);
      if (snapshot.map?.generator !== map.generator) {
        const updated = structuredClone(snapshot);
        updated.map = map;
        updated.layouts[location] = map;
        if (
          occupied(map, updated.position) ||
          (range(map.entry, updated.position) !== 0 && !findPath(map, map.entry, updated.position).length)
        )
          updated.position = map.entry;
        const saved = await this.saves.save({ id, name, snapshot: updated }, revision, select);
        this.adopt(saved, true);
        return;
      }
    }
    if (select) await this.saves.setSetting("active", id);
    this.adopt(record, true);
  }

  private async commit(profile: Profile) {
    if (!this.profile) return;
    if (!syncStacks(profile)) throw new Error("Your satchel has no room for all of these items.");
    const record = await this.saves.save(
      { id: this.profile.id, name: profile.form.name, snapshot: profile },
      this.profile.revision,
    );
    this.adopt(record);
  }

  private update(update: Update, onSaved?: () => void) {
    if (!this.profile) return;
    void this.perform(async () => {
      const candidate = structuredClone(this.profile!.snapshot);
      if (this.combat) candidate.battle = this.combat.snapshot();
      update(candidate);
      await this.commit(candidate);
      onSaved?.();
    });
  }

  private nearby(p: Profile, radius = 1) {
    if (!p.map || this.combat?.active) return undefined;
    if (p.map !== this.indexedMap) {
      this.indexedMap = p.map;
      this.entities = createEntities(p.map);
    }
    return this.entities?.entities
      .flatMap((entity) => (entity.landmark ? [entity.landmark] : []))
      .filter((place) => range(place, p.position) <= radius)
      .sort((a, b) => range(a, p.position) - range(b, p.position))[0];
  }

  private details(p?: Profile): GameView["details"] {
    if (!p || !this.panel) return emptyDetails;
    switch (this.panel) {
      case "character":
        return {
          title: p.form.name,
          body: `Level ${p.level} · ${p.xp} Experience · ${p.ap} AP`,
          options: [],
        };
      case "inventory":
        return {
          title: "Inventory",
          body: Object.entries(p.materials)
            .filter(([id, count]) => count && id !== "cobweb")
            .map(([id, count]) => `${itemName(id)} × ${count}`)
            .join(" · "),
          options: [],
        };
      case "skills":
        return {
          title: "Skills",
          body: "Train through practice and combat. Advance a ready rank with AP.",
          options: [],
        };
      case "journal":
        return {
          title: "Journal",
          body:
            [
              "Find Warden Nera in Lantern Rest to learn why the lower passages have gone quiet.",
              "Carry the signal through the Threshold to Spindle Hollow.",
              "Speak with the Watchkeeper in Spindle Hollow to report your journey.",
              "The passage stands open. The settlements can reach each other again.",
            ][p.quest] ?? "",
          options: [],
        };
      case "gates":
        return {
          title: "Moon Gates",
          body: p.gates.length
            ? "Travel to any other registered gate."
            : "Interact with a Moon Gate in person to register it.",
          options: gateOptions(p),
        };
      case "log":
        return { title: "Log", body: "", options: [] };
      case "settings":
        return {
          title: "Settings",
          body: "",
          options: [option("reset-bindings", "Reset Controls")],
        };
      case "loot":
        return { title: "Loot", body: "", options: [] };
      case "service": {
        const place = this.service;
        if (!place) return emptyDetails;
        if (
          place.id === "rack" ||
          (place.id === "blacksmith" && p.location === "spindle_hollow" && this.serviceMode === "shop")
        ) {
          const family = place.family ?? "heavy";
          return {
            title: place.name,
            body: "Take a weapon for practice or return one to the rack.",
            options: swords
              .filter((item) => item.family === family)
              .map((item) => {
                const owned = p.inventory.items.some((candidate) => candidate.id === item.id);
                return option(
                  `${owned ? "return-sword" : "take-sword"}:${item.id}`,
                  `${owned ? "Return" : "Take"} ${item.name}`,
                );
              }),
          };
        }
        if (this.serviceMode === "shop")
          return {
            title: "Blacksmith",
            body: `${p.gold} Gold`,
            options: shopItems.map((item) =>
              option(`buy:${item.id}`, `${item.name} · ${item.price} Gold`, p.gold < item.price),
            ),
          };
        if (this.serviceMode === "study")
          return {
            title: "School",
            body: "Choose a lesson to unlock a new skill.",
            options: Object.values(skillCatalog)
              .filter(
                (skill) => !p.skills[skill.id] || (skill.id === "windmill" && p.skills.windmill.rank === "novice"),
              )
              .map((skill) =>
                option(`learn:${skill.id}`, `Learn ${skill.name}${skill.id === "windmill" ? " · Rank F" : ""}`),
              ),
          };
        const options = serviceOptions(place, p);
        if (place.id === "gate") options.push(...gateOptions(p));
        if (this.dialogueView)
          options.push(...this.dialogueView.choices.map((choice) => option(`ink:${choice.index}`, choice.text)));
        return {
          title: place.name,
          body: this.dialogueView?.lines.join("\n") || describeService(place, p),
          options,
        };
      }
      default:
        return emptyDetails;
    }
  }

  private publish() {
    const p = this.profile?.snapshot;
    const subtitle = p?.map?.subtitle ? ` · ${p.map.subtitle}` : "";
    const xpAtLevelStart = p ? xpForLevel(p.level) : 0;
    const battle = this.combat;
    const encounterEnemies = p && battle?.active ? roomEnemies(p) : [];
    const nearby = p ? this.nearby(p) : undefined;
    const stats = p ? deriveStats(p.form, p.level, p.skills) : undefined;
    if (!this.mapView && p?.map && this.screen === "world") {
      const visible = p.location === "threshold" ? visibleCells(p.map, p.position) : undefined;
      this.mapView = {
        map: p.map,
        position: p.position,
        appearance: p.form,
        visible,
        explored: visible ? (p.explored[mapKey(p)] ?? []) : undefined,
        lighting: visible ? lightCells(p.map, p.position) : undefined,
      };
    }
    this.store.setState({
      mapView: this.screen === "world" ? this.mapView : undefined,
      view: {
        screen: this.screen,
        busy: this.busy,
        error: this.error,
        panel: this.panel,
        nearby: nearby?.name,
        characters: [...this.records]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((record) => ({
            id: record.id,
            name: record.name,
            detail: `Level ${record.snapshot.level}`,
          })),
        player:
          p && stats
            ? {
                name: p.form.name,
                level: p.level,
                hp: battle?.health ?? p.hp,
                maxHp: stats.health,
                mp: stats.mana,
                maxMp: stats.mana,
                stamina: battle?.stamina ?? stats.stamina,
                maxStamina: stats.stamina,
                xpInLevel: Math.max(0, p.xp - xpAtLevelStart),
                xpToAdvance: xpForLevel(p.level + 1) - xpAtLevelStart,
              }
            : undefined,
        location:
          !p || p.location === "arrival" ? "" : p.location === "threshold" ? "The Threshold" : townNames[p.location],
        locationDetail:
          p?.location === "threshold"
            ? p.thresholdVersion
              ? `Floor 1 · Room ${p.room} / ${THRESHOLD_ROOM_COUNT}${p.room === THRESHOLD_ROOM_COUNT ? " · Signal Vault" : subtitle}`
              : p.room === 9
                ? "Signal Vault"
                : `Chamber ${p.room} / 8${subtitle}`
            : "Dungeon Settlement",
        log: p?.log ?? [],
        arrival: {
          text: p?.arrivalText ?? "A stranger with a lantern waits at the mouth of the passage.",
          options: p?.arrivalText
            ? [option("arrive", "Follow the Lanterns")]
            : [option("arrival-talk", "Speak with Ilex")],
        },
        encounter: battle?.active
          ? {
              gauge: battle.playerGauge,
              enemyRoom: p?.thresholdVersion === 3 ? p.room : undefined,
              actionDetails: battle.actionDetails,
              available: (["attack", "defend", "smash", "counterattack", "windmill", "tonic"] as const).filter(
                (command) =>
                  command === "tonic"
                    ? Boolean(p?.tonics && battle.health < battle.player.health)
                    : battle.canQueue(command),
              ),
              queued: battle.queuedAction ?? undefined,
              target: String(battle.target),
              enemies: battle.enemies.flatMap((enemy, index) => {
                const position = encounterEnemies[index];
                if (enemy.health <= 0 || !position) return [];
                return [
                  {
                    id: String(index),
                    name: enemy.stats.name,
                    hp: enemy.health,
                    maxHp: enemy.stats.health,
                    gauge: enemy.gauge,
                    intent: itemName(enemy.intent),
                    position: { x: position.x, y: position.y },
                  },
                ];
              }),
            }
          : undefined,
        details: this.details(p),
        loot:
          p && this.panel === "loot"
            ? Object.entries(p.pending).map(([id, count]) => ({
                id,
                count,
                name: id === "tonic" ? "Healing Tonic" : itemName(id),
                icon: lootIcons[id],
              }))
            : [],
        inventory: p ? inventoryView(p) : emptyInventory,
        skillSlots: p?.skillSlots ?? emptySkillSlots(),
        skills: p
          ? Object.entries(p.skills).flatMap(([id, progress]) => {
              const skill = skillCatalog[id];
              const rank = rankData(id, progress.rank);
              if (!skill || !rank) return [];
              const max = rank.game_training_required ?? rank.training_required ?? 0;
              const points = (rank.game_training ?? rank.training ?? []).reduce(
                (sum, task) => sum + task.points * (progress.training[task.id] ?? 0),
                0,
              );
              return [
                {
                  id,
                  label: skill.name,
                  rank: progress.rank,
                  description: skill.description,
                  training: max ? Math.min(100, Math.floor((points / max) * 100)) : 0,
                  canAdvance: !!rankUp(id, progress, p.ap),
                  command: skillCommands[id],
                },
              ];
            })
          : [],
        settings: this.settings,
      },
    });
  }

  private openPanel(panel?: Panel) {
    this.route = [];
    this.routeTarget = undefined;
    this.panel = panel;
    if (panel !== "service") {
      this.service = undefined;
      this.dialogueView = undefined;
    }
    this.publish();
  }

  private openService(place: Landmark) {
    this.openPanel("service");
    this.service = place;
    this.serviceMode = "options";
    this.dialogueView = undefined;
    this.publish();
    const story = serviceStory[place.id as ServiceId];
    if (!story) return;
    void this.perform(async () => {
      const previous = this.profile?.snapshot.dialogue;
      const session = previous?.id === story ? await restoreDialogue(previous) : await createDialogue(story);
      const dialogue = advanceDialogue(session);
      if (this.service !== place) return;
      this.dialogueView = dialogue;
      if (this.profile) {
        const candidate = structuredClone(this.profile.snapshot);
        candidate.dialogue = saveDialogue(session);
        await this.commit(candidate);
      }
    });
  }

  private passageBlocked(p: Profile, target: number) {
    const blocked = p.thresholdVersion === 2 ? doorBlocked : legacyDoorBlocked;
    return blocked(p.room, target, p.cleared, p.links);
  }

  private resetThreshold(p: Profile) {
    p.run++;
    p.cleared = [];
    p.links = [];
    p.treasure = false;
    for (const key of Object.keys(p.layouts)) if (key.startsWith("threshold-")) delete p.layouts[key];
    for (const key of Object.keys(p.explored)) if (key.startsWith("threshold-")) delete p.explored[key];
  }

  private arriveAtTownLandmark(p: Profile, town: Town, id: "dungeon" | "gate") {
    arrive(p, town);
    const map = p.map;
    const landmark = map?.landmarks.find((place) => place.id === id);
    if (!map || !landmark) return;
    const { x, y } = landmark;
    const west = { x: x - 1, y };
    const north = { x, y: y - 1 };
    const approaches = id === "dungeon" ? [west, north] : [north, west];
    approaches.push({ x: x + 1, y }, { x, y: y + 1 });
    const approach = approaches.find(
      (point) => !occupied(map, point) && (range(map.entry, point) === 0 || findPath(map, map.entry, point).length > 0),
    );
    if (approach) p.position = approach;
  }

  private moveCandidate(p: Profile, destination: Point) {
    const map = p.map;
    if (!map || range(destination, p.position) !== 1 || !walkable(map, destination.x, destination.y)) return;
    const door = map.doors?.find((value) => range(value, destination) === 0);
    if (door) {
      if (this.passageBlocked(p, door.target)) {
        append(p, "The passage remains sealed. Finish the chamber encounters.");
        this.route = [];
        return;
      }
      const current = p.room;
      p.links = [...new Set([...p.links, link(current, door.target)])];
      arrive(p, "threshold", door.target, door.arrival);
      this.route = [];
      append(
        p,
        door.target === (p.thresholdVersion === 2 ? THRESHOLD_ROOM_COUNT : 9)
          ? "You enter the signal vault."
          : `You enter chamber ${door.target}.`,
      );
    } else if (occupied(map, destination)) {
      const enemy = map.enemies.find((item) => range(item, destination) === 0);
      if (enemy) this.beginCombat(p, enemy.room);
      this.route = [];
    } else {
      p.position = destination;
      const continuous = p.location === "threshold" && p.thresholdVersion === 3;
      const room = continuous ? roomAt(map, destination) : undefined;
      if (room !== undefined) p.room = room;
      if (map.enemies.length && (!continuous || room !== undefined)) {
        map.enemies = advanceWorldActors(map, destination, room);
        if (roomEnemies(p).some((enemy) => range(destination, enemy) <= 1)) this.beginCombat(p);
      }
    }
    rememberThresholdVisibility(p);
  }

  private beginCombat(p: Profile, room = p.room) {
    const enemies = roomEnemies(p, room);
    if (!enemies.length || p.cleared.includes(room)) return;
    p.room = room;
    const encounter = new Combat(
      this.battleStats(p),
      enemies.map((enemy) => this.combatStats(enemy, p.room)),
      Math.max(1, (p.seed + (p.room - 1) * 97) % 2147483647),
    );
    encounter.health = p.hp;
    p.battle = encounter.snapshot();
    this.route = [];
    append(p, `${enemies.map((enemy) => enemy.name).join(", ")} engage you.`);
  }

  private battleStats(p: Profile) {
    const equipped = p.inventory.items.filter((item) => item.equipped && (item.durability ?? 1) > 0);
    const weapon = equipped.find((item) => item.slot === "main_hand");
    const definition =
      swords.find((item) => item.id === weapon?.id) ?? shopItems.find((item) => item.id === weapon?.id);
    const defense = equipped.reduce(
      (sum, item) =>
        sum + (item.id === "riveted_jack" ? 2 : (shopItems.find((entry) => entry.id === item.id)?.defense ?? 0)),
      0,
    );
    return deriveStats(p.form, p.level, p.skills, definition, defense);
  }

  private combatStats(enemy: MapEnemy, room: number) {
    const source = dungeonEnemies[enemy.sprite] ?? dungeonEnemies.glass_mite;
    const tier = source.boss ? 0 : room - 1;
    return {
      ...source,
      health: source.health + tier,
      experience: source.experience + tier * 2,
    };
  }

  private gainXp(p: Profile, xp: number) {
    const priorMaximum = maxLife(p);
    p.xp = Math.min(2_000_000_000, p.xp + xp);
    const level = levelForXp(p.xp);
    if (level <= p.level) return;
    p.ap += level - p.level;
    p.level = level;
    p.hp += maxLife(p) - priorMaximum;
  }

  private finishBattle(p: Profile, battle: Combat) {
    p.hp = battle.health;
    if (battle.active) {
      battle.player = this.battleStats(p);
      p.battle = battle.snapshot();
      return;
    }
    delete p.battle;
    if (!battle.won) {
      p.hp = maxLife(p);
      p.pending = {};
      this.resetThreshold(p);
      this.arriveAtTownLandmark(p, p.origin, "dungeon");
      append(p, "You wake in the settlement. The Threshold has shifted into a new run.");
      return;
    }
    if (p.cleared.includes(p.room)) return;
    p.cleared.push(p.room);
    const enemies = roomEnemies(p);
    if (p.map) {
      p.map.enemies = p.thresholdVersion === 3 ? p.map.enemies.filter((enemy) => enemy.room !== p.room) : [];
      openDungeonGates(p.map, p.cleared);
      p.layouts[mapKey(p)] = structuredClone(p.map);
      rememberThresholdVisibility(p);
    }
    let seed = battle.seed;
    const roll = (count: number) => (seed = (seed * 16807) % 2147483647) % count;
    let xp = 0;
    for (const enemy of enemies) {
      const definition = this.combatStats(enemy, p.room);
      xp += definition.experience;
      const cobweb = definition.drops_cobweb ? roll(4) : 0;
      if (cobweb) p.pending.cobweb = (p.pending.cobweb ?? 0) + cobweb;
      if (roll(3) === 0) p.pending.gold = (p.pending.gold ?? 0) + roll(6) + 1;
    }
    this.gainXp(p, xp);
    append(p, `Chamber ${p.room} cleared. +${xp} XP.`);
  }

  travelTo = (target: Point) => {
    const p = this.profile?.snapshot;
    if (!p?.map || this.panel || this.combat || this.busy || !walkable(p.map, target.x, target.y)) return;
    const map = p.map;
    const landmark = map.landmarks.find((place) => range(place, target) === 0);
    this.routeTarget = landmark;
    const choices = landmark
      ? [
          { x: target.x + 1, y: target.y },
          { x: target.x - 1, y: target.y },
          { x: target.x, y: target.y + 1 },
          { x: target.x, y: target.y - 1 },
        ]
      : [target];
    let shortest: Point[] | undefined;
    for (const point of choices) {
      if (range(p.position, point) === 0) {
        shortest = [];
        break;
      }
      if (occupied(map, point) && range(point, target) !== 0) continue;
      const path = findPath(map, p.position, point);
      if (path.length && (!shortest || path.length < shortest.length)) shortest = path;
    }
    this.route = shortest ?? [];
    if (shortest?.length === 0 && landmark) this.interact();
  };

  step = (dx: number, dy: number) => {
    const p = this.profile?.snapshot;
    this.route = [];
    this.routeTarget = undefined;
    if (!p || this.screen !== "world" || this.panel || this.combat) return;
    this.update((candidate) =>
      this.moveCandidate(candidate, {
        x: candidate.position.x + dx,
        y: candidate.position.y + dy,
      }),
    );
  };

  tick = (dt: number) => {
    if (!this.profile || this.busy || this.screen !== "world") return;
    const battle = this.combat;
    if (battle) {
      const events = battle.advance(dt);
      if (events.length || !battle.active) {
        this.update(
          (p) => {
            append(p, ...events.map((event) => event.message));
            const training = events.flatMap((event) => event.training);
            if (training.length) p.skills = recordTraining(p.skills, training);
            for (const item of p.inventory.items) {
              if (!item.equipped || item.durability === undefined) continue;
              const wear = events.reduce(
                (sum, event) => sum + (item.slot === "main_hand" ? event.weaponWear : event.armorHit ? 25 : 0),
                0,
              );
              item.durability = Math.max(0, item.durability - wear);
            }
            this.finishBattle(p, battle);
          },
          () => {
            if (battle.won && Object.keys(this.profile?.snapshot.pending ?? {}).length) this.openPanel("loot");
          },
        );
      } else if ((this.hudTime += dt) >= 0.08) {
        this.hudTime = 0;
        this.publish();
      }
    } else if (!this.panel && (this.route.length || this.routeTarget)) {
      this.movementTime += dt;
      if (this.movementTime < 0.1) return;
      this.movementTime = 0;
      const next = this.route.shift();
      if (next) this.update((p) => this.moveCandidate(p, next));
      else {
        const target = this.routeTarget;
        this.routeTarget = undefined;
        if (target && range(target, this.profile.snapshot.position) <= 1) this.interact();
      }
    }
  };

  private interact = () => {
    const p = this.profile?.snapshot;
    if (!p || !p.map || this.busy || this.combat) return;
    if (Object.keys(p.pending).length) {
      this.openPanel("loot");
      return;
    }
    const place = this.nearby(p);
    const door = p.map.doors?.find((entry) => range(entry, p.position) <= 1);
    if (place?.id === "return" && p.room === 1) {
      this.openService(place);
    } else if (door && (!place || ["return", "exit"].includes(place.id))) {
      this.update((candidate) => {
        if (range(door, candidate.position) === 0) {
          if (this.passageBlocked(candidate, door.target)) {
            append(candidate, "The passage is still sealed.");
          } else {
            candidate.links = [...new Set([...candidate.links, link(candidate.room, door.target)])];
            arrive(candidate, "threshold", door.target, door.arrival);
          }
        } else this.moveCandidate(candidate, door);
      });
    } else if (place) this.openService(place);
  };

  private useTonic() {
    const battle = this.combat;
    this.update((p) => {
      if (!p.tonics) throw new Error("No Healing Tonics remain.");
      if ((battle?.health ?? p.hp) >= maxLife(p)) throw new Error("Life is already full.");
      p.tonics--;
      if (battle) {
        p.hp = battle.useTonic();
        p.battle = battle.snapshot();
      } else p.hp = Math.min(maxLife(p), p.hp + tonicHealing);
      append(p, "You drink a Healing Tonic. Your Time gauge is unchanged.");
    });
  }

  private queueCombat(command: CombatCommand) {
    if (command === "tonic") {
      this.useTonic();
      return;
    }
    const battle = this.combat;
    if (!battle?.active) return;
    this.update((p) => {
      if (!battle.queue(command)) throw new Error("This action is unavailable.");
      p.battle = battle.snapshot();
      append(p, `${itemName(command)} queued.`);
    });
  }

  private choose = (id: string) => {
    const p = this.profile?.snapshot;
    if (id === "reset-bindings") {
      this.actions.updateSettings({ bindings });
      return;
    }
    if (!p || this.busy) return;
    if (id === "tonic") {
      this.useTonic();
      return;
    }
    if (id === "arrival-talk") {
      void this.perform(async () => {
        const story = await createDialogue("arrival");
        const dialogue = advanceDialogue(story);
        const candidate = structuredClone(p);
        candidate.arrivalText = dialogue.lines.join("\n");
        candidate.dialogue = saveDialogue(story);
        append(candidate, ...dialogue.lines);
        await this.commit(candidate);
      });
      return;
    }
    if (id === "arrive") {
      void this.perform(async () => {
        const candidate = structuredClone(p);
        arrive(candidate, "lantern_rest");
        delete candidate.dialogue;
        append(candidate, "You enter Lantern Rest.");
        await this.commit(candidate);
        this.screen = "world";
      });
      return;
    }
    if (id === "collect-open") {
      this.openPanel("loot");
      return;
    }
    if (id === "shop" || id === "study") {
      this.serviceMode = id;
      this.publish();
      return;
    }
    if (id.startsWith("ink:")) {
      if (!p.dialogue) return;
      void this.perform(async () => {
        const dialogue = await restoreDialogue(p.dialogue!);
        const nextView = chooseDialogue(dialogue, Number(id.slice(4)));
        const candidate = structuredClone(p);
        candidate.dialogue = saveDialogue(dialogue);
        append(candidate, ...nextView.lines);
        await this.commit(candidate);
        this.dialogueView = nextView;
      });
      return;
    }
    const closes = ["enter", "travel", "complete", "retreat"].includes(id.split(":")[0]);
    this.update(
      (candidate) => this.applyService(candidate, id),
      closes
        ? () => this.closePanelAfterTransition()
        : id.startsWith("treasure") && !p.treasure
          ? () => this.openPanel("loot")
          : undefined,
    );
  };

  private applyService(p: Profile, id: string) {
    const [action, arg] = id.split(":");
    switch (action) {
      case "enter": {
        if (p.location !== "lantern_rest" && p.location !== "spindle_hollow") return;
        p.origin = p.location;
        if (p.thresholdVersion !== 3 || !p.completions) {
          this.resetThreshold(p);
          p.thresholdVersion = 3;
          if (p.completions) {
            p.cleared = Array.from({ length: THRESHOLD_ROOM_COUNT }, (_, index) => index + 1);
            p.treasure = true;
          }
        }
        const fromSpindleHollow = p.origin === "spindle_hollow";
        arrive(p, "threshold", fromSpindleHollow ? THRESHOLD_ROOM_COUNT : 1);
        if (p.map) {
          const portal = fromSpindleHollow ? p.map.exit : p.map.entry;
          p.position = { x: portal.x + 1, y: portal.y };
          rememberThresholdVisibility(p);
        }
        append(p, "You descend into the Threshold.");
        return;
      }
      case "quest-accept":
        if (p.quest === 0) {
          p.quest = 1;
          append(p, "Quest accepted: Carry the Signal.");
        }
        return;
      case "quest-reward":
        if (p.quest === 2) {
          p.quest = 3;
          p.gold += 32;
          append(p, "Quest complete. You receive 32 gold.");
        }
        return;
      case "gate-register":
        if ((p.location === "lantern_rest" || p.location === "spindle_hollow") && !p.gates.includes(p.location)) {
          p.gates.push(p.location);
          append(p, `${townNames[p.location]} Moon Gate registered.`);
        }
        return;
      case "travel": {
        const town = arg as Town;
        if (!p.gates.includes(town)) throw new Error("That gate has not been registered.");
        this.arriveAtTownLandmark(p, town, "gate");
        append(p, `The Moon Gate carries you to ${townNames[town]}.`);
        return;
      }
      case "starter-sword":
      case "starter-armor": {
        const item = action === "starter-sword" ? starterItems.sword : starterItems.armor;
        if (!addItem(p.inventory, item)) throw new Error("No room for this item, or you already own it.");
        equipItem(p.inventory, item.id);
        append(p, `You received and equipped ${item.name}.`);
        return;
      }
      case "take-sword":
      case "return-sword": {
        const item = swordItems.find((item) => item.id === arg);
        if (!item || (action === "take-sword" ? !addItem(p.inventory, item) : !removeItem(p.inventory, item.id))) {
          throw new Error("This weapon cannot be changed right now.");
        }
        append(
          p,
          action === "take-sword" ? `${item.name} packed into your satchel.` : `${item.name} returned to the rack.`,
        );
        return;
      }
      case "equip": {
        if (this.combat) throw new Error("Change equipment between encounters.");
        const item = p.inventory.items.find((value) => value.id === arg);
        if (!item) return;
        if (item.equipped) {
          const rest = p.inventory.items.filter((value) => value.id !== item.id);
          const inventory = { ...p.inventory, items: rest };
          if (
            !addItem(inventory, {
              ...item,
              equipped: false,
              accessorySlot: undefined,
            })
          )
            throw new Error("Make room in your bag first.");
          p.inventory = inventory;
        } else if (!equipItem(p.inventory, item.id)) throw new Error("This item cannot be equipped.");
        return;
      }
      case "buy": {
        const item = shopItems.find((entry) => entry.id === arg);
        if (!item || p.gold < item.price) throw new Error("You do not have enough gold.");
        const entry = {
          id: item.id,
          name: item.name,
          x: 0,
          y: 0,
          width: item.width ?? 1,
          height: item.height ?? 1,
          quantity: item.quantity,
          stackLimit: Math.max(1, item.quantity),
          slot: item.slot,
          durability: item.max_durability,
        };
        if (!addItem(p.inventory, entry)) throw new Error("Your bag has no suitable space.");
        p.gold -= item.price;
        append(p, `You bought ${item.name}.`);
        return;
      }
      case "buy-tonic":
        if (p.gold < 8) throw new Error("You need 8 gold.");
        p.gold -= 8;
        p.tonics++;
        append(p, "You bought a Healing Tonic.");
        return;
      case "buy-pouch":
        if (!addPouch(p, arg as keyof typeof pouches)) throw new Error("This pouch requires more room or gold.");
        append(p, "You bought a gold pouch.");
        return;
      case "pouch":
        if (p.gold < 18 || p.inventory.height >= 12) throw new Error("Bag expansion is unavailable.");
        p.gold -= 18;
        p.inventory.height++;
        append(p, "Your bag has another row of space.");
        return;
      case "heal":
        p.hp = maxLife(p);
        append(p, "You rest until your strength returns.");
        return;
      case "repair": {
        const maximum = (item: Profile["inventory"]["items"][number]) =>
          shopItems.find((entry) => entry.id === item.id)?.max_durability ?? maxDurability(item);
        const worn = p.inventory.items.filter(
          (item) => item.durability !== undefined && item.durability < maximum(item),
        );
        if (!worn.length) {
          append(p, "Your equipment is in good repair.");
          return;
        }
        const cost = worn.reduce((sum, item) => sum + Math.ceil((maximum(item) - item.durability!) / 100) * 2, 0);
        if (p.gold < cost) throw new Error(`Repairs cost ${cost} gold.`);
        p.gold -= cost;
        for (const item of worn) item.durability = maximum(item);
        append(p, "The blacksmith repairs your equipment.");
        return;
      }
      case "deposit":
      case "withdraw":
      case "craft": {
        const economy = {
          gold: p.gold,
          bankGold: p.bank,
          health: p.hp,
          tonics: p.tonics,
          materials: p.materials,
        };
        const deposit = action === "deposit";
        const result =
          action === "craft"
            ? craft(economy, arg, maxLife(p))
            : transferGold(economy, arg === "all" ? (deposit ? p.gold : p.bank) : Number(arg), deposit);
        if (!result) throw new Error("You lack the resources or space for that action.");
        p.gold = result.gold;
        p.bank = result.bankGold;
        p.hp = result.health;
        p.materials = result.materials as Profile["materials"];
        append(p, action === "craft" ? `${itemName(arg)} complete.` : "Gold transferred.");
        return;
      }
      case "harvest": {
        const location = `${p.location}:${this.service?.x},${this.service?.y}`;
        const time = Date.now();
        const old = p.harvests[location] ?? { count: 5, at: time };
        const regrown = Math.floor((time - old.at) / 300000);
        const count = Math.min(5, old.count + Math.max(0, regrown));
        if (!count) throw new Error("This tree needs more time to regrow.");
        p.harvests[location] = {
          count: count - 1,
          at: count === 5 ? time : old.at + regrown * 300000,
        };
        p.materials.firewood++;
        append(p, "You collect a piece of firewood.");
        return;
      }
      case "practice": {
        const sword = p.inventory.items.find(
          (item) => item.equipped && item.slot === "main_hand" && (item.durability ?? 1) > 0,
        );
        if (!sword) throw new Error("Equip a usable weapon before practicing.");
        if (p.skills.combat_mastery?.rank === "novice") p.skills = recordTraining(p.skills, ["attack"]);
        append(p, `${sword.name} strikes the practice post.`);
        return;
      }
      case "learn": {
        const skill = skillCatalog[arg];
        if (!skill) return;
        const progress = p.skills[arg];
        const windmill = arg === "windmill";
        if (progress && (!windmill || progress.rank !== "novice")) return;
        if (
          windmill &&
          (this.panel !== "service" ||
            this.service?.id !== "school" ||
            this.serviceMode !== "study" ||
            range(p.position, this.service) > 1 ||
            this.combat)
        )
          return;
        p.skills[arg] = { rank: windmill ? "F" : skill.ranks[0].rank, training: {} };
        append(p, `You learn ${skill.name}${windmill ? " at rank F" : ""}.`);
        return;
      }
      case "advance": {
        const progress = p.skills[arg];
        const next = progress && rankUp(arg, progress, p.ap);
        if (!next) throw new Error("More training or AP is required.");
        p.skills[arg] = next.skill;
        p.ap = next.ap;
        append(p, `${skillCatalog[arg].name} advances to ${next.skill.rank}.`);
        return;
      }
      case "slot": {
        const index = Number(arg);
        if (index >= 0 && index < p.quickSlots.length) p.quickSlots[index] = p.quickSlots[index] ? "" : "tonic";
        return;
      }
      case "treasure": {
        const vault = p.thresholdVersion ? THRESHOLD_ROOM_COUNT : 9;
        if (p.location !== "threshold" || p.room !== vault || p.treasure || !thresholdCleared(p)) return;
        if (Object.keys(p.pending).length) throw new Error("Take the remaining loot before opening a chest.");
        const rewards = [
          { gold: 60, tonic: 3 },
          { gold: 45, cobweb: 6 },
          { gold: 50, cloth: 4 },
          { gold: 70, fish: 8 },
          { gold: 85, fiber: 5 },
        ];
        const chest = rewards[Number(arg ?? "1") - 1];
        if (!chest) return;
        p.treasure = true;
        p.pending = Object.fromEntries(Object.entries(chest)) as Profile["pending"];
        append(p, "The Signal Cache opens. Only one chest may be claimed per run.");
        return;
      }
      case "retreat": {
        const interiorEntrance = p.map?.landmarks.find((place) => place.id === "return");
        if (
          p.location !== "threshold" ||
          p.room !== 1 ||
          this.combat ||
          Object.keys(p.pending).length > 0 ||
          !interiorEntrance ||
          range(p.position, interiorEntrance) > 1
        )
          return;
        this.arriveAtTownLandmark(p, p.thresholdVersion ? "lantern_rest" : p.origin, "dungeon");
        append(p, "You return through the entrance passage.");
        return;
      }
      case "complete": {
        if (p.thresholdVersion) {
          const exit = p.map?.landmarks.find((place) => place.id === "far-exit");
          if (
            p.location !== "threshold" ||
            p.room !== THRESHOLD_ROOM_COUNT ||
            this.combat ||
            !exit ||
            range(p.position, exit) > 1 ||
            !canLeaveForSpindleHollow(p)
          )
            return;
          if (p.origin === "lantern_rest") {
            if (!p.completions) p.completions++;
            if (p.quest === 1) p.quest = 2;
          }
          this.arriveAtTownLandmark(p, "spindle_hollow", "dungeon");
          append(p, "You reach Spindle Hollow.");
          return;
        }
        if (!p.treasure || Object.keys(p.pending).length)
          throw new Error("Collect or leave the treasure before exiting.");
        p.completions++;
        if (p.quest === 1) p.quest = 2;
        arrive(p, p.origin === "lantern_rest" ? "spindle_hollow" : "lantern_rest");
        append(p, `You reach ${townNames[p.location as Town]}.`);
        return;
      }
    }
  }

  private closePanelAfterTransition() {
    this.panel = undefined;
    this.service = undefined;
    this.dialogueView = undefined;
    this.route = [];
  }

  readonly actions: GameActions = {
    navigate: (screen) => {
      if (this.busy) return;
      this.route = [];
      this.panel = undefined;
      this.screen = screen;
      this.error = "";
      if (screen === "title") {
        void this.perform(async () => {
          if (this.combat && this.profile) {
            const p = structuredClone(this.profile.snapshot);
            p.battle = this.combat.snapshot();
            await this.commit(p);
          }
          await this.saves.setSetting("active", null);
        });
      } else this.publish();
    },
    create: (form) => {
      const name = form.name.trim();
      const candidate = { ...form, name };
      void this.perform(async () => {
        if (!validForm(candidate)) throw new Error("Choose a valid name and character appearance.");
        if (this.records.length >= 20) throw new Error("All 20 character slots are occupied.");
        const id = crypto.randomUUID();
        const seed = (crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646) + 1;
        const snapshot = newProfile(candidate, seed);
        syncStacks(snapshot);
        const record = await this.saves.save({ id, name, snapshot }, 0, true);
        this.adopt(record, true);
      });
    },
    load: (id) => {
      void this.perform(async () => {
        const record = await this.saves.load(id);
        if (!record || !validateProfile(record.snapshot)) throw new Error("This character could not be opened.");
        await this.openCharacter(record, true);
      });
    },
    deleteCharacter: (id) => {
      void this.perform(async () => {
        const record = this.records.find((item) => item.id === id);
        if (!record) return;
        await this.saves.delete(id, record.revision);
        this.records = this.records.filter((item) => item.id !== id);
        if (this.profile?.id === id) {
          this.profile = undefined;
          this.combat = undefined;
        }
      });
    },
    panel: (panel) => {
      if (this.screen === "world" && (!panel || !this.busy)) this.openPanel(panel);
    },
    combat: (command) => this.queueCombat(command),
    useQuickSlot: (index) => {
      if (this.profile?.snapshot.quickSlots[index] !== "tonic") return false;
      this.useTonic();
      return true;
    },
    assignSkillSlot: (index, skillId) => {
      const profile = this.profile?.snapshot;
      if (!profile || skillSlotKeys[index] === undefined || (profile.skillSlots?.[index] ?? null) === skillId) return;
      if (skillId !== null && (!Object.hasOwn(profile.skills, skillId) || !Object.hasOwn(skillCommands, skillId)))
        return;
      this.update((p) => {
        p.skillSlots ??= emptySkillSlots();
        p.skillSlots[index] = skillId;
      });
    },
    moveSkillSlot: (from, to) => {
      if (
        from === to ||
        skillSlotKeys[from] === undefined ||
        skillSlotKeys[to] === undefined ||
        !this.profile?.snapshot.skillSlots?.[from]
      )
        return;
      this.update((p) => {
        if (!p.skillSlots) return;
        [p.skillSlots[from], p.skillSlots[to]] = [p.skillSlots[to], p.skillSlots[from]];
      });
    },
    useSkillSlot: (index) => {
      const skill = this.profile?.snapshot.skillSlots?.[index];
      const command = skill ? skillCommands[skill] : undefined;
      if (this.busy || this.screen !== "world" || this.panel || !command || !this.combat?.canQueue(command))
        return false;
      this.queueCombat(command);
      return true;
    },
    target: (id) => {
      const index = Number(id);
      if (this.combat?.enemies[index]?.health) {
        this.combat.target = index;
        this.publish();
      }
    },
    choose: this.choose,
    takeLoot: (ids) => {
      const pending = this.profile?.snapshot.pending;
      if (this.panel !== "loot" || !pending) return;
      const selected = ids ? new Set(ids) : undefined;
      const items = Object.keys(pending).filter((id) => !selected || selected.has(id));
      if (!items.length) return;
      this.update(
        (p) => {
          for (const id of items) {
            const quantity = p.pending[id];
            if (id === "gold") p.gold += quantity;
            else if (id === "tonic") p.tonics += quantity;
            else if (Object.hasOwn(p.materials, id)) p.materials[id as Material] += quantity;
            delete p.pending[id];
          }
          append(p, "You take the loot.");
        },
        () => {
          if (this.panel === "loot" && !Object.keys(this.profile?.snapshot.pending ?? {}).length)
            this.closePanelAfterTransition();
        },
      );
    },
    moveItem: (id, x, y) =>
      this.update((p) => {
        if (this.combat || !moveItem(p.inventory, id, x, y)) throw new Error("This item cannot fit there.");
      }),
    interact: this.interact,
    updateSettings: (values) => {
      const newSettings = { ...this.settings, ...values };
      if (values.bindings) {
        const keys = Object.values(values.bindings).map((key) => key.toLowerCase());
        if (new Set(keys).size !== keys.length || keys.some(reservedKey)) {
          this.error = "That key is already assigned or reserved.";
          this.publish();
          return;
        }
        newSettings.bindings = Object.fromEntries(
          Object.entries(values.bindings).map(([id, key]) => [id, key.toLowerCase()]),
        );
      }
      this.settings = newSettings;
      this.publish();
      void this.saves.setSetting("preferences", newSettings).catch((error) => {
        this.error = String(error);
        this.publish();
      });
    },
  };

  pause = () => {
    this.route = [];
    this.routeTarget = undefined;
  };
}
