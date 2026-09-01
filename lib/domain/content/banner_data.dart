import 'package:freezed_annotation/freezed_annotation.dart';

part 'banner_data.freezed.dart';
part 'banner_data.g.dart';

/// Data-driven gacha banner definition (`assets/data/banners.json`).
///
/// Banners are versioned ([version]) because rate or lineup changes after
/// players have pulled must be auditable (dart-game-plan.md section 15).
/// [startsAt]/[endsAt] are optional ISO-8601 timestamps; availability rules
/// are applied by the gacha engine (Phase 10), not here.
@freezed
abstract class BannerData with _$BannerData {
  const factory BannerData({
    required String id,
    required String name,
    @Default('') String description,
    required int version,
    required int costPerPull,
    @Default('gems') String currencyId,
    required String rarityTableId,
    required List<String> featuredHeroIds,
    required int hardPity,
    String? startsAt,
    String? endsAt,
  }) = _BannerData;

  factory BannerData.fromJson(Map<String, dynamic> json) =>
      _$BannerDataFromJson(json);
}
