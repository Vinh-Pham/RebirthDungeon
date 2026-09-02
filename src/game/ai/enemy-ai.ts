/**
 * Pure enemy turn decisions (game plan §8): sight through the FOV adapter,
 * a remembered last-seen player position, A* chase, and seeded wander. The
 * caller (enemy-intent system) applies the decision as a pending action; this
 * module never mutates ECS state except the enemy's own memory component.
 */

import type { RandomSource } from '@/core/random/random-source';
import { GridPosition, type EnemyBrain } from '@/game/ecs/components';
import {
  isOpaqueAt,
  isPassableStatic,
  type RunContext,
} from '@/game/ecs/run-context';
import { computeFovCells } from '@/game/rot/rot-fov';
import { findPathAStar } from '@/game/rot/rot-pathfinder';

export const PLAYER_STABLE_ID = 'hero';

export type EnemyDecision =
  | { readonly kind: 'move'; readonly dx: number; readonly dy: number }
  | { readonly kind: 'attack'; readonly targetId: string }
  | { readonly kind: 'wait' };

const CARDINAL: readonly { readonly x: number; readonly y: number }[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function decideEnemyTurn(
  context: RunContext,
  position: GridPosition,
  brain: EnemyBrain,
  visionRadius: number,
  enemyRandom: RandomSource,
): EnemyDecision {
  const playerEntity = context.actorsByName.get(PLAYER_STABLE_ID);
  const playerPosition = playerEntity?.getComponent(GridPosition);
  if (!playerPosition) return { kind: 'wait' };

  // Sight: the enemy sees the player when the player's cell falls inside the
  // enemy's FOV. Sight updates (and only sight updates) the memory.
  const visibleCells = computeFovCells({
    originX: position.x,
    originY: position.y,
    radius: visionRadius,
    isOpaque: (x, y) => isOpaqueAt(context, x, y),
  });
  let seesPlayer = false;
  for (const cell of visibleCells) {
    if (cell.x === playerPosition.x && cell.y === playerPosition.y) {
      seesPlayer = true;
      break;
    }
  }
  if (seesPlayer) {
    brain.lastSeenPlayerX = playerPosition.x;
    brain.lastSeenPlayerY = playerPosition.y;
  }

  // Adjacent cardinal target → bump attack.
  const deltaX = playerPosition.x - position.x;
  const deltaY = playerPosition.y - position.y;
  if (Math.abs(deltaX) + Math.abs(deltaY) === 1) {
    return { kind: 'attack', targetId: PLAYER_STABLE_ID };
  }

  // Chase the remembered position; forget it once reached without sight.
  const targetX = brain.lastSeenPlayerX;
  const targetY = brain.lastSeenPlayerY;
  if (targetX !== null && targetY !== null) {
    if (targetX === position.x && targetY === position.y && !seesPlayer) {
      brain.lastSeenPlayerX = null;
      brain.lastSeenPlayerY = null;
    } else {
      const path = findPathAStar({
        fromX: position.x,
        fromY: position.y,
        toX: targetX,
        toY: targetY,
        // The enemy's own cell and the chase target (possibly the player's
        // cell) are allowed; everything else is static + dynamic passability.
        isPassable: (x, y) =>
          (x === position.x && y === position.y) ||
          isPassableStatic(context, x, y) ||
          (x === targetX && y === targetY),
      });
      if (path && path.length > 0) {
        const step = path[0];
        return {
          kind: 'move',
          dx: step.x - position.x,
          dy: step.y - position.y,
        };
      }
    }
  }

  // Nothing to chase: seeded wander (never shares a stream with combat).
  if (enemyRandom.chance(0.25)) return { kind: 'wait' };
  const direction = CARDINAL[enemyRandom.nextInt(CARDINAL.length)];
  return { kind: 'move', dx: direction.x, dy: direction.y };
}
