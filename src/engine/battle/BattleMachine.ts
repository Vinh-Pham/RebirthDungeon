import { assign, setup } from 'xstate';
import type { BattleResult } from '../ecs/systems/CombatSystem';

export type BattleAction = {
  action: 'attack' | 'skill' | 'defend' | 'rest' | 'item';
  skillId?: string;
  itemId?: string;
};
export interface BattleContext {
  turnId?: string;
  side?: 'player' | 'enemy';
  result?: BattleResult;
  action?: BattleAction;
  targetId?: string;
  error?: string;
}
type FlowEvent =
  | ({ type: 'START' | 'RESOLVED' | 'SYNC' } & Pick<BattleContext, 'turnId' | 'side' | 'result'>)
  | { type: 'SELECT_ACTION'; action: BattleAction }
  | { type: 'SELECT_TARGET'; targetId: string }
  | { type: 'CONFIRM' | 'ENEMY_EXECUTE' | 'CANCEL' }
  | { type: 'FAILED'; error: string };

/** State orchestration only; combat services own every gameplay calculation. */
export function createBattleMachine() {
  return setup({
    types: { context: {} as BattleContext, events: {} as FlowEvent },
    actions: {
      sync: assign(({ event }) =>
        ['START', 'RESOLVED', 'SYNC'].includes(event.type)
          ? {
              turnId: (event as BattleContext).turnId,
              side: (event as BattleContext).side,
              result: (event as BattleContext).result,
              action: undefined,
              targetId: undefined,
              error: undefined,
            }
          : {},
      ),
      selectAction: assign(({ event }) =>
        event.type === 'SELECT_ACTION'
          ? { action: event.action, targetId: undefined, error: undefined }
          : {},
      ),
      selectTarget: assign(({ event }) =>
        event.type === 'SELECT_TARGET' ? { targetId: event.targetId, error: undefined } : {},
      ),
      clearSelection: assign({ action: undefined, targetId: undefined, error: undefined }),
      fail: assign(({ event }) => (event.type === 'FAILED' ? { error: event.error } : {})),
    },
    guards: {
      victory: ({ context }) => context.result === 'victory',
      defeat: ({ context }) => context.result === 'defeat',
      player: ({ context }) => context.side === 'player',
      hasTarget: ({ context }) => !!context.action && !!context.targetId,
    },
  }).createMachine({
    id: 'battle',
    initial: 'initializing',
    context: {},
    on: { SYNC: { target: '.routing', actions: 'sync' } },
    states: {
      initializing: { on: { START: { target: 'routing', actions: 'sync' } } },
      routing: {
        always: [
          { guard: 'victory', target: 'victory' },
          { guard: 'defeat', target: 'defeat' },
          { guard: 'player', target: 'playerTurn' },
          { target: 'enemyTurn' },
        ],
      },
      playerTurn: {
        initial: 'selectingAction',
        states: {
          selectingAction: {
            on: { SELECT_ACTION: { target: 'selectingTarget', actions: 'selectAction' } },
          },
          selectingTarget: {
            on: {
              SELECT_ACTION: { actions: 'selectAction' },
              SELECT_TARGET: { actions: 'selectTarget' },
              CANCEL: { target: 'selectingAction', actions: 'clearSelection' },
              CONFIRM: { target: 'executing', guard: 'hasTarget' },
            },
          },
          executing: {
            on: {
              RESOLVED: { target: '#battle.routing', actions: 'sync' },
              FAILED: { target: 'selectingTarget', actions: 'fail' },
            },
          },
        },
      },
      enemyTurn: {
        initial: 'selectingAction',
        states: {
          selectingAction: { on: { ENEMY_EXECUTE: 'executing' } },
          executing: {
            on: {
              RESOLVED: { target: '#battle.routing', actions: 'sync' },
              FAILED: { target: 'selectingAction', actions: 'fail' },
            },
          },
        },
      },
      victory: { type: 'final' },
      defeat: { type: 'final' },
    },
  });
}
