import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'progression_controller.g.dart';

/// Placeholder progression state — character ownership, leveling, and
/// experience arrive with the progression domain (Phase 8/9).
class ProgressionState {
  const ProgressionState({this.ownedHeroIds = const <String>{}});

  final Set<String> ownedHeroIds;

  bool isOwned(String heroId) => ownedHeroIds.contains(heroId);
}

@Riverpod(keepAlive: true)
class ProgressionController extends _$ProgressionController {
  @override
  ProgressionState build() {
    return const ProgressionState();
  }
}
