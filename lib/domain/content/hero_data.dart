import 'package:freezed_annotation/freezed_annotation.dart';

part 'hero_data.freezed.dart';
part 'hero_data.g.dart';

/// Data-driven definition of a playable hero (`assets/data/heroes.json`).
///
/// Reference fields (`abilityIds`) are validated against their target tables
/// when the whole content set is parsed.
@freezed
abstract class HeroData with _$HeroData {
  const factory HeroData({
    required String id,
    required String name,
    @Default('') String description,
    required int baseHp,
    required int baseAttack,
    required int baseDefense,
    required int dieCount,
    @Default([]) List<String> abilityIds,
  }) = _HeroData;

  factory HeroData.fromJson(Map<String, dynamic> json) =>
      _$HeroDataFromJson(json);
}
