import 'package:freezed_annotation/freezed_annotation.dart';

part 'rarity_table_data.freezed.dart';
part 'rarity_table_data.g.dart';

/// One rarity tier. Pull/drop odds are [weight] relative to the total weight
/// of the containing table.
@freezed
abstract class RarityTierData with _$RarityTierData {
  const factory RarityTierData({
    required String id,
    required String name,
    required int weight,
  }) = _RarityTierData;

  factory RarityTierData.fromJson(Map<String, dynamic> json) =>
      _$RarityTierDataFromJson(json);
}

/// Data-driven rarity rate table (`assets/data/rarity_tables.json`).
///
/// Tier ids are globally unique; items reference them via `rarityId` and
/// banners reference a whole table via `rarityTableId`.
@freezed
abstract class RarityTableData with _$RarityTableData {
  const factory RarityTableData({
    required String id,
    required String name,
    required List<RarityTierData> tiers,
  }) = _RarityTableData;

  factory RarityTableData.fromJson(Map<String, dynamic> json) =>
      _$RarityTableDataFromJson(json);
}
