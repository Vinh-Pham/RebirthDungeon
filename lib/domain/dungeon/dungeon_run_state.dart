import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

part 'dungeon_run_state.freezed.dart';
part 'dungeon_run_state.g.dart';

/// Lifecycle of a run.
@JsonEnum()
enum RunStatus { notStarted, inProgress, victory, defeat }

/// The complete, serializable state of one dungeon run.
///
/// The run keeps only the *root* seed; every subsystem derives its own
/// stream from it (`dungeon`, `loot`, `combat` — see `deriveSeed`), so the
/// same seed and command sequence always replay the same run. Per Phase 4
/// the state holds the current floor only; the hero's HP carries between
/// combats in [heroHp].
@freezed
abstract class DungeonRunState with _$DungeonRunState {
  const factory DungeonRunState({
    @Default(RunStatus.notStarted) RunStatus status,
    @Default('') String runId,
    @Default('') String dungeonId,
    @Default('') String heroId,
    @Default(0) int seed,
    @Default(0) int heroHp,
    @Default(0) int heroMaxHp,
    @Default(0) int floorIndex,
    @Default(0) int floorCount,
    @Default([]) List<RunRoom> rooms,
    @Default(0) int currentRoomIndex,
    CombatState? combat,
    @Default([]) List<RunLoot> collectedLoot,
  }) = _DungeonRunState;

  factory DungeonRunState.fromJson(Map<String, dynamic> json) =>
      _$DungeonRunStateFromJson(json);
}

extension DungeonRunStateX on DungeonRunState {
  /// The room the hero currently occupies.
  RunRoom get currentRoom => rooms[currentRoomIndex];

  /// Whether the run has reached a terminal status.
  bool get isTerminal =>
      status == RunStatus.victory || status == RunStatus.defeat;
}
