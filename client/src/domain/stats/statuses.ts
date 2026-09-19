import { produce, type Immutable } from 'immer';
import type { Character, Enemy, Resource } from '../model';
import { enemyStats, resolveStats } from './resolve';
import { statusDefinitions } from './statusCatalog';
import type { StatusDefinition, StatusInstance } from './types';

type Actor = Character | Enemy;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function clampActor<T extends Actor>(actor: T): T {
    return produce(actor, (draft) => {
        if ('stats' in draft) {
            const c = draft as Character;
            c.stats = resolveStats(c).primary;
            for (const pool of ['hp', 'mana', 'stamina'] as const)
                c[pool] = Math.max(0, Math.min(c[pool], c.stats[pool]));
        } else draft.hp = Math.max(0, Math.min(draft.hp, enemyStats(draft as Enemy).hp));
    });
}

/** Pure updates: callers assign the result inside the enclosing Immer transaction. */
export function applyStatus<T extends Actor>(
    actor: Immutable<T>,
    id: string,
    source: { id: string; name: string },
    duringOwnActivation: boolean,
    definition?: StatusDefinition,
): T {
    const rule = definition ?? statusDefinitions[id];
    if (!rule || rule.id !== id || rule.version !== 1) throw new Error('Unknown status effect.');
    if (actor.hp <= 0) throw new Error('Cannot affect a defeated actor.');
    return clampActor(
        produce(actor as T, (draft) => {
            draft.statuses ??= [];
            const previous = draft.statuses.find(
                (status) => status.definition.group === rule.group,
            );
            if (previous && previous.definition.priority > rule.priority) return;
            if (
                previous &&
                previous.definition.id === rule.id &&
                previous.definition.version === rule.version
            ) {
                previous.remaining = previous.definition.duration;
                previous.skipNext = duringOwnActivation;
                return;
            }
            draft.statuses = draft.statuses.filter(
                (status) => status.definition.group !== rule.group,
            );
            draft.statuses.push({
                definition: copy(rule),
                sourceId: source.id,
                sourceName: source.name,
                targetId: actor.id,
                remaining: rule.duration,
                skipNext: duringOwnActivation,
            });
        }),
    );
}
export function removeStatuses<T extends Actor>(
    actor: Immutable<T>,
    tag: 'harmful' | 'buff' | 'poison',
): T {
    return clampActor(
        produce(actor as T, (draft) => {
            draft.statuses = (draft.statuses ?? []).filter(
                (status) => !status.definition.removable || !status.definition.tags.includes(tag),
            );
        }),
    );
}
export function restorePool(c: Immutable<Character>, pool: Resource, amount: number): Character {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid recovery.');
    return produce(c as Character, (draft) => {
        if (draft.hp <= 0) return;
        draft[pool] = Math.min(resolveStats(draft).primary[pool], draft[pool] + Math.floor(amount));
    });
}

function periodicDamage(actor: Actor, amount: number, type: 'physical' | 'magic' | 'true') {
    const character = 'stats' in actor;
    const values = character ? resolveStats(actor).values : enemyStats(actor);
    const defense = type === 'magic' ? values.magicDefense : values.defense;
    const protection = character
        ? (type === 'magic' ? values.magicProtection : values.protection) / 100
        : type === 'magic'
          ? values.magicProtection
          : values.protection;
    let damage =
        type === 'true' ? amount : Math.floor(Math.max(0, amount - defense) * (1 - protection));
    const shield = character ? (actor.effects.shield ?? 0) : (actor.shield ?? 0);
    const absorbed = Math.min(shield, damage);
    damage -= absorbed;
    if (character) actor.effects.shield = shield - absorbed;
    else actor.shield = shield - absorbed;
    actor.hp = Math.max(0, actor.hp - damage);
    return damage;
}

export function completeStatusActivation<T extends Actor>(
    actor: Immutable<T>,
): { actor: T; log: string[] } {
    const log: string[] = [];
    const result = produce(actor as T, (draft) => {
        const skipped: string[] = [];
        const statuses = [...(draft.statuses ?? [])].sort((a, b) =>
            `${a.definition.group}:${a.sourceId}`.localeCompare(
                `${b.definition.group}:${b.sourceId}`,
            ),
        );
        for (const status of statuses) {
            if (status.skipNext) {
                status.skipNext = false;
                skipped.push(status.definition.group);
                continue;
            }
            for (const effect of status.definition.periodic ?? []) {
                if (draft.hp <= 0) break;
                if (effect.kind === 'damage') {
                    if (effect.pool === 'hp') {
                        const damage = periodicDamage(
                            draft as Actor,
                            effect.amount,
                            effect.damageType ?? 'true',
                        );
                        log.push(
                            `${status.definition.name} deals ${damage} damage to ${draft.name}.`,
                        );
                    } else draft[effect.pool] = Math.max(0, draft[effect.pool] - effect.amount);
                } else if ('stats' in draft) {
                    const maximum = resolveStats(draft as Character).primary[effect.pool];
                    draft[effect.pool] = Math.min(maximum, draft[effect.pool] + effect.amount);
                    log.push(`${status.definition.name} restores ${effect.amount} ${effect.pool}.`);
                } else {
                    const enemy = draft as Enemy;
                    const maximum =
                        effect.pool === 'hp'
                            ? enemyStats(enemy).hp
                            : effect.pool === 'mana'
                              ? enemy.maxMana
                              : enemy.maxStamina;
                    enemy[effect.pool] = Math.min(maximum, enemy[effect.pool] + effect.amount);
                }
            }
            status.remaining--;
        }
        draft.statuses = (draft.statuses ?? []).filter((status) => status.remaining > 0);
        if ('stats' in draft) {
            const c = draft as Character;
            c.stats = resolveStats(c).primary;
            for (const pool of ['hp', 'mana', 'stamina'] as const)
                c[pool] = Math.min(c[pool], c.stats[pool]);
            if (c.hp > 0) {
                const regeneration = resolveStats({
                    ...c,
                    statuses: c.statuses.filter(
                        (status) => !skipped.includes(status.definition.group),
                    ),
                }).values;
                for (const [pool, stat] of [
                    ['hp', 'hpRegen'],
                    ['mana', 'manaRegen'],
                    ['stamina', 'staminaRegen'],
                ] as const)
                    c[pool] = Math.min(c.stats[pool], c[pool] + regeneration[stat]);
            }
        } else draft.hp = Math.min(draft.hp, enemyStats(draft as Enemy).hp);
    });
    return { actor: result, log };
}

export function statusSummary(status: Immutable<StatusInstance>) {
    return `${status.definition.name} · ${status.remaining} activation${status.remaining === 1 ? '' : 's'} · ${status.sourceName}`;
}