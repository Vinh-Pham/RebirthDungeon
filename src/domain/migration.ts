import type { SaveData, Character } from './model';
import { skills } from './skillCatalog';
import { progressionStats, refreshStats, snapshotAction } from './skillSystem';
/** Migration never rerolls a saved hand or spends a resource. */
export function migrateSave(value: unknown): SaveData {
    const source = value as SaveData;
    if (!source || (source as { version: number }).version !== 1) return source;
    const save = JSON.parse(JSON.stringify(source));
    if (!Array.isArray(save.data?.characters)) throw new Error('Invalid legacy save.');
    save.version = 2;
    save.data.version = 2;
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
        const c = raw as Character;
        if (c.run) {
            c.run.baseline = {
                contentVersion: 2,
                skills: JSON.parse(JSON.stringify(c.skills)),
                stats: progressionStats(c),
                weapon: c.weapon,
                offhand: null,
                armor: c.armor,
            };
            c.run.pageRewards = 0;
        }
        refreshStats(c);
        if (c.battle?.dice.length === 5)
            c.battle.action = snapshotAction(c, c.battle.skill, c.battle.target, false);
    }
    return save as SaveData;
}
