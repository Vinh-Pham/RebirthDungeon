import { versionSevenHero } from '../persistence/legacyFixture';
import { afterEach, describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { createHero, addItem, type Hero } from '../../engine/rpg/Character';
import { experienceToNextLevel } from '../../engine/rpg/Leveling';
import {
  acceptQuest,
  claimQuest,
  EncounterQuests,
  mergeQuestEncounter,
  objectiveProgress,
  questEligible,
  questItemNeeds,
  questReady,
  rankAtLeast,
  reconcileQuests,
  recordQuestWorldEvidence,
  trackObjective,
} from '../../engine/rpg/Quests';
import { learnSkill, rankUpSkill, type ActionOutcome } from '../../engine/rpg/Skills';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave, validateCampaign } from '../../persistence/SaveSchema';
import { distance, findPath, isWalkable } from '../../engine/world/TileMap';

const content = loadGameContent();
const main = content.data.quests[0],
  seal = content.data.quests[1],
  side = content.data.quests[2],
  milestone = content.data.quests[3];
const sessions: JourneySession[] = [];
afterEach(() => sessions.splice(0).forEach((s) => s.dispose()));
function session(hero = createHero(content), registry = content) {
  const base = new JourneySession(registry);
  sessions.push(base);
  const state = base.toSave();
  state.hero = hero;
  const next = new JourneySession(registry, state);
  sessions.push(next);
  return next;
}
function approach(journey: JourneySession, id: string) {
  const object = journey.map.objects.find((o) => o.id === id)!;
  if (distance(object, journey.toSave().position) > 1) {
    const path = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ]
      .map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }))
      .filter((p) => isWalkable(journey.map, p))
      .map((p) => ({ point: p, path: findPath(journey.map, journey.toSave().position, p) }))
      .filter((p) => p.path.length)
      .sort((a, b) => a.path.length - b.path.length)[0];
    journey.dispatch({ type: 'TRAVEL_TO', ...path.point });
  }
  journey.dispatch({ type: 'INTERACT', objectId: id });
}
function activeSide(hero = createHero(content), registry = content) {
  reconcileQuests(hero, registry, side.offerNpc);
  return acceptQuest(
    hero,
    registry.data.quests.find((q) => q.id === side.id)!,
    registry,
  );
}
function activeSeal() {
  let hero = learnSkill(createHero(content), 'smash', content);
  hero.quests[main.id] = {
    status: 'completed',
    stageId: main.stages[1].id,
    counts: { 'grocery-visit': 1 },
    claimId: `quest/${main.id}/once`,
  };
  reconcileQuests(hero, content);
  hero = acceptQuest(hero, seal, content);
  return hero;
}
function outcome(actionId: number): ActionOutcome {
  return {
    encounterId: 'attempt',
    actionId,
    sourceId: 'player',
    action: 'skill',
    skillId: 'smash',
    rank: 'F',
    tags: ['melee'],
    origin: 'direct',
    targets: [
      {
        targetId: 'slime-1',
        hostile: true,
        hit: true,
        critical: false,
        damage: 20,
        healing: 0,
        defeated: false,
      },
    ],
  };
}

describe('quest content and prerequisites', () => {
  it('authors a reachable story chain, side request, rank milestone and title award', () => {
    expect(content.data.quests.map((q) => q.category)).toEqual([
      'mainstream',
      'mainstream',
      'sidequest',
      'skill',
      'sidequest',
    ]);
    expect(seal.generation?.id).toBe('generation-1');
    expect(seal.rewards.titles).toEqual(['seals-witness']);
    expect(content.data.shops.some((s) => s.items.includes('apple'))).toBe(true);
    expect(content.data.shops.some((s) => s.items.includes('bread'))).toBe(true);
  });
  it('rejects duplicate stage/objective IDs, dangling references, cycles, unsupported skills and invalid quantities', () => {
    const mutations = [
      (raw: typeof content.data) => {
        raw.quests[0].stages[1].id = raw.quests[0].stages[0].id;
      },
      (raw: typeof content.data) => {
        raw.quests[0].offerNpc!.objectId = 'missing';
      },
      (raw: typeof content.data) => {
        raw.quests[0].rewards.titles = ['missing'];
      },
      (raw: typeof content.data) => {
        raw.quests[0].rewards.items[0].quantity = -1;
      },
      (raw: typeof content.data) => {
        raw.quests[0].prerequisite = { kind: 'quest', questId: 'missing' };
      },
      (raw: typeof content.data) => {
        raw.quests[0].prerequisite = { kind: 'quest', questId: seal.id };
      },
      (raw: typeof content.data) => {
        raw.quests[0].prerequisite = { kind: 'skill', skillId: 'smash', rank: 'D' };
      },
      (raw: typeof content.data) => {
        raw.quests[1].stages[0].objectives[0] = {
          id: 'bad',
          kind: 'useSkill',
          skillId: 'counterattack',
          label: 'Unsupported reaction',
          target: 1,
          allowDefeat: false,
        };
      },
      (raw: typeof content.data) => {
        raw.quests[0].stages[0].objectives[0] = {
          id: 'bad',
          kind: 'deliverItem',
          itemId: 'bread',
          label: 'Early delivery',
          target: 1,
        };
      },
    ];
    for (const mutate of mutations) {
      const raw = structuredClone(content.data);
      mutate(raw);
      expect(() => new ContentRegistry(raw)).toThrow();
    }
  });
  it('uses explicit AND/OR saved facts and numeric rank order; training alone cannot satisfy a higher rank', () => {
    let hero = learnSkill(createHero(content), 'sword-mastery', content);
    hero.ap = 3;
    hero.learnedSkills['sword-mastery'].objectiveCounts = { hits: 20, defeats: 4 };
    expect(questEligible(hero, milestone.prerequisite)).toBe(false);
    hero = rankUpSkill(hero, 'sword-mastery', content);
    expect(questEligible(hero, milestone.prerequisite)).toBe(true);
    expect(rankAtLeast('9', 'A')).toBe(true);
    expect(rankAtLeast('F', 'E')).toBe(false);
    expect(rankAtLeast('1', '9')).toBe(true);
    addItem(hero, 'iron-blade', 1, content);
    hero.equipment.weapon = 'weapon-1';
    hero.questFlags.push('seal-witnessed');
    expect(
      questEligible(hero, {
        kind: 'all',
        conditions: [
          { kind: 'item', itemId: 'iron-blade', quantity: 1, equipped: true },
          {
            kind: 'any',
            conditions: [
              { kind: 'level', level: 99 },
              { kind: 'flag', flagId: 'seal-witnessed' },
            ],
          },
        ],
      }),
    ).toBe(true);
  });
});

describe('ordered town objectives, deliveries and claims', () => {
  it('requires the current open NPC; discovery and journal previews never accept or grant rewards', () => {
    const journey = session();
    const initial = journey.toSave();
    expect(() =>
      journey.dispatch({ type: 'ACCEPT_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toThrow('Approach');
    expect(journey.toSave()).toEqual(initial);
    approach(journey, 'keeper');
    const available = journey.toSave();
    expect(available.hero.quests[main.id].status).toBe('available');
    expect(questReady(available.hero, main)).toBe(false);
    expect(journey.toSave()).toEqual(available);
    journey.dispatch({ type: 'CLOSE_SERVICE' });
    expect(() =>
      journey.dispatch({ type: 'ACCEPT_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toThrow('Approach');
    approach(journey, 'keeper');
    journey.dispatch({ type: 'ACCEPT_QUEST', questId: main.id, objectId: 'keeper' });
    expect(journey.toSave().hero.quests[main.id].stageId).toBe('visit-grocery');
    journey.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    expect(() =>
      journey.dispatch({ type: 'CLAIM_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toThrow('Approach');
  });
  it('ignores pre-acceptance visits, advances in order, consumes exact inputs and awards the complete claim once', () => {
    const hero = createHero(content);
    hero.gold = 30;
    const journey = session(hero);
    approach(journey, 'grocery-door');
    approach(journey, 'exit');
    approach(journey, 'keeper');
    journey.dispatch({ type: 'ACCEPT_QUEST', questId: main.id, objectId: 'keeper' });
    expect(journey.toSave().hero.quests[main.id].counts).toEqual({});
    approach(journey, 'grocery-door');
    approach(journey, 'grocery-keeper');
    journey.dispatch({
      type: 'BUY_ITEM',
      objectId: 'grocery-keeper',
      itemId: 'bread',
      quantity: 3,
    });
    expect(journey.toSave().hero.quests[main.id].stageId).toBe('bring-provisions');
    expect(questReady(journey.toSave().hero, main)).toBe(true);
    const before = journey.toSave();
    expect(() =>
      journey.dispatch({ type: 'CLAIM_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toThrow('named NPC');
    expect(journey.toSave()).toEqual(before);
    approach(journey, 'exit');
    approach(journey, 'keeper');
    journey.dispatch({ type: 'CLAIM_QUEST', questId: main.id, objectId: 'keeper' });
    const claimed = journey.toSave();
    expect(claimed.hero).toMatchObject({
      gold: 26,
      experience: 10,
      inventory: { bread: 1, 'combat-manual': 1 },
      quests: { [main.id]: { status: 'completed', claimId: `quest/${main.id}/once` } },
    });
    expect(() =>
      journey.dispatch({ type: 'CLAIM_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toThrow('not ready');
    expect(journey.toSave()).toEqual(claimed);
    expect(parseSave(JSON.parse(encodeSave(claimed, content)), content).campaign).toEqual(claimed);
  });
  it('held-item readiness regresses when food is consumed; item previews and equipped copies cannot fabricate delivery', () => {
    const hero = activeSide();
    addItem(hero, 'apple', 2, content);
    const journey = session(hero);
    expect(questReady(journey.toSave().hero, side)).toBe(true);
    expect(questItemNeeds(journey.toSave().hero, content, 'apple')[0].count).toBe(2);
    journey.dispatch({ type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: 'apple' });
    expect(questReady(journey.toSave().hero, side)).toBe(false);
    expect(questItemNeeds(journey.toSave().hero, content)[0].count).toBe(1);
    const before = journey.toSave().hero;
    expect(() => claimQuest(before, side, content)).toThrow('not ready');
    expect(journey.toSave().hero).toEqual(before);
    const armored = createHero(content);
    addItem(armored, 'moss-mail', 1, content);
    armored.equipment.armor = 'armor-1';
    expect(
      objectiveProgress(armored, side, {
        kind: 'deliverItem',
        itemId: 'moss-mail',
        id: 'mail',
        label: 'Mail',
        target: 1,
      }),
    ).toBe(0);
  });
  it('rejects the entire delivery if any reward cannot fit; validates capacity after removing inputs', () => {
    const hero = activeSide();
    addItem(hero, 'apple', 2, content);
    hero.inventory.potion = 999;
    const before = structuredClone(hero);
    expect(() => claimQuest(hero, side, content)).toThrow('full');
    expect(hero).toEqual(before);
    const raw = structuredClone(content.data);
    raw.quests[2].rewards.items = [{ itemId: 'apple', quantity: 2 }];
    const registry = new ContentRegistry(raw),
      full = activeSide(createHero(registry), registry);
    addItem(full, 'apple', 999, registry);
    expect(claimQuest(full, registry.data.quests[2], registry).inventory.apple).toBe(999);
    hero.inventory.potion = 2;
    hero.gold = 1000000;
    expect(() => claimQuest(hero, side, content)).toThrow('capacity');
    expect(hero.inventory.apple).toBe(2);
  });
  it('awards XP, per-level AP, restored resources, explicit AP and a title together without equipping it', () => {
    const hero = activeSeal();
    hero.quests[seal.id].stageId = 'seal-report';
    hero.quests[seal.id].counts = {
      'practice-smash': 3,
      'clear-moss-depths': 1,
      'keeper-report': 1,
    };
    hero.experience = 399;
    hero.health = 20;
    hero.mana = 1;
    hero.stamina = 1;
    hero.wounds = 20;
    hero.fullness = 50;
    const before = structuredClone(hero),
      claimed = claimQuest(hero, seal, content);
    expect(hero).toEqual(before);
    expect(claimed).toMatchObject({
      level: 2,
      ap: 8,
      gold: 30,
      wounds: 0,
      fullness: 100,
      earnedTitles: ['seals-witness'],
      questFlags: ['seal-witnessed'],
    });
    expect(claimed.health).toBeGreaterThan(20);
    expect(claimed.equipment).toEqual(hero.equipment);
    hero.ap = 999998;
    expect(() => claimQuest(hero, seal, content)).toThrow('capacity');
    expect(hero.health).toBe(20);
  });
  it('reserves AP for quest-earned levels beyond the former level-99 cap', () => {
    const hero = activeSide();
    addItem(hero, 'apple', 2, content);
    Object.assign(hero, {
      level: 99,
      cumulativeLevel: 99,
      experience: experienceToNextLevel(99) - 1,
      ap: 1000000,
    });
    const before = structuredClone(hero);
    expect(() => claimQuest(hero, side, content)).toThrow('capacity');
    expect(hero).toEqual(before);
    hero.ap = 999999;
    expect(claimQuest(hero, side, content)).toMatchObject({
      level: 100,
      cumulativeLevel: 100,
      ap: 1000000,
    });
  });
  it('persists discovered offers and revalidates changing acceptance prerequisites', () => {
    const raw = structuredClone(content.data);
    raw.quests[0].prerequisite = {
      kind: 'item',
      itemId: 'iron-blade',
      quantity: 1,
      equipped: true,
    };
    const registry = new ContentRegistry(raw),
      hero = createHero(registry);
    addItem(hero, 'iron-blade', 1, registry);
    hero.equipment.weapon = 'weapon-1';
    const journey = session(hero, registry);
    approach(journey, 'keeper');
    journey.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' });
    expect(journey.toSave().hero.quests[main.id].status).toBe('available');
    const before = journey.toSave();
    expect(() =>
      journey.dispatch({ type: 'ACCEPT_QUEST', questId: main.id, objectId: 'keeper' }),
    ).toThrow('eligible');
    expect(journey.toSave()).toEqual(before);
  });
  it('bounds tracking to three current objectives without imposing an active quest cap', () => {
    let hero = activeSeal();
    hero = activeSide(hero);
    hero.learnedSkills['sword-mastery'] = { rank: 'E', objectiveCounts: {} };
    hero.discoveredSkills.push('sword-mastery');
    reconcileQuests(hero, content);
    hero = acceptQuest(hero, milestone, content);
    trackObjective(hero, seal, 'practice-smash');
    trackObjective(hero, side, 'healer-apples');
    trackObjective(hero, milestone, 'mastery-rank-e');
    expect(hero.trackedObjectives).toHaveLength(3);
    expect(Object.values(hero.quests).filter((q) => q.status === 'active')).toHaveLength(3);
    trackObjective(hero, side, 'healer-apples');
    expect(hero.trackedObjectives).toHaveLength(2);
    recordQuestWorldEvidence(hero, { kind: 'visit', worldId: 'refuge' }, content);
    expect(hero.quests[seal.id].counts).toEqual({});
  });
});

describe('attempt-local practice and versioned saved progress', () => {
  it('counts one use per area action, ignores enemy/unrelated/duplicate evidence and discards unfinished attempts', () => {
    const hero = activeSeal(),
      ledger = new EncounterQuests('attempt', hero, content, true);
    const area = outcome(1);
    area.targets.push({ ...area.targets[0], targetId: 'slime-2' });
    ledger.record(area);
    ledger.record(area);
    ledger.record({ ...outcome(2), sourceId: 'enemy' });
    ledger.record({ ...outcome(3), encounterId: 'another' });
    expect(ledger.snapshot()[seal.id].counts).toEqual({ 'practice-smash': 1 });
    expect(hero.quests[seal.id].counts).toEqual({});
    const restarted = new EncounterQuests('attempt', hero, content, true);
    expect(restarted.snapshot()).toEqual({});
    const inactive = new EncounterQuests('attempt', createHero(content), content, true);
    inactive.record(area);
    expect(inactive.snapshot()).toEqual({});
    const arena = new EncounterQuests('attempt', hero, content, false);
    arena.record(area);
    expect(arena.snapshot()).toEqual({});
  });
  it.each(['victory', 'defeat'] as const)(
    'banks authored practice on completed %s and advances one stage without reusing evidence',
    (result) => {
      const hero = activeSeal(),
        ledger = new EncounterQuests('attempt', hero, content, true);
      for (let i = 1; i <= 10; i++) ledger.record(outcome(i));
      mergeQuestEncounter(hero, ledger.snapshot(), result, 'chamber', content);
      expect(hero.quests[seal.id]).toMatchObject({
        stageId: 'seal-depths',
        counts: { 'practice-smash': 3 },
      });
      expect(hero.quests[seal.id].counts['clear-moss-depths']).toBeUndefined();
      expect(hero.trackedObjectives).toEqual([]);
    },
  );
  it('respects defeat policy and only counts authored wins after a matching victory', () => {
    const raw = structuredClone(content.data);
    const objective = raw.quests[1].stages[0].objectives[0];
    if (objective.kind === 'useSkill') objective.allowDefeat = false;
    raw.quests[1].stages[0].objectives.push({
      kind: 'winEncounter',
      id: 'win-halls',
      label: 'Win the slime chamber',
      target: 1,
      mapId: 'chamber',
    });
    const registry = new ContentRegistry(raw),
      hero = activeSeal(),
      ledger = new EncounterQuests('attempt', hero, registry, true);
    ledger.record(outcome(1));
    mergeQuestEncounter(hero, ledger.snapshot(), 'defeat', 'chamber', registry);
    expect(hero.quests[seal.id].counts['practice-smash']).toBeUndefined();
    expect(hero.quests[seal.id].counts['win-halls']).toBeUndefined();
    mergeQuestEncounter(hero, ledger.snapshot(), 'victory', 'elder-chamber', registry);
    expect(hero.quests[seal.id].counts['win-halls']).toBeUndefined();
    mergeQuestEncounter(hero, {}, 'victory', 'chamber', registry);
    expect(hero.quests[seal.id].counts['win-halls']).toBe(1);
  });
  it('migrates version 6 without restoring depleted resources, replaying evidence, awarding XP/AP or auto-learning', () => {
    const journey = session();
    const campaign = journey.toSave();
    campaign.hero = learnSkill(campaign.hero, 'sword-mastery', content);
    campaign.hero.learnedSkills['sword-mastery'].rank = 'E';
    campaign.hero.ap = 11;
    campaign.hero.health = 20;
    campaign.hero.mana = 3;
    campaign.hero.stamina = 5;
    const { quests, earnedTitles, questFlags, trackedObjectives, ...old } = versionSevenHero(
      campaign.hero,
    );
    void quests;
    void earnedTitles;
    void questFlags;
    void trackedObjectives;
    const migrated = parseSave(
      { version: 6, savedAt: new Date().toISOString(), campaign: { ...campaign, hero: old } },
      content,
    );
    expect(migrated.version).toBe(11);
    expect(migrated.campaign.hero).toMatchObject({
      health: 20,
      mana: 3,
      stamina: 5,
      ap: 11,
      quests: {},
      earnedTitles: [],
    });
    const restored = new JourneySession(content, migrated.campaign);
    sessions.push(restored);
    expect(restored.toSave().hero.quests[milestone.id].status).toBe('available');
    expect(restored.toSave().hero.ap).toBe(11);
    restored.dispatch({ type: 'ACCEPT_QUEST', questId: milestone.id });
    expect(questReady(restored.toSave().hero, milestone)).toBe(true);
    restored.dispatch({ type: 'CLAIM_QUEST', questId: milestone.id });
    expect(restored.toSave().hero.ap).toBe(13);
    expect(restored.toSave().hero.learnedSkills.smash).toBeUndefined();
  });
  it('rejects unknown IDs, counter overflow, skipped stages, duplicate tracking and forged claim receipts', () => {
    const hero = activeSeal(),
      journey = session(hero);
    const mutations = [
      (h: Hero) => {
        h.quests[seal.id].stageId = 'missing';
      },
      (h: Hero) => {
        h.quests[seal.id].stageId = 'seal-report';
      },
      (h: Hero) => {
        h.quests[seal.id].counts['practice-smash'] = 4;
      },
      (h: Hero) => {
        h.quests[seal.id].counts.unknown = 1;
      },
      (h: Hero) => {
        h.quests[seal.id].claimId = 'forged';
      },
      (h: Hero) => {
        h.earnedTitles.push('missing', 'missing');
      },
      (h: Hero) => {
        h.trackedObjectives = [
          { questId: seal.id, objectiveId: 'practice-smash' },
          { questId: seal.id, objectiveId: 'practice-smash' },
        ];
      },
    ];
    for (const mutate of mutations) {
      const state = journey.toSave();
      mutate(state.hero);
      expect(() => validateCampaign(state, content)).toThrow();
    }
  });
});
