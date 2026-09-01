import 'dart:math';

import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:rebirth_dungeon/application/run/run_event_bus.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/ids/id_generator.dart';
import 'package:rebirth_dungeon/core/random/seeded_random_source.dart';
import 'package:rebirth_dungeon/core/time/time_source.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';
import 'package:rebirth_dungeon/domain/combat/combat_engine.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_command.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_engine.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'run_controller.g.dart';

/// Immutable UI state for the current run. Domain state lives inside
/// [run] (`DungeonRunState`, including any active combat); [lastEvents]
/// carries the domain events of the most recent command for presentation;
/// [error] holds the message of the last rejected command.
class RunUiState {
  const RunUiState({this.run, this.lastEvents = const [], this.error});

  final DungeonRunState? run;
  final List<RunEvent> lastEvents;
  final String? error;

  bool get hasActiveRun => run != null && run!.status == RunStatus.inProgress;
}

/// Bridges the Flutter app to the pure-Dart run and combat engines.
///
/// The engines (and their RNG streams) are created per run and kept for the
/// run's lifetime; the root seed is drawn here in the application layer and
/// every subsystem derives its own channel from it.
@Riverpod(keepAlive: true)
class RunController extends _$RunController {
  RunEngine? _engine;
  DungeonRunState? _run;

  @override
  RunUiState build() {
    // Recreate on content changes: engines always run against the current
    // content set.
    ref.watch(contentProvider);
    _engine = null;
    _run = null;
    return const RunUiState();
  }

  void _publish(Iterable<RunEvent> events) {
    ref.read(runEventBusProvider).publish(events);
  }

  GameContent get _content {
    final content = ref.read(contentProvider).value;
    if (content == null) {
      throw StateError('Game content is not loaded yet.');
    }
    return content;
  }

  /// Starts a new run with a freshly drawn seed and returns its runId.
  String startRun({required String heroId, required String dungeonId}) {
    final content = _content;
    final seed = Random().nextInt(1 << 31);
    final engine = RunEngine(
      content: content,
      combatEngine: CombatEngine(
        content: content,
        random: SeededRandomSource(deriveSeed(seed, 'combat')),
      ),
      dungeonRandom: SeededRandomSource(deriveSeed(seed, 'dungeon')),
      lootRandom: SeededRandomSource(deriveSeed(seed, 'loot')),
      idGenerator: SystemIdGenerator(
        timeSource: const SystemTimeSource(),
        randomSource: SeededRandomSource(deriveSeed(seed, 'ids')),
      ),
    );
    // Always start from a fresh initial state: beginning a new run
    // intentionally abandons any previous one (Phase 7 adds an explicit
    // abandon flow).
    final result = engine.execute(
      const DungeonRunState(),
      StartRun(heroId: heroId, dungeonId: dungeonId, seed: seed),
    );
    _engine = engine;
    _run = result.state;
    state = RunUiState(run: result.state, lastEvents: result.events);
    _publish(result.events);
    return result.state.runId;
  }

  void enterRoom(int roomIndex) => _dispatch(EnterRoom(roomIndex: roomIndex));

  void combat(CombatCommand command) =>
      _dispatch(CombatAction(command: command));

  void descend() => _dispatch(const Descend());

  void _dispatch(RunCommand command) {
    final engine = _engine;
    final run = _run;
    if (engine == null || run == null) {
      return;
    }
    try {
      final result = engine.execute(run, command);
      _run = result.state;
      state = RunUiState(run: result.state, lastEvents: result.events);
      _publish(result.events);
    } on DomainException catch (error) {
      state = RunUiState(run: run, error: error.failure.message);
    }
  }
}
