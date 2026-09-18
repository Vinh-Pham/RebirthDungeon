import type { Immutable } from 'immer';
import type { Character, Stats, ActionSnapshot } from './model';
import { wikiValue } from './skills/wiki';
import { resolveStats, equipment, enemyStats } from './stats/resolve';
import { effectiveCosts, affordability } from './stats/resources';
export { equipment, progressionStats } from './stats/resolve';
import { skills, ranks, skillRank, trainingPoints } from './skillCatalog';
export const learned = (c: Immutable<Character>) => c.run?.baseline?.skills ?? c.skills;
export const rankIndex = (c: Immutable<Character>, id: string) =>
    learned(c)[id] ? ranks.indexOf(learned(c)[id].rank) : -1;
export function requirementReason(c: Immutable<Character>, id: string): string {
    const s = skills[id];
    if (!s) return 'Unavailable';
    if (s.route === 'reference') return 'Catalog reference only';
    if (s.races && !s.races.includes(c.race))
        return `Available to ${s.races.join(' and ')} characters`;
    const e = equipment(c);
    const ok = {
        any: true,
        melee: !!e.weapon && e.melee,
        sword: e.sword,
        dual: e.dual,
        shield: e.offDef?.type === 'shield',
        light: e.armor?.armorCategory === 'light',
        heavy: e.armor?.armorCategory === 'heavy',
        bow: e.weapon?.talent === 'Archery',
        guns: e.weapon?.talent === 'Dual Gun',
        magic: e.weapon?.talent === 'Magic',
    }[s.requirement];
    return ok
        ? ''
        : `Requires ${{ any: 'equipment', melee: 'a melee weapon', sword: 'a sword', dual: 'dual swords', shield: 'a shield', light: 'light armor', heavy: 'heavy armor', bow: 'a bow', guns: 'dual guns', magic: 'a wand' }[s.requirement]}`;
}
export function effectiveStats(c: Immutable<Character>): Stats {
    return resolveStats(c).primary;
}
export function refreshStats(c: Character) {
    c.stats = effectiveStats(c);
    for (const pool of ['hp', 'mana', 'stamina'] as const)
        c[pool] = Math.max(0, Math.min(c[pool], c.stats[pool]));
}
export function defenses(c: Immutable<Character>, magic = false) {
    const values = resolveStats(c).values;
    return {
        defense: magic ? values.magicDefense : values.defense,
        protection: (magic ? values.magicProtection : values.protection) / 100,
    };
}
export function attackInputs(c: Immutable<Character>, id: string) {
    const e = equipment(c),
        s = skills[id];
    const talent = s.talent ?? e.weapon?.talent ?? 'Close Combat';
    const values = resolveStats(c).values;
    return {
        attack:
            talent === 'Magic'
                ? values.magicAttack
                : talent === 'Archery'
                  ? values.rangedAttack
                  : talent === 'Dual Gun'
                    ? values.dualGunAttack
                    : values.meleeAttack,
        melee: talent === 'Close Combat',
        sword: talent === 'Close Combat' && e.sword,
        dual: talent === 'Close Combat' && e.dual,
        magic: talent === 'Magic',
    };
}
export function usableReason(c: Immutable<Character>, id: string): string {
    if (!skills[id] || !learned(c)[id] || skills[id].type !== 'active')
        return 'Skill is not learned';
    const reason = requirementReason(c, id);
    if (reason) return reason;
    if (c.cooldowns[id] > 0) return `Cooldown: ${c.cooldowns[id]} activation(s)`;
    if (id === 'final' && c.effects.final) return 'Final Hit is already active';
    const rank = skillRank(id, learned(c)[id], c.race);
    const costs = actionCosts(c, id, rank);
    return affordability(c, costs);
}
export function snapshotAction(
    c: Immutable<Character>,
    id: string,
    target: string,
    validate = true,
): ActionSnapshot {
    if (validate) {
        const reason = usableReason(c, id);
        if (reason) throw new Error(reason);
    }
    const s = skills[id],
        rank = skillRank(id, learned(c)[id], c.race),
        inputs = attackInputs(c, id);
    const enemies = c.battle!.enemies.filter(
        (e) => e.hp > 0 && (s.target === 'all' || e.id === target),
    );
    if (s.target !== 'self' && !enemies.length) throw new Error('Choose a living enemy.');
    const critical = rankIndex(c, 'critical');
    return {
        id: `${c.run?.id}:${c.battle!.room}:${c.battle!.turn}`,
        combatVersion: 2,
        statsVersion: 1,
        skill: id,
        rank: structuredClone(rank),
        ...inputs,
        targets:
            s.target === 'self'
                ? []
                : enemies
                      .sort((a, b) => a.id.localeCompare(b.id))
                      .map((e) => ({
                          id: e.id,
                          defense: inputs.magic
                              ? enemyStats(e).magicDefense
                              : enemyStats(e).defense,
                          protection: inputs.magic
                              ? enemyStats(e).magicProtection
                              : enemyStats(e).protection,
                      })),
        criticalChance: critical >= 0 ? 1000 : 0,
        criticalBonus:
            critical >= 0
                ? wikiValue(skills.critical.wiki, 'Additional Damage', critical, c.race) / 100
                : 0,
        costs: actionCosts(c, id, rank),
    };
}
export function train(c: Character, id: string, objective: string, amount = 1) {
    const p = c.skills[id];
    if (!p || id === 'normal' || p.rank === '1') return;
    const rule = skillRank(id, p).objectives.find((o) => o.id === objective);
    if (!rule) return;
    p.counts[objective] = Math.min(rule.cap, (p.counts[objective] ?? 0) + amount);
}
export function learn(c: Character, id: string) {
    if (!skills[id] || id === 'normal') throw new Error('Unavailable skill.');
    if (c.skills[id]) throw new Error('Skill already learned.');
    const reason = requirementReason(c, id);
    if (reason) throw new Error(reason);
    c.skills[id] = { rank: 'F', counts: {} };
    refreshStats(c);
}
export function advance(c: Character, id: string) {
    const p = c.skills[id];
    if (!p || id === 'normal') throw new Error('Learn this skill first.');
    const r = ranks.indexOf(p.rank);
    if (r === 14) throw new Error('Max Rank');
    if (trainingPoints(id, p) < 100) throw new Error('Requires 100 training points.');
    const cost = skillRank(id, p, c.race).ap;
    if (c.ap < cost) throw new Error(`Requires ${cost} AP.`);
    c.ap -= cost;
    c.skills[id] = { rank: ranks[r + 1], counts: {} };
    refreshStats(c);
}
export function passiveDescription(c: Immutable<Character>, id: string, rank = rankIndex(c, id)) {
    const r = Math.max(0, rank);
    if (skills[id].wiki) {
        return skills[id].wiki.rows
            .filter(
                (row) =>
                    row.label.startsWith('Additional ') &&
                    (!/Human|Elf|Giant/.test(row.label) || row.label.includes(c.race)),
            )
            .map((row) => `${row.label}: ${row.values[r]}`)
            .join('; ');
    }
    const value = skills[id].ranks[r].base;
    if (id === 'dualMastery') return `+${value} eligible melee attack`;
    if (id === 'shieldMastery') return `+${value} defenses; +${value}% protections`;
    return '';
}

export function actionCosts(
    c: Immutable<Character>,
    id: string,
    rank = skillRank(id, learned(c)[id], c.race),
) {
    const costs = { ...rank.costs };
    if (id === 'shockwave')
        costs.mana = Math.ceil(
            (effectiveStats(c).mana *
                wikiValue(skills[id].wiki, 'Mana Usage', ranks.indexOf(rank.rank), c.race)) /
                100,
        );
    return skills[id].type === 'active' && skills[id].route !== 'reference'
        ? effectiveCosts(c, id, costs)
        : costs;
}
