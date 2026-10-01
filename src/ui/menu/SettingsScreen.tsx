import { Text, View } from 'react-native';
import { useAudio } from '../../audio/AudioProvider';
import { DungeonButton, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import { MenuPage, menu } from './MenuUI';

export default function SettingsScreen() {
  const audio = useAudio();
  const { settings, ready, soundReady } = audio;
  return <MenuPage>
    <Text className="text-muted" style={menu.body}>Sound preferences apply to every character.</Text>
    {!ready ? <DungeonLoading label="Loading sound preferences" /> : <DungeonCard>
      <Text className="text-accent" style={menu.heading}>Sound</Text>
      <DungeonButton label={settings.enabled ? soundReady ? 'Mute sound' : 'Resume sound' : 'Enable sound'} selected={settings.enabled}
        onPress={() => {
          if (settings.enabled && !soundReady) audio.resume();
          else audio.setSettings({ ...settings, enabled: !settings.enabled });
        }} />
      {(['music', 'sfx'] as const).map((channel) => <View key={channel} className="gap-2 py-2">
        <Text className="text-muted" style={menu.body}>{channel === 'music' ? 'Music' : 'Effects'} · {Math.round(settings[channel] * 100)}%</Text>
        <View className="flex-row flex-wrap gap-2">
          <DungeonButton label={`Lower ${channel} volume`} disabled={settings[channel] === 0}
            onPress={() => audio.setSettings({ ...settings, [channel]: Math.round(Math.max(0, settings[channel] - 0.1) * 10) / 10 })} />
          <DungeonButton label={`Raise ${channel} volume`} disabled={settings[channel] === 1}
            onPress={() => audio.setSettings({ ...settings, [channel]: Math.round(Math.min(1, settings[channel] + 0.1) * 10) / 10 })} />
        </View>
      </View>)}
    </DungeonCard>}
    <DungeonNotice message={audio.error} />
    {audio.error ? <DungeonButton label="Retry sound preferences" onPress={() => { void audio.preferences.retry(); if (settings.enabled) audio.resume(); }} /> : null}
  </MenuPage>;
}
