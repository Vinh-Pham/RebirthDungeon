import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:rebirth_dungeon/application/settings/settings_controller.dart';

/// UI preferences. Only preferences live here — never game state.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);
    final controller = ref.read(settingsControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          SwitchListTile(
            secondary: const Icon(Icons.music_note),
            title: const Text('Music'),
            value: settings.musicEnabled,
            onChanged: controller.setMusicEnabled,
          ),
          SwitchListTile(
            secondary: const Icon(Icons.volume_up),
            title: const Text('Sound effects'),
            value: settings.sfxEnabled,
            onChanged: controller.setSfxEnabled,
          ),
          SwitchListTile(
            secondary: const Icon(Icons.vibration),
            title: const Text('Haptics'),
            value: settings.hapticsEnabled,
            onChanged: controller.setHapticsEnabled,
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text(
              'Audio arrives with Phase 11; preferences persist now.',
            ),
          ),
        ],
      ),
    );
  }
}
