// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'item_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ItemData _$ItemDataFromJson(Map<String, dynamic> json) => _ItemData(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String? ?? '',
  category: $enumDecode(_$ItemCategoryEnumMap, json['category']),
  rarityId: json['rarityId'] as String,
  baseValue: (json['baseValue'] as num).toInt(),
);

Map<String, dynamic> _$ItemDataToJson(_ItemData instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'description': instance.description,
  'category': _$ItemCategoryEnumMap[instance.category]!,
  'rarityId': instance.rarityId,
  'baseValue': instance.baseValue,
};

const _$ItemCategoryEnumMap = {
  ItemCategory.consumable: 'consumable',
  ItemCategory.material: 'material',
  ItemCategory.treasure: 'treasure',
};
