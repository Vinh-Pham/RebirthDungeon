import { migrateInventory } from './inventory';
import { emptyEquipment } from './model';
import { emptyJournal, emptyRunQuests } from './quests/types';
import { produce } from 'immer';
import { createStatSnapshot } from './stats/resolve';
import type { SaveData, Character } from './model';
import { skills } from './Skills';
import { progressionStats, refreshStats, snapshotAction } from './skillSystem';
/** Migration never rerolls a saved hand or spends a resource. */
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
        if (c.battle?.dice.length === 5)
            c.battle.action = snapshotAction(c, c.battle.skill, c.battle.target, false);
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

export function migrateSave(value: unknown): SaveData {
    const source = migrateQuests(value);
    if (!source?.data || (source as { version: number }).version !== 3) return source;
    return produce(source, (draft) => {
        draft.version = 4;
        draft.data.version = 4;
        for (const c of draft.data.characters) migrateInventory(c);
    });
}
