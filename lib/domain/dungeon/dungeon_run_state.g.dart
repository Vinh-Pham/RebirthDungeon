// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dungeon_run_state.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DungeonRunState _$DungeonRunStateFromJson(Map<String, dynamic> json) =>
    _DungeonRunState(
      status:
          $enumDecodeNullable(_$RunStatusEnumMap, json['status']) ??
          RunStatus.notStarted,
      runId: json['runId'] as String? ?? '',
      dungeonId: json['dungeonId'] as String? ?? '',
      heroId: json['heroId'] as String? ?? '',
      seed: (json['seed'] as num?)?.toInt() ?? 0,
      heroHp: (json['heroHp'] as num?)?.toInt() ?? 0,
      heroMaxHp: (json['heroMaxHp'] as num?)?.toInt() ?? 0,
      floorIndex: (json['floorIndex'] as num?)?.toInt() ?? 0,
      floorCount: (json['floorCount'] as num?)?.toInt() ?? 0,
      rooms:
          (json['rooms'] as List<dynamic>?)
              ?.map((e) => RunRoom.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      currentRoomIndex: (json['currentRoomIndex'] as num?)?.toInt() ?? 0,
      combat: json['combat'] == null
          ? null
          : CombatState.fromJson(json['combat'] as Map<String, dynamic>),
      collectedLoot:
          (json['collectedLoot'] as List<dynamic>?)
              ?.map((e) => RunLoot.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$DungeonRunStateToJson(_DungeonRunState instance) =>
    <String, dynamic>{
      'status': _$RunStatusEnumMap[instance.status]!,
      'runId': instance.runId,
      'dungeonId': instance.dungeonId,
      'heroId': instance.heroId,
      'seed': instance.seed,
      'heroHp': instance.heroHp,
      'heroMaxHp': instance.heroMaxHp,
      'floorIndex': instance.floorIndex,
      'floorCount': instance.floorCount,
      'rooms': instance.rooms,
      'currentRoomIndex': instance.currentRoomIndex,
      'combat': instance.combat,
      'collectedLoot': instance.collectedLoot,
    };

const _$RunStatusEnumMap = {
  RunStatus.notStarted: 'notStarted',
  RunStatus.inProgress: 'inProgress',
  RunStatus.victory: 'victory',
  RunStatus.defeat: 'defeat',
};
