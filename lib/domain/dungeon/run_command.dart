import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';

part 'run_command.freezed.dart';

/// Player/system intents the run engine resolves. Combat inside a room is
/// bridged through [CombatAction].
@freezed
sealed class RunCommand extends GameCommand with _$RunCommand {
  const RunCommand._();

  const factory RunCommand.startRun({
    required String heroId,
    required String dungeonId,
    required int seed,
  }) = StartRun;

  const factory RunCommand.enterRoom({required int roomIndex}) = EnterRoom;

  const factory RunCommand.combatCommand({required CombatCommand command}) =
      CombatAction;

  const factory RunCommand.descend() = Descend;
}
