import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { createHero, addItem } from '../../engine/rpg/Character';
import { prepareBattleItem } from '../../engine/rpg/Consumables';
import { learnSkill } from '../../engine/rpg/Skills';
import { BattleSession } from '../../game/BattleSession';
import type { GameEvent } from '../../engine/events';
import { battleHotbarItems } from '../../ui/battle/battleActionDetails';

const content = loadGameContent(),
  sessions: BattleSession[] = [];
function setup(itemId = 'potion') {
  vi.useFakeTimers();
  const hero = learnSkill(createHero(content), 'combat-mastery', content);
  hero.itemHotbar = [itemId];
  hero.inventory[itemId] = 1;
  addItem(hero, 'iron-blade', 1, content);
  hero.equipment.weapon = 'weapon-1';
  const battle = new BattleSession(
    content,
    12345,
    'chamber',
    hero,
    [],
    undefined,
    'hotbar/test',
    true,
  );
  sessions.push(battle);
  const player = battle.engine.getEntity('player')!;
  player.health!.current = 10;
  player.mana!.current = 2;
  player.stamina!.current = 4;
  return { battle, player };
}
afterEach(() => {
  sessions.splice(0).forEach((s) => s.dispose());
  vi.useRealTimers();
});
describe('consumable hotbar actions', () => {
  it.each([
    ['potion', 'health', 51],
    ['mana-potion', 'mana', 23],
    ['stamina-potion', 'stamina', 35],
  ] as const)(
    'uses %s once with the shared recovery and turn tick, without RNG, wear or skill training',
    (itemId, resource, after) => {
      const { battle, player } = setup(itemId),
        random = battle.engine.random.snapshot();
      const events: GameEvent[] = [];
      battle.engine.events.subscribe((e) => events.push(e));
      const durability = player.weapon!.durability;
      expect(battle.selectPlayerAction({ action: 'item', itemId }, 0)).toBe(true);
      expect(player[resource]!.current).toBe(after);
      expect(player.inventory![itemId]).toBeUndefined();
      expect(player.itemHotbar).toEqual([itemId]);
      expect(player.weapon!.durability).toBe(durability);
      expect(battle.engine.random.snapshot()).toEqual(random);
      expect(battle.training.snapshot()).toEqual({});
      expect(battle.battle.phase).toBe('enemyTurn');
      expect(battle.combat.completedActions).toBe(1);
      expect(battle.selectPlayerAction({ action: 'item', itemId }, 0)).toBe(false);
      expect(events.filter((e) => e.type === 'ITEM_USED')).toEqual([
        { type: 'ITEM_USED', sourceId: 'player', itemId },
      ]);
      expect(events.find((e) => e.type === 'ACTION_RESOLVED')?.outcome).toMatchObject({
        action: 'item',
        tags: [],
      });
    },
  );
  it('previews recovery and keeps depleted icons without selecting, consuming, ticking or rolling', () => {
    const { battle, player } = setup(),
      before = structuredClone(player),
      random = battle.engine.random.snapshot(),
      view = battle.getSnapshot();
    expect(battleHotbarItems(battle)).toMatchObject([
      { item: { id: 'potion' }, quantity: 1, recovery: { resource: 'health', amount: 40 } },
    ]);
    expect(player).toEqual(before);
    expect(battle.getSnapshot()).toEqual(view);
    expect(battle.engine.random.snapshot()).toEqual(random);
    delete player.inventory!.potion;
    expect(battleHotbarItems(battle)).toMatchObject([
      { item: { id: 'potion' }, quantity: 0, unavailableReason: 'Out of stock' },
    ]);
    player.inventory!.potion = 2;
    expect(battleHotbarItems(battle)).toMatchObject([
      { quantity: 2, unavailableReason: undefined, recovery: { amount: 40 } },
    ]);
  });
  it('requires self and confirmation, permits cancel, respects wounds, and revalidates depleted stock', () => {
    const { battle, player } = setup(),
      random = battle.engine.random.snapshot();
    player.wounds = player.health!.max - 20;
    battle.dispatch({ type: 'SELECT_ACTION', action: 'item', itemId: 'potion' });
    expect(battle.getSnapshot().targets).toEqual(['player']);
    expect(() => battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' })).toThrow(
      'Invalid',
    );
    expect(() => battle.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('Select a living target');
    battle.dispatch({ type: 'CANCEL_ACTION' });
    expect(player.health!.current).toBe(10);
    expect(player.inventory!.potion).toBe(1);
    expect(battle.engine.random.snapshot()).toEqual(random);
    expect(battle.combat.completedActions).toBe(0);
    expect(prepareBattleItem(player, 'potion', content).recovery.amount).toBe(10);
    battle.dispatch({ type: 'SELECT_ACTION', action: 'item', itemId: 'potion' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: 'player' });
    delete player.inventory!.potion;
    const before = structuredClone(player);
    expect(() => battle.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('Out of stock');
    expect(player).toEqual(before);
    expect(battle.combat.completedActions).toBe(0);
    expect(battle.engine.random.snapshot()).toEqual(random);
    player.inventory!.potion = 1;
    battle.dispatch({ type: 'CONFIRM_ACTION' });
    expect(player.health!.current).toBe(20);
    expect(player.wounds).toBe(player.health!.max - 20);
  });
});
