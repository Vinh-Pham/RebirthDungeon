import 'package:freezed_annotation/freezed_annotation.dart';

part 'die_data.freezed.dart';
part 'die_data.g.dart';

/// One face of a [DieData]: the value it shows plus free-form tags that
/// future mechanics can react to (e.g. `cursed`, `lucky`).
@freezed
abstract class DieFaceData with _$DieFaceData {
  const factory DieFaceData({
    required int value,
    @Default([]) List<String> tags,
  }) = _DieFaceData;

  factory DieFaceData.fromJson(Map<String, dynamic> json) =>
      _$DieFaceDataFromJson(json);
}

/// Data-driven definition of a die (`assets/data/dice.json`).
///
/// When [faces] is null the die is a plain `1..sides` die.
@freezed
abstract class DieData with _$DieData {
  const factory DieData({
    required String id,
    required String name,
    @Default('') String description,
    required int sides,
    List<DieFaceData>? faces,
  }) = _DieData;

  factory DieData.fromJson(Map<String, dynamic> json) =>
      _$DieDataFromJson(json);
}
