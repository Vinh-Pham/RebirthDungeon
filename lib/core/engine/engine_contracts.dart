/// The base command/result/event pattern shared by every domain engine
/// (dart-game-plan.md section 4):
///
/// ```text
/// State + Command
///        ↓
///  Domain Engine
///        ↓
/// New State + Events
/// ```
///
/// Conventions:
///
/// - Commands are immutable intent (`GameCommand` subclasses).
/// - Engines are pure: no `Random()`, no `DateTime.now()`, no I/O — all
///   nondeterminism is injected.
/// - Every resolved command returns an [EngineResult] with the new state and
///   the domain events that happened. Events are facts, phrased in the past
///   tense (`DiceRolled`, `MonsterDefeated`).
/// - Illegal commands throw `DomainException` carrying a `Failure`.
abstract class GameCommand {
  const GameCommand();
}

/// Marker base for immutable facts emitted by domain engines. Extend — do
/// not implement.
abstract class GameEvent {
  const GameEvent();
}

/// Uniform output of a resolved command: the new [state] plus the [events]
/// that occurred while producing it.
///
/// Both fields are treated as immutable; engines must not mutate the event
/// list after construction.
class EngineResult<S, E extends GameEvent> {
  const EngineResult({required this.state, this.events = const []});

  final S state;
  final List<E> events;

  @override
  String toString() => 'EngineResult(state: $state, events: $events)';
}

/// Contract for a stateless engine resolving commands of type [C] against
/// state [S], emitting events of type [E].
///
/// Engines may either implement this single-dispatch interface or expose one
/// method per command returning `EngineResult<S, E>`; both follow the same
/// pattern.
abstract interface class DomainEngine<
  S,
  C extends GameCommand,
  E extends GameEvent
> {
  EngineResult<S, E> execute(S state, C command);
}
