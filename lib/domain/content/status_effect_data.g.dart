// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'status_effect_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_StatusEffectData _$StatusEffectDataFromJson(Map<String, dynamic> json) =>
    _StatusEffectData(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      kind: $enumDecode(_$StatusEffectKindEnumMap, json['kind']),
      potency: IntRange.fromJson(json['potency'] as Map<String, dynamic>),
      durationTurns: IntRange.fromJson(
        json['durationTurns'] as Map<String, dynamic>,
      ),
    );

Map<String, dynamic> _$StatusEffectDataToJson(_StatusEffectData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'kind': _$StatusEffectKindEnumMap[instance.kind]!,
      'potency': instance.potency,
      'durationTurns': instance.durationTurns,
    };

const _$StatusEffectKindEnumMap = {
  StatusEffectKind.buff: 'buff',
  StatusEffectKind.debuff: 'debuff',
};
