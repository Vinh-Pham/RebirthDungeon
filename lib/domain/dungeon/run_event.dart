import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

part 'run_event.freezed.dart';

/// Facts emitted while resolving run commands. Combat events are bubbled up
/// unchanged alongside these.
@freezed
sealed class RunEvent extends GameEvent with _$RunEvent {
  const RunEvent._();

  /// Combat facts bubbled up unchanged while a room's combat is resolved.
  const factory RunEvent.combat(CombatEvent event) = CombatHappened;

  const factory RunEvent.runStarted({
    required String runId,
    required String dungeonId,
    required int seed,
  }) = RunStarted;

  const factory RunEvent.roomEntered({
    required int roomIndex,
    required RoomKind roomKind,
  }) = RoomEntered;

  const factory RunEvent.roomCleared({required int roomIndex}) = RoomCleared;

  const factory RunEvent.lootGained({
    required int roomIndex,
    required List<RunLoot> entries,
  }) = LootGained;

  const factory RunEvent.shrineHealed({
    required int healed,
    required int remainingHp,
  }) = ShrineHealed;

  const factory RunEvent.combatVictory({required int roomIndex}) =
      CombatVictory;

  const factory RunEvent.combatDefeat() = CombatDefeat;

  const factory RunEvent.floorDescended({required int floorIndex}) =
      FloorDescended;

  const factory RunEvent.runCompleted({required int floorsCleared}) =
      RunCompleted;

  const factory RunEvent.runFailed() = RunFailed;
}
