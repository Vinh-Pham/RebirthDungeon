// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'shop_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ShopController)
final shopControllerProvider = ShopControllerProvider._();

final class ShopControllerProvider
    extends $NotifierProvider<ShopController, ShopState> {
  ShopControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'shopControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$shopControllerHash();

  @$internal
  @override
  ShopController create() => ShopController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ShopState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ShopState>(value),
    );
  }
}

String _$shopControllerHash() => r'96e745e589696e024bee8c434fd74eecc17bfe6b';

abstract class _$ShopController extends $Notifier<ShopState> {
  ShopState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ShopState, ShopState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ShopState, ShopState>,
              ShopState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
