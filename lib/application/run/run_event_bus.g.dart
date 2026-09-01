// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'run_event_bus.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(runEventBus)
final runEventBusProvider = RunEventBusProvider._();

final class RunEventBusProvider
    extends $FunctionalProvider<RunEventBus, RunEventBus, RunEventBus>
    with $Provider<RunEventBus> {
  RunEventBusProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'runEventBusProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$runEventBusHash();

  @$internal
  @override
  $ProviderElement<RunEventBus> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  RunEventBus create(Ref ref) {
    return runEventBus(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RunEventBus value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RunEventBus>(value),
    );
  }
}

String _$runEventBusHash() => r'b2e0a461c0fb2ed20999b390fbbc3f5abf42c67e';
