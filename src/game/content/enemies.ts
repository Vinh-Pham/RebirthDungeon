import type { Combatant } from "../systems/combat";
import type { WolfKind } from "../world/world";
export interface DungeonEnemy extends Combatant {
  sprite: number;
  experience: number;
  drops_cobweb?: boolean;
  boss?: boolean;
}
/** Authored baseline values from game/data/enemies/dungeon.lua. */
export const dungeonEnemies: Record<string, DungeonEnemy> = {
  glass_mite: {
    name: "Glass Mite",
    sprite: 16,
    health: 15,
    damage_min: 3,
    damage_max: 5,
    defense: 0,
    experience: 16,
    drops_cobweb: true,
  },
  cinder_crawler: {
    name: "Cinder Crawler",
    sprite: 13,
    health: 19,
    damage_min: 4,
    damage_max: 6,
    defense: 0,
    experience: 20,
    drops_cobweb: true,
  },
  shale_stalker: {
    name: "Shale Stalker",
    sprite: 5,
    health: 23,
    damage_min: 4,
    damage_max: 7,
    defense: 1,
    experience: 24,
    drops_cobweb: true,
  },
  coil_sentinel: {
    name: "Coil Sentinel",
    sprite: 3,
    health: 27,
    damage_min: 5,
    damage_max: 8,
    defense: 1,
    experience: 30,
  },
  vault_warden: {
    name: "Vault Warden",
    sprite: 36,
    health: 72,
    damage_min: 7,
    damage_max: 11,
    defense: 2,
    experience: 110,
    boss: true,
  },
};

interface Wolf extends Combatant {
  experience: number;
  gold: readonly [min: number, max: number];
}

// Mabinogi World Wiki, Wolf (Family), normal Gray Wolf and White Wolf.
export const wolves: Record<WolfKind, Wolf> = {
  gray_wolf: {
    name: "Gray Wolf",
    health: 90,
    damage_min: 12,
    damage_max: 17,
    defense: 1,
    protection: 0,
    experience: 93,
    gold: [11, 50],
  },
  white_wolf: {
    name: "White Wolf",
    health: 160,
    damage_min: 10,
    damage_max: 30,
    defense: 1,
    protection: 0,
    experience: 110,
    gold: [20, 80],
  },
};

export const isWolfKind = (sprite: string): sprite is WolfKind => Object.hasOwn(wolves, sprite);
