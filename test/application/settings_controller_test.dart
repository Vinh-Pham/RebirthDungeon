import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:rebirth_dungeon/application/settings/settings_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test(
    'settings defaults are on and persist through SharedPreferences',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      final container = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container.dispose);

      expect(container.read(settingsControllerProvider).musicEnabled, isTrue);

      container
          .read(settingsControllerProvider.notifier)
          .setMusicEnabled(false);
      container
          .read(settingsControllerProvider.notifier)
          .setHapticsEnabled(false);

      expect(container.read(settingsControllerProvider).musicEnabled, isFalse);
      expect(
        container.read(settingsControllerProvider).hapticsEnabled,
        isFalse,
      );
      expect(container.read(settingsControllerProvider).sfxEnabled, isTrue);
      expect(prefs.getBool('settings.musicEnabled'), isFalse);
      expect(prefs.getBool('settings.hapticsEnabled'), isFalse);
    },
  );

  test('stored preferences are restored on startup', () async {
    SharedPreferences.setMockInitialValues({'settings.sfxEnabled': false});
    final prefs = await SharedPreferences.getInstance();

    final container = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(container.dispose);

    expect(container.read(settingsControllerProvider).sfxEnabled, isFalse);
  });
}
