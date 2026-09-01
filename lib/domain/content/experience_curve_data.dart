import 'package:freezed_annotation/freezed_annotation.dart';

part 'experience_curve_data.freezed.dart';
part 'experience_curve_data.g.dart';

/// Data-driven experience curve (`assets/data/experience_curves.json`).
///
/// [xpToLevel][i] is the *total* experience needed to reach level `i + 2`
/// (reaching level 2 costs `xpToLevel[0]`). The list must be non-empty and
/// strictly increasing.
@freezed
abstract class ExperienceCurveData with _$ExperienceCurveData {
  const factory ExperienceCurveData({
    required String id,
    required String name,
    required List<int> xpToLevel,
  }) = _ExperienceCurveData;

  factory ExperienceCurveData.fromJson(Map<String, dynamic> json) =>
      _$ExperienceCurveDataFromJson(json);
}
