import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/app/app.dart';

void main() {
  testWidgets('app shell builds and shows the placeholder home screen', (
    tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: RebirthDungeonApp()));

    expect(find.text('Rebirth Dungeon'), findsOneWidget);
    expect(
      find.text('Bootstrap complete. Gameplay arrives with Phase 7.'),
      findsOneWidget,
    );
  });
}
