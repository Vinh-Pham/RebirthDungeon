import {
  createGameEngine,
  type Entity,
  type GameCommand,
  type GameEngine,
  type GameEvent,
  type GameSystem,
} from '../../engine';

/** Test-only rule proving command -> system -> ECS -> event, not production combat. */
export function createAttackFixture(): GameSystem {
  return {
    initialize(engine) {
      return engine.commands.register('ATTACK', ({ attackerId, targetId }) => {
        const attacker = engine.getEntity(attackerId);
        const target = engine.getEntity(targetId);
        if (!attacker?.combatant || !attacker.health || attacker.health.current <= 0) {
          throw new Error('Attacker must be a living combatant');
        }
        if (!target?.health || target.health.current <= 0 || attackerId === targetId) {
          throw new Error('Target must be a different living entity');
        }
        const amount = Math.min(target.health.current, engine.random.int(1, attacker.combatant.attack));
        target.health.current -= amount;
        engine.events.emit({ type: 'DAMAGE_DEALT', sourceId: attackerId, targetId, amount, critical: false });
      });
    },
    update() {},
  };
}

export interface SimulationScenario {
  seed: number;
  entities: readonly Entity[];
  commands: readonly GameCommand[];
  configure(engine: GameEngine): void;
}

/** Fresh inputs and detached output make scenarios repeatable and comparable. */
export function runSimulation(scenario: SimulationScenario) {
  const engine = createGameEngine({ seed: scenario.seed });
  const events: GameEvent[] = [];
  try {
    for (const entity of scenario.entities) engine.spawn(structuredClone(entity));
    engine.events.subscribe((event) => events.push(structuredClone(event)));
    scenario.configure(engine);
    for (const command of scenario.commands) engine.dispatch(structuredClone(command));
    return { entities: structuredClone(engine.world.entities), events };
  } finally {
    engine.dispose();
  }
}
