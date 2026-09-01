import 'package:go_router/go_router.dart';

import '../presentation/home/home_screen.dart';

/// Application-level navigation. Placeholder route set until Phase 5 adds
/// splash, login, dungeon selection, game, characters, inventory, gacha,
/// shop, and settings routes with guards.
///
/// Flame never routes between meta screens; it only renders the game scene.
final appRouter = GoRouter(
  initialLocation: '/',
  routes: [GoRoute(path: '/', builder: (context, state) => const HomeScreen())],
);
