// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'monster_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MonsterData _$MonsterDataFromJson(Map<String, dynamic> json) => _MonsterData(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String? ?? '',
  hp: (json['hp'] as num).toInt(),
  attack: (json['attack'] as num).toInt(),
  defense: (json['defense'] as num).toInt(),
  abilityIds:
      (json['abilityIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const [],
  xpReward: IntRange.fromJson(json['xpReward'] as Map<String, dynamic>),
  lootTableId: json['lootTableId'] as String?,
);

Map<String, dynamic> _$MonsterDataToJson(_MonsterData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'hp': instance.hp,
      'attack': instance.attack,
      'defense': instance.defense,
      'abilityIds': instance.abilityIds,
      'xpReward': instance.xpReward,
      'lootTableId': instance.lootTableId,
    };
