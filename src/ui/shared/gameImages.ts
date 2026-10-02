/** Static requires let Metro bundle artwork for offline use on every platform. */
export type GameImageKind = 'skill' | 'item';
export type GameImageReference = { kind: GameImageKind; id: string };

export const NO_GAME_IMAGE: number = require('../../../assets/game/no-image.jpg');

const skillImages: Record<string, number> = {
  'arrow-revolver': require('../../../assets/game/skills/arrow-revolver.png'),
  'blacksmithing': require('../../../assets/game/skills/blacksmithing.png'),
  'bow-mastery': require('../../../assets/game/skills/bow-mastery.png'),
  'campfire': require('../../../assets/game/skills/campfire.png'),
  'carpentry': require('../../../assets/game/skills/carpentry.png'),
  'combat-mastery': require('../../../assets/game/skills/combat-mastery.png'),
  'counterattack': require('../../../assets/game/skills/counterattack.png'),
  'critical-hit': require('../../../assets/game/skills/critical-hit.png'),
  'defense': require('../../../assets/game/skills/defense.png'),
  'firebolt': require('../../../assets/game/skills/firebolt.png'),
  'first-aid': require('../../../assets/game/skills/first-aid.png'),
  'fishing': require('../../../assets/game/skills/fishing.png'),
  'hailstorm': require('../../../assets/game/skills/hailstorm.png'),
  'handicraft': require('../../../assets/game/skills/handicraft.png'),
  'healing': require('../../../assets/game/skills/healing.png'),
  'heavy-armor-mastery': require('../../../assets/game/skills/heavy-armor-mastery.png'),
  'herbalism': require('../../../assets/game/skills/herbalism.png'),
  'icebolt': require('../../../assets/game/skills/icebolt.png'),
  'icicle': require('../../../assets/game/skills/icicle.png'),
  'light-armor-mastery': require('../../../assets/game/skills/light-armor-mastery.png'),
  'lightning-bolt': require('../../../assets/game/skills/lightning-bolt.png'),
  'magic-mastery': require('../../../assets/game/skills/magic-mastery.png'),
  'magnum-shot': require('../../../assets/game/skills/magnum-shot.png'),
  'mana-regeneration': require('../../../assets/game/skills/mana-regeneration.png'),
  'mana-shield': require('../../../assets/game/skills/mana-shield.png'),
  'meteor-strike': require('../../../assets/game/skills/meteor-strike.png'),
  'potion-making': require('../../../assets/game/skills/potion-making.png'),
  'range-attack': require('../../../assets/game/skills/range-attack.png'),
  'shockwave': require('../../../assets/game/skills/shockwave.png'),
  'smash': require('../../../assets/game/skills/smash.png'),
  'sword-mastery': require('../../../assets/game/skills/sword-mastery.png'),
  'thunder': require('../../../assets/game/skills/thunder.png'),
  'wand-mastery': require('../../../assets/game/skills/wand-mastery.png'),
};

const itemImages: Record<string, number> = {
  'baseball-bat': require('../../../assets/game/weapons/baseball-bat.png'),
  'beginner-bow': require('../../../assets/game/weapons/beginner-bow.png'),
  'beginner-shield': require('../../../assets/game/weapons/beginner-shield.png'),
  'crossbow': require('../../../assets/game/weapons/crossbow.png'),
  'iron-sword': require('../../../assets/game/weapons/iron-sword.png'),
  'mace': require('../../../assets/game/weapons/mace.png'),
  'short-sword': require('../../../assets/game/weapons/short-sword.png'),
  'apple': require('../../../assets/game/consumables/apple.png'),
  'cheese': require('../../../assets/game/consumables/cheese.png'),
  'egg': require('../../../assets/game/consumables/egg.png'),
  'hp-10-potion': require('../../../assets/game/consumables/hp-10-potion.png'),
  'hp-30-potion': require('../../../assets/game/consumables/hp-30-potion.png'),
  'milk': require('../../../assets/game/consumables/milk.png'),
  'mp-10-potion': require('../../../assets/game/consumables/mp-10-potion.png'),
  'mp-30-potion': require('../../../assets/game/consumables/mp-30-potion.png'),
  'stamina-10-potion': require('../../../assets/game/consumables/stamina-10-potion.png'),
  'stamina-30-potion': require('../../../assets/game/consumables/stamina-30-potion.png'),
};

// Existing content IDs can differ from the artwork filenames; art never defines potency.
const aliases: Record<GameImageKind, Record<string, string>> = {
  skill: { 'elf-ranged-attack': 'range-attack', 'ice-spear': 'icicle' },
  item: { 'iron-blade': 'iron-sword', potion: 'hp-30-potion', 'mana-potion': 'mp-30-potion', 'stamina-potion': 'stamina-30-potion' },
};

export function gameImageSource({ kind, id }: GameImageReference): number {
  const images = kind === 'skill' ? skillImages : itemImages;
  const key = Object.hasOwn(aliases[kind], id) ? aliases[kind][id] : id;
  return Object.hasOwn(images, key) ? images[key] : NO_GAME_IMAGE;
}
