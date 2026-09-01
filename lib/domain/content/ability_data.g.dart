// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ability_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AbilityData _$AbilityDataFromJson(Map<String, dynamic> json) => _AbilityData(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String? ?? '',
  effect: $enumDecode(_$AbilityEffectEnumMap, json['effect']),
  power: IntRange.fromJson(json['power'] as Map<String, dynamic>),
  dieCost: (json['dieCost'] as num?)?.toInt() ?? 1,
);

Map<String, dynamic> _$AbilityDataToJson(_AbilityData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'effect': _$AbilityEffectEnumMap[instance.effect]!,
      'power': instance.power,
      'dieCost': instance.dieCost,
    };

const _$AbilityEffectEnumMap = {
  AbilityEffect.damage: 'damage',
  AbilityEffect.heal: 'heal',
  AbilityEffect.shield: 'shield',
};
