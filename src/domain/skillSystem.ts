import type { Immutable } from 'immer';
import type { Character, Stats, ActionSnapshot } from './model';
import { items } from './catalog';
import { skills, ranks, skillRank, trainingPoints } from './skillCatalog';
export const learned = (c: Immutable<Character>) => c.run?.baseline?.skills ?? c.skills;
export const rankIndex = (c: Immutable<Character>, id: string) =>
    learned(c)[id] ? ranks.indexOf(learned(c)[id].rank) : -1;
export function equipment(c: Immutable<Character>) {
    const loadout = c.run?.baseline ?? c;
    const main = c.inventory.find((i) => i.id === loadout.weapon),
        off = c.inventory.find((i) => i.id === loadout.offhand),
        body = c.inventory.find((i) => i.id === loadout.armor);
    const weapon = main && items[main.kind],
        offDef = off && items[off.kind],
        armor = body && items[body.kind];
    const sword = !!main && ['sword', 'steel'].includes(main.kind);
    const dual = sword && !!off && main!.id !== off.id && ['sword', 'steel'].includes(off.kind);
    return {
        main,
        off,
        weapon,
        offDef,
        armor,
        sword,
        dual,
        melee: !weapon || weapon.talent === 'Close Combat',
    };
}
export function requirementReason(c: Immutable<Character>, id: string): string {
    const s = skills[id];
    if (!s) return 'Unavailable';
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
export function progressionStats(c: Immutable<Character>): Stats {
    return Object.fromEntries(
        Object.keys(c.base).map((k) => [k, c.base[k as keyof Stats] + c.growth[k as keyof Stats]]),
    ) as unknown as Stats;
}
export function effectiveStats(c: Immutable<Character>): Stats {
    const result = { ...(c.run?.baseline?.stats ?? progressionStats(c)) };
    const mastery = rankIndex(c, 'combatMastery');
    if (mastery >= 0) result.hp += 5 + 2 * mastery;
    if (equipment(c).armor?.armorCategory === 'heavy')
        result.dex = Math.floor(
            result.dex *
                (1 - (20 - Math.min(20, 2 * Math.max(0, rankIndex(c, 'heavyMastery')))) / 100),
        );
    return result;
}
export function refreshStats(c: Character) {
    c.stats = effectiveStats(c);
    for (const pool of ['hp', 'mana', 'stamina'] as const)
        c[pool] = Math.min(c[pool], c.stats[pool]);
}
export function defenses(c: Immutable<Character>, magic = false) {
    const e = equipment(c);
    let defense = (magic ? e.armor?.magicDefense : e.armor?.defense) ?? 0;
    defense += (magic ? e.offDef?.magicDefense : e.offDef?.defense) ?? 0;
    let protection = 0;
    for (const id of ['shieldMastery', 'lightMastery', 'heavyMastery']) {
        const r = rankIndex(c, id);
        if (r < 0 || requirementReason(c, id)) continue;
        defense += id === 'heavyMastery' ? 2 + 2 * r : 1 + r;
        protection += id === 'lightMastery' ? 1 + Math.floor(r / 2) : 1 + r;
    }
    return { defense, protection: Math.min(1, protection / 100) };
}
export function attackInputs(c: Immutable<Character>, id: string) {
    const e = equipment(c),
        stats = effectiveStats(c),
        s = skills[id];
    const talent = s.talent ?? e.weapon?.talent ?? 'Close Combat';
    const melee = talent === 'Close Combat',
        sword = melee && e.sword,
        dual = melee && e.dual;
    const power =
        (e.weapon?.power ?? 2) * (e.main?.durability === 0 ? 0.5 : 1) +
        (dual ? (e.offDef?.power ?? 0) * 0.5 * (e.off?.durability === 0 ? 0.5 : 1) : 0);
    const attribute =
        talent === 'Magic'
            ? stats.int
            : talent === 'Archery'
              ? stats.dex
              : talent === 'Dual Gun'
                ? (stats.str + stats.int) / 2
                : stats.str;
    let attack = power + attribute / 10;
    for (const [sid, eligible] of [
        ['combatMastery', melee],
        ['swordMastery', sword],
        ['dualMastery', dual],
    ] as const) {
        const r = rankIndex(c, sid);
        if (eligible && r >= 0) attack += 1 + r;
    }
    if (melee) attack += c.effects.final?.magnitude ?? 0;
    return { attack, melee, sword, dual, magic: talent === 'Magic' };
}
export function usableReason(c: Immutable<Character>, id: string): string {
    if (!skills[id] || !learned(c)[id] || skills[id].type !== 'active')
        return 'Skill is not learned';
    const reason = requirementReason(c, id);
    if (reason) return reason;
    if (c.cooldowns[id] > 0) return `Cooldown: ${c.cooldowns[id]} activation(s)`;
    if (id === 'final' && c.effects.final) return 'Final Hit is already active';
    const rank = skillRank(id, learned(c)[id]);
    for (const pool of ['hp', 'mana', 'stamina'] as const)
        if (c[pool] - rank.costs[pool] < (pool === 'hp' ? 1 : 0)) return `Not enough ${pool}`;
    return '';
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
        rank = skillRank(id, learned(c)[id]),
        inputs = attackInputs(c, id);
    const enemies = c.battle!.enemies.filter(
        (e) => e.hp > 0 && (s.target === 'all' || e.id === target),
    );
    if (s.target !== 'self' && !enemies.length) throw new Error('Choose a living enemy.');
    const critical = rankIndex(c, 'critical');
    return {
        id: `${c.run?.id}:${c.battle!.room}:${c.battle!.turn}`,
        combatVersion: 2,
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
                          defense: (inputs.magic ? e.magicDefense : e.defense) ?? 0,
                          protection: (inputs.magic ? e.magicProtection : e.protection) ?? 0,
                      })),
        criticalChance: critical >= 0 ? 1000 : 0,
        criticalBonus: critical >= 0 ? (25 + 5 * critical) / 100 : 0,
        costs: { ...rank.costs },
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
    const cost = skillRank(id, p).ap;
    if (c.ap < cost) throw new Error(`Requires ${cost} AP.`);
    c.ap -= cost;
    c.skills[id] = { rank: ranks[r + 1], counts: {} };
    refreshStats(c);
}
export function passiveDescription(c: Immutable<Character>, id: string, rank = rankIndex(c, id)) {
    const r = Math.max(0, rank);
    switch (id) {
        case 'combatMastery':
            return `+${5 + 2 * r} Max HP; +${1 + r} melee attack`;
        case 'swordMastery':
        case 'dualMastery':
            return `+${1 + r} eligible melee attack`;
        case 'critical':
            return `10% critical chance; +${25 + 5 * r}% critical damage`;
        case 'heavyMastery':
            return `+${2 + 2 * r} defenses; +${1 + r}% protections; ${Math.min(20, 2 * r)}% DEX penalty relief`;
        case 'lightMastery':
            return `+${1 + r} defenses; +${1 + Math.floor(r / 2)}% protections`;
        case 'shieldMastery':
            return `+${1 + r} defenses; +${1 + r}% protections`;
        default:
            return '';
    }
}
