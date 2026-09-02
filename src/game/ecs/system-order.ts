/**
 * Ordered system pipeline (game plan §5). updateOrder values are well spaced
 * so later phases slot combat systems between them without renumbering:
 * Encounter(400) / Dice(500) / Ability(600) / Damage(700) / StatusEffect(800)
 * arrive around the movement block in Phase 4.
 */

export const SYSTEM_ORDER = {
  inputIntent: 100,
  enemyIntent: 200,
  movement: 300,
  interaction: 400,
  visibility: 500,
  turnFinalization: 600,
  cleanup: 700,
  eventExport: 800,
} as const;

/** sceneData key for the ordered system-execution log (test infrastructure). */
const SYSTEM_ORDER_LOG_KEY = 'runSystemOrderLog';

export function initSystemOrderLog(
  scene: import('@esengine/ecs-framework').Scene,
): void {
  scene.sceneData.set(SYSTEM_ORDER_LOG_KEY, []);
}

export function systemOrderLog(
  scene: import('@esengine/ecs-framework').Scene,
): readonly string[] {
  const log = scene.sceneData.get(SYSTEM_ORDER_LOG_KEY);
  return Array.isArray(log) ? (log as string[]) : [];
}

export function recordSystemTick(
  scene: import('@esengine/ecs-framework').Scene,
  systemName: string,
): void {
  let log = scene.sceneData.get(SYSTEM_ORDER_LOG_KEY);
  if (!Array.isArray(log)) {
    log = [];
    scene.sceneData.set(SYSTEM_ORDER_LOG_KEY, log);
  }
  (log as string[]).push(systemName);
}
