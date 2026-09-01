// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dungeon_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DungeonData _$DungeonDataFromJson(Map<String, dynamic> json) => _DungeonData(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String? ?? '',
  floorCount: (json['floorCount'] as num).toInt(),
  roomsPerFloor: IntRange.fromJson(
    json['roomsPerFloor'] as Map<String, dynamic>,
  ),
  monsterPool: (json['monsterPool'] as List<dynamic>)
      .map((e) => e as String)
      .toList(),
  bossId: json['bossId'] as String,
  lootTableId: json['lootTableId'] as String,
  recommendedLevel: (json['recommendedLevel'] as num?)?.toInt() ?? 1,
);

Map<String, dynamic> _$DungeonDataToJson(_DungeonData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'floorCount': instance.floorCount,
      'roomsPerFloor': instance.roomsPerFloor,
      'monsterPool': instance.monsterPool,
      'bossId': instance.bossId,
      'lootTableId': instance.lootTableId,
      'recommendedLevel': instance.recommendedLevel,
    };
