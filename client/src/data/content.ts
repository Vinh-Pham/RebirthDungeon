import skillBookRecipes from './skill-books/basic.json';
import worlds from './worlds/basic.json';
import enchants from './enchants/basic.json';
import enchantingRules from './enchants/rules.json';
import enchantSkills from './skills/enchant.json';
import poisonAttack from './skills/poison-attack.json';
import restSkills from './skills/rest.json';
import skills from './skills/basic.json';
import humanRangedAttack from './skills/human-ranged-attack.json';
import mossHallsEnemies from './enemies/dungeons/moss-halls/basic.json';
import sharedEnemies from './enemies/shared/basic.json';
import spiderNestEnemies from './enemies/dungeons/spider-nest/basic.json';
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
  return new ContentRegistry({
    enchants,
    enchantingRules,
    skills: [...skills, ...enchantSkills, ...humanRangedAttack, ...restSkills, ...poisonAttack],
    enemies: [...mossHallsEnemies, ...sharedEnemies, ...spiderNestEnemies],
    classes,
    items,
    statusEffects,
    maps,
    atlases,
    worlds,
    dungeons,
    shops,
    skillBookRecipes,
    quests,
    titles,
    questFlags: ['seal-witnessed'],
  });
}
