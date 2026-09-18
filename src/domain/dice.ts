export function nextRandom(seed: number): [number, number] {
    const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return [next, next / 4294967296];
}
export function roll(
    seed: number,
    dice: number[] = [],
    held: readonly boolean[] = [],
    weights: readonly number[] = [1, 1, 1, 1, 1, 1],
): { seed: number; dice: number[] } {
    if (
        weights.length !== 6 ||
        weights.some((w) => !Number.isSafeInteger(w) || w < 0) ||
        !weights.some((w) => w > 0)
    )
        throw new Error('Invalid dice weights.');
    const total = weights.reduce((a, b) => a + b, 0);
    const result: number[] = [];
    for (let i = 0; i < 5; i++) {
        if (held[i] && dice[i]) result.push(dice[i]);
        else {
            let value;
            [seed, value] = nextRandom(seed);
            let sample = value * total,
                face = 0;
            while (face < 5 && sample >= weights[face]) sample -= weights[face++];
            result.push(face + 1);
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
    if (counts[0] === 5) return { name: 'Five of a kind', multiplier: 10 };
    if (unique === '12345' || unique === '23456') return { name: 'Straight', multiplier: 3 };
    if (counts[0] === 4) return { name: 'Four of a kind', multiplier: 5 };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'Full house', multiplier: 3.5 };
    if (counts[0] === 3) return { name: 'Three of a kind', multiplier: 2.5 };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'Two pairs', multiplier: 2 };
    if (counts[0] === 2) return { name: 'Pair', multiplier: 1.5 };
    return { name: 'Chance', multiplier: 1 };
}
export { previewDamage as attackDamage } from './combat';
