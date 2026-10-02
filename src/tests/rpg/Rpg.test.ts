import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { BattleSession } from '../../game/BattleSession';
import { createHero, heroStats, grantExperience, validateHero, rollLoot, applyHero, addItem } from '../../engine/rpg/Character';
import { applyStatus, effectiveEntity, tickStatuses } from '../../engine/rpg/StatusEffects';
import { createGameRandom } from '../../engine/Random';
import type { GameEvent } from '../../engine/events';
import type { GameCommand } from '../../engine/commands';
const content = loadGameContent();
afterEach(() => vi.useRealTimers());
describe('RPG rules', () => {
  it('derives independent stats from class, level, weapon and armor', () => {
    const hero = createHero(content); addItem(hero, 'iron-blade', 1, content); addItem(hero, 'moss-mail', 1, content);
    hero.equipment = { weapon: 'weapon-1', armor: 'armor-1' }; hero.level = 3; hero.cumulativeLevel = 3;
    expect(heroStats(hero, content)).toMatchObject({ maxHealth: 118, maxMana: 98, maxStamina: 113, combatant: { attack: 38, defense: 9 } });
    expect(content.data.classes[0].combatant.attack).toBe(9);
    const entity = content.spawn('warden', 'player', 'player', 0, 0); applyHero(entity, hero, content);
    entity.inventory!.potion = 900; expect(hero.inventory.potion).toBe(2);
  });
  it('crosses multiple level thresholds and restores resources on level up', () => {
    const hero = createHero(content); hero.health = 1; hero.mana = 0;
    grantExperience(hero, 1105, content);
    expect(hero).toMatchObject({ level: 3, experience: 5, health: 118, mana: 98, stamina: 113, wounds: 0, fullness: 100 });
    grantExperience(hero, 279988500, content); expect(hero.level).toBe(200); expect(hero.experience).toBe(0);
  });
  it('rejects unknown inventory, invalid equipment, out-of-range resources and XP', () => {
    for (const mutate of [
      (hero: ReturnType<typeof createHero>) => { hero.inventory.unknown = 1; },
      (hero: ReturnType<typeof createHero>) => { hero.equipment.weapon = 'potion'; },
      (hero: ReturnType<typeof createHero>) => { hero.equipment.weapon = 'iron-blade'; },
      (hero: ReturnType<typeof createHero>) => { hero.health = 999; },
      (hero: ReturnType<typeof createHero>) => { hero.experience = 400; },
    ]) { const hero = createHero(content); mutate(hero); expect(() => validateHero(hero, content)).toThrow(); }
  });
  it('rolls reproducible loot using engine RNG', () => {
    const a = createGameRandom(5); const b = createGameRandom(5);
    expect(Array.from({ length: 10 }, () => rollLoot('slime', content, a))).toEqual(Array.from({ length: 10 }, () => rollLoot('slime', content, b)));
  });
  it('refreshes a buff, applies debuffs without mutating base stats, and expires on the defined timing', () => {
    const entity = content.spawn('warden', 'player', 'player', 0, 0); const events: GameEvent[] = [];
    applyStatus(entity, 'focus', 'player', content, events); tickStatuses(entity, 'turnEnd', content, events);
    applyStatus(entity, 'focus', 'player', content, events); applyStatus(entity, 'weakness', 'enemy', content, events);
    expect(entity.statuses!.find((status) => status.id === 'focus')?.remainingTurns).toBe(3);
    expect(effectiveEntity(entity, content).combatant?.attack).toBe(10); expect(entity.combatant?.attack).toBe(9);
    tickStatuses(entity, 'turnStart', content, events); expect(entity.statuses![0].remainingTurns).toBe(3);
    for (let i = 0; i < 3; i++) tickStatuses(entity, 'turnEnd', content, events);
    expect(entity.statuses).toEqual([]); expect(effectiveEntity(entity, content).combatant?.attack).toBe(9);
  });
  it('caps stacks and honors ignore semantics', () => {
    const raw = JSON.parse(JSON.stringify(content.data)); raw.statusEffects[0].stacking = 'stack';
    const stacked = new ContentRegistry(raw); const entity = stacked.spawn('slime', 'enemy', 'enemy', 0, 0); const events: GameEvent[] = [];
    for (let i = 0; i < 30; i++) applyStatus(entity, 'burn', 'player', stacked, events);
    expect(entity.statuses![0].stacks).toBe(10);
    raw.statusEffects[0].stacking = 'ignore'; const ignored = new ContentRegistry(raw);
    entity.statuses![0].remainingTurns = 1; applyStatus(entity, 'burn', 'new-source', ignored, events);
    expect(entity.statuses![0]).toMatchObject({ remainingTurns: 1, sourceId: 'player' });
  });
  it('kills a combatant via damage-over-time and resolves victory before animations complete', () => {
    vi.useFakeTimers(); const battle = new BattleSession(content);
    const enemy = battle.engine.getEntity('slime-1')!; enemy.health!.current = 2;
    applyStatus(enemy, 'burn', 'player', content, []);
    battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'healing' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: 'player' }); battle.dispatch({ type: 'CONFIRM_ACTION' });
    battle.advanceEnemyTurns(); expect(enemy.dead).toBe(true); expect(battle.combat.result).toBe('victory');
    expect(battle.presentation.getSnapshot().busy).toBe(true); battle.dispose(); expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects unassigned battle item actions without changing supplies, resources, turn or RNG', () => {
    vi.useFakeTimers(); const battle = new BattleSession(content, 1, 'chamber', createHero(content));
    try {
      const player = battle.engine.getEntity('player')!; player.health!.current = 10;
      const before = structuredClone(player), random = battle.engine.random.snapshot(), snapshot = battle.getSnapshot();
      expect(() => battle.dispatch({ type: 'SELECT_ACTION', action: 'item', itemId: 'potion' } as unknown as GameCommand)).toThrow('not assigned');
      expect(() => battle.dispatch({ type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: 'potion' })).toThrow('Select and confirm');
      expect(player).toEqual(before); expect(battle.getSnapshot()).toEqual(snapshot);
      expect(battle.engine.random.snapshot()).toEqual(random); expect(battle.combat.completedActions).toBe(0);
      expect(battle.combat.currentTurn()).toBe('player');
    } finally { battle.dispose(); }
  });
});
