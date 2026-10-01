import skillBookRecipes from './skill-books/basic.json';
import worlds from './worlds/basic.json';
import enchants from './enchants/basic.json';
import enchantingRules from './enchants/rules.json';
import enchantSkills from './skills/enchant.json';
import skills from './skills/basic.json';
import enemies from './enemies/basic.json';
import classes from './classes/basic.json';
import items from './items/basic.json';
import statusEffects from './status-effects/basic.json';
import maps from './maps/basic.json';
import atlases from './atlases/basic.json';
import dungeons from './dungeons/basic.json';
import shops from './shops/basic.json';
import quests from './quests/basic.json';
import titles from './titles/basic.json';
import { ContentRegistry } from '../engine/data/ContentRegistry';

export function loadGameContent(): ContentRegistry {
  return new ContentRegistry({ enchants, enchantingRules, skills: [...skills, ...enchantSkills], enemies, classes, items, statusEffects, maps, atlases, worlds, dungeons, shops, skillBookRecipes, quests, titles, questFlags: ['seal-witnessed'] });
}
