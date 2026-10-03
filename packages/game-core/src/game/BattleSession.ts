import { BattlePersistenceSchema } from './BattlePersistence';
import { appendLogs, type LogSink } from '../engine/logging/LogEngine';
import { commandLog, observeGameLogging } from './logging/GameActionLogging';
import type { Immutable } from '../engine/immutableState';
import { EncounterTitles } from '../engine/rpg/Titles';
import { cloneData } from '../engine/cloneData';
import { EncounterTraining, type TrainingLedger } from '../engine/rpg/Skills';
import { EncounterQuests } from '../engine/rpg/Quests';
import { applyHero, createHero, type HeroSnapshot, type Weapon } from '../engine/rpg/Character';
import { calculateCharacterStats, type CharacterStats, type StatSource } from '../engine/rpg/Stats';
import { effectiveEntity } from '../engine/rpg/StatusEffects';
import { createGameEngine } from '../engine/GameEngine';
import { CombatSystem } from '../engine/ecs/systems/CombatSystem';
import { BattleController, type BattlePhase } from '../engine/battle/BattleController';
import type { BattleAction } from '../engine/battle/BattleMachine';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { GameCommand } from '../engine/commands';
import type { GameEvent } from '../engine/events';
import type { Unsubscribe } from '../engine/EventBus';
import type { TileMap } from '../data/schemas/content';
import { MapSchema } from '../data/schemas/content';
import { headlessPresentation, type PresentationFactory } from './Presentation';
import { validateHealth } from '../engine/ecs/components/Health';
import { validateCombatStats } from '../engine/ecs/components/CombatStats';
import type { Entity } from '../engine/ecs/Entity';
import type { RenderEntity } from '../renderer/types';

export interface PersistedBattleState {
  version: 1;
  encounterId: string;
  seed: number;
  randomState: number[];
  entities: Entity[];
  combat: ReturnType<CombatSystem['exportState']>;
  enemyHistory: ReturnType<BattleController['exportState']>;
  training: ReturnType<EncounterTraining['exportState']>;
  quests: ReturnType<EncounterQuests['exportState']>;
  titles: ReturnType<EncounterTitles['snapshot']>;
}
export interface CharacterReview {
  source: StatSource;
  stats: CharacterStats;
  health: number;
  mana: number;
  stamina: number;
  wounds: number;
  fullness: number;
  statuses: { name: string; turns: number; stacks: number }[];
  weapon?: { name: string; durability: number; maxDurability: number };
}
export interface BattleView {
  character?: CharacterReview;
  inventory?: {
    items: Record<string, number>;
    weapon?: Weapon & { id: string };
    ammunitionItemId?: string;
  };
  phase: BattlePhase;
  actionCount: number;
  turnId?: string;
  selectedTargetId?: string;
  selectedAction?: BattleAction;
  entities: readonly RenderEntity[];
  targets: readonly string[];
  log: readonly string[];
  training: TrainingLedger;
}

/** An event-driven, read-only projection for UI; ECS remains authoritative. */
export class BattleSession {
  readonly engine;
  readonly training: EncounterTraining;
  readonly quests: EncounterQuests;
  readonly titles: EncounterTitles;
  readonly combat: CombatSystem;
  readonly battle: BattleController;
  readonly presentation;
  readonly map: TileMap;
  readonly initialEntities: readonly RenderEntity[];
  private snapshot!: BattleView;
  private listeners = new Set<() => void>();
  private cleanup: Unsubscribe[] = [];
  private log: string[] = [];
  private disposed = false;
  private submitting = false;
  private inputLocked = false;

  constructor(
    readonly content: ContentRegistry,
    seed = 12345,
    mapId: string | Immutable<TileMap> = 'chamber',
    hero?: HeroSnapshot,
    effects: readonly { statusId: string; stacks: number }[] = [],
    characterName?: string,
    readonly encounterId = `arena/${seed}`,
    eligibleTraining = false,
    private readonly logSink?: LogSink,
    presentationFactory: PresentationFactory = headlessPresentation,
  ) {
    const map =
      typeof mapId === 'string'
        ? content.data.maps.find((entry) => entry.id === mapId)
        : MapSchema.parse(mapId);
    if (!map) throw new Error(`Unknown map: ${mapId}`);
    this.map = map;
    this.engine = createGameEngine({ seed });
    if (logSink)
      this.cleanup.push(observeGameLogging(this.engine, content, logSink, true, encounterId));
    for (const spawn of map.spawns)
      this.engine.spawn(
        content.spawn(
          spawn.kind === 'player' && hero ? hero.classId : spawn.definitionId,
          spawn.entityId,
          spawn.kind,
          spawn.x * map.tileSize,
          spawn.y * map.tileSize,
        ),
      );
    for (const entity of this.engine.world.entities)
      if (entity.player) applyHero(entity, hero ?? createHero(content), content, effects);
    if (characterName)
      for (const entity of this.engine.world.entities)
        if (entity.player) entity.name = characterName;
    this.training = new EncounterTraining(
      encounterId,
      cloneData((hero ?? createHero(content)).learnedSkills),
      content,
      eligibleTraining,
    );
    this.quests = new EncounterQuests(
      encounterId,
      cloneData(hero ?? createHero(content)),
      content,
      eligibleTraining,
    );
    this.titles = new EncounterTitles(encounterId, eligibleTraining);
    this.combat = new CombatSystem(
      map.spawns.map((spawn) => spawn.entityId),
      {
        content,
        canAct: () => !this.inputLocked && this.battle.isResolving,
        encounterId,
        onOutcome: (outcome) => {
          this.training.record(outcome);
          this.quests.record(outcome);
        },
      },
    );
    this.battle = new BattleController(this.combat, content);
    this.presentation = presentationFactory(this.engine);
    this.initialEntities = this.projectEntities();
    this.refresh();
    try {
      this.cleanup.push(
        this.engine.events.subscribe((event) => {
          this.record(event);
          this.refresh();
        }),
      );
      this.engine.addSystem(this.combat);
      this.engine.addSystem(this.battle);
      this.cleanup.push(this.battle.subscribe(() => this.refresh()));
      this.engine.dispatch({ type: 'START_BATTLE' });
      this.refresh();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  exportState(): PersistedBattleState {
    if (!['selectingAction', 'victory', 'defeat'].includes(this.battle.phase))
      throw new Error('Battle must be at a stable boundary');
    return {
      version: 1,
      encounterId: this.encounterId,
      seed: this.engine.seed,
      randomState: this.engine.random.snapshot(),
      entities: cloneData(this.engine.world.entities),
      combat: this.combat.exportState(),
      enemyHistory: this.battle.exportState(),
      training: this.training.exportState(),
      quests: this.quests.exportState(),
      titles: this.titles.snapshot(),
    };
  }
  restoreState(state: PersistedBattleState) {
    BattlePersistenceSchema.parse(state);
    const initial = new Map(this.engine.world.entities.map((entity) => [entity.id, entity]));
    if (
      state.entities.length !== initial.size ||
      state.entities.some(
        (entity) =>
          !initial.has(entity.id) ||
          !!entity.player !== !!initial.get(entity.id)?.player ||
          !!entity.enemy !== !!initial.get(entity.id)?.enemy,
      )
    )
      throw new Error('Saved actors do not match the encounter');
    if (
      state.training.lastAction > state.combat.actionSequence ||
      state.quests.lastAction > state.combat.actionSequence ||
      state.titles.encounterId !== this.encounterId ||
      new Set(state.combat.defending).size !== state.combat.defending.length
    )
      throw new Error('Invalid saved evidence sequence');
    for (const entity of state.entities) {
      for (const resource of [entity.mana, entity.stamina])
        if (resource && resource.current > resource.max) throw new Error('Invalid saved resources');
      for (const [itemId] of Object.entries(entity.inventory ?? {})) this.content.item(itemId);
      for (const skillId of [
        ...(entity.skills ?? []),
        ...Object.keys(entity.cooldowns ?? {}),
        ...Object.keys(entity.learnedSkills ?? {}),
      ])
        this.content.skill(skillId);
      for (const status of entity.statuses ?? []) {
        this.content.status(status.id);
        if (!initial.has(status.sourceId)) throw new Error('Invalid saved status');
      }
      if (
        entity.position &&
        (entity.position.x >= this.map.width * this.map.tileSize ||
          entity.position.y >= this.map.height * this.map.tileSize)
      )
        throw new Error('Invalid saved position');
    }
    const living = state.entities
      .filter(
        (entity) => entity.health && entity.health.current > 0 && entity.combatant && !entity.dead,
      )
      .map((entity) => entity.id);
    if (
      state.combat.turns.ids.length !== living.length ||
      state.combat.turns.ids.some((id) => !living.includes(id))
    )
      throw new Error('Invalid saved turn membership');
    const playerAlive = state.entities.some(
        (entity) => entity.player && entity.health!.current > 0 && !entity.dead,
      ),
      enemyAlive = state.entities.some(
        (entity) => entity.enemy && entity.health!.current > 0 && !entity.dead,
      );
    if (state.combat.outcome !== (!playerAlive ? 'defeat' : !enemyAlive ? 'victory' : undefined))
      throw new Error('Invalid saved encounter result');
    if (state.enemyHistory.some((entry) => !initial.get(entry.id)?.enemy))
      throw new Error('Invalid saved enemy history');

    if (
      state.version !== 1 ||
      state.encounterId !== this.encounterId ||
      state.seed !== this.engine.seed
    )
      throw new Error('Unsupported or mismatched battle snapshot');
    if (
      state.entities.filter((entity) => entity.player).length !== 1 ||
      new Set(state.entities.map((entity) => entity.id)).size !== state.entities.length
    )
      throw new Error('Invalid saved battle actors');
    for (const entity of state.entities) {
      if (entity.health) validateHealth(entity.health);
      if (entity.combatant) validateCombatStats(entity.combatant);
    }
    this.engine.world.clear();
    state.entities.forEach((entity) => this.engine.spawn(cloneData(entity)));
    this.engine.random.restore(state.randomState);
    this.combat.restoreState(state.combat);
    this.battle.restoreState(state.enemyHistory);
    this.training.restoreState(state.training);
    this.quests.restoreState(state.quests);
    this.titles.restoreState(state.titles);
    this.refresh();
  }
  get events() {
    return this.engine.events;
  }
  get error() {
    return this.battle.context.error;
  }
  getActor(id: string) {
    return this.engine.getEntity(id);
  }
  validTargetIds(action?: BattleAction) {
    return this.battle.validTargetIds(action);
  }
  previewSkill(sourceId: string, targetId: string, skillId: string) {
    return this.combat.previewSkill(sourceId, targetId, skillId);
  }
  previewBasic(sourceId: string, targetId: string) {
    return this.combat.previewBasic(sourceId, targetId);
  }
  getSnapshot = (): BattleView => this.snapshot;
  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  dispatch(command: GameCommand): void {
    if (this.disposed || this.inputLocked) {
      const error = this.disposed
        ? 'Battle session has been disposed'
        : 'Save pending. Retry before continuing.';
      if (!this.disposed)
        appendLogs(this.logSink, [
          {
            ...commandLog({ command, committed: false, error }, true),
            encounterId: this.encounterId,
          },
        ]);
      throw new Error(error);
    }
    this.engine.dispatch(command);
  }
  recordInspection(type: string, message: string) {
    if (!this.disposed)
      appendLogs(this.logSink, [
        { category: 'user', type, message, encounterId: this.encounterId },
      ]);
  }
  private rejectPlayerInput(message: string) {
    if (!this.disposed)
      appendLogs(this.logSink, [
        {
          category: 'combat',
          type: 'BATTLE_INPUT_REJECTED',
          message,
          encounterId: this.encounterId,
        },
      ]);
  }
  canAcceptPlayerInput(expectedActionCount: number): boolean {
    return (
      !this.disposed &&
      !this.inputLocked &&
      !this.submitting &&
      !this.presentation.getSnapshot().busy &&
      expectedActionCount === this.combat.completedActions &&
      ['selectingAction', 'selectingTarget'].includes(this.battle.phase) &&
      !!this.engine.getEntity(this.combat.currentTurn() ?? '')?.player
    );
  }
  /** One player intent; retain the controller's authoritative validation and resolution. */
  executePlayerAction(
    action: BattleAction,
    targetId: string,
    expectedActionCount: number,
  ): boolean {
    if (!this.canAcceptPlayerInput(expectedActionCount)) {
      this.rejectPlayerInput(
        'Battle input unavailable while saving, presenting, or waiting for another turn.',
      );
      return false;
    }
    if (!this.battle.validTargetIds(action).includes(targetId)) {
      this.rejectPlayerInput('Choose a living, valid target');
      throw new Error('Choose a living, valid target');
    }
    this.submitting = true;
    try {
      this.dispatch({ type: 'SELECT_ACTION', ...action });
      this.dispatch({ type: 'SELECT_TARGET', targetId });
      this.dispatch({ type: 'CONFIRM_ACTION' });
      return true;
    } finally {
      this.submitting = false;
    }
  }
  /** Use confirms self-only actions and attacks/skills against the last living enemy. */
  selectPlayerAction(action: BattleAction, expectedActionCount: number): boolean {
    if (!this.canAcceptPlayerInput(expectedActionCount)) {
      this.rejectPlayerInput(
        'Battle input unavailable while saving, presenting, or waiting for another turn.',
      );
      return false;
    }
    const targets = this.battle.validTargetIds(action);
    const soleEnemy =
      targets.length === 1 &&
      (action.action === 'attack' || action.action === 'skill') &&
      !!this.engine.getEntity(targets[0])?.enemy;
    if (targets.length === 1 && (targets[0] === this.combat.currentTurn() || soleEnemy)) {
      return this.executePlayerAction(action, targets[0], expectedActionCount);
    }
    this.dispatch({ type: 'SELECT_ACTION', ...action });
    return true;
  }
  advanceEnemyTurns(): void {
    if (this.inputLocked) return;
    // Consecutive enemies resolve immediately; presentation plays separately.
    while (this.battle.phase === 'enemyTurn') this.dispatch({ type: 'ADVANCE_ENEMY_TURN' });
  }
  setInputLocked(locked: boolean) {
    this.inputLocked = locked;
  }
  /** Publish saved configuration without resetting the encounter or its checkpoint. */
  setItemHotbar(ids: readonly string[]) {
    const player = this.engine.world.entities.find((entity) => entity.player);
    if (player) player.itemHotbar = [...ids];
    this.refresh();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanup.forEach((cleanup) => cleanup());
    this.presentation.dispose();
    this.engine.dispose();
    this.listeners.clear();
  }

  private projectEntities(): RenderEntity[] {
    return this.engine.world.entities
      .filter((entity) => entity.sprite && entity.position && entity.health)
      .map((entity) => ({
        id: entity.id,
        name: entity.name ?? entity.id,
        side: entity.player ? 'player' : 'enemy',
        x: entity.position!.x,
        y: entity.position!.y,
        sprite: {
          ...entity.sprite!,
          idleFrames: entity.sprite!.idleFrames ? [...entity.sprite!.idleFrames] : undefined,
        },
        health: entity.health!.current,
        maxHealth: entity.health!.max,
        mana: entity.mana?.current ?? 0,
        maxMana: entity.mana?.max ?? 0,
        dead: !!entity.dead,
        stamina: entity.stamina?.current,
        maxStamina: entity.stamina?.max,
        wounds: entity.wounds,
        fullness: entity.fullness,
        weapon: entity.weapon
          ? {
              itemId: entity.weapon.itemId,
              name: this.content.item(entity.weapon.itemId).name,
              durability: entity.weapon.durability,
              maxDurability: this.content.item(entity.weapon.itemId).maxDurability!,
            }
          : undefined,
        secondaryHand: entity.ammunitionItemId
          ? {
              itemId: entity.ammunitionItemId,
              name: this.content.item(entity.ammunitionItemId).name,
              quantity: entity.inventory?.[entity.ammunitionItemId] ?? 0,
            }
          : undefined,
      }));
  }
  private refresh() {
    const player = this.engine.world.entities.find((entity) => entity.player);
    const stats = player?.statSource
      ? calculateCharacterStats(player.statSource, this.content)
      : undefined;
    const character: CharacterReview | undefined =
      player && stats
        ? {
            source: cloneData(player.statSource!),
            stats: { ...stats, combatant: { ...effectiveEntity(player, this.content).combatant! } },
            health: player.health!.current,
            mana: player.mana!.current,
            stamina: player.stamina!.current,
            wounds: player.wounds!,
            fullness: player.fullness!,
            statuses: (player.statuses ?? []).map((status) => ({
              name: this.content.status(status.id).name,
              turns: status.remainingTurns,
              stacks: status.stacks,
            })),
            weapon: player.weapon
              ? {
                  name: this.content.item(player.weapon.itemId).name,
                  durability: player.weapon.durability,
                  maxDurability: this.content.item(player.weapon.itemId).maxDurability!,
                }
              : undefined,
          }
        : undefined;
    this.snapshot = {
      character,
      inventory: player
        ? {
            items: { ...player.inventory },
            ammunitionItemId: player.ammunitionItemId,
            weapon: player.weapon ? cloneData(player.weapon) : undefined,
          }
        : undefined,
      phase: this.battle.phase,
      actionCount: this.combat.completedActions,
      turnId: this.combat.currentTurn(),
      selectedAction: this.battle.context.action ? { ...this.battle.context.action } : undefined,
      selectedTargetId: this.battle.context.targetId,
      entities: this.projectEntities(),
      targets: this.battle.validTargetIds(),
      log: [...this.log],
      training: this.training.snapshot(),
    };
    this.listeners.forEach((listener) => listener());
  }
  private record(event: GameEvent) {
    const name = (id: string) => this.engine.getEntity(id)?.name ?? id;
    let line: string | undefined;
    if (event.type === 'DAMAGE_DEALT') this.titles.damage(event.targetId, event.amount);
    if (event.type === 'DAMAGE_DEALT')
      line = `${name(event.targetId)} loses ${event.amount} HP${event.critical ? ' · critical' : ''}.`;
    if (event.type === 'ATTACK_MISSED') line = `${name(event.sourceId)} misses.`;
    if (event.type === 'HEALTH_RESTORED')
      line = `${name(event.targetId)} recovers ${event.amount} HP.`;
    if (event.type === 'MANA_RESTORED')
      line = `${name(event.targetId)} recovers ${event.amount} mana.`;
    if (event.type === 'WEAPON_WORN')
      line =
        event.durability === 0
          ? `${this.content.item(event.itemId).name} broke. Its stat bonus is lost until repaired.`
          : `${this.content.item(event.itemId).name} · ${event.durability} durability.`;
    if (event.type === 'RESTED') line = `${name(event.entityId)} rests to recover stamina.`;
    if (event.type === 'DEFENDED')
      line = `${name(event.entityId)} defends, halving attack and spell damage until their next turn and recovering stamina.`;
    if (event.type === 'WOUNDS_RECEIVED')
      line = `${name(event.entityId)} suffers ${event.amount} wounds.`;
    if (event.type === 'SKILL_USED')
      line = `${name(event.sourceId)} casts ${this.content.skill(event.skillId).name}.`;
    if (event.type === 'ITEM_USED')
      line = `${name(event.sourceId)} uses ${this.content.item(event.itemId).name}.`;
    if (event.type === 'STATUS_APPLIED')
      line = `${name(event.entityId)} gains ${this.content.status(event.statusId).name}.`;
    if (event.type === 'STATUS_EXPIRED')
      line = `${this.content.status(event.statusId).name} fades from ${name(event.entityId)}.`;
    if (event.type === 'ENTITY_DIED') line = `${name(event.entityId)} falls.`;
    if (event.type === 'BATTLE_ENDED')
      line =
        event.result === 'victory' ? 'The chamber is clear.' : 'The dungeon claims another warden.';
    if (line) this.log = [...this.log.slice(-7), line];
  }
}
