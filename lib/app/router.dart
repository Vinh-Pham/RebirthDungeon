import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rebirth_dungeon/application/account/account_controller.dart';
import 'package:rebirth_dungeon/application/run/run_controller.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/presentation/characters/characters_screen.dart';
import 'package:rebirth_dungeon/presentation/dungeon/dungeon_selection_screen.dart';
import 'package:rebirth_dungeon/presentation/gacha/gacha_screen.dart';
import 'package:rebirth_dungeon/presentation/game/game_screen.dart';
import 'package:rebirth_dungeon/presentation/home/home_screen.dart';
import 'package:rebirth_dungeon/presentation/inventory/inventory_screen.dart';
import 'package:rebirth_dungeon/presentation/login/login_screen.dart';
import 'package:rebirth_dungeon/presentation/settings/settings_screen.dart';
import 'package:rebirth_dungeon/presentation/shop/shop_screen.dart';
import 'package:rebirth_dungeon/presentation/splash/splash_screen.dart';

/// Application navigation (dart-game-plan.md section 2). Flame never routes
/// between meta screens.
///
/// Guards:
/// - Every screen except splash/login requires a signed-in (guest) session.
/// - `/game/:runId` additionally requires that this exact run exists and is
///   still in progress, so stale deep links fall back to dungeon selection.
/// - A signed-in session on `/login` goes straight to `/home`.
final routerProvider = Provider<GoRouter>((ref) {
  // Re-run the redirect whenever session or run state changes.
  final refresh = ValueNotifier(0);
  ref.listen(accountControllerProvider, (_, _) => refresh.value++);
  ref.listen(runControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final location = state.matchedLocation;
      final account = ref.read(accountControllerProvider);
      final onAuthScreen = location == '/splash' || location == '/login';

      if (!account.isSignedIn && !onAuthScreen) {
        return '/login';
      }
      if (account.isSignedIn && location == '/login') {
        return '/home';
      }
      if (location.startsWith('/game')) {
        final run = ref.read(runControllerProvider).run;
        final runId = state.pathParameters['runId'];
        final isActive = run != null && run.runId == runId && !run.isTerminal;
        if (!isActive) {
          return '/dungeon';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
      GoRoute(
        path: '/dungeon',
        builder: (context, state) => const DungeonSelectionScreen(),
      ),
      GoRoute(
        path: '/game/:runId',
        builder: (context, state) =>
            GameScreen(runId: state.pathParameters['runId']!),
      ),
      GoRoute(
        path: '/characters',
        builder: (context, state) => const CharactersScreen(),
      ),
      GoRoute(
        path: '/inventory',
        builder: (context, state) => const InventoryScreen(),
      ),
      GoRoute(path: '/gacha', builder: (context, state) => const GachaScreen()),
      GoRoute(path: '/shop', builder: (context, state) => const ShopScreen()),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
});
