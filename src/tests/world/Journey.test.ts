import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { JourneySession } from '../../game/JourneySession';
import { loadGameContent } from '../../data/content';
import { findPath, isWalkable, distance } from '../../engine/world/TileMap';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { validateCampaign } from '../../persistence/SaveSchema';
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
  it('supports town dialogue, one-time chests and individual weapon equipment', () => {
    const session = create(); session.dispatch({ type: 'INTERACT', objectId: 'keeper' }); expect(session.getSnapshot().message).toContain('altar');
    expect(() => session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' })).toThrow('next');
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 }); session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' });
    expect(session.toSave().hero.weapons['weapon-1']).toEqual({ itemId: 'iron-blade', durability: 60 });
    expect(() => session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' })).toThrow('empty');
    session.dispatch({ type: 'EQUIP_WEAPON', weaponId: 'weapon-1' }); expect(session.toSave().hero.equipment.weapon).toBe('weapon-1');
    session.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' }); expect(session.toSave().hero.equipment.weapon).toBeUndefined();
    expect(session.map.objects.some((object) => object.kind === 'rest')).toBe(false);
  });
  it('transitions maps and creates deterministic encounters that lock exploration', () => {
    const session = create(); enterHalls(session); expect(session.toSave().worldId).toBe('halls');
    expect(session.engine.getEntity('keeper')).toBeUndefined(); expect(session.engine.getEntity('slime-guard')).toBeDefined();
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    expect(session.toSave().pending?.objectId).toBe('slime-guard'); expect(session.toSave().position).toEqual({ x: 5, y: 3 });
    expect(() => session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow('Finish');
    expect(() => session.dispatch({ type: 'EQUIP_ARMOR', armorId: 'potion' })).toThrow('Finish');
    const resumed = new JourneySession(content, session.toSave()); sessions.push(resumed); expect(resumed.toSave()).toEqual(session.toSave());
  });
  it('opens an onward route after clearing Moss Halls, including an already-cleared saved game', () => {
    vi.useFakeTimers(); const session = create(); enterHalls(session);
    for (const objectId of ['slime-guard', 'elder-guard']) {
      const object = session.map.objects.find((entry) => entry.id === objectId)!;
      session.dispatch({ type: 'TRAVEL_TO', x: object.x, y: object.y });
      const battle = session.createBattle();
      try {
        for (const entity of battle.engine.world.entities) if (entity.enemy) entity.health!.current = 1;
        battle.engine.getEntity('player')!.combatant!.hitChance = 1;
        while (!battle.combat.result) {
          if (battle.battle.phase === 'enemyTurn') battle.advanceEnemyTurns();
          else {
            battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
            battle.dispatch({ type: 'SELECT_TARGET', targetId: battle.battle.validTargetIds()[0] });
            battle.dispatch({ type: 'CONFIRM_ACTION' });
          }
        }
        expect(battle.combat.result).toBe('victory'); session.finishBattle(battle);
      } finally { battle.dispose(); }
    }
    const saved = session.toSave();
    const resumed = new JourneySession(content, saved); sessions.push(resumed);
    const onward = resumed.map.objects.find((object) => object.kind === 'portal' && (object.dungeonId || object.destination !== 'refuge'));
    expect(onward, 'Cleared Moss Halls must have a route to more dungeon rooms').toBeDefined();
    expect(onward!.blocked).toBe(false);
    const approach = { x: onward!.x - 1, y: onward!.y };
    expect(isWalkable(resumed.map, approach)).toBe(true);
    resumed.dispatch({ type: 'TRAVEL_TO', ...approach });
    const hero = resumed.toSave().hero;
    resumed.dispatch({ type: 'INTERACT', objectId: onward!.id });
    const run = resumed.toSave().dungeon!;
    expect(run).toBeDefined();
    expect(run.blueprint.rooms.length).toBeGreaterThan(3);
    expect(run.blueprint.encounters.find((encounter) => encounter.kind === 'boss')!.map.spawns.some((spawn) => spawn.definitionId === 'giant-black-spider')).toBe(true);
    expect(resumed.toSave().hero).toMatchObject({ inventory: hero.inventory, weapons: hero.weapons, equipment: hero.equipment,
      gold: hero.gold, health: hero.health, mana: hero.mana, stamina: hero.stamina });
    expect(resumed.toSave().hero.titleCollection.evidence['entered/moss-depths']).toBe(1);
  });
  it('keeps the onward passage locked until both guardians are cleared and preserves ordinary map returns', () => {
    const session = create(); enterHalls(session);
    for (const cleared of [[], ['halls/slime-guard'], ['halls/elder-guard']]) {
      const saved = session.toSave(); saved.cleared = cleared; saved.position = { x: 8, y: 3 };
      const resumed = new JourneySession(content, saved); sessions.push(resumed);
      const passage = resumed.map.objects.find((object) => object.id === 'depths-passage')!;
      expect(passage.blocked).toBe(true); expect(isWalkable(resumed.map, passage)).toBe(false);
      const before = resumed.toSave();
      expect(() => resumed.dispatch({ type: 'INTERACT', objectId: passage.id })).toThrow('Defeat both guardians');
      expect(resumed.toSave()).toEqual(before);
      expect(() => validateCampaign({ ...before, position: { x: passage.x, y: passage.y } }, content)).toThrow('position');
    }
    session.dispatch({ type: 'INTERACT', objectId: 'west' });
    expect(session.map.id).toBe('refuge');
    expect(session.engine.getEntity('keeper')).toBeDefined();
    expect(session.engine.getEntity('slime-guard')).toBeUndefined();
  });
  it('carries equipment into battles and awards XP, gold and loot exactly once', () => {
    vi.useFakeTimers(); const session = create(); session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' }); session.dispatch({ type: 'EQUIP_WEAPON', weaponId: 'weapon-1' });
    enterHalls(session); session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 }); const battle = session.createBattle();
    expect(battle.engine.getEntity('player')?.combatant?.attack).toBe(38); expect(() => session.finishBattle(battle)).toThrow('ready');
    battle.engine.getEntity('slime-1')!.health!.current = 1;
    battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'firebolt' }); battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' }); battle.dispatch({ type: 'CONFIRM_ACTION' });
    session.finishBattle(battle);
    expect(session.toSave()).toMatchObject({ hero: { level: 1, experience: 24, gold: 12, inventory: { potion: 3 } }, cleared: ['halls/slime-guard'] });
    expect(() => session.finishBattle(battle)).toThrow('ready'); battle.dispose();
  });
  it('defeat recovery returns to the refuge without resetting earned levels or AP', () => {
    vi.useFakeTimers(); const session = create(); const saved = session.toSave(); saved.hero.gold = 11;
    saved.hero.level = 3; saved.hero.cumulativeLevel = 3; saved.hero.experience = 5; saved.hero.ap = 2;
    const restored = new JourneySession(content, saved); sessions.push(restored); enterHalls(restored); restored.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    const battle = restored.createBattle(); battle.engine.getEntity('player')!.health!.current = 1; battle.engine.getEntity('slime-1')!.combatant!.hitChance = 1; battle.engine.getEntity('slime-1')!.combatant!.attack = 100;
    battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'healing' }); battle.dispatch({ type: 'SELECT_TARGET', targetId: 'player' }); battle.dispatch({ type: 'CONFIRM_ACTION' }); battle.advanceEnemyTurns();
    restored.finishBattle(battle); expect(restored.toSave()).toMatchObject({ worldId: 'refuge', hero: { level: 3, experience: 5, ap: 2, health: 118, mana: 98, stamina: 113, wounds: 0, fullness: 100, gold: 5 }, cleared: [] });
    expect(restored.getSnapshot().message).toContain('Recovered at the refuge'); battle.dispose();
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
      (raw: ReturnType<typeof loadGameContent>['data']) => { raw.worlds.find((map) => map.id === 'halls')!.objects.at(-1)!.requiresCleared = ['missing']; },
      (raw: ReturnType<typeof loadGameContent>['data']) => { raw.worlds.find((map) => map.id === 'halls')!.objects.at(-1)!.requiresCleared = ['slime-guard', 'slime-guard']; },
      (raw: ReturnType<typeof loadGameContent>['data']) => { raw.worlds.find((map) => map.id === 'halls')!.objects.at(-1)!.requiresCleared = ['west']; },
    ]) { const raw = JSON.parse(JSON.stringify(content.data)); mutate(raw); expect(() => new ContentRegistry(raw)).toThrow(); }
  });
});
