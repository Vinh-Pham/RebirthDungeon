import { xoroshiro128plus, xoroshiro128plusFromState } from 'pure-rand/generator/xoroshiro128plus';
import { uniformInt } from 'pure-rand/distribution/uniformInt';
import { z } from 'zod';
import type { Immutable } from 'immer';

export const rngSchema = z.strictObject({
    formatVersion: z.literal(1),
    algorithm: z.literal('xoroshiro128plus'),
    state: z
        .array(z.number().int().min(-2147483648).max(2147483647))
        .length(4)
        .refine((words) => words.some((word) => word !== 0)),
});
export type RngState = z.infer<typeof rngSchema>;
export interface BattleRng {
    int(min: number, max: number): number;
    chance(probability: number): boolean;
    snapshot(): RngState;
}
export function createRng(source: number | Immutable<RngState>): BattleRng {
    const generator =
        typeof source === 'number'
            ? xoroshiro128plus(source)
            : xoroshiro128plusFromState(rngSchema.parse(source).state);
    return {
        int(min, max) {
            if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max)
                throw new Error('Invalid random range.');
            return uniformInt(generator, min, max);
        },
        chance(probability) {
            if (!Number.isFinite(probability) || probability < 0 || probability > 1)
                throw new Error('Invalid probability.');
            if (probability === 0 || probability === 1) return probability === 1;
            return uniformInt(generator, 0, 999999) < Math.floor(probability * 1000000);
        },
        snapshot: () => ({
            formatVersion: 1,
            algorithm: 'xoroshiro128plus',
            state: [...generator.getState()],
        }),
    };
}
export const seedRng = (seed: number): RngState => createRng(seed).snapshot();
export function nextRandom(state: Immutable<RngState>): [RngState, number] {
    const rng = createRng(state);
    const value = rng.int(0, 0xffffffff) / 0x100000000;
    return [rng.snapshot(), value];
}
/** Version-one derivation: FNV-1a over stable battle identity, XOR the legacy seed. */
export function battleSeed(seed: number, identity: string): number {
    let hash = 2166136261;
    for (let i = 0; i < identity.length; i++)
        hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619);
    return hash ^ seed;
}