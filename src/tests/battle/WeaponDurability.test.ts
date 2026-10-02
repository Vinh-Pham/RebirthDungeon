import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { addItem, createHero, heroStats, type Hero } from '../../engine/rpg/Character';
import { applyStatus, effectiveEntity } from '../../engine/rpg/StatusEffects';
import { characterStatBreakdown } from '../../engine/rpg/Stats';
import { BattleSession } from '../../game/BattleSession';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { legacyCampaign } from '../persistence/legacyFixture';

const content = loadGameContent(); const battles: BattleSession[] = []; const sessions: JourneySession[] = [];
function armed(durability = 60) {
  const hero = createHero(content); addItem(hero, 'iron-blade', 2, content);
  hero.equipment.weapon = 'weapon-1'; hero.weapons['weapon-1'].durability = durability; return hero;
}
function battle(hero = armed(), registry = content, mapId = 'chamber') {
  const session = new BattleSession(registry, 7, mapId, hero); battles.push(session);
  const player = session.engine.getEntity('player')!; player.combatant!.hitChance = 1; player.combatant!.criticalChance = 0; player.combatant!.criticalRating = 0; player.combatant!.magicCriticalChance = 0;
  for (const entity of session.engine.world.entities) if (entity.enemy) entity.combatant!.evasion = 0;
  return session;
}
function act(session: BattleSession, action: 'attack' | 'skill', id?: string, target = 'slime-1') {
  session.dispatch({ type: 'SELECT_ACTION', action, skillId: action === 'skill' ? id : undefined });
  session.dispatch({ type: 'SELECT_TARGET', targetId: target }); session.dispatch({ type: 'CONFIRM_ACTION' });
}
function encounter(hero: Hero) {
  const base = new JourneySession(content); sessions.push(base); const state = base.toSave(); state.hero = hero;
  const journey = new JourneySession(content, state); sessions.push(journey);
  journey.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 }); journey.dispatch({ type: 'INTERACT', objectId: 'east' }); journey.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
  const session = journey.createBattle(); battles.push(session); const player = session.engine.getEntity('player')!;
  player.combatant!.hitChance = 1; player.combatant!.criticalChance = 0; player.combatant!.criticalRating = 0; player.combatant!.magicCriticalChance = 0; session.engine.getEntity('slime-1')!.combatant!.evasion = 0;
  return { journey, session };
}
afterEach(() => { battles.splice(0).forEach((session) => session.dispose()); sessions.splice(0).forEach((session) => session.dispose()); vi.restoreAllMocks(); });

describe('weapon wear in confirmed combat', () => {
  it('wears only the equipped copy and keeps the journey and initial hero detached', () => {
    const hero = armed(); const session = battle(hero); act(session, 'attack');
    expect(session.engine.getEntity('player')!.weapon!.durability).toBe(59);
    expect(hero.weapons['weapon-1'].durability).toBe(60); expect(hero.weapons['weapon-2'].durability).toBe(60);
    expect(session.getSnapshot().entities.find((entity) => entity.side === 'player')!.weapon).toMatchObject({ durability: 59, maxDurability: 60 });
  });
  it('resolves a breaking hit with the bonus, then removes it while retaining buffs and resources', () => {
    const session = battle(armed(1)); const player = session.engine.getEntity('player')!; const enemy = session.engine.getEntity('slime-1')!;
    enemy.health = { current: 1000, max: 1000 }; player.combatant!.minDamage = player.combatant!.maxDamage;
    applyStatus(player, 'focus', 'player', content, []); const beforeHP = enemy.health!.current; const mana = player.mana!.current;
    const expectedDamage = effectiveEntity(player, content).combatant!.attack - Math.max(0, enemy.combatant!.defense - player.combatant!.armorPierce!);
    act(session, 'attack'); expect(beforeHP - enemy.health!.current).toBe(expectedDamage);
    expect(player.weapon!.durability).toBe(0); expect(player.combatant!.attack).toBe(34); expect(player.mana!.current).toBe(mana);
    const review = session.getSnapshot().character!;
    expect(review.source.weaponItemId).toBeUndefined();
    const breakdown = characterStatBreakdown(review.source, content);
    expect(breakdown.equipment.attack - breakdown.base.attack).toBe(0);
    expect(review.stats.combatant.attack - breakdown.dungeon.attack).toBe(content.status('focus').modifier);
    review.source.level = 99;
    expect(player.statSource!.level).toBe(1);
    expect(effectiveEntity(player, content).combatant!.attack).toBeGreaterThan(34); expect(session.getSnapshot().log.some((line) => line.includes('broke'))).toBe(true);
    session.advanceEnemyTurns(); player.combatant!.minDamage = player.combatant!.maxDamage; const previous = enemy.health!.current; const unarmedDamage = effectiveEntity(player, content).combatant!.attack - Math.max(0, enemy.combatant!.defense - player.combatant!.armorPierce!);
    act(session, 'attack'); expect(previous - enemy.health!.current).toBe(unarmedDamage); expect(player.weapon!.durability).toBe(0);
  });
  it('does not wear weapons on misses or rejected and cancelled actions', () => {
    const session = battle(); const random = session.engine.random.snapshot();
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow();
    session.dispatch({ type: 'SELECT_ACTION', action: 'attack' }); session.dispatch({ type: 'CANCEL_ACTION' });
    expect(session.engine.random.snapshot()).toEqual(random); expect(session.engine.getEntity('player')!.weapon!.durability).toBe(60);
    vi.spyOn(session.engine.random, 'chance').mockReturnValue(false); act(session, 'attack'); expect(session.engine.getEntity('player')!.weapon!.durability).toBe(60);
  });
  it('does not wear weapons on spells or healing', () => {
    const session = battle(armed()); act(session, 'skill', 'firebolt');
    expect(session.engine.getEntity('player')!.weapon!.durability).toBe(60);
    session.advanceEnemyTurns(); act(session, 'skill', 'healing', 'player');
    expect(session.engine.getEntity('player')!.weapon!.durability).toBe(60);
  });
  it('wears once for a physical skill hitting multiple enemies and never for a damaging magic skill', () => {
    const raw = structuredClone(content.data);
    raw.skills.push({ ...raw.skills[0], id: 'sweep', name: 'Sweep', gameRanks: { F: { ...raw.skills[0].gameRanks!.F!, minPower: 0, maxPower: 0, manaCost: 0 } }, effect: 'damage', element: 'physical', target: 'allEnemies', power: 0, minPower: 0, maxPower: 0, manaCost: 0, hitChance: 1, criticalChance: 0, statuses: [] });
    raw.classes[0].skills.push('sweep'); raw.maps[0].spawns.push({ ...raw.maps[0].spawns[1], entityId: 'slime-2', y: 4 });
    const registry = new ContentRegistry(raw); const hero = armed(2); hero.learnedSkills.sweep = { rank: 'F', objectiveCounts: {} }; hero.discoveredSkills.push('sweep'); const session = battle(hero, registry); act(session, 'skill', 'sweep');
    expect(session.engine.getEntity('slime-1')!.health!.current).toBeLessThan(55); expect(session.engine.getEntity('slime-2')!.health!.current).toBeLessThan(55);
    expect(session.engine.getEntity('player')!.weapon!.durability).toBe(1); expect(session.getSnapshot().log.filter((line) => line.includes('durability'))).toHaveLength(1);
    session.advanceEnemyTurns(); act(session, 'skill', 'firebolt'); expect(session.engine.getEntity('player')!.weapon!.durability).toBe(1);
  });
  it.each(['victory', 'defeat'] as const)('copies wear back on %s and preserves spare copies after save/load', (result) => {
    const { journey, session } = encounter(armed()); const enemy = session.engine.getEntity('slime-1')!;
    if (result === 'victory') enemy.health!.current = 1;
    else { session.engine.getEntity('player')!.health!.current = 1; Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 }); enemy.combatant!.hitChance = 1; }
    act(session, 'attack'); if (result === 'defeat') session.advanceEnemyTurns();
    expect(session.combat.result).toBe(result); journey.finishBattle(session);
    const saved = parseSave(JSON.parse(encodeSave(journey.toSave(), content)), content);
    expect(saved.campaign.hero.weapons['weapon-1'].durability).toBe(59); expect(saved.campaign.hero.weapons['weapon-2'].durability).toBe(60);
    expect(() => journey.finishBattle(session)).toThrow('ready'); expect(saved.campaign.hero.equipment.weapon).toBe('weapon-1');
    expect(heroStats(saved.campaign.hero, content).combatant.attack).toBeGreaterThanOrEqual(13);
  });
  it('reloads unfinished encounters with starting durability and migrates legacy pending encounters', () => {
    const { journey, session } = encounter(armed(12)); const checkpoint = journey.toSave(); act(session, 'attack'); expect(session.engine.getEntity('player')!.weapon!.durability).toBe(11);
    const resumed = new JourneySession(content, parseSave(JSON.parse(encodeSave(journey.toSave(), content)), content).campaign); sessions.push(resumed);
    const restarted = resumed.createBattle(); battles.push(restarted); expect(restarted.engine.getEntity('player')!.weapon!.durability).toBe(12);
    expect(resumed.toSave()).toEqual(checkpoint); expect(restarted.engine.seed).toBe(session.engine.seed);
    const migrated = parseSave({ version: 3, savedAt: new Date().toISOString(), campaign: legacyCampaign(checkpoint) }, content);
    const legacyJourney = new JourneySession(content, migrated.campaign); sessions.push(legacyJourney);
    const legacyBattle = legacyJourney.createBattle(); battles.push(legacyBattle);
    expect(legacyBattle.engine.getEntity('player')!.weapon!.durability).toBe(60); expect(legacyBattle.engine.seed).toBe(session.engine.seed);
  });
});
