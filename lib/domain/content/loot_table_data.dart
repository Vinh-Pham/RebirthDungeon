import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:rebirth_dungeon/core/value_objects/int_range.dart';

part 'loot_table_data.freezed.dart';
part 'loot_table_data.g.dart';

/// One weighted entry of a loot table. Drop chance is [weight] relative to
/// the total weight of all entries in the table.
@freezed
abstract class LootEntryData with _$LootEntryData {
  const factory LootEntryData({
    required String itemId,
    required int weight,
    required IntRange quantity,
  }) = _LootEntryData;

  factory LootEntryData.fromJson(Map<String, dynamic> json) =>
      _$LootEntryDataFromJson(json);
}

/// Data-driven definition of a loot table (`assets/data/loot_tables.json`).
@freezed
abstract class LootTableData with _$LootTableData {
  const factory LootTableData({
    required String id,
    required String name,
    required List<LootEntryData> entries,
  }) = _LootTableData;

  factory LootTableData.fromJson(Map<String, dynamic> json) =>
      _$LootTableDataFromJson(json);
}
