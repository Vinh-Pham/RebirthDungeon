import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { JourneySession } from '../../game/JourneySession';
import { loadGameContent } from '../../data/content';
import { findPath, isWalkable, distance } from '../../engine/world/TileMap';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
const content = loadGameContent(); const sessions: JourneySession[] = [];
function create() { const session = new JourneySession(content); sessions.push(session); return session; }
function enterHalls(session: JourneySession) {
  session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 }); session.dispatch({ type: 'INTERACT', objectId: 'east' });
}
afterEach(() => { sessions.splice(0).forEach((session) => session.dispose()); vi.useRealTimers(); });
describe('world exploration', () => {
  it('moves by commands and rejects walls, NPCs, chests, diagonals and invalid entities', () => {
    const session = create(); const initial = session.toSave();
    for (const command of [
      { type: 'MOVE', entityId: 'player', dx: 0, dy: -1 },
      { type: 'MOVE', entityId: 'player', dx: 1, dy: 1 },
      { type: 'MOVE', entityId: 'player', dx: 0.5, dy: 0 },
      { type: 'MOVE', entityId: 'other', dx: 1, dy: 0 },
    ] as const) expect(() => session.dispatch(command)).toThrow();
    expect(session.toSave()).toEqual(initial);
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    expect(() => session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow('blocked');
    expect(session.engine.getEntity('player')?.position).toEqual({ x: 3, y: 3 });
  });
  it('supports NPC dialogue, one-time chests, equipment and rest', () => {
    const session = create(); session.dispatch({ type: 'INTERACT', objectId: 'keeper' }); expect(session.getSnapshot().message).toContain('blade');
    expect(() => session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' })).toThrow('next');
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 }); session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' });
    expect(session.toSave().hero.inventory['iron-blade']).toBe(1);
    expect(() => session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' })).toThrow('empty');
    session.dispatch({ type: 'EQUIP_ITEM', itemId: 'iron-blade' }); expect(session.toSave().hero.equipment.weapon).toBe('iron-blade');
    session.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' }); expect(session.toSave().hero.equipment.weapon).toBeUndefined();
    session.dispatch({ type: 'TRAVEL_TO', x: 2, y: 3 }); session.dispatch({ type: 'INTERACT', objectId: 'rest' }); expect(session.toSave().hero.health).toBe(42);
  });
  it('transitions maps and creates deterministic encounters that lock exploration', () => {
    const session = create(); enterHalls(session); expect(session.toSave().worldId).toBe('halls');
    expect(session.engine.getEntity('keeper')).toBeUndefined(); expect(session.engine.getEntity('slime-guard')).toBeDefined();
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    expect(session.toSave().pending?.objectId).toBe('slime-guard'); expect(session.toSave().position).toEqual({ x: 5, y: 3 });
    expect(() => session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow('Finish');
    expect(() => session.dispatch({ type: 'EQUIP_ITEM', itemId: 'potion' })).toThrow('Finish');
    const resumed = new JourneySession(content, session.toSave()); sessions.push(resumed); expect(resumed.toSave()).toEqual(session.toSave());
  });
  it('carries equipment into battles and awards XP, gold and loot exactly once', () => {
    vi.useFakeTimers(); const session = create(); session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' }); session.dispatch({ type: 'EQUIP_ITEM', itemId: 'iron-blade' });
    enterHalls(session); session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 }); const battle = session.createBattle();
    expect(battle.engine.getEntity('player')?.combatant?.attack).toBe(13); expect(() => session.finishBattle(battle)).toThrow('ready');
    battle.engine.getEntity('slime-1')!.health!.current = 1;
    battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'fireball' }); battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' }); battle.dispatch({ type: 'CONFIRM_ACTION' });
    session.finishBattle(battle);
    expect(session.toSave()).toMatchObject({ hero: { level: 2, experience: 4, gold: 12, inventory: { potion: 3 } }, cleared: ['halls/slime-guard'] });
    expect(() => session.finishBattle(battle)).toThrow('ready'); battle.dispose();
  });
  it('rebirth returns to refuge, preserves equipment and opened chests, and halves gold', () => {
    vi.useFakeTimers(); const session = create(); const saved = session.toSave(); saved.hero.gold = 11;
    const restored = new JourneySession(content, saved); sessions.push(restored); enterHalls(restored); restored.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    const battle = restored.createBattle(); battle.engine.getEntity('player')!.health!.current = 1; battle.engine.getEntity('slime-1')!.combatant!.hitChance = 1;
    battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'focus' }); battle.dispatch({ type: 'SELECT_TARGET', targetId: 'player' }); battle.dispatch({ type: 'CONFIRM_ACTION' }); battle.advanceEnemyTurns();
    restored.finishBattle(battle); expect(restored.toSave()).toMatchObject({ worldId: 'refuge', hero: { health: 42, gold: 5 }, cleared: [] }); battle.dispose();
  });
  it('keeps snapshots detached and rejects commands after disposal', () => {
    const session = create(); const snapshot = session.toSave(); snapshot.hero.inventory.potion = 999;
    expect(session.toSave().hero.inventory.potion).toBe(2); session.dispose(); expect(() => session.dispatch({ type: 'INTERACT', objectId: 'keeper' })).toThrow('disposed');
  });
  it('finds bounded, cardinal, walkable paths for generated floor targets', () => {
    const map = content.data.worlds[0];
    fc.assert(fc.property(fc.integer({ min: 0, max: 9 }), fc.integer({ min: 0, max: 6 }), (x, y) => {
      const path = findPath(map, map.entry, { x, y }); let previous = map.entry;
      for (const point of path) { expect(isWalkable(map, point)).toBe(true); expect(distance(previous, point)).toBe(1); previous = point; }
      if (path.length) expect(previous).toEqual({ x, y });
      expect(path.length).toBeLessThan(map.width * map.height);
    }), { numRuns: 150 });
  });
  it('rejects invalid world dimensions, duplicate objects, and dangling references', () => {
    for (const mutate of [
      (raw: ReturnType<typeof loadGameContent>['data']) => { raw.worlds[0].tiles.pop(); },
      (raw: ReturnType<typeof loadGameContent>['data']) => { raw.worlds[0].objects[0].x = 500; },
      (raw: ReturnType<typeof loadGameContent>['data']) => { raw.worlds[0].objects.push(raw.worlds[0].objects[0]); },
      (raw: ReturnType<typeof loadGameContent>['data']) => { raw.worlds[0].objects[3].destination = 'missing'; },
    ]) { const raw = JSON.parse(JSON.stringify(content.data)); mutate(raw); expect(() => new ContentRegistry(raw)).toThrow(); }
  });
});
