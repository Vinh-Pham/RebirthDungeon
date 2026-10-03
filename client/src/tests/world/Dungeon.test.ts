import { cloneData } from '../../engine/cloneData';
import { afterEach, describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import {
  createDungeonRun,
  generateDungeon,
  projectDungeonMap,
  reachableTiles,
  remainingEnemies,
  validateDungeon,
} from '../../engine/dungeon/Dungeon';
import { JourneySession } from '../../game/JourneySession';
import type { BattleSession } from '../../game/BattleSession';
import { distance, findPath, isWalkable } from '../../engine/world/TileMap';
import { encodeSave, parseSave, validateCampaign } from '../../persistence/SaveSchema';
import { addItem, heroStats, itemCount } from '../../engine/rpg/Character';
import { learnSkill } from '../../engine/rpg/Skills';
import { questReady } from '../../engine/rpg/Quests';
import { legacyCampaign } from '../persistence/legacyFixture';
import { followCamera, screenToWorld, worldToScreen } from '../../renderer/Camera';

const content = loadGameContent();
const definition = content.data.dungeons[0];
const sessions: JourneySession[] = [];
const battles: BattleSession[] = [];
afterEach(() => {
  battles.splice(0).forEach((battle) => battle.dispose());
  sessions.splice(0).forEach((session) => session.dispose());
});
function create(seed = 7, registry = content) {
  const session = new JourneySession(registry, undefined, seed);
  sessions.push(session);
  session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 5 });
  session.dispatch({ type: 'INTERACT', objectId: 'dungeon-entrance' });
  session.dispatch({
    type: 'OFFER_ITEM',
    objectId: 'dungeon-entrance',
    item: { itemId: 'potion' },
  });
  return session;
}
function win(session: JourneySession) {
  const battle = session.createBattle();
  battles.push(battle);
  const player = battle.engine.getEntity('player')!;
  player.combatant!.attack = 10000;
  player.combatant!.hitChance = 1;
  player.combatant!.criticalChance = 0;
  player.combatant!.defense = 10000;
  for (const enemy of battle.engine.world.entities.filter((entity) => entity.enemy))
    enemy.health!.current = 1;
  while (!battle.combat.result) {
    if (battle.battle.phase === 'enemyTurn') {
      battle.advanceEnemyTurns();
      continue;
    }
    battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: battle.battle.validTargetIds()[0] });
    battle.dispatch({ type: 'CONFIRM_ACTION' });
  }
  expect(battle.combat.result).toBe('victory');
  session.finishBattle(battle);
  battle.dispose();
  return battle;
}
function travel(session: JourneySession, point: { x: number; y: number }) {
  for (let i = 0; i < 30; i++) {
    if (session.toSave().pending) win(session);
    if (distance(session.toSave().position, point) === 0) return;
    session.dispatch({ type: 'TRAVEL_TO', ...point });
    if (distance(session.toSave().position, point) === 0) return;
  }
  throw new Error('Travel did not finish');
}
function interact(session: JourneySession, objectId: string) {
  for (let i = 0; i < 30; i++) {
    if (session.toSave().pending) win(session);
    const obj = session.map.objects.find((obj) => obj.id === objectId)!;
    const position = session.toSave().position;
    if (distance(position, obj) <= 1) {
      session.dispatch({ type: 'INTERACT', objectId });
      return;
    }
    const paths = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ]
      .map(([dx, dy]) => ({ x: obj.x + dx, y: obj.y + dy }))
      .filter((p) => isWalkable(session.map, p))
      .map((point) => ({ point, path: findPath(session.map, position, point) }))
      .filter((entry) => entry.path.length)
      .sort((a, b) => a.path.length - b.path.length);
    expect(paths.length).toBeGreaterThan(0);
    travel(session, paths[0].point);
  }
  throw new Error('Interaction did not finish');
}
function clearOrdinary(session: JourneySession) {
  const blueprint = session.toSave().dungeon!.blueprint;
  for (const encounter of blueprint.encounters.filter((entry) => entry.kind === 'monster')) {
    if (session.toSave().dungeon!.cleared.includes(encounter.objectId)) continue;
    const obj = blueprint.world.objects.find((obj) => obj.id === encounter.objectId)!;
    travel(session, obj);
    if (session.toSave().pending) win(session);
  }
  for (const encounter of blueprint.encounters.filter((entry) => entry.kind === 'mimic')) {
    interact(session, encounter.objectId);
    win(session);
  }
}
function resume(session: JourneySession) {
  const saved = parseSave(JSON.parse(encodeSave(session.toSave(), content)), content);
  const resumed = new JourneySession(content, saved.campaign);
  sessions.push(resumed);
  expect(resumed.toSave()).toEqual(session.toSave());
  return resumed;
}

function watchingSeal(session: JourneySession) {
  const saved = session.toSave();
  saved.hero = cloneData(learnSkill(saved.hero, 'smash', content));
  saved.hero.quests['refuge-preparations'] = {
    status: 'completed',
    stageId: 'bring-provisions',
    counts: { 'grocery-visit': 1 },
    claimId: 'quest/refuge-preparations/once',
  };
  saved.hero.quests['broken-seal'] = {
    status: 'active',
    stageId: 'seal-depths',
    counts: { 'practice-smash': 3 },
  };
  const restored = new JourneySession(content, saved);
  sessions.push(restored);
  return restored;
}

describe('seeded dungeon geometry and content', () => {
  it('spawns spider encounters and a giant black spider boss with their own sprites', () => {
    const spiderIds = ['white-spider', 'black-spider', 'red-spider'];
    const seen = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const blueprint = generateDungeon(definition, seed);
      for (const encounter of blueprint.encounters) {
        const enemies = encounter.map.spawns.filter((spawn) => spawn.kind === 'enemy');
        expect(enemies.filter((spawn) => spawn.definitionId === 'giant-black-spider')).toHaveLength(
          encounter.kind === 'boss' ? 1 : 0,
        );
        for (const spawn of enemies) {
          const entity = content.spawn(
            spawn.definitionId,
            spawn.entityId,
            'enemy',
            spawn.x,
            spawn.y,
          );
          expect(entity.sprite).toMatchObject({ atlas: spawn.definitionId, frame: 0 });
          expect(
            content.data.atlases.find((atlas) => atlas.id === entity.sprite!.atlas),
          ).toMatchObject({ columns: 1, rows: 1, frameWidth: 32, frameHeight: 32 });
          if (spawn.definitionId !== 'giant-black-spider') {
            expect(spiderIds).toContain(spawn.definitionId);
            seen.add(spawn.definitionId);
          } else {
            expect(entity.name).toBe('Giant black spider');
            expect(entity.health!.max).toBeGreaterThan(
              content.spawn('black-spider', 'regular', 'enemy', 0, 0).health!.max,
            );
          }
        }
      }
    }
    expect([...seen].sort()).toEqual([...spiderIds].sort());
  });
  it('generates deterministic connected layouts with required room types and isolated gates', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const blueprint = generateDungeon(definition, seed);
        expect(blueprint).toEqual(generateDungeon(definition, seed));
        expect(
          blueprint.rooms.filter((room) => !['start', 'boss', 'treasure'].includes(room.kind))
            .length,
        ).toBeGreaterThanOrEqual(8);
        expect(blueprint.rooms.length).toBeLessThanOrEqual(15);
        validateDungeon(
          createDungeonRun(blueprint, { worldId: 'refuge', position: { x: 7, y: 5 } }),
          content,
        );
        const reached = reachableTiles(blueprint.world);
        expect(reached.has('49,' + blueprint.rooms.find((r) => r.kind === 'boss')!.y)).toBe(false);
        expect(blueprint.world.objects.filter((obj) => obj.kind === 'finalChest')).toHaveLength(5);
      }),
      { seed: 20260929, numRuns: 200 },
    );
    expect(generateDungeon(definition, 1)).not.toEqual(generateDungeon(definition, 2));
  }, 20000);
  it('hides mimics, rewards and fountain outcomes in the exploration map', () => {
    const blueprint = generateDungeon(definition, 3);
    const run = createDungeonRun(blueprint, { worldId: 'refuge', position: { x: 7, y: 5 } });
    const visible = projectDungeonMap(run);
    for (const mimic of blueprint.encounters.filter((entry) => entry.kind === 'mimic'))
      expect(visible.objects.find((obj) => obj.id === mimic.objectId)).toMatchObject({
        kind: 'chest',
        name: 'Treasure chest',
        encounterMap: undefined,
      });
    expect(visible.objects.some((obj) => obj.kind === 'mimic' || obj.itemId)).toBe(false);
  });
  it('rejects dangling dungeon definitions, enemies, effects and rewards', () => {
    for (const mutate of [
      (raw: typeof content.data) => {
        raw.dungeons[0].mimicId = 'missing';
      },
      (raw: typeof content.data) => {
        raw.dungeons[0].fountainIds = ['burn'];
      },
      (raw: typeof content.data) => {
        raw.dungeons[0].finalRewards[0].itemId = 'missing';
      },
      (raw: typeof content.data) => {
        raw.worlds[0].objects.at(-1)!.dungeonId = 'missing';
      },
    ]) {
      const raw = structuredClone(content.data);
      mutate(raw);
      expect(() => new ContentRegistry(raw)).toThrow();
    }
  });
});

describe('dungeon progression', () => {
  it('continues from cleared Moss Halls without an offering through rooms, the spider boss, treasure and a safe return', () => {
    const initial = new JourneySession(content);
    sessions.push(initial);
    const saved = initial.toSave();
    saved.worldId = 'halls';
    saved.position = { x: 8, y: 3 };
    saved.cleared = ['halls/slime-guard', 'halls/elder-guard'];
    saved.hero.inventory = {};
    let session = new JourneySession(content, saved);
    sessions.push(session);
    session.dispatch({ type: 'INTERACT', objectId: 'depths-passage' });
    expect(session.toSave().hero.inventory).toEqual({});
    expect(session.toSave().dungeon!.returnTo).toEqual({
      worldId: 'refuge',
      position: { x: 7, y: 3 },
    });
    const earlyReturn = resume(session);
    interact(earlyReturn, 'goddess-statue');
    expect(earlyReturn.map.id).toBe('refuge');
    expect(earlyReturn.toSave().dungeon).toBeUndefined();
    session = resume(session);
    clearOrdinary(session);
    interact(session, 'boss-key');
    interact(session, 'boss-gate');
    const gate = session.map.objects.find((object) => object.id === 'boss-gate')!;
    travel(session, { x: 50, y: gate.y });
    const bossBattle = session.createBattle();
    battles.push(bossBattle);
    expect(
      bossBattle.engine.world.entities.some(
        (entity) => entity.enemy && entity.name === 'Giant black spider',
      ),
    ).toBe(true);
    bossBattle.dispose();
    win(session);
    interact(session, 'treasure-key');
    interact(session, 'final-chest-1');
    session = resume(session);
    session.dispatch({ type: 'EXIT_DUNGEON' });
    expect(session.map.id).toBe('refuge');
    expect(session.toSave().position).toEqual({ x: 7, y: 3 });
    expect(session.toSave().cleared).toEqual(saved.cleared);
    expect(resume(session).toSave().dungeon).toBeUndefined();
  });
  it('counts the successful final exit once, excludes statue returns, and requires a later keeper report before the title claim', () => {
    const early = watchingSeal(create());
    interact(early, 'goddess-statue');
    expect(early.toSave().hero.quests['broken-seal'].counts['clear-moss-depths']).toBeUndefined();
    expect(early.toSave().hero.earnedTitles).not.toContain('first-delver');
    const session = watchingSeal(create());
    clearOrdinary(session);
    interact(session, 'boss-key');
    interact(session, 'boss-gate');
    const gate = session.map.objects.find((obj) => obj.id === 'boss-gate')!;
    travel(session, { x: 50, y: gate.y });
    win(session);
    interact(session, 'treasure-key');
    interact(session, 'final-chest-1');
    expect(session.toSave().hero.quests['broken-seal'].stageId).toBe('seal-depths');
    const statueReturn = resume(session);
    interact(statueReturn, 'goddess-statue');
    expect(
      statueReturn.toSave().hero.quests['broken-seal'].counts['clear-moss-depths'],
    ).toBeUndefined();
    expect(statueReturn.toSave().hero.earnedTitles).toEqual(['guardian-breaker']);
    expect(session.toSave().hero.earnedTitles).toEqual(['guardian-breaker']);
    const before = session.toSave(),
      candidate = session.progressionCandidate({ type: 'EXIT_DUNGEON' });
    sessions.push(candidate);
    expect(session.toSave()).toEqual(before);
    expect(candidate.toSave().hero.quests['broken-seal']).toMatchObject({
      stageId: 'seal-report',
      counts: { 'clear-moss-depths': 1 },
    });
    session.dispatch({ type: 'EXIT_DUNGEON' });
    expect(session.toSave()).toEqual(candidate.toSave());
    expect(questReady(session.toSave().hero, content.data.quests[1])).toBe(false);
    interact(session, 'keeper');
    expect(questReady(session.toSave().hero, content.data.quests[1])).toBe(true);
    session.dispatch({ type: 'CLAIM_QUEST', questId: 'broken-seal', objectId: 'keeper' });
    expect(session.toSave().hero.earnedTitles).toEqual([
      'first-delver',
      'guardian-breaker',
      'seals-witness',
    ]);
    expect(resume(session).toSave().hero.quests['broken-seal'].status).toBe('completed');
  });
  it('starts beside the goddess and ends runs while retaining resources and generating a fresh layout', () => {
    const session = create();
    const initial = session.toSave();
    expect(initial.position).toEqual(initial.dungeon!.blueprint.world.entry);
    expect(() => session.dispatch({ type: 'EXIT_DUNGEON' })).toThrow('Claim');
    session.dispatch({ type: 'INTERACT', objectId: 'goddess-statue' });
    expect(session.toSave()).toMatchObject({
      worldId: 'refuge',
      position: initial.dungeon!.returnTo.position,
      hero: initial.hero,
    });
    expect(session.toSave().dungeon).toBeUndefined();
    session.dispatch({ type: 'INTERACT', objectId: 'dungeon-entrance' });
    session.dispatch({
      type: 'OFFER_ITEM',
      objectId: 'dungeon-entrance',
      item: { itemId: 'potion' },
    });
    expect(session.toSave().dungeon!.blueprint.seed).not.toBe(initial.dungeon!.blueprint.seed);
  });
  it('requires every hidden mimic, manual key pickup, boss victory and a single final reward, including reloads', () => {
    let session = create();
    const blueprint = session.toSave().dungeon!.blueprint;
    const bossGate = blueprint.world.objects.find((obj) => obj.id === 'boss-gate')!;
    travel(session, { x: bossGate.x - 1, y: bossGate.y });
    expect(() => session.dispatch({ type: 'INTERACT', objectId: bossGate.id })).toThrow(
      'every enemy',
    );
    expect(() => session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow(
      'blocked',
    );
    expect(findPath(session.map, session.toSave().position, { x: 50, y: bossGate.y })).toEqual([]);
    for (const encounter of blueprint.encounters.filter((entry) => entry.kind === 'monster')) {
      if (session.toSave().dungeon!.cleared.includes(encounter.objectId)) continue;
      travel(
        session,
        blueprint.world.objects.find((obj) => obj.id === encounter.objectId)!,
      );
      if (session.toSave().pending) win(session);
    }
    expect(remainingEnemies(session.toSave().dungeon!)).toBe(
      blueprint.encounters.filter((entry) => entry.kind === 'mimic').length,
    );
    expect(session.toSave().dungeon!.bossKey.status).toBe('absent');
    const mimics = blueprint.encounters.filter((entry) => entry.kind === 'mimic');
    for (const encounter of mimics) {
      interact(session, encounter.objectId);
      session = resume(session);
      const finished = win(session);
      expect(() => session.finishBattle(finished)).toThrow('ready');
    }
    expect(remainingEnemies(session.toSave().dungeon!)).toBe(0);
    const lastMimic = blueprint.world.objects.find((obj) => obj.id === mimics.at(-1)!.objectId)!;
    expect(session.toSave().dungeon!.bossKey).toEqual({
      status: 'dropped',
      position: { x: lastMimic.x, y: lastMimic.y },
    });
    session = resume(session);
    travel(session, { x: bossGate.x - 1, y: bossGate.y });
    expect(() => session.dispatch({ type: 'INTERACT', objectId: bossGate.id })).toThrow('Pick up');
    interact(session, 'boss-key');
    session = resume(session);
    interact(session, 'boss-gate');
    session = resume(session);
    expect(session.toSave().dungeon!.bossKey.status).toBe('spent');
    travel(session, { x: 50, y: bossGate.y });
    expect(session.toSave().pending?.objectId).toBe('boss-room-encounter');
    session = resume(session);
    win(session);
    expect(session.toSave().dungeon!.treasureKey.status).toBe('dropped');
    session = resume(session);
    const finalChest = blueprint.world.objects.find((obj) => obj.id === 'final-chest-1')!;
    expect(() => interact(session, finalChest.id)).toThrow('Pick up');
    expect(session.toSave().dungeon!.treasureKey.status).toBe('dropped');
    interact(session, 'treasure-key');
    session = resume(session);
    interact(session, finalChest.id);
    session = resume(session);
    expect(session.toSave().dungeon).toMatchObject({
      selectedChest: finalChest.id,
      treasureKey: { status: 'spent' },
    });
    const before = session.toSave();
    expect(() => session.dispatch({ type: 'INTERACT', objectId: finalChest.id })).toThrow(
      'only one',
    );
    expect(session.toSave()).toEqual(before);
    expect(
      blueprint.world.objects
        .filter((obj) => obj.kind === 'finalChest')
        .every((obj) => session.isClaimed(obj.id)),
    ).toBe(true);
    session.dispatch({ type: 'EXIT_DUNGEON' });
    const { earnedTitles, titleCollection, ...afterHero } = session.toSave().hero;
    const {
      earnedTitles: beforeTitles,
      titleCollection: beforeCollection,
      ...beforeHero
    } = before.hero;
    expect(afterHero).toEqual(beforeHero);
    expect(earnedTitles).toEqual([...beforeTitles, 'first-delver'].sort());
    expect(titleCollection.evidence).toEqual({
      ...beforeCollection.evidence,
      'clear/moss-depths': 1,
    });
    expect(session.toSave().dungeon).toBeUndefined();
    expect(session.toSave().worldId).toBe('refuge');
  });
  it('keeps treasure locked if the boss dies before its companions', () => {
    let session = create();
    for (
      let seed = 8;
      session.toSave().dungeon!.blueprint.encounters.find((e) => e.kind === 'boss')!.map.spawns
        .length < 3;
      seed++
    )
      session = create(seed);
    clearOrdinary(session);
    interact(session, 'boss-key');
    interact(session, 'boss-gate');
    const bossRoom = session
      .toSave()
      .dungeon!.blueprint.rooms.find((room) => room.kind === 'boss')!;
    travel(session, { x: bossRoom.x, y: bossRoom.y + 4 });
    const battle = session.createBattle();
    battles.push(battle);
    const player = battle.engine.getEntity('player')!;
    player.combatant!.attack = 10000;
    player.combatant!.hitChance = 1;
    const boss = battle.map.spawns.find((spawn) => spawn.definitionId === 'giant-black-spider')!;
    battle.engine.getEntity(boss.entityId)!.health!.current = 1;
    battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: boss.entityId });
    battle.dispatch({ type: 'CONFIRM_ACTION' });
    expect(battle.combat.result).toBeUndefined();
    expect(session.toSave().dungeon!.treasureKey.status).toBe('absent');
    expect(() => session.finishBattle(battle)).toThrow('ready');
    expect(session.map.objects.find((obj) => obj.id === 'treasure-gate')!.blocked).toBe(true);
  });
  it('keeps final chest selection and the key unchanged when inventory rejects the reward', () => {
    const session = create();
    clearOrdinary(session);
    interact(session, 'boss-key');
    interact(session, 'boss-gate');
    const gate = session.map.objects.find((obj) => obj.id === 'boss-gate')!;
    travel(session, { x: 50, y: gate.y });
    win(session);
    interact(session, 'treasure-key');
    const chest = session
      .toSave()
      .dungeon!.blueprint.world.objects.find((obj) => obj.id === 'final-chest-1')!;
    travel(session, { x: chest.x - 1, y: chest.y });
    const saved = session.toSave();
    addItem(saved.hero, chest.itemId!, 999 - itemCount(saved.hero, chest.itemId!), content);
    const restored = new JourneySession(content, saved);
    sessions.push(restored);
    expect(() => restored.dispatch({ type: 'INTERACT', objectId: chest.id })).toThrow('full');
    expect(restored.toSave()).toEqual(saved);
  });
  it('ends a defeated run, clears fountain effects and keys, restores resources and halves gold', () => {
    const session = watchingSeal(create());
    const fountain = session.toSave().dungeon!.blueprint.fountains[0];
    interact(session, fountain.objectId);
    const saved = session.toSave();
    saved.hero.gold = 101;
    const restored = new JourneySession(content, saved);
    sessions.push(restored);
    const monster =
      saved.dungeon!.blueprint.encounters.find(
        (e) => e.kind === 'monster' && !saved.dungeon!.cleared.includes(e.objectId),
      ) ?? saved.dungeon!.blueprint.encounters.find((e) => e.kind === 'mimic')!;
    if (monster.kind === 'mimic') interact(restored, monster.objectId);
    else
      travel(
        restored,
        saved.dungeon!.blueprint.world.objects.find((obj) => obj.id === monster.objectId)!,
      );
    const goldBefore = restored.toSave().hero.gold;
    const battle = restored.createBattle();
    battles.push(battle);
    battle.engine.getEntity('player')!.health!.current = 1;
    for (const enemy of battle.engine.world.entities.filter((entity) => entity.enemy)) {
      enemy.combatant!.attack = 100000;
      enemy.combatant!.hitChance = 1;
    }
    battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    battle.dispatch({ type: 'SELECT_TARGET', targetId: battle.battle.validTargetIds()[0] });
    battle.dispatch({ type: 'CONFIRM_ACTION' });
    battle.advanceEnemyTurns();
    expect(battle.combat.result).toBe('defeat');
    restored.finishBattle(battle);
    expect(restored.toSave()).toMatchObject({
      worldId: 'refuge',
      hero: { gold: Math.floor(goldBefore / 2) },
    });
    expect(restored.toSave().dungeon).toBeUndefined();
    expect(restored.toSave().hero.quests['broken-seal']).toMatchObject({
      stageId: 'seal-depths',
      counts: { 'practice-smash': 3 },
    });
    expect(
      restored.toSave().hero.quests['broken-seal'].counts['clear-moss-depths'],
    ).toBeUndefined();
    expect(restored.engine.getEntity('player')!.combatant).toEqual(
      heroStats(restored.toSave().hero, content).combatant,
    );
  });
});

describe('fountains, checkpoints and camera', () => {
  it('accumulates repeated fountain effects once each and rejects stacks above the saved cap', () => {
    const raw = structuredClone(content.data);
    raw.dungeons[0].roomWeights.fountain = 10000;
    raw.dungeons[0].fountainIds = ['focus'];
    const registry = new ContentRegistry(raw);
    const session = create(7, registry);
    const fountains = session.toSave().dungeon!.blueprint.fountains;
    expect(fountains.length).toBeGreaterThan(1);
    for (const fountain of fountains) interact(session, fountain.objectId);
    expect(session.toSave().dungeon!.effects).toEqual([
      { statusId: 'focus', stacks: fountains.length },
    ]);
    const saved = session.toSave();
    saved.dungeon!.effects[0].stacks = 11;
    expect(() => validateCampaign(saved, registry)).toThrow();
  });
  it('stacks effects across encounters, persists outcomes and clears them on statue exit', () => {
    const session = create();
    const fountains = session.toSave().dungeon!.blueprint.fountains;
    for (const fountain of fountains) {
      interact(session, fountain.objectId);
      const before = session.toSave();
      expect(() => session.dispatch({ type: 'INTERACT', objectId: fountain.objectId })).toThrow(
        'dry',
      );
      expect(session.toSave()).toEqual(before);
    }
    const restored = resume(session);
    const saved = restored.toSave();
    const expected = heroStats(saved.hero, content, saved.dungeon!.effects);
    expect(restored.engine.getEntity('player')!.combatant).toEqual(expected.combatant);
    const mimic = saved.dungeon!.blueprint.encounters.find((e) => e.kind === 'mimic')!;
    interact(restored, mimic.objectId);
    const battle = restored.createBattle();
    battles.push(battle);
    expect(battle.engine.getEntity('player')!.combatant).toEqual(
      heroStats(restored.toSave().hero, content, restored.toSave().dungeon!.effects).combatant,
    );
    win(restored);
    expect(restored.toSave().dungeon!.effects).toEqual(saved.dungeon!.effects);
    interact(restored, 'goddess-statue');
    expect(restored.toSave().dungeon).toBeUndefined();
    expect(restored.engine.getEntity('player')!.combatant).toEqual(
      heroStats(restored.toSave().hero, content).combatant,
    );
  });
  it('combines positive and negative modifiers independently of order', () => {
    const session = new JourneySession(content);
    sessions.push(session);
    const hero = session.toSave().hero;
    const effects = [
      { statusId: 'focus', stacks: 2 },
      { statusId: 'weakness', stacks: 10 },
    ];
    expect(heroStats(hero, content, effects)).toEqual(
      heroStats(hero, content, [...effects].reverse()),
    );
    expect(heroStats(hero, content, effects).combatant.attack).toBe(12);
    expect(heroStats(hero, content).combatant.attack).toBe(34);
  });
  it('migrates version 2 and rejects corrupt progress, effects, key states, references and bypass corridors', () => {
    const legacy = new JourneySession(content);
    sessions.push(legacy);
    expect(
      parseSave(
        {
          version: 2,
          savedAt: new Date().toISOString(),
          campaign: legacyCampaign(legacy.toSave()),
        },
        content,
      ),
    ).toMatchObject({
      version: 13,
      campaign: { ...legacy.toSave(), hero: { ...legacy.toSave().hero, ap: 0 } },
    });
    const session = create();
    for (const mutate of [
      (run: NonNullable<ReturnType<JourneySession['toSave']>['dungeon']>) => {
        run.bossKey.status = 'held';
      },
      (run: NonNullable<ReturnType<JourneySession['toSave']>['dungeon']>) => {
        run.bossDoorOpened = true;
      },
      (run: NonNullable<ReturnType<JourneySession['toSave']>['dungeon']>) => {
        run.cleared.push('missing');
      },
      (run: NonNullable<ReturnType<JourneySession['toSave']>['dungeon']>) => {
        run.effects.push({ statusId: 'focus', stacks: 10 });
      },
      (run: NonNullable<ReturnType<JourneySession['toSave']>['dungeon']>) => {
        run.blueprint.encounters[0].map.spawns[1].definitionId = 'missing';
      },
      (run: NonNullable<ReturnType<JourneySession['toSave']>['dungeon']>) => {
        const gate = run.blueprint.world.objects.find((obj) => obj.id === 'boss-gate')!;
        for (let x = 48; x <= 50; x++) run.blueprint.world.tiles[(gate.y - 1) * 72 + x] = 0;
      },
    ]) {
      const saved = session.toSave();
      mutate(saved.dungeon!);
      expect(() => validateCampaign(saved, content)).toThrow();
    }
    const behindGate = session.toSave();
    const bossRoom = behindGate.dungeon!.blueprint.rooms.find((room) => room.kind === 'boss')!;
    behindGate.position = { x: bossRoom.x, y: bossRoom.y };
    expect(() => validateCampaign(behindGate, content)).toThrow('bypasses');
    const detached = session.toSave();
    detached.dungeon!.blueprint.world.tiles.fill(0);
    expect(session.toSave().dungeon!.blueprint.world.tiles).not.toEqual(
      detached.dungeon!.blueprint.world.tiles,
    );
    expect(Reflect.set(session.map.tiles, '0', 0)).toBe(false);
  });
  it('keeps camera bounds and touch coordinates aligned on phone and tablet viewports', () => {
    for (const width of [240, 350, 560])
      for (const point of [
        { x: 16, y: 16 },
        { x: 900, y: 600 },
        { x: 2290, y: 1500 },
      ]) {
        const camera = followCamera(
          point,
          { width: 2304, height: 1536 },
          { width, height: Math.min(width, 420) },
        );
        expect(camera.x).toBeGreaterThanOrEqual(0);
        expect(camera.x + width).toBeLessThanOrEqual(2304);
        expect(screenToWorld(worldToScreen(point, camera), camera)).toEqual(point);
      }
    const camera = followCamera(
      { x: 50, y: 50 },
      { width: 100, height: 100 },
      { width: 300, height: 300 },
    );
    expect(camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});
