import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;
import 'package:rebirth_dungeon/domain/content/game_content.dart';

/// Repository contract for loading the validated game content set.
///
/// Application controllers depend on this interface only; concrete
/// implementations (asset bundle today, remote/patched content later) are
/// wired at composition time in `main.dart`.
abstract interface class ContentRepository {
  Future<GameContent> load();
}

/// Loads and validates the JSON files shipped under `assets/data/`.
class AssetContentRepository implements ContentRepository {
  const AssetContentRepository();

  @override
  Future<GameContent> load() async {
    final files = <String, Object?>{
      for (final fileName in ContentFiles.all)
        fileName: jsonDecode(
          await rootBundle.loadString('assets/data/$fileName'),
        ),
    };
    return GameContent.parse(files);
  }
}
