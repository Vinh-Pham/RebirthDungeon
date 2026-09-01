import 'package:freezed_annotation/freezed_annotation.dart';

part 'item_data.freezed.dart';
part 'item_data.g.dart';

/// Broad item category. Equipment mechanics arrive with Phase 9; `material`
/// covers crafting/upgrade fodder for the prototype.
@JsonEnum()
enum ItemCategory { consumable, material, treasure }

/// Data-driven definition of an item (`assets/data/items.json`).
@freezed
abstract class ItemData with _$ItemData {
  const factory ItemData({
    required String id,
    required String name,
    @Default('') String description,
    required ItemCategory category,
    required String rarityId,
    required int baseValue,
  }) = _ItemData;

  factory ItemData.fromJson(Map<String, dynamic> json) =>
      _$ItemDataFromJson(json);
}
