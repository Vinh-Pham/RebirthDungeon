// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'banner_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_BannerData _$BannerDataFromJson(Map<String, dynamic> json) => _BannerData(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String? ?? '',
  version: (json['version'] as num).toInt(),
  costPerPull: (json['costPerPull'] as num).toInt(),
  currencyId: json['currencyId'] as String? ?? 'gems',
  rarityTableId: json['rarityTableId'] as String,
  featuredHeroIds: (json['featuredHeroIds'] as List<dynamic>)
      .map((e) => e as String)
      .toList(),
  hardPity: (json['hardPity'] as num).toInt(),
  startsAt: json['startsAt'] as String?,
  endsAt: json['endsAt'] as String?,
);

Map<String, dynamic> _$BannerDataToJson(_BannerData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'version': instance.version,
      'costPerPull': instance.costPerPull,
      'currencyId': instance.currencyId,
      'rarityTableId': instance.rarityTableId,
      'featuredHeroIds': instance.featuredHeroIds,
      'hardPity': instance.hardPity,
      'startsAt': instance.startsAt,
      'endsAt': instance.endsAt,
    };
