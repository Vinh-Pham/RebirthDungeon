import type { BattleAvailability, ResolvedPresentation } from '@rebirth/game-core/online/Contracts';
import type { ActivityEvent } from '@rebirth/game-core/online/Audit';
import type { GameplayBattle } from '../game/Gameplay';
import type { BattleView } from '../game/BattleSession';
import type { BattleAction } from '../engine/battle/BattleMachine';
import type { GameCommand } from '../engine/commands';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { RenderEntity } from '../renderer/types';
import type { Entity } from '../engine/ecs/Entity';
import { EventBus } from '../engine/EventBus';
import type { CoreView } from './queries';
type BattleViewInput = Pick<CoreView, 'character' | 'hero' | 'encounter' | 'dungeon' | 'stats'>;
import { cloneData } from '../engine/cloneData';
import { RemotePresentation } from './RemotePresentation';
import type { CommandResult } from './CommandCoordinator';

export class RemoteBattle implements GameplayBattle {
  readonly events = new EventBus();
  readonly presentation = new RemotePresentation();
  readonly initialEntities: readonly RenderEntity[];
  private view!: BattleView;
  private listeners = new Set<() => void>();
  private selection?: BattleAction;
  private chronicle: string[] = [];
  private played = new Set<string>();
  error: string | undefined;
  constructor(
    private current: BattleViewInput,
    readonly content: ContentRegistry,
    private canAct: () => boolean,
    private submit: (action: BattleAction, targetId: string) => void,
    private log: (type: ActivityEvent['type'], message: string) => void,
  ) {
    this.initialEntities = this.entities();
    this.refresh();
  }
  get encounterId() {
    return this.current.encounter!.id;
  }
  get map() {
    return this.current.encounter!.map;
  }
  get availability(): readonly BattleAvailability[] {
    return this.current.encounter!.actions;
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  update(current: BattleViewInput) {
    if (
      current.encounter?.actionSequence !== this.current.encounter?.actionSequence ||
      current.character.revision !== this.current.character.revision
    )
      this.selection = undefined;
    this.current = current;
    this.refresh();
  }
  getActor(id: string): Entity | undefined {
    const actor = this.current.encounter!.actors.find((a) => a.id === id);
    if (!actor) return;
    const spawn = this.map.spawns.find((s) => s.entityId === id)!;
    const definition = actor.player
      ? this.content.data.classes.find((c) => c.id === this.current.hero.classId)!
      : this.content.data.enemies.find((e) => e.id === spawn.definitionId)!;
    return {
      id: actor.id,
      name: actor.name,
      player: actor.player ? true : undefined,
      enemy: actor.enemy ? true : undefined,
      dead: actor.dead ? true : undefined,
      health: actor.health ? cloneData(actor.health) : undefined,
      mana: actor.mana ? cloneData(actor.mana) : undefined,
      stamina: actor.stamina ? cloneData(actor.stamina) : undefined,
      wounds: actor.wounds,
      fullness: actor.fullness,
      weapon: actor.weapon ? cloneData(actor.weapon) : undefined,
      inventory: { ...actor.inventory },
      itemHotbar: [...actor.itemHotbar],
      ammunitionItemId: actor.ammunitionItemId,
      learnedSkills: actor.learnedSkills ? cloneData(actor.learnedSkills) : undefined,
      statuses: cloneData(actor.statuses),
      cooldowns: { ...actor.cooldowns },
      position: actor.position ? cloneData(actor.position) : undefined,
      sprite: cloneData(definition.sprite),
      combatant: { ...definition.combatant },
      statSource: actor.statSource ? cloneData(actor.statSource) : undefined,
      skills: actor.player
        ? Object.keys(actor.learnedSkills ?? {}).filter(
            (id) => this.content.skill(id).kind !== 'passive',
          )
        : [...definition.skills],
    };
  }
  private entities(): RenderEntity[] {
    return this.current.encounter!.actors.map((actor) => {
      const entity = this.getActor(actor.id)!;
      return {
        id: actor.id,
        name: actor.name ?? actor.id,
        side: actor.player ? 'player' : 'enemy',
        x: actor.position?.x ?? 0,
        y: actor.position?.y ?? 0,
        sprite: entity.sprite!,
        health: actor.health?.current ?? 0,
        maxHealth: actor.health?.max ?? 0,
        mana: actor.mana?.current ?? 0,
        maxMana: actor.mana?.max ?? 0,
        stamina: actor.stamina?.current,
        maxStamina: actor.stamina?.max,
        wounds: actor.wounds,
        fullness: actor.fullness,
        dead: actor.dead,
        weapon: actor.weapon
          ? {
              itemId: actor.weapon.itemId,
              name: this.content.item(actor.weapon.itemId).name,
              durability: actor.weapon.durability,
              maxDurability: this.content.item(actor.weapon.itemId).maxDurability!,
            }
          : undefined,
        secondaryHand: actor.ammunitionItemId
          ? {
              itemId: actor.ammunitionItemId,
              name: this.content.item(actor.ammunitionItemId).name,
              quantity: actor.inventory[actor.ammunitionItemId] ?? 0,
            }
          : undefined,
      };
    });
  }
  private refresh() {
    const encounter = this.current.encounter!;
    const player = encounter.actors.find((a) => a.player)!;
    const entity = this.getActor(player.id)!;
    const stats = {
      ...this.current.stats,
      combatant: player.stats ?? entity.combatant!,
      maxHealth: player.health!.max,
      maxMana: player.mana!.max,
      maxStamina: player.stamina!.max,
    };
    this.view = {
      phase:
        this.selection && encounter.phase === 'selectingAction'
          ? 'selectingTarget'
          : encounter.phase,
      actionCount: encounter.actionSequence,
      turnId: encounter.turnId,
      selectedAction: this.selection,
      entities: this.entities(),
      targets: this.selection ? this.validTargetIds(this.selection) : [],
      log: this.chronicle,
      training: {},
      inventory: {
        items: { ...player.inventory },
        weapon: player.weapon,
        ammunitionItemId: player.ammunitionItemId,
      },
      character: {
        source: entity.statSource!,
        stats,
        health: player.health!.current,
        mana: player.mana!.current,
        stamina: player.stamina!.current,
        wounds: player.wounds ?? 0,
        fullness: player.fullness ?? 100,
        statuses: player.statuses.map((s) => ({
          name: this.content.status(s.id).name,
          turns: s.remainingTurns,
          stacks: s.stacks,
        })),
        weapon: player.weapon
          ? {
              name: this.content.item(player.weapon.itemId).name,
              durability: player.weapon.durability,
              maxDurability: this.content.item(player.weapon.itemId).maxDurability!,
            }
          : undefined,
      },
    };
    this.listeners.forEach((listener) => listener());
  }
  private availabilityFor(action: BattleAction) {
    return this.availability.find(
      (a) =>
        a.action.action === action.action &&
        ('skillId' in a.action ? a.action.skillId : undefined) === action.skillId &&
        ('itemId' in a.action ? a.action.itemId : undefined) === action.itemId,
    );
  }
  validTargetIds(action = this.selection) {
    return action ? [...(this.availabilityFor(action)?.targets ?? [])] : [];
  }
  previewSkill(_sourceId: string, targetId: string, skillId: string) {
    return this.preview({ action: 'skill', skillId }, targetId);
  }
  previewBasic(_sourceId: string, targetId: string) {
    return this.preview({ action: 'attack' }, targetId);
  }
  private preview(action: BattleAction, targetId: string) {
    const availability = this.availabilityFor(action);
    if (availability?.reason) throw new Error(availability.reason);
    const result = availability?.previews.find((p) =>
      p.targets.some((t) => t.targetId === targetId),
    );
    if (!result) throw new Error('This preview is unavailable.');
    return result;
  }
  canAcceptPlayerInput(sequence: number) {
    return (
      this.canAct() &&
      !this.presentation.getSnapshot().busy &&
      sequence === this.view.actionCount &&
      ['selectingAction', 'selectingTarget'].includes(this.view.phase)
    );
  }
  executePlayerAction(action: BattleAction, targetId: string, sequence: number) {
    if (!this.canAcceptPlayerInput(sequence)) return false;
    const availability = this.availabilityFor(action);
    if (!availability || availability.reason || !availability.targets.includes(targetId))
      throw new Error(availability?.reason ?? 'Choose a valid target.');
    this.selection = undefined;
    this.log('SELECT_TARGET', `Selected target ${targetId}.`);
    this.submit(action, targetId);
    this.refresh();
    return true;
  }
  selectPlayerAction(action: BattleAction, sequence: number) {
    if (!this.canAcceptPlayerInput(sequence)) return false;
    const availability = this.availabilityFor(action);
    if (!availability || availability.reason)
      throw new Error(availability?.reason ?? 'Action unavailable.');
    this.log('SELECT_ACTION', `Selected ${action.action}.`);
    if (availability.targets.length === 1)
      return this.executePlayerAction(action, availability.targets[0], sequence);
    this.selection = action;
    this.refresh();
    return true;
  }
  dispatch(command: GameCommand) {
    if (command.type !== 'CANCEL_ACTION')
      throw new Error('Submit a complete confirmed battle action.');
    this.log('CANCEL_ACTION', 'Cancelled battle selection.');
    this.selection = undefined;
    this.refresh();
  }
  advanceEnemyTurns() {
    /* Enemy turns are committed with the server action. */
  }
  recordInspection(type: ActivityEvent['type'], message: string) {
    this.log(type, message);
  }
  present(result: CommandResult, previousRevision: number) {
    const presentation = result.receipt.outcome.presentation;
    if (
      !presentation ||
      this.played.has(result.receipt.commandId) ||
      presentation.encounterId !== this.encounterId ||
      result.receipt.committedRevision <= previousRevision ||
      ('updates' in result ? result.snapshotRevision : result.character.revision) !==
        result.receipt.committedRevision ||
      this.current.character.revision !== result.receipt.committedRevision
    )
      return;
    this.played.add(result.receipt.commandId);
    this.play(presentation);
  }
  private play(presentation: ResolvedPresentation) {
    this.presentation.enqueue(presentation.batches);
    for (const batch of presentation.batches) {
      for (const impact of batch.impacts) {
        this.chronicle = [
          ...this.chronicle,
          `${this.getActor(batch.sourceId)?.name ?? batch.sourceId}: ${impact.healing ? 'restored' : 'dealt'} ${impact.amount} ${impact.healing ? 'HP' : 'damage'}.`,
        ].slice(-100);
        try {
          this.events.emit(
            impact.healing
              ? {
                  type: 'HEALTH_RESTORED',
                  sourceId: batch.sourceId,
                  targetId: impact.targetId,
                  amount: impact.amount,
                }
              : {
                  type: 'DAMAGE_DEALT',
                  sourceId: batch.sourceId,
                  targetId: impact.targetId,
                  amount: impact.amount,
                  critical: impact.critical,
                },
          );
        } catch {
          /* Observers cannot change a committed action. */
        }
      }
    }
    this.refresh();
  }
  dispose() {
    this.presentation.dispose();
    this.events.clear();
    this.listeners.clear();
  }
}
