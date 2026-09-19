import { z } from 'zod';
import { skills } from '../Skills';
import { items } from '../catalog';
import { statusDefinitions } from '../stats/statusCatalog';
import { rankSchema, statusDefinitionSchema } from './schemas';
import { enemySkills } from './profiles';
const skillMetadata = z.object({
    name: z.string().min(1),
    hits: z.number().int().positive(),
    target: z.enum(['one', 'all', 'self']),
    effect: z.enum([
        'attack',
        'counter',
        'buff',
        'passive',
        'heal',
        'defend',
        'manaShield',
        'restoreMana',
        'status',
    ]),
    type: z.enum(['active', 'passive']),
    requirement: z.enum([
        'any',
        'melee',
        'sword',
        'shield',
        'light',
        'heavy',
        'dual',
        'bow',
        'guns',
        'magic',
    ]),
    route: z.enum(['starter', 'lesson', 'book', 'collection', 'reference']),
});
const consumable = z.object({
    name: z.string().min(1),
    resource: z.enum(['hp', 'mana', 'stamina']).optional(),
    restore: z.number().nonnegative().optional(),
    statuses: z.array(z.string()).optional(),
    cleanse: z.enum(['harmful', 'buff', 'poison']).optional(),
});
let validated = false;
export function validateBattleContent() {
    if (validated) return;
    for (const [id, status] of Object.entries(statusDefinitions)) {
        statusDefinitionSchema.parse(status);
        if (status.id !== id) throw new Error('Mismatched status ID.');
    }
    for (const skill of Object.values(skills)) {
        skillMetadata.parse(skill);
        if (skill.route === 'reference') continue;
        for (const ranks of [skill.ranks, ...Object.values(skill.ranksByRace ?? {})]) {
            for (const rank of ranks) rankSchema.parse(rank);
            if (ranks.length !== 15 || new Set(ranks.map((r) => r.rank)).size !== 15)
                throw new Error('Invalid skill ranks.');
        }
        for (const status of skill.appliedStatuses ?? [])
            if (!statusDefinitions[status.id]) throw new Error('Unknown skill status.');
    }
    for (const item of Object.values(items))
        if (item.type === 'consumable') {
            consumable.parse(item);
            for (const id of item.statuses ?? [])
                if (!statusDefinitions[id]) throw new Error('Unknown item status.');
        }
    for (const skill of Object.values(enemySkills))
        if (skill.status && !statusDefinitions[skill.status])
            throw new Error('Unknown enemy status.');
    validated = true;
}