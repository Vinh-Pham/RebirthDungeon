import { items, skills } from './catalog';
import type { Immutable } from 'immer';
import type { Character, Enemy } from './model';
export function nextRandom(seed: number): [number, number] {
    const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return [next, next / 4294967296];
}
export function roll(
    seed: number,
    dice: number[] = [],
    held: boolean[] = [],
): { seed: number; dice: number[] } {
    const result: number[] = [];
    for (let i = 0; i < 5; i++) {
        if (held[i] && dice[i]) result.push(dice[i]);
        else {
            let value;
            [seed, value] = nextRandom(seed);
            result.push(1 + Math.floor(value * 6));
        }
    }
    return { seed, dice: result };
}
export function combination(dice: readonly number[]): { name: string; multiplier: number } {
    if (dice.length !== 5 || dice.some((x) => !Number.isInteger(x) || x < 1 || x > 6))
        throw new Error('Five six-sided dice are required.');
    const counts = Object.values(
        dice.reduce<Record<number, number>>((a, n) => {
            a[n] = (a[n] || 0) + 1;
            return a;
        }, {}),
    ).sort((a, b) => b - a);
    const unique = [...new Set(dice)].sort().join('');
    if (counts[0] === 5) return { name: 'Five of a kind', multiplier: 5 };
    if (unique === '12345' || unique === '23456')
        return { name: 'Large straight', multiplier: 3.5 };
    if (counts[0] === 4) return { name: 'Four of a kind', multiplier: 3 };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'Full house', multiplier: 2.5 };
    if (['1234', '2345', '3456'].some((x) => unique.includes(x)))
        return { name: 'Small straight', multiplier: 2 };
    if (counts[0] === 3) return { name: 'Three of a kind', multiplier: 1.75 };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'Two pairs', multiplier: 1.5 };
    if (counts[0] === 2) return { name: 'Pair', multiplier: 1.25 };
    return { name: 'Chance', multiplier: 1 };
}
export function attackDamage(
    c: Immutable<Character>,
    enemy: Immutable<Enemy>,
    skillId: string,
    dice: readonly number[],
): number {
    const s = skills[skillId];
    if (!s) throw new Error('Unknown skill.');
    const weapon = c.inventory.find((i) => i.id === c.weapon);
    const def = weapon ? items[weapon.kind] : undefined;
    const talent = s.talent || def?.talent || 'Close Combat';
    const stat =
        talent === 'Magic'
            ? c.stats.int
            : talent === 'Archery'
              ? c.stats.dex
              : talent === 'Dual Gun'
                ? (c.stats.str + c.stats.int) / 2
                : c.stats.str;
    const power = (def?.power || 2) * (weapon?.durability === 0 ? 0.5 : 1);
    return (
        Math.max(
            1,
            Math.floor(
                (power + stat / 10 + dice.reduce((a, b) => a + b, 0) / 5) *
                    s.factor *
                    combination(dice).multiplier,
            ) - enemy.defense,
        ) * s.hits
    );
}
