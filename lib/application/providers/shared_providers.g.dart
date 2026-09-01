// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'shared_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Composition-time dependency, overridden in `main.dart` with the real
/// (pre-loaded) SharedPreferences instance.

@ProviderFor(sharedPreferences)
final sharedPreferencesProvider = SharedPreferencesProvider._();

/// Composition-time dependency, overridden in `main.dart` with the real
/// (pre-loaded) SharedPreferences instance.

final class SharedPreferencesProvider
    extends
        $FunctionalProvider<
          SharedPreferences,
          SharedPreferences,
          SharedPreferences
        >
    with $Provider<SharedPreferences> {
  /// Composition-time dependency, overridden in `main.dart` with the real
  /// (pre-loaded) SharedPreferences instance.
  SharedPreferencesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'sharedPreferencesProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$sharedPreferencesHash();

  @$internal
  @override
  $ProviderElement<SharedPreferences> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SharedPreferences create(Ref ref) {
    return sharedPreferences(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SharedPreferences value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SharedPreferences>(value),
    );
  }
}

String _$sharedPreferencesHash() => r'2d3f210f1a834612b934d587daa5c84fe0460d15';

/// Composition-time dependency for content loading; overridden in tests.

@ProviderFor(contentRepository)
final contentRepositoryProvider = ContentRepositoryProvider._();

/// Composition-time dependency for content loading; overridden in tests.

final class ContentRepositoryProvider
    extends
        $FunctionalProvider<
          ContentRepository,
          ContentRepository,
          ContentRepository
        >
    with $Provider<ContentRepository> {
  /// Composition-time dependency for content loading; overridden in tests.
  ContentRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'contentRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$contentRepositoryHash();

  @$internal
  @override
  $ProviderElement<ContentRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ContentRepository create(Ref ref) {
    return contentRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ContentRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ContentRepository>(value),
    );
  }
}

String _$contentRepositoryHash() => r'85e1b4309b0cf97734d1bd34984530bbe681f91e';

/// The validated content set every controller and screen reads.
/// Loading errors surface as `AsyncError` and screens render them.

@ProviderFor(content)
final contentProvider = ContentProvider._();

/// The validated content set every controller and screen reads.
/// Loading errors surface as `AsyncError` and screens render them.

final class ContentProvider
    extends
        $FunctionalProvider<
          AsyncValue<GameContent>,
          GameContent,
          FutureOr<GameContent>
        >
    with $FutureModifier<GameContent>, $FutureProvider<GameContent> {
  /// The validated content set every controller and screen reads.
  /// Loading errors surface as `AsyncError` and screens render them.
  ContentProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'contentProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$contentHash();

  @$internal
  @override
  $FutureProviderElement<GameContent> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<GameContent> create(Ref ref) {
    return content(ref);
  }
}

String _$contentHash() => r'ac821d5b1c0cd337aa3c9995783de81ee8370342';
