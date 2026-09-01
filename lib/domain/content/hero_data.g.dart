// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'hero_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_HeroData _$HeroDataFromJson(Map<String, dynamic> json) => _HeroData(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String? ?? '',
  baseHp: (json['baseHp'] as num).toInt(),
  baseAttack: (json['baseAttack'] as num).toInt(),
  baseDefense: (json['baseDefense'] as num).toInt(),
  dieCount: (json['dieCount'] as num).toInt(),
  dieId: json['dieId'] as String? ?? 'die_standard',
  abilityIds:
      (json['abilityIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const [],
);

Map<String, dynamic> _$HeroDataToJson(_HeroData instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'description': instance.description,
  'baseHp': instance.baseHp,
  'baseAttack': instance.baseAttack,
  'baseDefense': instance.baseDefense,
  'dieCount': instance.dieCount,
  'dieId': instance.dieId,
  'abilityIds': instance.abilityIds,
};
