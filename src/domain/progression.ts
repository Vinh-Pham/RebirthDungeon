import type { Character, Stats, Talent } from './model';
import { zeroStats } from './model';
export const baseStats: Stats = {
    hp: 118,
    mana: 98,
    stamina: 113,
    str: 55,
    int: 48,
    dex: 58,
    will: 57,
    luck: 47,
};
const base: Record<Talent, Partial<Stats>> = {
    'Close Combat': { str: 20 },
    Archery: { hp: 5, stamina: 5, dex: 10 },
    Magic: { int: 10, mana: 10 },
    'Dual Gun': { str: 5, int: 5, hp: 5, mana: 5, stamina: 10 },
};
const level: Record<Talent, Partial<Stats>> = {
    'Close Combat': { str: 0.5 },
    Archery: { dex: 0.5 },
    Magic: { int: 0.5 },
    'Dual Gun': { str: 0.25, int: 0.25 },
};
const age: Record<Talent, Partial<Stats>> = {
    'Close Combat': { str: 2, hp: 1 },
    Archery: { dex: 2, stamina: 1 },
    Magic: { int: 2, mana: 1 },
    'Dual Gun': { str: 1, int: 1 },
};
export const startingStats = (talent: Talent): Stats => {
    const s = { ...baseStats };
    for (const [k, v] of Object.entries(base[talent])) s[k as keyof Stats] += v;
    return s;
};
// Replaced with the archived current wiki's level table by scripts/extract-growth.py.
import xpTable from './xp-table.json';
export const xpNeeded = (level: number): number =>
    xpTable[Math.min(199, Math.max(1, level))] || 100;
export function gainXp(c: Character, amount: number) {
    c.xp += amount;
    while (c.level < 200 && c.xp >= xpNeeded(c.level)) {
        c.xp -= xpNeeded(c.level);
        c.level++;
        c.totalLevel++;
        c.ap++;
        for (const [k, v] of Object.entries(level[c.talent])) {
            c.growth[k as keyof Stats] += v;
            c.stats[k as keyof Stats] += v;
        }
    }
    if (c.level === 200) c.xp = 0;
}
const dateFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
});
export function agingBoundaries(from: number, to: number): number[] {
    if (to <= from) return [];
    const found: number[] = [];
    let cursor = Math.floor(from / 3600000) * 3600000 + 3600000;
    for (; cursor <= to; cursor += 3600000) {
        const p = dateFormat.formatToParts(cursor);
        if (
            p.find((p) => p.type === 'weekday')?.value === 'Sat' &&
            p.find((p) => p.type === 'hour')?.value === '12'
        )
            found.push(cursor);
    }
    return found;
}
export function applyAging(c: Character, now: number) {
    for (const _ of agingBoundaries(c.agedAt, now)) {
        void _;
        c.age++;
        c.ap += 5;
        if (c.age <= 20)
            for (const [k, v] of Object.entries(age[c.talent])) {
                c.growth[k as keyof Stats] += v;
                c.stats[k as keyof Stats] += v;
            }
    }
    c.agedAt = Math.max(c.agedAt, now);
}
export const rebirthCooldown = (total: number) =>
    (total < 5000 ? 1 : total < 8000 ? 2 : total < 10000 ? 4 : 6) * 86400000;
export function rebirth(c: Character, talent: Talent, newAge: number, now: number) {
    if (c.run) throw new Error('Abandon your active dungeon before rebirth.');
    if (now < c.rebornAt + rebirthCooldown(c.totalLevel))
        throw new Error('Your next rebirth is not available yet.');
    applyAging(c, now);
    if (newAge < 10 || newAge > 17 || newAge > c.age || !Number.isInteger(newAge))
        throw new Error('Choose a valid rebirth age.');
    if (c.race === 'Giant' && talent === 'Archery')
        throw new Error('Giants cannot choose Archery.');
    c.talent = talent;
    c.age = newAge;
    c.level = 1;
    c.totalLevel++;
    c.xp = 0;
    c.rebornAt = now;
    c.base = startingStats(talent);
    c.stats = { ...c.base };
    c.growth = zeroStats();
    c.hp = c.stats.hp;
    c.mana = c.stats.mana;
    c.stamina = c.stats.stamina;
}
