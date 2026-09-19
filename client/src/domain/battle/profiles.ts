import { z } from 'zod';
import type { Enemy } from '../model';
export const enemySkillSchema = z.strictObject({
    name: z.string().min(1),
    power: z.number().positive(),
    cost: z.number().nonnegative(),
    cooldown: z.number().int().nonnegative(),
    status: z.enum(['poison', 'armorBreak']).optional(),
});
export const enemySkills = {
    pounce: enemySkillSchema.parse({ name: 'Pounce', power: 1.25, cost: 4, cooldown: 2 }),
    poisonBite: enemySkillSchema.parse({
        name: 'Poison Bite',
        power: 1,
        cost: 4,
        cooldown: 2,
        status: 'poison',
    }),
    armorBreak: enemySkillSchema.parse({
        name: 'Armor Break',
        power: 1,
        cost: 4,
        cooldown: 2,
        status: 'armorBreak',
    }),
};
export type EnemySkillId = keyof typeof enemySkills;
export function enemyProfile(enemy: Pick<Enemy, 'name' | 'boss' | 'species'>) {
    const human = enemy.species === 'human';
    return {
        speed: human ? 11 : enemy.boss ? 8 : enemy.name === 'Red Spider' ? 12 : 9,
        stamina: 20,
        maxStamina: 20,
        mana: 0,
        maxMana: 0,
        skills: human
            ? []
            : [enemy.boss ? 'armorBreak' : enemy.name === 'Red Spider' ? 'poisonBite' : 'pounce'],
        cooldowns: {},
        consumables: [],
        allowsItems: human,
        defendedLastTurn: false,
        guarding: false,
    };
}