// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'combat_die.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CombatDie _$CombatDieFromJson(Map<String, dynamic> json) => _CombatDie(
  dieIndex: (json['dieIndex'] as num).toInt(),
  dieId: json['dieId'] as String,
  sides: (json['sides'] as num).toInt(),
  maxFace: (json['maxFace'] as num).toInt(),
  faceValue: (json['faceValue'] as num?)?.toInt(),
  tags:
      (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
  status:
      $enumDecodeNullable(_$DieStatusEnumMap, json['status']) ??
      DieStatus.unrolled,
  assignedAbility: json['assignedAbility'] as String?,
);

Map<String, dynamic> _$CombatDieToJson(_CombatDie instance) =>
    <String, dynamic>{
      'dieIndex': instance.dieIndex,
      'dieId': instance.dieId,
      'sides': instance.sides,
      'maxFace': instance.maxFace,
      'faceValue': instance.faceValue,
      'tags': instance.tags,
      'status': _$DieStatusEnumMap[instance.status]!,
      'assignedAbility': instance.assignedAbility,
    };

const _$DieStatusEnumMap = {
  DieStatus.unrolled: 'unrolled',
  DieStatus.available: 'available',
  DieStatus.assigned: 'assigned',
  DieStatus.spent: 'spent',
};
