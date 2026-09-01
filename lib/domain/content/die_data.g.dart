// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'die_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DieFaceData _$DieFaceDataFromJson(Map<String, dynamic> json) => _DieFaceData(
  value: (json['value'] as num).toInt(),
  tags:
      (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
);

Map<String, dynamic> _$DieFaceDataToJson(_DieFaceData instance) =>
    <String, dynamic>{'value': instance.value, 'tags': instance.tags};

_DieData _$DieDataFromJson(Map<String, dynamic> json) => _DieData(
  id: json['id'] as String,
  name: json['name'] as String,
  description: json['description'] as String? ?? '',
  sides: (json['sides'] as num).toInt(),
  faces: (json['faces'] as List<dynamic>?)
      ?.map((e) => DieFaceData.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$DieDataToJson(_DieData instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'description': instance.description,
  'sides': instance.sides,
  'faces': instance.faces,
};
