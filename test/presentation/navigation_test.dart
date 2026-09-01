import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/app/app.dart';
import 'package:rebirth_dungeon/app/router.dart';
import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/content/content_fixtures.dart';

Future<ProviderContainer> _pumpApp(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      contentProvider.overrideWith(
        (ref) async => GameContent.parse(validContentSet()),
      ),
    ],
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: const RebirthDungeonApp(),
    ),
  );
  return container;
}

void main() {
  testWidgets('splash hands over to login, guest sign-in reaches home', (
    tester,
  ) async {
    await _pumpApp(tester);

    // Splash is visible first.
    expect(find.text('Loading Rebirth Dungeon...'), findsOneWidget);

    // Advance past the splash delay and let the content future resolve.
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();

    expect(find.text('Play as guest'), findsOneWidget);

    await tester.tap(find.text('Play as guest'));
    await tester.pumpAndSettle();

    expect(find.text('Welcome,'), findsNothing); // no stray splash text
    expect(find.text('Rebirth Dungeon'), findsWidgets); // home app bar
  });

  testWidgets('deep-linking to a game route without a run falls back to '
      'dungeon selection', (tester) async {
    final container = await _pumpApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Play as guest'));
    await tester.pumpAndSettle();

    container.read(routerProvider).go('/game/not-a-real-run');
    await tester.pumpAndSettle();

    expect(find.text('Choose a Dungeon'), findsOneWidget);
  });

  testWidgets('the dungeon list comes from content and starts a run', (
    tester,
  ) async {
    await _pumpApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Play as guest'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Play'));
    await tester.pumpAndSettle();

    // Both fixture dungeons are listed by name.
    expect(find.text('Halls'), findsNWidgets(2));

    // Start a run from the first card and land on the game screen.
    await tester.tap(find.text('Halls').first);
    await tester.pumpAndSettle();

    expect(find.textContaining('Floor 1 of'), findsOneWidget);
    expect(find.text('Doors'), findsOneWidget);
  });

  testWidgets('signed-in sessions skip login', (tester) async {
    final container = await _pumpApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Play as guest'));
    await tester.pumpAndSettle();

    final router = container.read(routerProvider);
    router.go('/login');
    await tester.pumpAndSettle();

    expect(find.text('Play as guest'), findsNothing);
    expect(find.text('Rebirth Dungeon'), findsWidgets); // back on home
  });
}
