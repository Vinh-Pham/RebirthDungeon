import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'inventory_controller.g.dart';

/// Placeholder inventory state — real items, stacking, and equipment
/// arrive with the inventory domain (Phase 9). Run loot is collected inside
/// the run state until then.
class InventoryState {
  const InventoryState({this.itemCount = 0});

  final int itemCount;
}

@Riverpod(keepAlive: true)
class InventoryController extends _$InventoryController {
  @override
  InventoryState build() {
    return const InventoryState();
  }
}
