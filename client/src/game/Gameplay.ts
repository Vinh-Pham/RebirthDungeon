import type { z } from 'zod';
import type { ActivityEvent } from '@rebirth/game-core/online/Audit';
import type { LogCategory } from '../engine/logging/LogEngine';
import type { JourneyHost } from './JourneyHost';
import type { BattleSession, BattleView } from './BattleSession';
import type { HeroFacts } from '../engine/rpg/Character';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { Immutable } from '../engine/immutableState';
import type { WorldMap } from '../data/schemas/world';
import type { GameCommand, ProgressionCommand } from '../engine/commands';
import type { EventBus } from '../engine/EventBus';
import type {
  PublicView,
  PreviewRequestSchema,
  PreviewResponseSchema,
  BattleAvailability,
  BattlePreviewSchema,
  OnlineCommand,
} from '@rebirth/game-core/online/Contracts';
import type { AudioSettings } from '../audio/AudioManager';
import type { VictoryLoot } from '@rebirth/game-core/game/VictoryLoot';
export type GameplayProfile = {
  id: string;
  name: string;
  talent: 'warrior' | 'archery' | 'mage';
  age: number;
};
export type GameplayProgressionCommand =
  | ProgressionCommand
  | Extract<OnlineCommand, { type: 'APPLY_ENCHANT' | 'BURN_EQUIPMENT' }>;
export type PreviewSelection = z.infer<typeof PreviewRequestSchema>['selection'];
export type GameplayDungeon = NonNullable<PublicView['dungeon']>;
export interface JourneyObservation {
  readonly state: {
    readonly hero: HeroFacts;
    readonly worldId: string;
    readonly position: Readonly<{ x: number; y: number }>;
    readonly opened: readonly string[];
    readonly cleared: readonly string[];
    readonly inEncounter: boolean;
    readonly dungeon?: Immutable<GameplayDungeon>;
  };
  readonly map: Immutable<WorldMap>;
  readonly message: string;
  readonly revision: number;
  readonly activeService?: string;
  readonly resting: boolean;
}
export interface GameplayJourney {
  readonly source: 'local' | 'online';
  readonly characterId: string;
  readonly characterName?: string;
  readonly content: ContentRegistry;
  readonly events: EventBus;
  getSnapshot(): JourneyObservation;
  subscribe(listener: () => void): () => void;
  dispatch(command: GameCommand): void;
  isClaimed(id: string): boolean;
  objectSprite(
    object: Immutable<WorldMap['objects'][number]>,
  ): { atlas: string; frame: number } | undefined;
  playerSprite(): { atlas: string; frame: number; idleFrames?: readonly number[] };
  preview(
    selection: PreviewSelection,
    revision: number,
    signal?: AbortSignal,
  ): Promise<z.infer<typeof PreviewResponseSchema>>;
  previewKey(selection: PreviewSelection): readonly unknown[];
  setAudio?(settings: AudioSettings): void;
  previewVictoryLoot(battle: GameplayBattle): VictoryLoot;
}
export type GameplayBattle = Pick<
  BattleSession,
  | 'getSnapshot'
  | 'subscribe'
  | 'content'
  | 'map'
  | 'initialEntities'
  | 'encounterId'
  | 'presentation'
  | 'dispatch'
  | 'canAcceptPlayerInput'
  | 'executePlayerAction'
  | 'selectPlayerAction'
  | 'advanceEnemyTurns'
  | 'events'
  | 'error'
  | 'getActor'
  | 'validTargetIds'
> & {
  recordInspection(type: ActivityEvent['type'], message: string): void;
  readonly availability?: readonly BattleAvailability[];
  previewSkill(
    sourceId: string,
    targetId: string,
    skillId: string,
  ): z.infer<typeof BattlePreviewSchema>;
  previewBasic(sourceId: string, targetId: string): z.infer<typeof BattlePreviewSchema>;
};
export type GameplayBattleView = BattleView;
export interface GameplayHostView {
  session?: GameplayJourney;
  battle?: GameplayBattle;
  revision: number;
  busy: boolean;
  storageAvailable: boolean;
  error?: string;
  notice?: string;
  pendingResult?: string;
  retryAvailable?: boolean;
  restPaused?: boolean;
  slots: ReturnType<JourneyHost['getSnapshot']>['slots'];
}
export interface GameplayHost extends Pick<
  JourneyHost,
  | 'content'
  | 'logs'
  | 'save'
  | 'load'
  | 'toggleRest'
  | 'stopRest'
  | 'retryProgression'
  | 'flush'
  | 'flushForExit'
> {
  recordLog(category: LogCategory, type: ActivityEvent['type'], message: string): void;
  readonly source: 'local' | 'online';
  readonly localHost?: JourneyHost;
  subscribe(listener: () => void): () => void;
  getSnapshot(): GameplayHostView;
  getServerSnapshot(): GameplayHostView;
  progress(command: GameplayProgressionCommand): Promise<boolean>;
  returnFromBattle(selectedItemIds?: readonly string[]): Promise<boolean>;
}
