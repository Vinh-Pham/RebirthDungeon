// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inventory_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(InventoryController)
final inventoryControllerProvider = InventoryControllerProvider._();

final class InventoryControllerProvider
    extends $NotifierProvider<InventoryController, InventoryState> {
  InventoryControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inventoryControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inventoryControllerHash();

  @$internal
  @override
  InventoryController create() => InventoryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(InventoryState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<InventoryState>(value),
    );
  }
}

String _$inventoryControllerHash() =>
    r'5eb52a280590cfbbdb74beb804cc861c19b11e8d';

abstract class _$InventoryController extends $Notifier<InventoryState> {
  InventoryState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<InventoryState, InventoryState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<InventoryState, InventoryState>,
              InventoryState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
