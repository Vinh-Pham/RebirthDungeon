import type { Immutable } from 'immer';
import type { Character, Enemy } from '../model';
import { items } from '../catalog';
import { consumeInventoryItem } from '../inventory';
import { applyStatus, removeStatuses } from '../stats/statuses';
import { refreshStats, effectiveStats } from '../skillSystem';

type Actor = Character | Enemy;
export function consumableReason(actor: Immutable<Actor>, id: string) {
    const character = 'inventory' in actor;
    const item = (character ? actor.inventory : actor.consumables).find((i) => i.id === id);
    const def = item && items[item.kind];
    if (
        !item ||
        item.count < 1 ||
        !def ||
        def.type !== 'consumable' ||
        (!def.resource && !def.statuses && !def.cleanse)
    )
        return 'Choose a consumable.';
    if (actor.hp <= 0) return 'Cannot restore a defeated actor.';
    if (!character && !actor.allowsItems) return 'This enemy cannot use items.';
    if (def.requiresRun && character && !actor.run) return 'Use this during a dungeon run.';
    if (
        def.cleanse &&
        !actor.statuses?.some(
            (s) => s.definition.removable && s.definition.tags.includes(def.cleanse!),
        )
    )
        return 'No matching effect to remove.';
    if (def.resource) {
        const max = character
            ? effectiveStats(actor)[def.resource]
            : def.resource === 'hp'
              ? actor.maxHp
              : def.resource === 'mana'
                ? actor.maxMana
                : actor.maxStamina;
        if (actor[def.resource] >= max && !def.statuses && !def.cleanse)
            return 'That resource is already full.';
    }
    return '';
}
export function consumeItem(actor: Actor, id: string) {
    const reason = consumableReason(actor, id);
    if (reason) throw new Error(reason);
    const character = 'inventory' in actor;
    const inventory = character ? actor.inventory : actor.consumables;
    const item = inventory.find((i) => i.id === id)!;
    const def = items[item.kind];
    if (def.cleanse) actor.statuses = removeStatuses(actor, def.cleanse).statuses;
    if (def.resource) {
        const max = character
            ? effectiveStats(actor)[def.resource]
            : def.resource === 'hp'
              ? actor.maxHp
              : def.resource === 'mana'
                ? actor.maxMana
                : actor.maxStamina;
        actor[def.resource] = Math.min(max, actor[def.resource] + def.restore!);
    }
    for (const status of def.statuses ?? [])
        actor.statuses = applyStatus(actor, status, { id, name: def.name }, true).statuses;
    if (character) {
        refreshStats(actor);
        consumeInventoryItem(actor, id);
    } else if (--item.count === 0) inventory.splice(inventory.indexOf(item), 1);
}