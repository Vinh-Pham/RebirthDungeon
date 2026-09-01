// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rarity_table_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RarityTierData _$RarityTierDataFromJson(Map<String, dynamic> json) =>
    _RarityTierData(
      id: json['id'] as String,
      name: json['name'] as String,
      weight: (json['weight'] as num).toInt(),
    );

Map<String, dynamic> _$RarityTierDataToJson(_RarityTierData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'weight': instance.weight,
    };

_RarityTableData _$RarityTableDataFromJson(Map<String, dynamic> json) =>
    _RarityTableData(
      id: json['id'] as String,
      name: json['name'] as String,
      tiers: (json['tiers'] as List<dynamic>)
          .map((e) => RarityTierData.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$RarityTableDataToJson(_RarityTableData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'tiers': instance.tiers,
    };
