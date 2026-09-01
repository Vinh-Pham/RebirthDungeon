import 'package:rebirth_dungeon/data/repositories/content_repository.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'shared_providers.g.dart';

/// Composition-time dependency, overridden in `main.dart` with the real
/// (pre-loaded) SharedPreferences instance.
@Riverpod(keepAlive: true)
SharedPreferences sharedPreferences(Ref ref) {
  throw UnimplementedError(
    'sharedPreferencesProvider must be overridden in main.dart.',
  );
}

/// Composition-time dependency for content loading; overridden in tests.
@Riverpod(keepAlive: true)
ContentRepository contentRepository(Ref ref) {
  return const AssetContentRepository();
}

/// The validated content set every controller and screen reads.
/// Loading errors surface as `AsyncError` and screens render them.
@Riverpod(keepAlive: true)
Future<GameContent> content(Ref ref) {
  return ref.watch(contentRepositoryProvider).load();
}
