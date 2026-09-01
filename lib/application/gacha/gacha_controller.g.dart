// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'gacha_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(gachaController)
final gachaControllerProvider = GachaControllerProvider._();

final class GachaControllerProvider
    extends
        $FunctionalProvider<
          AsyncValue<GachaState>,
          GachaState,
          FutureOr<GachaState>
        >
    with $FutureModifier<GachaState>, $FutureProvider<GachaState> {
  GachaControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'gachaControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$gachaControllerHash();

  @$internal
  @override
  $FutureProviderElement<GachaState> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<GachaState> create(Ref ref) {
    return gachaController(ref);
  }
}

String _$gachaControllerHash() => r'eed1a0d77f998adb5cfd37bf4796eae93a16d6dd';
