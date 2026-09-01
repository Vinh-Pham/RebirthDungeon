// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'loot_table_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LootEntryData _$LootEntryDataFromJson(Map<String, dynamic> json) =>
    _LootEntryData(
      itemId: json['itemId'] as String,
      weight: (json['weight'] as num).toInt(),
      quantity: IntRange.fromJson(json['quantity'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$LootEntryDataToJson(_LootEntryData instance) =>
    <String, dynamic>{
      'itemId': instance.itemId,
      'weight': instance.weight,
      'quantity': instance.quantity,
    };

_LootTableData _$LootTableDataFromJson(Map<String, dynamic> json) =>
    _LootTableData(
      id: json['id'] as String,
      name: json['name'] as String,
      entries: (json['entries'] as List<dynamic>)
          .map((e) => LootEntryData.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$LootTableDataToJson(_LootTableData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'entries': instance.entries,
    };
