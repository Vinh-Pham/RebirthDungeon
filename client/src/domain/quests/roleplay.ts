import { seedRng } from '../rng';
import { initializeInventory } from '../inventory';
import { emptyEquipment } from '../model';
import type { Immutable } from 'immer';
import { zeroStats, type Character, type SaveData } from '../model';
import { startingStats } from '../progression';
import { refreshStats, progressionStats } from '../skillSystem';
import { createStatSnapshot } from '../stats/resolve';
import { emptyJournal, emptyRunQuests, type RpSession } from './types';

export function controlledCharacter(save: Immutable<SaveData>): Immutable<Character> | undefined {
    const hero = save.data.characters.find((c) => c.id === save.data.activeId);
    return hero?.rp?.actor ?? hero;
}
export function createMemory(attemptId: string): RpSession {
    const stats = startingStats('Close Combat');
    const actor: Character = {
        id: `aren:${attemptId}`,
        role: 'aren',
        name: 'Aren',
        race: 'Human',
        talent: 'Close Combat',
        age: 17,
        level: 1,
        xp: 0,
        totalLevel: 1,
        ap: 0,
        base: { ...stats },
        growth: zeroStats(),
        stats: { ...stats },
        hp: stats.hp,
        mana: stats.mana,
        stamina: stats.stamina,
        gold: 0,
        bankGold: 0,
        inventory: [
            { id: 'aren-sword', kind: 'sword', count: 1, durability: 20 },
            { id: 'aren-potions', kind: 'hp', count: 2 },
        ],
        bank: [],
        equipment: { ...emptyEquipment(), main: 'aren-sword' },
        placements: {},
        inventoryRecovery: [],
        skills: {
            normal: { rank: 'F', counts: {} },
            combatMastery: { rank: 'F', counts: {} },
            defense: { rank: 'F', counts: {} },
            smash: { rank: 'F', counts: {} },
            counter: { rank: 'F', counts: {} },
        },
        collection: [],
        cooldowns: {},
        effects: {},
        createdAt: 0,
        rebornAt: 0,
        agedAt: 0,
        run: null,
        battle: null,
        reward: null,
        checkpoint: 'exploring',
        tutorial: 0,
        statuses: [],
        titleModifiers: {},
        quests: emptyJournal(),
        rp: null,
    };
    initializeInventory(actor);
    refreshStats(actor);
    actor.hp = actor.stats.hp;
    actor.mana = actor.stats.mana;
    actor.stamina = actor.stats.stamina;
    const rooms = [
        { id: 0, x: 6, y: 8, kind: 'entry' as const, required: false, trigger: 'spider' as const },
        {
            id: 1,
            x: 17,
            y: 8,
            kind: 'encounter' as const,
            required: true,
            trigger: 'spider' as const,
        },
        {
            id: 2,
            x: 28,
            y: 8,
            kind: 'encounter' as const,
            required: true,
            trigger: 'spider' as const,
        },
        { id: 3, x: 39, y: 8, kind: 'exit' as const, required: false, trigger: 'switch' as const },
    ];
    const tiles = Array.from({ length: 18 }, (_, y) =>
        Array.from({ length: 46 }, (_, x) => Number(y >= 4 && y <= 12 && x >= 2 && x <= 43)),
    );
    actor.run = {
        id: `memory:${attemptId}`,
        seed: 7319,
        tiles,
        rooms,
        cleared: [],
        visited: [0],
        x: 208,
        y: 272,
        chosen: null,
        chests: [],
        quests: emptyRunQuests(),
        pageRewards: 0,
        baseline: {
            contentVersion: 2,
            skills: structuredClone(actor.skills),
            stats: progressionStats(actor),
            equipment: { ...actor.equipment },
            statSnapshot: createStatSnapshot(actor),
        },
    };
    return { version: 1, scenario: 'aren-memory', attemptId, rng: seedRng(7319), actor };
}