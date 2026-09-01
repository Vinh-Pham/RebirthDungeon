// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'run_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Bridges the Flutter app to the pure-Dart run and combat engines.
///
/// The engines (and their RNG streams) are created per run and kept for the
/// run's lifetime; the root seed is drawn here in the application layer and
/// every subsystem derives its own channel from it.

@ProviderFor(RunController)
final runControllerProvider = RunControllerProvider._();

/// Bridges the Flutter app to the pure-Dart run and combat engines.
///
/// The engines (and their RNG streams) are created per run and kept for the
/// run's lifetime; the root seed is drawn here in the application layer and
/// every subsystem derives its own channel from it.
final class RunControllerProvider
    extends $NotifierProvider<RunController, RunUiState> {
  /// Bridges the Flutter app to the pure-Dart run and combat engines.
  ///
  /// The engines (and their RNG streams) are created per run and kept for the
  /// run's lifetime; the root seed is drawn here in the application layer and
  /// every subsystem derives its own channel from it.
  RunControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'runControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$runControllerHash();

  @$internal
  @override
  RunController create() => RunController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RunUiState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RunUiState>(value),
    );
  }
}

String _$runControllerHash() => r'e606fb7b39c795ce550e243469eb4c69d3678141';

/// Bridges the Flutter app to the pure-Dart run and combat engines.
///
/// The engines (and their RNG streams) are created per run and kept for the
/// run's lifetime; the root seed is drawn here in the application layer and
/// every subsystem derives its own channel from it.

abstract class _$RunController extends $Notifier<RunUiState> {
  RunUiState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<RunUiState, RunUiState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<RunUiState, RunUiState>,
              RunUiState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
