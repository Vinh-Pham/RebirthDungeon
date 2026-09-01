// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'progression_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ProgressionController)
final progressionControllerProvider = ProgressionControllerProvider._();

final class ProgressionControllerProvider
    extends $NotifierProvider<ProgressionController, ProgressionState> {
  ProgressionControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'progressionControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$progressionControllerHash();

  @$internal
  @override
  ProgressionController create() => ProgressionController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgressionState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgressionState>(value),
    );
  }
}

String _$progressionControllerHash() =>
    r'109c80a0d31d71f8ebc89b40cca4d4d9d1daec42';

abstract class _$ProgressionController extends $Notifier<ProgressionState> {
  ProgressionState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ProgressionState, ProgressionState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ProgressionState, ProgressionState>,
              ProgressionState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
