import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'settings_controller.g.dart';

/// UI preferences only (Phase 8 rule: never game state). Persisted to
/// SharedPreferences immediately on change.
class SettingsState {
  const SettingsState({
    this.musicEnabled = true,
    this.sfxEnabled = true,
    this.hapticsEnabled = true,
  });

  final bool musicEnabled;
  final bool sfxEnabled;
  final bool hapticsEnabled;

  SettingsState copyWith({
    bool? musicEnabled,
    bool? sfxEnabled,
    bool? hapticsEnabled,
  }) {
    return SettingsState(
      musicEnabled: musicEnabled ?? this.musicEnabled,
      sfxEnabled: sfxEnabled ?? this.sfxEnabled,
      hapticsEnabled: hapticsEnabled ?? this.hapticsEnabled,
    );
  }
}

@Riverpod(keepAlive: true)
class SettingsController extends _$SettingsController {
  static const _musicKey = 'settings.musicEnabled';
  static const _sfxKey = 'settings.sfxEnabled';
  static const _hapticsKey = 'settings.hapticsEnabled';

  @override
  SettingsState build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    return SettingsState(
      musicEnabled: prefs.getBool(_musicKey) ?? true,
      sfxEnabled: prefs.getBool(_sfxKey) ?? true,
      hapticsEnabled: prefs.getBool(_hapticsKey) ?? true,
    );
  }

  void setMusicEnabled(bool value) => _write(_musicKey, value);
  void setSfxEnabled(bool value) => _write(_sfxKey, value);
  void setHapticsEnabled(bool value) => _write(_hapticsKey, value);

  void _write(String key, bool value) {
    ref.read(sharedPreferencesProvider).setBool(key, value);
    state = state.copyWith(
      musicEnabled: key == _musicKey ? value : null,
      sfxEnabled: key == _sfxKey ? value : null,
      hapticsEnabled: key == _hapticsKey ? value : null,
    );
  }
}
