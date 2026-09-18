import { freeze } from 'immer';
import { statIds, type StatId } from './types';

/** Rebirth Dungeon balance v1, not Mabinogi weapon ratios or Protection ratings. */
export const statRules = freeze(
    {
        version: 1 as const,
        maxAmount: 1_000_000,
        maxDuration: 1000,
        maxSources: 128,
        maxModifiers: 64,
        // Retain talent attack scaling; author defensive roles for STR, WIL, and INT.
        meleePerStr: 0.1,
        rangedPerDex: 0.1,
        magicPerInt: 0.1,
        dualPerStr: 0.05,
        dualPerInt: 0.05,
        defensePerStr: 0.05,
        magicDefensePerWill: 0.05,
        magicProtectionPerInt: 0.05,
        // Resource maxima retain their explicit progression values; no hidden attribute gains.
        hpPerStr: 0,
        manaPerInt: 0,
        staminaPerWill: 0,
    },
    true,
);

export const statLabels: Record<StatId, string> = {
    hp: 'Max HP',
    mana: 'Max MP',
    stamina: 'Max SP',
    str: 'Strength',
    int: 'Intelligence',
    dex: 'Dexterity',
    will: 'Will',
    luck: 'Luck',
    meleeAttack: 'Melee Attack',
    rangedAttack: 'Ranged Attack',
    magicAttack: 'Magic Attack',
    dualGunAttack: 'Dual Gun Attack',
    defense: 'Defense',
    magicDefense: 'Magic Defense',
    protection: 'Protection',
    magicProtection: 'Magic Protection',
    hpRegen: 'HP regeneration',
    manaRegen: 'MP regeneration',
    staminaRegen: 'SP regeneration',
};
export const emptyCombatStats = () =>
    Object.fromEntries(statIds.map((id) => [id, 0])) as Record<StatId, number>;
export const isPercentage = (id: StatId) => id === 'protection' || id === 'magicProtection';
export function statBound(id: StatId) {
    return { min: id === 'hp' ? 1 : 0, max: isPercentage(id) ? 100 : statRules.maxAmount };
}
