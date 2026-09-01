// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'experience_curve_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ExperienceCurveData _$ExperienceCurveDataFromJson(Map<String, dynamic> json) =>
    _ExperienceCurveData(
      id: json['id'] as String,
      name: json['name'] as String,
      xpToLevel: (json['xpToLevel'] as List<dynamic>)
          .map((e) => (e as num).toInt())
          .toList(),
    );

Map<String, dynamic> _$ExperienceCurveDataToJson(
  _ExperienceCurveData instance,
) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'xpToLevel': instance.xpToLevel,
};
