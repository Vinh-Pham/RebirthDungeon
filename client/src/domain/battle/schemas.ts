import { enemySkills } from './profiles';
import { z } from 'zod';
import { rngSchema } from '../rng';
import { ranks } from '../skills/types';
import { statIds } from '../stats/types';
import type { Character } from '../model';
const id = z.string().min(1);
const amount = z.number().nonnegative();
const integer = z.number().int().nonnegative();
const ids = z.array(id);
const numbers = z.record(z.string(), integer);
const pool = z.enum(['hp', 'mana', 'stamina']);
const stats = z.strictObject({
    hp: amount,
    mana: amount,
    stamina: amount,
    str: z.number(),
    int: z.number(),
    dex: z.number(),
    will: z.number(),
    luck: z.number(),
});
const modifier = z.strictObject({
    stat: z.enum(statIds),
    flat: z.number().optional(),
    percentBp: z.number().int().optional(),
});
const cost = z.strictObject({
    pool,
    skill: id.optional(),
    flat: z.number().optional(),
    percentBp: z.number().int().optional(),
});
const source = z.strictObject({
    id,
    name: id,
    kind: z.enum(['equipment', 'skill', 'title', 'status']),
    modifiers: z.array(modifier),
    costs: z.array(cost).optional(),
});
const periodicFields = {
    pool,
    amount: integer,
    damageType: z.enum(['physical', 'magic', 'true']).optional(),
};
const periodic = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('damage'), ...periodicFields }),
    z.strictObject({ kind: z.literal('restore'), ...periodicFields }),
]);
export const statusDefinitionSchema = z.strictObject({
    id,
    version: z.literal(1),
    name: id,
    icon: z.string(),
    group: id,
    priority: z.number().int(),
    duration: z.number().int().positive(),
    tags: z.array(z.enum(['buff', 'harmful', 'poison'])),
    removable: z.boolean(),
    modifiers: z.array(modifier),
    costs: z.array(cost).optional(),
    periodic: z.array(periodic).optional(),
});
const status = z.strictObject({
    definition: statusDefinitionSchema,
    sourceId: id,
    sourceName: id,
    targetId: id,
    remaining: z.number().int().positive(),
    skipNext: z.boolean(),
});
const item = z.strictObject({
    id,
    kind: id,
    count: z.number().int().positive(),
    durability: amount.optional(),
});
const equipment = z.strictObject(
    Object.fromEntries(
        [
            'accessory1',
            'head',
            'accessory2',
            'main',
            'body',
            'offhand',
            'gloves',
            'boots',
            'robe',
        ].map((slot) => [slot, id.nullable()]),
    ),
);
const skills = z.record(z.string(), z.strictObject({ rank: z.enum(ranks), counts: numbers }));
export const rankSchema = z.strictObject({
    rank: z.enum(ranks),
    base: amount,
    attackMultiplier: amount.optional(),
    counterMultiplier: amount.optional(),
    costs: z.strictObject({ hp: amount, mana: amount, stamina: amount }),
    cooldown: integer,
    ap: integer,
    duration: integer,
    objectives: z.array(z.strictObject({ id, label: id, points: amount, cap: integer })),
});
const effects = z.strictObject({
    defense: z.strictObject({ defense: amount, protection: amount }).optional(),
    manaShield: z
        .strictObject({
            efficiency: z.number().positive(),
            upkeep: integer,
            remaining: z.number().int().positive(),
        })
        .optional(),
    final: z.strictObject({ magnitude: amount, remaining: z.number().int().positive() }).optional(),
    counter: z
        .strictObject({
            power: amount,
            opponentMultiplier: amount.optional(),
            source: z.strictObject({
                skill: id,
                melee: z.boolean(),
                sword: z.boolean(),
                dual: z.boolean(),
            }),
        })
        .optional(),
    shield: amount.optional(),
});
const enemy = z.strictObject({
    species: z.enum(['spider', 'human']).optional(),
    id,
    name: id,
    hp: amount,
    maxHp: z.number().positive(),
    attack: amount,
    defense: amount,
    boss: z.boolean(),
    magicDefense: amount.optional(),
    protection: amount.max(1).optional(),
    magicProtection: amount.max(1).optional(),
    shield: amount.optional(),
    attackType: z.enum(['melee', 'ranged', 'magic']).optional(),
    statuses: z.array(status).optional(),
    speed: z.number().positive(),
    stamina: amount,
    maxStamina: amount,
    mana: amount,
    maxMana: amount,
    skills: ids,
    cooldowns: numbers,
    consumables: z.array(item),
    allowsItems: z.boolean(),
    defendedLastTurn: z.boolean(),
    guarding: z.boolean(),
});
const event = z.strictObject({
    id,
    battleId: id,
    turnId: id,
    operationId: id,
    sequence: z.number().int().positive(),
    type: z.enum([
        'action',
        'item',
        'damage',
        'healed',
        'resource',
        'statusApplied',
        'statusExpired',
        'counter',
        'defeated',
        'turnStart',
        'turnEnd',
        'battleEnd',
    ]),
    actorId: id,
    text: id,
    targetId: id.optional(),
    amount: z.number().optional(),
    critical: z.boolean().optional(),
    hitIndex: integer.optional(),
});
const battle = z.strictObject({
    room: integer,
    enemies: z.array(enemy).min(1),
    id,
    rulesVersion: z.literal(1),
    contentVersion: z.literal(1),
    order: ids.min(2),
    speeds: z.record(z.string(), z.number().positive()),
    cursor: integer,
    round: z.number().int().positive(),
    turn: z.number().int().positive(),
    turnId: id,
    started: z.boolean(),
    itemUsed: z.boolean(),
    rng: rngSchema,
    winner: z.enum(['player', 'enemy']).nullable(),
    events: z.array(event).max(100),
    eventSequence: integer,
    log: z.array(z.string()).max(20),
});
const reward = z.strictObject({
    id,
    gold: amount,
    items: z.array(item),
    boss: z.boolean(),
    claimed: ids,
});
const runQuests = z.strictObject({
    version: z.literal(1),
    stages: numbers,
    counts: z.record(z.string(), numbers),
    defeats: ids,
});
const run = z.strictObject({
    quests: runQuests.optional(),
    id,
    seed: z.number(),
    tiles: z.array(z.array(z.number())),
    rooms: z.array(
        z.strictObject({
            id: integer,
            x: z.number(),
            y: z.number(),
            kind: z.enum(['entry', 'encounter', 'boss', 'supplies', 'exit']),
            trigger: z.enum(['spider', 'chest', 'switch']),
            required: z.boolean(),
        }),
    ),
    cleared: z.array(integer),
    visited: z.array(integer),
    x: z.number(),
    y: z.number(),
    chests: z.array(reward),
    chosen: integer.nullable(),
    baseline: z
        .strictObject({
            contentVersion: z.literal(2),
            statSnapshot: z
                .strictObject({ version: z.literal(1), base: stats, sources: z.array(source) })
                .optional(),
            skills,
            stats,
            equipment,
        })
        .optional(),
    pageRewards: integer.optional(),
});
const talent = z.enum(['Close Combat', 'Archery', 'Magic', 'Dual Gun']);
const quests = z.strictObject({
    version: z.literal(1),
    records: z.record(
        z.string(),
        z.strictObject({
            status: z.enum(['available', 'active', 'ready', 'completed']),
            stage: integer,
            counts: numbers,
            claimId: id.optional(),
        }),
    ),
    tracked: ids,
    overflow: z.array(item),
    rebirths: z.array(z.strictObject({ id, talent })),
    chapters: ids,
    generations: ids,
    notices: z.array(z.strictObject({ id, text: id })),
});
const phase = z.enum(['selecting', 'turnStart', 'reward', 'treasure', 'exploring']);
const character: z.ZodType = z.lazy(() =>
    z.strictObject({
        quests,
        rp: z
            .strictObject({
                version: z.literal(1),
                scenario: z.literal('aren-memory'),
                attemptId: id,
                rng: rngSchema,
                actor: character,
            })
            .nullable(),
        role: z.literal('aren').optional(),
        id,
        name: id,
        race: z.enum(['Human', 'Elf', 'Giant']),
        talent,
        age: integer,
        level: integer,
        xp: amount,
        totalLevel: integer,
        ap: amount,
        base: stats,
        growth: stats,
        stats,
        hp: amount,
        mana: amount,
        stamina: amount,
        gold: amount,
        bankGold: amount,
        inventory: z.array(item),
        bank: z.array(item),
        equipment,
        placements: z.record(z.string(), z.strictObject({ column: integer, row: integer })),
        inventoryRecovery: z.array(item),
        skills,
        collection: z.array(integer),
        cooldowns: numbers,
        effects,
        createdAt: z.number(),
        rebornAt: z.number(),
        agedAt: z.number(),
        run: run.nullable(),
        battle: battle.nullable(),
        reward: reward.nullable(),
        checkpoint: phase,
        tutorial: integer,
        statuses: z.array(status),
        titleModifiers: z.strictObject({ first: source.optional(), second: source.optional() }),
    }),
);
export const saveSchema = z.strictObject({
    battleEvents: z.array(event).max(100).optional(),
    version: z.literal(5),
    migrationNotice: z.boolean().optional(),
    data: z.strictObject({
        version: z.literal(5),
        statsVersion: z.literal(1),
        revision: integer,
        rng: rngSchema,
        activeId: id.nullable(),
        characters: z.array(character).max(20),
        settings: z.strictObject({
            music: amount.max(1),
            effects: amount.max(1),
            reducedMotion: z.boolean(),
            hudScale: z.number().positive(),
        }),
        operations: ids.max(256),
    }),
    checkpoint: z.strictObject({
        version: z.literal(1),
        screen: z.enum([
            'Title',
            'CharacterSelect',
            'NewCharacter',
            'Town1',
            'Alby',
            'Battle',
            'TreasureRoom',
        ]),
        phase,
    }),
});
// Legacy objects deliberately retain fields needed by the version-specific migrations.
export const legacySaveSchema = z.looseObject({
    version: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    data: z.looseObject({
        version: z.number().int().min(1).max(4),
        rng: z.number().int(),
        characters: z
            .array(
                z.looseObject({
                    id,
                    hp: amount,
                    mana: amount,
                    stamina: amount,
                    inventory: z.array(z.unknown()),
                }),
            )
            .max(20),
    }),
    checkpoint: z.looseObject({ version: z.literal(1), screen: id, phase: id }),
});
export function validateTurn(c: Character) {
    const b = c.battle;
    if (!b) return;
    if (
        b.id !== `${c.run?.id}:${b.room}` ||
        (b.winner === 'player' && (c.hp <= 0 || b.enemies.some((e) => e.hp > 0))) ||
        (b.winner === 'enemy' && c.hp > 0)
    )
        throw new Error('Invalid battle outcome.');
    const actors = [c.id, ...b.enemies.map((e) => e.id)];
    if (
        new Set(actors).size !== actors.length ||
        b.order.length !== actors.length ||
        new Set(b.order).size !== actors.length ||
        b.order.some((id) => !actors.includes(id)) ||
        b.cursor >= b.order.length ||
        b.turnId !== `${b.id}:${b.turn}` ||
        Object.keys(b.speeds).length !== actors.length ||
        actors.some((id) => !b.speeds[id])
    )
        throw new Error('Invalid turn order.');
    const actor =
        b.order[b.cursor] === c.id ? c : b.enemies.find((e) => e.id === b.order[b.cursor])!;
    if (!b.winner && actor.hp <= 0) throw new Error('Defeated actor has an active turn.');
    if (b.itemUsed && !b.started) throw new Error('Invalid item allowance.');
    for (const e of b.enemies)
        if (
            e.hp > e.maxHp ||
            e.stamina > e.maxStamina ||
            e.mana > e.maxMana ||
            (!e.allowsItems && e.consumables.length)
        )
            throw new Error('Invalid enemy resources.');
    for (const e of b.enemies)
        if (
            new Set(e.skills).size !== e.skills.length ||
            e.skills.some((id) => !(id in enemySkills)) ||
            Object.keys(e.cooldowns).some((id) => !e.skills.includes(id))
        )
            throw new Error('Invalid enemy skills.');
    if (
        b.events.some(
            (e, i) =>
                e.id !== `${b.id}:${e.sequence}` ||
                (i > 0 && e.sequence !== b.events[i - 1].sequence + 1),
        ) ||
        (b.events.length > 0 && b.events[b.events.length - 1].sequence !== b.eventSequence)
    )
        throw new Error('Invalid event sequence.');
    if (
        new Set(b.events.map((e) => e.id)).size !== b.events.length ||
        b.events.some(
            (e) =>
                e.battleId !== b.id ||
                !actors.includes(e.actorId) ||
                (e.targetId && !actors.includes(e.targetId)) ||
                e.sequence > b.eventSequence,
        )
    )
        throw new Error('Invalid battle events.');
}