import { describe, expect, it } from 'vitest';
import { newOnlineState, execute, publicView, validateOnlineState } from '../src/online/Runtime';
import {
  ResolvedPresentationSchema,
  CommandSchema,
  GAME_CONTENT_VERSION,
  CommandRequestSchema,
} from '../src/online/Contracts';
import { JourneySession } from '../src/game/JourneySession';
import { gameContent } from '../src/online/Runtime';
import { BattleSession } from '../src/game/BattleSession';
import { addItem, createHero } from '../src/engine/rpg/Character';
import { applyStatus } from '../src/engine/rpg/StatusEffects';
const metadata = {
  id: 'hero',
  name: 'Player',
  age: 12,
  talent: 'warrior' as const,
  revision: 1,
  contentVersion: GAME_CONTENT_VERSION,
  createdAt: 0,
  updatedAt: 0,
};
function encounter() {
  let state = newOnlineState(12345, 'Player', 'warrior');
  for (const command of [
    { type: 'TRAVEL_TO', x: 7, y: 3 },
    { type: 'INTERACT', objectId: 'east' },
    { type: 'TRAVEL_TO', x: 5, y: 3 },
  ] as const)
    state = execute(state, 'Player', command, 1000).state;
  expect(state.battle).toBeDefined();
  return state;
}
describe('authoritative portable execution', () => {
  it('projects legal actions and deterministic damage without consuming RNG or changing state', () => {
    const state = encounter(),
      checkpoint = structuredClone(state);
    const first = publicView(state, metadata),
      second = publicView(state, metadata);
    expect(first).toEqual(second);
    expect(state).toEqual(checkpoint);
    expect(
      first.encounter!.actions.find((a) => a.action.action === 'attack')!.previews.length,
    ).toBeGreaterThan(0);
    const attack = first.encounter!.actions.find((a) => a.action.action === 'attack')!;
    const resolved = execute(
      state,
      'Player',
      { type: 'BATTLE_ACTION', action: { action: 'attack' }, targetId: attack.targets[0] },
      2000,
    );
    expect(resolved.outcome.presentation!.encounterId).toBe(first.encounter!.id);
    expect(resolved.outcome.presentation!.fromActionSequence).toBe(first.encounter!.actionSequence);
    expect(resolved.outcome.presentation!.toActionSequence).toBe(
      resolved.state.battle!.combat.actionSequence,
    );
    expect(resolved.outcome.presentation!.batches.length).toBeGreaterThan(0);
    expect(() => ResolvedPresentationSchema.parse(resolved.outcome.presentation)).not.toThrow();
    expect(JSON.stringify(resolved.outcome)).not.toMatch(/randomState|seed/);
    expect(state).toEqual(checkpoint);
  });
  it('uses exploration consumables through the same rules and rejects forged targets', () => {
    const state = newOnlineState(12345, 'Player', 'warrior');
    state.campaign.hero.health = 1;
    const quantity = state.campaign.hero.inventory.potion;
    const result = execute(state, 'Player', { type: 'USE_ITEM', itemId: 'potion' }, 1000);
    expect(result.state.campaign.hero.health).toBeGreaterThan(1);
    expect(result.state.campaign.hero.inventory.potion).toBe(quantity - 1);
    expect(
      CommandSchema.safeParse({ type: 'USE_ITEM', itemId: 'potion', targetId: 'enemy' }).success,
    ).toBe(false);
    expect(() =>
      execute(encounter(), 'Player', { type: 'USE_ITEM', itemId: 'potion' }, 1000),
    ).toThrow();
  });
  it('rejects forged state, raw combat, debug and presentation commands', () => {
    for (const type of [
      'REST',
      'USE_LIFE_SKILL',
      'ATTACK',
      'DEBUG_GOLD',
      'ADVANCE_ENEMY_TURN',
      'SELECT_ACTION',
      'START_BATTLE',
    ])
      expect(CommandSchema.safeParse({ type }).success).toBe(false);
    expect(CommandSchema.safeParse({ type: 'MOVE', dx: 1, dy: 0, entityId: 'enemy' }).success).toBe(
      false,
    );
    expect(
      CommandSchema.safeParse({
        type: 'BATTLE_ACTION',
        targetId: 'player',
        action: { action: 'rest', damage: 9 },
      }).success,
    ).toBe(false);
    expect(
      CommandRequestSchema.safeParse({
        commandId: crypto.randomUUID(),
        expectedRevision: -1,
        command: { type: 'STOP_REST' },
      }).success,
    ).toBe(false);
  });
  it('rest renews a lease without offline recovery or accelerated pulses', () => {
    let state = newOnlineState(12345, 'Player', 'warrior');
    state.campaign.hero.health = 1;
    state = execute(state, 'Player', { type: 'START_REST' }, 1000).state;
    expect(() => execute(state, 'Player', { type: 'REST_PULSE' }, 1999)).toThrow('one second');
    state = execute(state, 'Player', { type: 'REST_PULSE' }, 2000).state;
    const health = state.campaign.hero.health;
    expect(health).toBeGreaterThan(1);
    state = execute(state, 'Player', { type: 'REST_PULSE' }, 6000).state;
    expect(state.campaign.hero.health).toBe(health);
    state = execute(state, 'Player', { type: 'REST_PULSE' }, 7000).state;
    expect(state.campaign.hero.health).toBeGreaterThan(health);
  });
  it('excludes private streams and generated outcomes from views', () => {
    const state = encounter(),
      view = publicView(state, metadata);
    expect(JSON.stringify(view)).not.toContain('randomState');
    expect(view.hero).not.toHaveProperty('enchanting');
    expect(view.encounter?.actionSequence).toBe(state.battle!.combat.actionSequence);
  });
  it('restores every player boundary to identical future actions and rewards', () => {
    let state = encounter();
    const journey = new JourneySession(gameContent, state.campaign, undefined, 'Player');
    const continuous = journey.createBattle();
    continuous.restoreState(state.battle!);
    try {
      for (let i = 0; i < 120 && !continuous.combat.result; i++) {
        const target = continuous.battle.validTargetIds({ action: 'attack' })[0];
        continuous.executePlayerAction(
          { action: 'attack' },
          target,
          continuous.combat.completedActions,
        );
        continuous.advanceEnemyTurns();
        state = execute(
          state,
          'Player',
          { type: 'BATTLE_ACTION', action: { action: 'attack' }, targetId: target },
          1000 + i,
        ).state;
        expect(state.battle).toEqual(continuous.exportState());
        validateOnlineState(state, 'Player');
      }
      expect(continuous.combat.result).toBeDefined();
      if (continuous.combat.result === 'victory')
        expect(state.rewards).toEqual(journey.victoryOffer(continuous));
      const settled = execute(state, 'Player', { type: 'SETTLE_ENCOUNTER' }, 5000).state;
      journey.finishBattle(continuous);
      expect(settled.campaign).toEqual(journey.toSave());
      expect(settled.battle).toBeUndefined();
      expect(() => execute(settled, 'Player', { type: 'SETTLE_ENCOUNTER' }, 5001)).toThrow();
    } finally {
      continuous.dispose();
      journey.dispose();
    }
  });
  it('resumes defending, consumptions, cooldowns, enemy history and pending evidence', () => {
    const state = encounter();
    const journey = new JourneySession(gameContent, state.campaign);
    const battle = journey.createBattle();
    try {
      battle.restoreState(state.battle!);
      battle.executePlayerAction({ action: 'defend' }, 'player', battle.combat.completedActions);
      battle.advanceEnemyTurns();
      const saved = battle.exportState();
      const restored = new BattleSession(
        gameContent,
        battle.engine.seed,
        battle.map,
        state.campaign.hero,
        undefined,
        'Player',
        battle.encounterId,
        true,
      );
      try {
        restored.restoreState(saved);
        expect(restored.exportState()).toEqual(saved);
        const target = battle.battle.validTargetIds({ action: 'attack' })[0];
        for (const current of [battle, restored]) {
          current.executePlayerAction(
            { action: 'attack' },
            target,
            current.combat.completedActions,
          );
          current.advanceEnemyTurns();
        }
        expect(restored.exportState()).toEqual(battle.exportState());
      } finally {
        restored.dispose();
      }
    } finally {
      battle.dispose();
      journey.dispose();
    }
  });
  it('preserves poison, cooldowns, ammunition, consumptions and weapon breakage at live boundaries', () => {
    const hero = createHero(gameContent);
    addItem(hero, 'short-bow', 1, gameContent);
    addItem(hero, 'arrow', 5, gameContent);
    hero.equipment.weapon = 'weapon-1';
    hero.equipment.secondaryHand = 'arrow';
    hero.itemHotbar = ['potion'];
    hero.weapons['weapon-1'].durability = 1;
    const battle = new BattleSession(gameContent, 1, 'chamber', hero);
    const restored = new BattleSession(gameContent, 1, 'chamber', hero);
    try {
      battle.advanceEnemyTurns();
      const player = battle.engine.getEntity('player')!;
      const enemy = battle.engine.world.entities.find((e) => e.enemy)!;
      player.health!.current = Math.max(10, player.health!.max - 10);
      player.cooldowns = { firebolt: 4 };
      applyStatus(player, 'poison', enemy.id, gameContent, []);
      const checkpoint = battle.exportState();
      restored.restoreState(checkpoint);
      expect(restored.exportState()).toEqual(checkpoint);
      for (const current of [battle, restored]) {
        current.executePlayerAction(
          { action: 'item', itemId: 'potion' },
          'player',
          current.combat.completedActions,
        );
        current.advanceEnemyTurns();
      }
      expect(restored.exportState()).toEqual(battle.exportState());
      expect(battle.engine.getEntity('player')!.inventory!.potion).toBe(
        checkpoint.entities.find((e) => e.player)!.inventory!.potion - 1,
      );
      restored.restoreState(battle.exportState());
      for (const current of [battle, restored]) {
        current.executePlayerAction(
          { action: 'attack' },
          enemy.id,
          current.combat.completedActions,
        );
        current.advanceEnemyTurns();
      }
      expect(restored.exportState()).toEqual(battle.exportState());
      expect(battle.engine.getEntity('player')!.inventory!.arrow).toBe(4);
      expect(battle.engine.getEntity('player')!.weapon!.durability).toBe(0);
    } finally {
      restored.dispose();
      battle.dispose();
    }
  });
  it('rejects corrupted formats, actors, RNG, resources and progression cursors before restore', () => {
    const state = encounter();
    const journey = new JourneySession(gameContent, state.campaign);
    const battle = journey.createBattle();
    try {
      for (const corrupt of [
        (s: any) => {
          s.version = 2;
        },
        (s: any) => {
          s.randomState = [0, 0, 0, 0];
        },
        (s: any) => {
          s.entities.push(s.entities[0]);
        },
        (s: any) => {
          s.entities.find((e: any) => e.player).mana.current = 999999;
        },
        (s: any) => {
          s.training.lastAction = s.combat.actionSequence + 1;
        },
        (s: any) => {
          s.combat.turns.ids = ['unknown'];
        },
      ]) {
        const candidate = structuredClone(state.battle!);
        corrupt(candidate);
        expect(() => battle.restoreState(candidate)).toThrow();
      }
      battle.restoreState(state.battle!);
      expect(battle.exportState()).toEqual(state.battle);
    } finally {
      battle.dispose();
      journey.dispose();
    }
  });
});
