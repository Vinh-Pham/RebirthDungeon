import { freeze } from 'immer';
import type { Race } from './model';
import {
    ranks,
    type Skill,
    type Rank,
    type SkillProgress,
    type RankDefinition,
} from './skills/types';
export * from './skills/types';
import normal from './skills/normal-attack';
import shot from './skills/power-shot';
import double from './skills/double-shot';
import windmill from './skills/windmill';
import final from './skills/final-hit';
import shieldMastery from './skills/shield-mastery';
import dualMastery from './skills/dual-wield-mastery';
import ice from './skills/icebolt';
import combatMastery from './skills/combat-mastery';
import counter from './skills/counterattack';
import critical from './skills/critical-hit';
import heavyMastery from './skills/heavy-armor-mastery';
import lightMastery from './skills/light-armor-mastery';
import swordMastery from './skills/sword-mastery';
import smash from './skills/smash';
import arrowRevolver from './skills/arrow-revolver';
import blacksmithing from './skills/blacksmithing';
import bowMastery from './skills/bow-mastery';
import campfire from './skills/campfire';
import carpentry from './skills/carpentry';
import defense from './skills/defense';
import firebolt from './skills/firebolt';
import firstAid from './skills/first-aid';
import fishing from './skills/fishing';
import hailstorm from './skills/hailstorm';
import handicraft from './skills/handicraft';
import healing from './skills/healing';
import herbalism from './skills/herbalism';
import iceSpear from './skills/ice-spear';
import lightningBolt from './skills/lightning-bolt';
import magicMastery from './skills/magic-mastery';
import magnumShot from './skills/magnum-shot';
import manaRegeneration from './skills/mana-regeneration';
import manaShield from './skills/mana-shield';
import meteorStrike from './skills/meteor-strike';
import potionMaking from './skills/potion-making';
import rangeAttack from './skills/range-attack';
import shockwave from './skills/shockwave';
import thunder from './skills/thunder';
import wandMastery from './skills/wand-mastery';
import arcaneFocus from './skills/arcane-focus';
import bloodStrike from './skills/blood-strike';
export const skills: Record<string, Skill> = {
    arcaneFocus,
    bloodStrike,
    wandMastery,
    normal,
    shot,
    double,
    windmill,
    final,
    shieldMastery,
    dualMastery,
    ice,
    combatMastery,
    counter,
    critical,
    heavyMastery,
    lightMastery,
    swordMastery,
    smash,
    arrowRevolver,
    blacksmithing,
    bowMastery,
    campfire,
    carpentry,
    defense,
    firebolt,
    firstAid,
    fishing,
    hailstorm,
    handicraft,
    healing,
    herbalism,
    iceSpear,
    lightningBolt,
    magicMastery,
    magnumShot,
    manaRegeneration,
    manaShield,
    meteorStrike,
    potionMaking,
    rangeAttack,
    shockwave,
    thunder,
};
export const skillRank = (
    id: string,
    progress?: { readonly rank: Rank },
    race: Race = 'Human',
): RankDefinition =>
    (skills[id].ranksByRace?.[race] ?? skills[id].ranks)[ranks.indexOf(progress?.rank ?? 'F')];
export function trainingPoints(id: string, progress: Readonly<SkillProgress>): number {
    return skillRank(id, progress).objectives.reduce(
        (sum, o) => sum + Math.min(o.cap, progress.counts[o.id] ?? 0) * o.points,
        0,
    );
}

freeze(skills, true);
