import { createBattle } from './battle/engine';
import { enemyProfile } from './battle/profiles';
import { seedRng, battleSeed } from './rng';
import { legacySaveSchema } from './battle/schemas';
import { migrateInventory } from './inventory';
import { emptyEquipment } from './model';
import { emptyJournal, emptyRunQuests } from './quests/types';
import { produce } from 'immer';
import { createStatSnapshot } from './stats/resolve';
import type { SaveData, Character } from './model';
import { skills } from './Skills';
import { progressionStats, refreshStats } from './skillSystem';
/** Legacy input is converted without executing unfinished actions. */
function migrateLegacy(value: unknown): SaveData {
    const source = value as SaveData;
    if (!source || (source as { version: number }).version !== 1) return source;
    const save = JSON.parse(JSON.stringify(source));
    if (!Array.isArray(save.data?.characters)) throw new Error('Invalid legacy save.');
    save.version = 2;
    save.data.version = 2;
    delete save.data.statsVersion;
    save.migrationNotice = true;
    for (const raw of save.data.characters) {
        if (
            !Array.isArray(raw.skills) ||
            raw.skills.some((id: unknown) => typeof id !== 'string' || !skills[id])
        )
            throw new Error('Unknown legacy skill.');
        raw.skills = Object.fromEntries(
            raw.skills.map((id: string) => [id, { rank: 'F', counts: {} }]),
        );
        raw.skills.normal ??= { rank: 'F', counts: {} };
        raw.offhand = null;
        raw.collection = [];
        raw.cooldowns = {};
        raw.effects = {};
        raw.statuses = [];
        raw.titleModifiers = {};
        const c = raw as Character;
        if (c.run) {
            c.run.baseline = {
                contentVersion: 2,
                skills: JSON.parse(JSON.stringify(c.skills)),
                stats: progressionStats(c),
                equipment: {
                    ...emptyEquipment(),
                    main: raw.weapon ?? raw.equipment?.main ?? null,
                    body: raw.armor ?? raw.equipment?.body ?? null,
                },
            };
            c.run.pageRewards = 0;
        }
        migrateInventory(c);
        refreshStats(c);
    }
    return save as SaveData;
}

function migrateStats(value: unknown): SaveData {
    const source = migrateLegacy(value);
    if (!source?.data || (source as { version: number }).version !== 2) return source;
    if (source.data.statsVersion === 1) return source;
    if (source.data.statsVersion !== undefined) throw new Error('Unsupported stats version.');
    return produce(source, (draft) => {
        draft.data.statsVersion = 1;
        for (const c of draft.data.characters) {
            migrateInventory(c);
            c.statuses = [];
            c.titleModifiers = {};
            if (c.run?.baseline) c.run.baseline.statSnapshot = createStatSnapshot(c);
            refreshStats(c);
        }
    });
}

function migrateQuests(value: unknown): SaveData {
    const source = migrateStats(value);
    if (!source?.data || (source as { version: number }).version !== 2) return source;
    return produce(source, (draft) => {
        Object.assign(draft, { version: 3 });
        Object.assign(draft.data, { version: 3 });
        for (const c of draft.data.characters) {
            c.quests = emptyJournal();
            c.rp = null;
            if (c.run) c.run.quests = emptyRunQuests();
            for (const e of c.battle?.enemies ?? []) e.species = 'spider';
        }
    });
}

function migrateV4(value: unknown): SaveData {
    const source = migrateQuests(value);
    if (!source?.data || (source as { version: number }).version !== 3) return source;
    return produce(source, (draft) => {
        Object.assign(draft, { version: 4 });
        Object.assign(draft.data, { version: 4 });
        for (const c of draft.data.characters) migrateInventory(c);
    });
}
function starterSkills(c: Character) {
    for (const id of ['combatMastery', 'defense']) {
        c.skills[id] ??= { rank: 'F', counts: {} };
        if (c.run?.baseline && !c.run.baseline.skills[id]) {
            c.run.baseline.skills[id] = { rank: 'F', counts: {} };
            const snapshot = c.run.baseline.statSnapshot;
            if (snapshot && !snapshot.sources.some((source) => source.id === `skill:${id}`)) {
                const additions = createStatSnapshot(c).sources.filter(
                    (source) => source.id === `skill:${id}`,
                );
                snapshot.sources.push(...JSON.parse(JSON.stringify(additions)));
            }
        }
    }
    refreshStats(c);
}
export function migrateSave(value: unknown): SaveData {
    if ((value as { version?: number })?.version === 5) return value as SaveData;
    legacySaveSchema.parse(value);
    const source = migrateV4(value);
    if ((source as { version: number }).version !== 4) throw new Error('Unsupported save version.');
    return produce(source, (draft) => {
        draft.version = 5;
        draft.data.version = 5;
        draft.migrationNotice = true;
        const oldSeed = source.data.rng as unknown as number;
        draft.data.rng = seedRng(oldSeed);
        function convert(c: Character, seed: number) {
            starterSkills(c);
            if (c.effects.counter) {
                const old = c.effects.counter as typeof c.effects.counter & { multiplier?: number };
                old.power *= old.multiplier ?? 1;
                old.opponentMultiplier = (old.opponentMultiplier ?? 0) * (old.multiplier ?? 1);
                delete old.multiplier;
            }
            if (c.battle) {
                const previous = c.battle;
                const enemies = previous.enemies.map((e) => {
                    const { inflicts: _inflicts, ...rest } = e as typeof e & {
                        inflicts?: string[];
                    };
                    return { ...rest, ...enemyProfile(e) };
                });
                c.battle = createBattle(
                    c,
                    previous.room,
                    enemies,
                    seedRng(battleSeed(seed, `${c.run!.id}:${previous.room}`)),
                );
                c.battle.log = previous.log.slice(-20);
                c.battle.cursor = c.battle.order.indexOf(c.id);
                c.battle.started = true;
                c.battle.winner = c.reward ? 'player' : null;
                c.checkpoint = c.reward ? 'reward' : 'selecting';
            }
            if (c.rp) {
                const seed = c.rp.rng as unknown as number;
                c.rp.rng = seedRng(seed);
                convert(c.rp.actor, seed);
            }
        }
        for (const c of draft.data.characters) convert(c, oldSeed);
        const owner = draft.data.characters.find((c) => c.id === draft.data.activeId);
        const c = owner?.rp?.actor ?? owner;
        if (draft.checkpoint.screen === 'Battle' && c) draft.checkpoint.phase = c.checkpoint;
    });
}