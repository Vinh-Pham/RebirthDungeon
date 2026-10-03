import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDraft } from 'immer';
import { loadGameContent } from '../../data/content';
import { cloneData } from '../../engine/cloneData';
import { immutableData, produceState } from '../../engine/immutableState';
import { addItem, applyHero, createHero } from '../../engine/rpg/Character';
import { insertSkillPage, learnSkill, readSkillBook } from '../../engine/rpg/Skills';
import type { Entity } from '../../engine/ecs/Entity';
import {
  acceptQuest,
  claimQuest,
  reconcileQuests,
  recordQuestWorldEvidence,
} from '../../engine/rpg/Quests';
import { applyEnchant } from '../../engine/rpg/Enchants';
import { createDungeonRun, generateDungeon } from '../../engine/dungeon/Dungeon';
import { findPath, isWalkable } from '../../engine/world/TileMap';
import { JourneySession } from '../../game/JourneySession';
import type { BattleSession } from '../../game/BattleSession';
import type { CampaignState } from '../../persistence/SaveSchema';
import * as SaveSchema from '../../persistence/SaveSchema';
import { AutoSaver } from '../../persistence/AutoSaver';
import { SaveRepository, type SaveRow } from '../../persistence/SaveRepository';

const content = loadGameContent();
const sessions: JourneySession[] = [];
const battles: BattleSession[] = [];
function create(state?: CampaignState) {
  const session = new JourneySession(content, state);
  sessions.push(session);
  return session;
}
function assertFrozenTree(value: unknown) {
  if (!value || typeof value !== 'object') return;
  expect(isDraft(value)).toBe(false);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) assertFrozenTree(child);
}
afterEach(() => {
  battles.splice(0).forEach((battle) => battle.dispose());
  sessions.splice(0).forEach((session) => session.dispose());
  vi.restoreAllMocks();
});

describe('immutable campaign boundaries', () => {
  it('shares untouched branches while keeping old views stable and observation pure', () => {
    const session = create();
    const before = session.getSnapshot();
    const saved = session.toSave();
    const listener = vi.fn();
    session.subscribe(listener);
    expect(session.getSnapshot()).toBe(before);
    expect(session.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    const after = session.getSnapshot();
    expect(after.state).not.toBe(before.state);
    expect(after.state.hero.inventory).toBe(before.state.hero.inventory);
    expect(after.state.hero.weapons).toBe(before.state.hero.weapons);
    expect(after.state.hero.learnedSkills).toBe(before.state.hero.learnedSkills);
    expect(after.state.randomState).toBe(before.state.randomState);
    expect(after.map).toBe(before.map);
    expect(before.state).toEqual(saved);
    expect(listener).toHaveBeenCalledTimes(1);
    assertFrozenTree(after);
    expect(Reflect.set(after.state.hero.inventory, 'potion', 900)).toBe(false);
    session.dispatch({ type: 'CLOSE_SERVICE' });
    expect(session.getSnapshot().state).toBe(after.state);
  });

  it('adopts external saves without freezing them and returns detached editable exports', () => {
    const input = create().toSave();
    const session = create(input);
    const before = session.getSnapshot();
    input.hero.inventory.potion = 900;
    input.position.x = 99;
    expect(Object.isFrozen(input.hero.inventory)).toBe(false);
    const exported = session.toSave();
    exported.hero.inventory.potion = 901;
    exported.position.x = 100;
    expect(session.getSnapshot()).toBe(before);
    expect(session.toSave().hero.inventory.potion).toBe(2);
  });

  it('rolls back a late page-capacity rejection including costs, view and notifications', () => {
    const state = create().toSave();
    addItem(state.hero, 'sword-manual-unfinished', 1, content);
    for (let i = 1; i <= 3; i++) addItem(state.hero, `sword-page-${i}`, 1, content);
    state.hero = cloneData(insertSkillPage(state.hero, 'sword-manual', 'sword-page-1', content));
    state.hero = cloneData(insertSkillPage(state.hero, 'sword-manual', 'sword-page-2', content));
    addItem(state.hero, 'sword-manual', 999, content);
    const session = create(state);
    const before = session.getSnapshot();
    const player = cloneData(session.engine.getEntity('player'));
    const notify = vi.fn();
    session.subscribe(notify);
    session.engine.events.subscribe(notify);
    expect(() =>
      session.dispatch({
        type: 'INSERT_SKILL_PAGE',
        recipeId: 'sword-manual',
        pageId: 'sword-page-3',
      }),
    ).toThrow('full');
    expect(session.getSnapshot()).toBe(before);
    expect(session.engine.random.snapshot()).toEqual(before.state.randomState);
    expect(session.engine.getEntity('player')).toEqual(player);
    expect(notify).not.toHaveBeenCalled();
  });

  it('discards staged generation draws, offerings and service metadata on validation failure', () => {
    const session = create();
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 5 });
    session.dispatch({ type: 'INTERACT', objectId: 'dungeon-entrance' });
    const before = session.getSnapshot();
    // Generation has already consumed RNG and the offering when this reference is validated.
    const validate = vi.spyOn(SaveSchema, 'validateCampaign').mockImplementation((candidate) => {
      expect((candidate as CampaignState).dungeon).toBeDefined();
      expect((candidate as CampaignState).hero.inventory.potion).toBe(
        before.state.hero.inventory.potion - 1,
      );
      expect((candidate as CampaignState).randomState).not.toEqual(before.state.randomState);
      throw new Error('Candidate rejected');
    });
    expect(() =>
      session.dispatch({
        type: 'OFFER_ITEM',
        objectId: 'dungeon-entrance',
        item: { itemId: 'potion' },
      }),
    ).toThrow('Candidate rejected');
    expect(validate).toHaveBeenCalledTimes(1);
    validate.mockRestore();
    expect(session.getSnapshot()).toBe(before);
    expect(session.engine.random.snapshot()).toEqual(before.state.randomState);
    session.dispatch({
      type: 'OFFER_ITEM',
      objectId: 'dungeon-entrance',
      item: { itemId: 'potion' },
    });
    const control = create(cloneData(before.state));
    control.dispatch({ type: 'INTERACT', objectId: 'dungeon-entrance' });
    control.dispatch({
      type: 'OFFER_ITEM',
      objectId: 'dungeon-entrance',
      item: { itemId: 'potion' },
    });
    expect(session.toSave()).toEqual(control.toSave());
  });

  it('shares large generated geometry through moves and independent durable candidates', () => {
    const state = create().toSave();
    for (let i = 0; i < 200; i++) addItem(state.hero, 'iron-blade', 1, content);
    state.dungeon = createDungeonRun(
      generateDungeon(content.data.dungeons[0], 56789, state.hero.classId),
      { worldId: state.worldId, position: state.position },
    );
    state.worldId = state.dungeon.blueprint.world.id;
    state.position = { ...state.dungeon.blueprint.world.entry };
    const session = create(state);
    const before = session.getSnapshot();
    const step = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].find(([dx, dy]) =>
      isWalkable(session.map, { x: state.position.x + dx, y: state.position.y + dy }),
    )!;
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: step[0], dy: step[1] });
    expect(session.getSnapshot().state.dungeon).toBe(before.state.dungeon);
    expect(session.getSnapshot().map).toBe(before.map);
    const current = session.getSnapshot();
    const candidate = session.progressionCandidate({
      type: 'SET_ITEM_HOTBAR',
      itemId: 'potion',
      assigned: true,
    });
    sessions.push(candidate);
    expect(candidate.getSnapshot().state.dungeon).toBe(current.state.dungeon);
    expect(candidate.getSnapshot().state.hero.weapons).toBe(current.state.hero.weapons);
    expect(candidate.getSnapshot().state.hero.itemHotbar).toContain('potion');
    expect(session.getSnapshot()).toBe(current);
    expect(candidate.engine).not.toBe(session.engine);
    candidate.engine.getEntity('player')!.inventory!.potion = 900;
    expect(session.engine.getEntity('player')!.inventory!.potion).toBe(2);
    expect(candidate.getSnapshot().state.hero.inventory.potion).toBe(2);
  });

  it('publishes committed state once even if a listener fails, and prevents reentry', () => {
    const session = create();
    const calls: string[] = [];
    session.subscribe(() => {
      throw new Error('Display failed');
    });
    session.subscribe(() => {
      calls.push('view');
      expect(session.getSnapshot().state.position).toEqual({ x: 3, y: 3 });
      expect(() => session.dispatch({ type: 'REST', entityId: 'player' })).toThrow('resolving');
    });
    session.engine.events.on('WORLD_MOVED', () => {
      calls.push('event');
      expect(session.engine.getEntity('player')!.position).toEqual({ x: 3, y: 3 });
    });
    expect(() => session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 })).toThrow(
      'Campaign committed',
    );
    expect(calls).toEqual(['view', 'event']);
    expect(session.toSave().position).toEqual({ x: 3, y: 3 });
  });

  it('retains per-step travel commits and the same encounter RNG checkpoint', () => {
    const automatic = create(),
      manual = create();
    const autoEvents: unknown[] = [],
      manualEvents: unknown[] = [];
    automatic.engine.events.subscribe((event) => autoEvents.push(event));
    manual.engine.events.subscribe((event) => manualEvents.push(event));
    for (const session of [automatic, manual]) {
      session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
      session.dispatch({ type: 'INTERACT', objectId: 'east' });
    }
    const path = findPath(manual.map, manual.getSnapshot().state.position, { x: 7, y: 3 });
    const revisions: number[] = [];
    automatic.subscribe(() => revisions.push(automatic.getSnapshot().revision));
    automatic.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    for (const point of path) {
      const position = manual.getSnapshot().state.position;
      manual.dispatch({
        type: 'MOVE',
        entityId: 'player',
        dx: point.x - position.x,
        dy: point.y - position.y,
      });
      if (manual.getSnapshot().state.pending) break;
    }
    expect(revisions.length).toBeGreaterThan(1);
    expect(automatic.toSave()).toEqual(manual.toSave());
    expect(autoEvents).toEqual(manualEvents);
  });

  it('keeps battle entities mutable and isolated from frozen campaign branches', () => {
    const session = create();
    session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
    session.dispatch({ type: 'INTERACT', objectId: 'east' });
    session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    const before = session.getSnapshot();
    const battle = session.createBattle();
    battles.push(battle);
    const entity = battle.engine.getEntity('player')!;
    expect(isDraft(entity.inventory)).toBe(false);
    entity.inventory!.potion = 0;
    entity.health!.current = 1;
    expect(session.getSnapshot()).toBe(before);
    expect(before.state.hero.inventory.potion).toBe(2);
    const restart = session.createBattle();
    battles.push(restart);
    expect(restart.engine.getEntity('player')!.inventory!.potion).toBe(2);
  });

  it('composes book learning and consumption with frozen structurally shared results', () => {
    const hero = createHero(content);
    addItem(hero, 'combat-manual', 1, content);
    const before = immutableData(hero);
    const after = readSkillBook(before, 'combat-manual', content);
    assertFrozenTree(after);
    expect(after.weapons).toBe(before.weapons);
    expect(after.quests).toBe(before.quests);
    expect(after.learnedSkills['combat-mastery'].rank).toBe('F');
    expect(after.inventory['combat-manual']).toBeUndefined();
    expect(before.inventory['combat-manual']).toBe(1);
    expect(() => readSkillBook(after, 'combat-manual', content)).toThrow();
  });

  it('composes quest delivery and skill rewards without mutating frozen intermediate results', () => {
    const quest = {
      ...content.data.quests[0],
      rewards: { ...content.data.quests[0].rewards, skills: ['combat-mastery'] },
    };
    const hero = createHero(content);
    reconcileQuests(hero, content, quest.offerNpc);
    const accepted = acceptQuest(immutableData(hero), quest, content);
    const ready = produceState(accepted, (draft) => {
      addItem(draft, 'bread', 2, content);
      recordQuestWorldEvidence(draft, { kind: 'visit', worldId: 'grocery-interior' }, content);
    });
    const after = claimQuest(ready, quest, content);
    assertFrozenTree(after);
    expect(after.quests[quest.id].status).toBe('completed');
    expect(after.learnedSkills['combat-mastery'].rank).toBe('F');
    expect(after.inventory.bread).toBeUndefined();
    expect(ready.inventory.bread).toBe(2);
    expect(ready.learnedSkills['combat-mastery']).toBeUndefined();
    expect(after.weapons).toBe(ready.weapons);
  });

  it('copies nested ECS components from drafts before those drafts are revoked', () => {
    const hero = createHero(content);
    addItem(hero, 'iron-blade', 1, content);
    hero.equipment.weapon = 'weapon-1';
    const before = immutableData({ hero, effects: [{ statusId: 'focus', stacks: 1 }] });
    const entity: Entity = { id: 'player', player: true };
    const after = produceState(before, (draft) => {
      draft.hero.health -= 1;
      applyHero(entity, draft.hero, content, draft.effects);
    });
    expect(isDraft(entity.statSource!.effects[0])).toBe(false);
    entity.statSource!.effects[0].stacks = 2;
    entity.weapon!.durability = 0;
    entity.inventory!.potion = 0;
    entity.learnedSkills!.firebolt.objectiveCounts.uses = 1;
    expect(after.effects[0].stacks).toBe(1);
    expect(after.hero.weapons['weapon-1'].durability).toBe(60);
    expect(after.hero.inventory.potion).toBe(2);
    expect(after.hero.learnedSkills.firebolt.objectiveCounts).toEqual({});
  });

  it('returns a finalized enchant receipt without a draft escaping', () => {
    const hero = cloneData(learnSkill(immutableData(createHero(content)), 'enchant', content));
    addItem(hero, 'iron-blade', 1, content);
    addItem(hero, 'keen-scroll', 1, content);
    addItem(hero, 'enchant-powder', 1, content);
    const before = immutableData(hero);
    const request = {
      target: { weaponId: 'weapon-1' },
      scrollId: 'keen-scroll',
      powderId: 'enchant-powder',
      operationId: 'enchant-1',
      revision: 1,
    };
    const result = applyEnchant(before, request, content);
    assertFrozenTree(result.hero);
    expect(result.receipt).toBe(
      result.hero.enchanting.receipts.find((receipt) => receipt.id === 'enchant-1'),
    );
    expect(isDraft(result.receipt)).toBe(false);
    expect(Object.isFrozen(result.receipt)).toBe(true);
    const duplicate = applyEnchant(result.hero, request, content);
    expect(duplicate.hero).toBe(result.hero);
    expect(duplicate.receipt).toBe(result.receipt);
    expect(result.hero.armors).toBe(before.armors);
  });

  it('saves a retained frozen checkpoint after later movement and retries the identical state', async () => {
    const session = create();
    const retained = session.getSnapshot().state;
    const rows: SaveRow[] = [];
    let fail = true;
    const repository = new SaveRepository(
      {
        async read() {
          return undefined;
        },
        async list() {
          return rows;
        },
        async close() {},
        async write(row) {
          rows.push(row);
          if (fail) {
            fail = false;
            throw new Error('Offline');
          }
        },
      },
      content,
    );
    const saver = new AutoSaver(repository, () => {});
    saver.schedule(retained);
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
    await expect(saver.flush()).rejects.toThrow('Offline');
    await saver.flush();
    expect(rows).toHaveLength(2);
    expect(JSON.parse(rows[0].payload).campaign).toEqual(retained);
    expect(JSON.parse(rows[1].payload).campaign).toEqual(retained);
    expect(session.getSnapshot().state.position).not.toEqual(retained.position);
    await saver.dispose();
    await repository.close();
  });
});
