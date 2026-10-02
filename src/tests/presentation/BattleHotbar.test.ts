import { afterEach, describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { createHero } from '../../engine/rpg/Character';
import { learnSkill } from '../../engine/rpg/Skills';
import { BattleSession } from '../../game/BattleSession';
import { battleActionDetails, battleHotbarActions, battleSkills } from '../../ui/battle/battleActionDetails';

const content = loadGameContent();
const sessions: BattleSession[] = [];
function create(registry = content) {
  let hero = createHero(registry);
  for (const id of ['smash', 'combat-mastery', 'sword-mastery']) hero = learnSkill(hero, id, registry);
  hero.learnedSkills.icebolt.rank = 'E';
  const session = new BattleSession(registry, 12345, 'chamber', hero);
  sessions.push(session);
  return session;
}
afterEach(() => sessions.splice(0).forEach((session) => session.dispose()));

describe('battle hotbar details', () => {
  it.each([['warrior', 'combat-mastery'], ['archery', 'human-ranged-attack'], ['mage', 'magic-mastery']] as const)(
    'keeps Attack and Defend in Combat for a new %s without granting skills', (talent, attackSkill) => {
      const hero = createHero(content, talent), before = structuredClone(hero);
      const session = new BattleSession(content, 12345, 'chamber', hero); sessions.push(session);
      const player = session.engine.getEntity('player')!, entityBefore = structuredClone(player);
      const random = session.engine.random.snapshot();
      const actions = battleHotbarActions(session, 'combat');
      expect(actions.map(({ id, skill, action }) => [id, skill.id, action])).toEqual([
        ['attack', attackSkill, { action: 'attack' }], ['defend', 'defense', { action: 'defend' }],
      ]);
      expect(actions.every(({ rank }) => rank === undefined)).toBe(true);
      expect(battleHotbarActions(session, 'magic').map(({ id }) => id)).toEqual(['firebolt', 'icebolt', 'lightning-bolt', 'healing']);
      expect(battleHotbarActions(session, 'items')).toEqual([]);
      expect(battleActionDetails(session, actions[0].action).previews).toEqual(battleActionDetails(session, { action: 'attack' }).previews);
      expect(player).toEqual(entityBefore); expect(hero).toEqual(before);
      expect(session.engine.random.snapshot()).toEqual(random); expect(session.combat.completedActions).toBe(0);
    });

  it('shows the saved mastery rank on Attack alongside learned Combat skills', () => {
    const session = create(), player = session.engine.getEntity('player')!;
    player.learnedSkills!['combat-mastery'].rank = 'E';
    const actions = battleHotbarActions(session, 'combat');
    expect(actions.map(({ id }) => id)).toEqual(['attack', 'defend', 'smash']);
    expect(actions[0]).toMatchObject({ rank: 'E', skill: { id: 'combat-mastery' }, action: { action: 'attack' } });
  });

  it('shows learned active skills in their authored categories with saved ranks', () => {
    const session = create();
    const skills = battleSkills(session);
    expect(skills.filter((skill) => skill.category === 'combat').map((skill) => skill.id)).toEqual(['smash']);
    expect(skills.filter((skill) => skill.category === 'magic').map((skill) => skill.id))
      .toEqual(['firebolt', 'icebolt', 'lightning-bolt', 'healing']);
    expect(skills.find((skill) => skill.id === 'icebolt')).toMatchObject({ rank: 'E', minPower: 11, maxPower: 21 });
    expect(skills.some((skill) => ['combat-mastery', 'sword-mastery', 'windmill', 'enchant'].includes(skill.id))).toBe(false);
  });

  it('inspects basic and skill actions without changing the selected action, resources, RNG or training', () => {
    const session = create();
    session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'icebolt' });
    const player = session.engine.getEntity('player')!;
    const before = structuredClone(player), snapshot = session.getSnapshot(), random = session.engine.random.snapshot();
    for (const action of [{ action: 'attack' }, { action: 'skill', skillId: 'firebolt' }, { action: 'skill', skillId: 'healing' }] as const) {
      expect(battleActionDetails(session, action).previews.length).toBeGreaterThan(0);
    }
    expect(player).toEqual(before);
    expect(session.getSnapshot()).toEqual(snapshot);
    expect(session.engine.random.snapshot()).toEqual(random);
    expect(session.training.snapshot()).toEqual({});
    expect(session.combat.completedActions).toBe(0);
  });

  it('keeps unavailable skills inspectable with equipment, cooldown and resource reasons', () => {
    const session = create(), player = session.engine.getEntity('player')!;
    expect(battleActionDetails(session, { action: 'skill', skillId: 'smash' }).unavailableReason).toContain('usable melee weapon');
    player.cooldowns = { firebolt: 2 };
    expect(battleActionDetails(session, { action: 'skill', skillId: 'firebolt' }).unavailableReason).toBe('Cooldown: 2 turns');
    player.cooldowns = {};
    player.mana!.current = 0;
    expect(battleActionDetails(session, { action: 'skill', skillId: 'firebolt' }).unavailableReason).toContain('insufficient mana');
    expect(battleSkills(session).some((skill) => skill.id === 'firebolt')).toBe(true);
  });

  it('requires self-Healing stamina but still permits a free-stamina ally preview', () => {
    const solo = create();
    solo.engine.getEntity('player')!.stamina!.current = 0;
    expect(battleActionDetails(solo, { action: 'skill', skillId: 'healing' }).unavailableReason).toBe('Insufficient stamina');
    const data = structuredClone(content.data);
    data.maps.find((map) => map.id === 'chamber')!.spawns.push({ entityId: 'ally', definitionId: 'warden', kind: 'player', x: 2, y: 3 });
    const party = create(new ContentRegistry(data));
    party.engine.getEntity('player')!.stamina!.current = 0;
    party.engine.getEntity('ally')!.health!.current = 40;
    const details = battleActionDetails(party, { action: 'skill', skillId: 'healing' });
    expect(details.unavailableReason).toBeUndefined();
    expect(details.previews).toHaveLength(1);
    expect(details.previews[0]).toMatchObject({ staminaCost: 0, healing: true, targets: [{ targetId: 'ally' }] });
    expect(details.failures).toEqual([{ targetId: 'player', reason: 'Insufficient stamina' }]);
  });

  it('includes area targets once and keeps exhausted basic attacks available', () => {
    const data = structuredClone(content.data);
    data.skills.find((skill) => skill.id === 'firebolt')!.target = 'allEnemies';
    data.maps.find((map) => map.id === 'chamber')!.spawns.push({ entityId: 'slime-2', definitionId: 'slime', kind: 'enemy', x: 7, y: 4 });
    const session = create(new ContentRegistry(data));
    session.engine.getEntity('player')!.stamina!.current = 0;
    const details = battleActionDetails(session, { action: 'skill', skillId: 'firebolt' });
    expect(details.previews).toHaveLength(1);
    expect(details.previews[0].targets.map((target) => target.targetId)).toEqual(['slime-1', 'slime-2']);
    expect(battleActionDetails(session, { action: 'attack' }).unavailableReason).toBeUndefined();
  });
});
