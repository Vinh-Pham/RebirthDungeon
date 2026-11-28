import type { EquipmentSlot } from "../game/systems/inventory";
import type { CombatActionDetails } from "../game/systems/combat";
import type { LogEntry } from "../game/core/profile";

export type Screen = "title" | "characters" | "creation" | "arrival" | "world";
export type Panel =
  | "character"
  | "inventory"
  | "skills"
  | "journal"
  | "log"
  | "gates"
  | "settings"
  | "service"
  | "loot";
export type CombatCommand = "attack" | "defend" | "smash" | "counterattack" | "windmill" | "tonic";
export const skillSlotKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;
export type SkillCategory = "combat" | "magic" | "life";
export interface Point {
  x: number;
  y: number;
}
export interface CharacterForm {
  name: string;
  race: number;
  gender: number;
  age: number;
  talent: number;
  body: number;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  eyeColor: number;
  face: number;
}
export interface ActionOption {
  id: string;
  label: string;
  disabled?: boolean;
}
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  amount?: number;
  texture?: string;
  equipped?: boolean;
  equipmentSlot?: EquipmentSlot;
  canOffHand?: boolean;
}
export interface CharacterStatGroup {
  title: string;
  stats: { label: string; value: string }[];
}

export interface CharacterSheet {
  age: string;
  race: string;
  talent: string;
  ap: number;
  levelCap: number;
  totalXp: number;
  groups: Record<"attributes" | "defense" | "combat" | "magic" | "gathering", CharacterStatGroup>;
}

export interface GameView {
  screen: Screen;
  busy: boolean;
  error: string;
  characters: { id: string; name: string; detail: string }[];
  player?: {
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    wounds?: number;
    deadly?: boolean;
    mp: number;
    maxMp: number;
    stamina: number;
    maxStamina: number;
    xpInLevel: number;
    xpToAdvance: number;
  };
  location: string;
  locationDetail: string;
  nearby?: string;
  log: LogEntry[];
  arrival: { text: string; options: ActionOption[] };
  encounter?: {
    enemyRoom?: number;
    enemyId?: string;
    actionDetails: CombatActionDetails[];
    available: CombatCommand[];
    queued?: CombatCommand;
    target?: string;
    enemies: {
      id: string;
      mapEnemyId?: string;
      name: string;
      hp: number;
      maxHp: number;
      intent: string;
      position: Point;
    }[];
  };
  loadedSkill?: Exclude<CombatCommand, "attack" | "tonic">;
  skillCooldowns: Partial<Record<Exclude<CombatCommand, "tonic">, number>>;
  availableSkills: Exclude<CombatCommand, "tonic">[];
  panel?: Panel;
  characterSheet?: CharacterSheet;
  details: { title: string; body: string; options: ActionOption[] };
  loot: { id: string; name: string; count: number; icon?: string }[];
  inventory: {
    width: number;
    height: number;
    items: InventoryItem[];
    equipment: Partial<Record<EquipmentSlot, InventoryItem>>;
    tonics: number;
    quickSlots: boolean[];
  };
  skillSlots: (string | null)[];
  skills: {
    id: string;
    label: string;
    rank: string;
    category: SkillCategory;
    training: number;
    description: string;
    canAdvance: boolean;
    command?: Exclude<CombatCommand, "tonic">;
    cooldown?: number;
  }[];
  settings: {
    reducedMotion: boolean;
    showLogTimestamps: boolean;
    bindings: Record<string, string>;
  };
}
export interface GameActions {
  navigate: (screen: Screen) => void;
  create: (form: CharacterForm) => void;
  load: (id: string) => void;
  deleteCharacter: (id: string) => void;
  panel: (panel?: Panel) => void;
  combat: (command: CombatCommand) => void;
  useQuickSlot: (index: number) => boolean;
  assignSkillSlot: (index: number, skillId: string | null) => void;
  moveSkillSlot: (from: number, to: number) => void;
  useSkillSlot: (index: number) => boolean;
  target: (id: string) => void;
  attackEnemy: (id: string) => void;
  choose: (id: string) => void;
  takeLoot: (ids?: readonly string[]) => void;
  moveItem: (id: string, x: number, y: number) => void;
  interact: () => void;
  updateSettings: (values: Partial<GameView["settings"]>) => void;
}
