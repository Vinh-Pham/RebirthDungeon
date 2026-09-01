// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'combat_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(combatController)
final combatControllerProvider = CombatControllerProvider._();

final class CombatControllerProvider
    extends
        $FunctionalProvider<
          CombatController,
          CombatController,
          CombatController
        >
    with $Provider<CombatController> {
  CombatControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'combatControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$combatControllerHash();

  @$internal
  @override
  $ProviderElement<CombatController> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  CombatController create(Ref ref) {
    return combatController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CombatController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CombatController>(value),
    );
  }
}

String _$combatControllerHash() => r'f3d2b80f6ac2b1f7a6799a90bc726315a5a5e7b8';

/// The active combat, or null when the hero is not fighting.

@ProviderFor(activeCombat)
final activeCombatProvider = ActiveCombatProvider._();

/// The active combat, or null when the hero is not fighting.

final class ActiveCombatProvider
    extends $FunctionalProvider<CombatState?, CombatState?, CombatState?>
    with $Provider<CombatState?> {
  /// The active combat, or null when the hero is not fighting.
  ActiveCombatProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'activeCombatProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$activeCombatHash();

  @$internal
  @override
  $ProviderElement<CombatState?> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  CombatState? create(Ref ref) {
    return activeCombat(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CombatState? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CombatState?>(value),
    );
  }
}

String _$activeCombatHash() => r'8e9240b4f43ceb39302d9d0a839532fb1f2a6460';
