import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CharacterDetailsSchema, TALENTS, TALENT_LABELS, type CharacterDetails } from '../../persistence/CharacterProfile';
import { withCharacters } from '../../persistence/characters';
import { MenuButton, MenuError, MenuPage, menu } from './MenuUI';

const ages = Array.from({ length: 8 }, (_, index) => index + 10);
const descriptions = { warrior: 'A talent for the blade.', archery: 'A steady hand and a watchful eye.', mage: 'A spark of the arcane.' };
export default function NewCharacterScreen() {
  const [attempt, setAttempt] = useState(0);
  return <NewCharacterForm key={attempt} retry={() => setAttempt((value) => value + 1)} />;
}
function NewCharacterForm({ retry }: { retry(): void }) {
  const { importId } = useLocalSearchParams<{ importId?: string }>();
  const [name, setName] = useState('');
  const [talent, setTalent] = useState<CharacterDetails['talent']>();
  const [age, setAge] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!importId);
  const [error, setError] = useState<string>();
  const submitting = useRef(false);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    let active = true;
    if (importId) {
      setReady(false); setError(undefined);
      void withCharacters((repository) => repository.get(importId)).then((profile) => {
        if (!active) return;
        if (!profile?.needsSetup) throw new Error('This character does not need setup.');
        setReady(true);
      }).catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Character details could not be loaded.'); });
    }
    return () => { active = false; focused.current = false; };
  }, [importId]));
  const valid = CharacterDetailsSchema.safeParse({ name, talent, age }).success;
  async function submit() {
    if (submitting.current || !ready) return;
    const result = CharacterDetailsSchema.safeParse({ name, talent, age });
    if (!result.success) { setError('Enter a name, choose a talent, and select an age from 10 to 17.'); return; }
    submitting.current = true; setBusy(true); setError(undefined);
    try {
      const profile = await withCharacters((repository) => importId ? repository.completeImport(importId, result.data) : repository.create(result.data));
      if (focused.current) router.dismissTo({ pathname: '/characters', params: { selected: profile.id } });
    } catch (failure) { if (focused.current) setError(failure instanceof Error ? failure.message : 'Your character could not be saved. Please try again.'); }
    finally { submitting.current = false; if (focused.current) setBusy(false); }
  }
  return <MenuPage>
    <Text style={menu.eyebrow}>REBIRTH DUNGEON · {importId ? 'EXISTING JOURNEY' : 'A NEW LIFE'}</Text>
    <Text accessibilityRole="header" style={menu.title}>{importId ? 'Name your adventurer' : 'Create a character'}</Text>
    <Text style={menu.body}>{importId ? 'Complete your character details to continue your saved journey.' : 'Who will answer the dungeon’s call?'}</Text>
    {!ready ? <View style={menu.section}>{error ? <><MenuError message={error} /><MenuButton label="Retry" onPress={retry} /></> : <ActivityIndicator accessibilityLabel="Loading character" color="#d0b987" />}</View> : <>
      <View style={menu.section}><Text style={menu.label}>Character name</Text>
        <TextInput accessibilityLabel="Character name" value={name} onChangeText={setName} editable={!busy} maxLength={24}
          placeholder="Enter a name" placeholderTextColor="#82908c" autoCorrect={false} autoCapitalize="words" returnKeyType="done" style={styles.input} />
        <Text style={menu.body}>1–24 characters</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Talent" style={menu.section}><Text style={menu.label}>Talent</Text>
        {TALENTS.map((choice) => <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={TALENT_LABELS[choice]}
          accessibilityState={{ selected: talent === choice, checked: talent === choice, disabled: busy }} disabled={busy} onPress={() => setTalent(choice)}
          style={({ pressed }) => [styles.choice, talent === choice && styles.selected, pressed && menu.pressed]}>
          <View style={styles.choiceText}><Text style={menu.heading}>{TALENT_LABELS[choice]}</Text><Text style={menu.body}>{descriptions[choice]}</Text></View>
          <Text style={styles.mark}>{talent === choice ? '●' : '○'}</Text>
        </Pressable>)}
      </View>
      <View style={menu.section}><Text style={menu.label}>Age</Text><View accessibilityRole="radiogroup" accessibilityLabel="Age" style={styles.ages}>
        {ages.map((choice) => <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={`Age ${choice}`}
          accessibilityState={{ selected: age === choice, checked: age === choice, disabled: busy }} disabled={busy} onPress={() => setAge(choice)}
          style={({ pressed }) => [styles.age, age === choice && styles.selected, pressed && menu.pressed]}><Text style={menu.heading}>{choice}</Text></Pressable>)}
      </View></View>
      <MenuError message={error} />
      <MenuButton label={busy ? 'Saving Character…' : importId ? 'Save Character' : 'Create Character'} busy={busy} disabled={!valid} onPress={() => { void submit(); }} />
    </>}
    <MenuButton label="Cancel" secondary disabled={busy} onPress={() => router.dismissTo('/characters')} />
  </MenuPage>;
}
const styles = StyleSheet.create({
  input: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#192326', color: '#e4d9c5', borderWidth: 1, borderColor: '#53605e', borderRadius: 8, fontSize: 17 },
  choice: { backgroundColor: '#192326', borderColor: '#344044', borderWidth: 1, borderRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceText: { flex: 1, gap: 4 }, mark: { color: '#d0b987', fontSize: 22 },
  selected: { borderColor: '#d0b987', backgroundColor: '#293331' }, ages: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  age: { width: '22%', flexGrow: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#344044', backgroundColor: '#192326' },
});
