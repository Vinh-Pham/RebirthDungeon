import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { CharacterSummary } from '../../persistence/CharacterRepository';
import { TALENT_LABELS } from '../../persistence/CharacterProfile';
import { withCharacters } from '../../persistence/characters';
import { MenuButton, MenuError, MenuPage, menu } from './MenuUI';

export default function CharacterSelectScreen() {
  const [attempt, setAttempt] = useState(0);
  return <CharacterSelectContent key={attempt} retry={() => setAttempt((value) => value + 1)} />;
}
function CharacterSelectContent({ retry }: { retry(): void }) {
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(undefined);
    void withCharacters((repository) => repository.list()).then((entries) => {
      if (active) setCharacters(entries);
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : 'Your characters could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));
  return <MenuPage>
    <Text style={menu.eyebrow}>REBIRTH DUNGEON</Text>
    <Text accessibilityRole="header" style={menu.title}>Choose your character</Text>
    <Text style={menu.body}>Continue a journey, or begin a new life.</Text>
    {loading ? <ActivityIndicator accessibilityLabel="Loading characters" color="#d0b987" /> : error ? <View style={menu.section}>
      <MenuError message={error} /><MenuButton label="Retry" secondary onPress={retry} />
    </View> : characters.length ? <View style={menu.section}>{characters.map(({ profile, level, error: saveError }) => <Pressable key={profile.id}
      accessibilityRole="button" accessibilityLabel={`${profile.name}, ${profile.needsSetup ? 'complete character details' : `${TALENT_LABELS[profile.talent]}, age ${profile.age}, level ${level ?? 'unknown'}`}`}
      accessibilityState={{ disabled: !!saveError, selected: selected === profile.id }} disabled={!!saveError}
      onPress={() => profile.needsSetup ? router.push({ pathname: '/characters/new', params: { importId: profile.id } }) : router.push({ pathname: '/game/[characterId]', params: { characterId: profile.id } })}
      style={({ pressed }) => [menu.card, selected === profile.id && { borderColor: '#d0b987' }, pressed && menu.pressed]}>
      <Text style={menu.heading}>{profile.name}</Text>
      <Text style={menu.body}>{profile.needsSetup ? 'Your existing journey · Complete your character details' : `${TALENT_LABELS[profile.talent]} · Age ${profile.age} · Level ${level ?? '—'}`}</Text>
      {saveError ? <MenuError message={saveError} /> : <Text style={menu.label}>{profile.needsSetup ? 'Complete character →' : 'Continue journey →'}</Text>}
    </Pressable>)}</View> : <View style={menu.card}>
      <Text style={menu.heading}>Your story is unwritten</Text><Text style={menu.body}>Create your first character to enter the dungeon.</Text>
    </View>}
    <MenuButton label="Create New Character" onPress={() => router.push('/characters/new')} />
    <MenuButton label="Back to Title" secondary onPress={() => router.navigate('/')} />
  </MenuPage>;
}
