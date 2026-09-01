// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'combatant.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ActiveStatusEffect _$ActiveStatusEffectFromJson(Map<String, dynamic> json) =>
    _ActiveStatusEffect(
      statusId: json['statusId'] as String,
      kind: $enumDecode(_$StatusEffectKindEnumMap, json['kind']),
      potency: (json['potency'] as num).toInt(),
      remainingTurns: (json['remainingTurns'] as num).toInt(),
    );

Map<String, dynamic> _$ActiveStatusEffectToJson(_ActiveStatusEffect instance) =>
    <String, dynamic>{
      'statusId': instance.statusId,
      'kind': _$StatusEffectKindEnumMap[instance.kind]!,
      'potency': instance.potency,
      'remainingTurns': instance.remainingTurns,
    };

const _$StatusEffectKindEnumMap = {
  StatusEffectKind.buff: 'buff',
  StatusEffectKind.debuff: 'debuff',
};

_PlayerCombatant _$PlayerCombatantFromJson(Map<String, dynamic> json) =>
    _PlayerCombatant(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      hp: (json['hp'] as num?)?.toInt() ?? 0,
      maxHp: (json['maxHp'] as num?)?.toInt() ?? 0,
      attack: (json['attack'] as num?)?.toInt() ?? 0,
      defense: (json['defense'] as num?)?.toInt() ?? 0,
      shield: (json['shield'] as num?)?.toInt() ?? 0,
      statuses:
          (json['statuses'] as List<dynamic>?)
              ?.map(
                (e) => ActiveStatusEffect.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const [],
      abilityIds:
          (json['abilityIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$PlayerCombatantToJson(_PlayerCombatant instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'hp': instance.hp,
      'maxHp': instance.maxHp,
      'attack': instance.attack,
      'defense': instance.defense,
      'shield': instance.shield,
      'statuses': instance.statuses,
      'abilityIds': instance.abilityIds,
    };

_EnemyCombatant _$EnemyCombatantFromJson(Map<String, dynamic> json) =>
    _EnemyCombatant(
      id: json['id'] as String? ?? '',
      contentId: json['contentId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      hp: (json['hp'] as num?)?.toInt() ?? 0,
      maxHp: (json['maxHp'] as num?)?.toInt() ?? 0,
      attack: (json['attack'] as num?)?.toInt() ?? 0,
      defense: (json['defense'] as num?)?.toInt() ?? 0,
      shield: (json['shield'] as num?)?.toInt() ?? 0,
      statuses:
          (json['statuses'] as List<dynamic>?)
              ?.map(
                (e) => ActiveStatusEffect.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const [],
      abilityIds:
          (json['abilityIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      basicAttackMax: (json['basicAttackMax'] as num?)?.toInt() ?? 1,
    );

Map<String, dynamic> _$EnemyCombatantToJson(_EnemyCombatant instance) =>
    <String, dynamic>{
      'id': instance.id,
      'contentId': instance.contentId,
      'name': instance.name,
      'hp': instance.hp,
      'maxHp': instance.maxHp,
      'attack': instance.attack,
      'defense': instance.defense,
      'shield': instance.shield,
      'statuses': instance.statuses,
      'abilityIds': instance.abilityIds,
      'basicAttackMax': instance.basicAttackMax,
    };
