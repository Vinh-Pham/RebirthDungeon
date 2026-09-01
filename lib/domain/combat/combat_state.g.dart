// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'combat_state.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CombatState _$CombatStateFromJson(Map<String, dynamic> json) => _CombatState(
  phase:
      $enumDecodeNullable(_$CombatPhaseEnumMap, json['phase']) ??
      CombatPhase.notStarted,
  player: json['player'] == null
      ? const PlayerCombatant()
      : PlayerCombatant.fromJson(json['player'] as Map<String, dynamic>),
  enemies:
      (json['enemies'] as List<dynamic>?)
          ?.map((e) => EnemyCombatant.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  dice:
      (json['dice'] as List<dynamic>?)
          ?.map((e) => CombatDie.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  turn: (json['turn'] as num?)?.toInt() ?? 0,
  enemyActionCursor: (json['enemyActionCursor'] as num?)?.toInt() ?? 0,
  rerollsUsedThisTurn: (json['rerollsUsedThisTurn'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$CombatStateToJson(_CombatState instance) =>
    <String, dynamic>{
      'phase': _$CombatPhaseEnumMap[instance.phase]!,
      'player': instance.player,
      'enemies': instance.enemies,
      'dice': instance.dice,
      'turn': instance.turn,
      'enemyActionCursor': instance.enemyActionCursor,
      'rerollsUsedThisTurn': instance.rerollsUsedThisTurn,
    };

const _$CombatPhaseEnumMap = {
  CombatPhase.notStarted: 'notStarted',
  CombatPhase.rolling: 'rolling',
  CombatPhase.awaitingPlayerAction: 'awaitingPlayerAction',
  CombatPhase.enemyTurn: 'enemyTurn',
  CombatPhase.victory: 'victory',
  CombatPhase.defeat: 'defeat',
};
