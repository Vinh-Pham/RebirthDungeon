import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Description } from 'heroui-native/description';
import { FieldError } from 'heroui-native/field-error';
import { Input } from 'heroui-native/input';
import { Label } from 'heroui-native/label';
import { RadioGroup } from 'heroui-native/radio-group';
import { TextField } from 'heroui-native/text-field';
import { cn } from 'heroui-native/utils';
import { CharacterDetailsSchema, TALENTS, TALENT_LABELS, type CharacterDetails } from '../../persistence/CharacterProfile';
import { withCharacters } from '../../persistence/characters';
import { MenuButton, MenuError, MenuPage, menu } from './MenuUI';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import { DungeonLoading } from '../shared/DungeonUI';

const ages = Array.from({ length: 8 }, (_, index) => index + 10);
const descriptions = { warrior: '+20 Strength; gains Strength as you level.', archery: '+10 Dexterity, +5 Health and Stamina; gains Dexterity as you level.', mage: '+10 Intelligence and Mana; gains Intelligence as you level.' };
export default function NewCharacterScreen() {
  const [attempt, setAttempt] = useState(0);
  return <NewCharacterForm key={attempt} retry={() => setAttempt((value) => value + 1)} />;
}
function NewCharacterForm({ retry }: { retry(): void }) {
  const { importId } = useLocalSearchParams<{ importId?: string }>();
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
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
  const nameValidation = CharacterDetailsSchema.shape.name.safeParse(name);
  const nameError = nameTouched && !nameValidation.success ? nameValidation.error.issues[0]?.message : undefined;
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
    <Text className="text-accent" style={menu.eyebrow}>REBIRTH DUNGEON · {importId ? 'EXISTING JOURNEY' : 'A NEW LIFE'}</Text>
    <Text className="text-foreground" accessibilityRole="header" style={menu.title}>{importId ? 'Name your adventurer' : 'Create a character'}</Text>
    <Text className="text-muted" style={menu.body}>{importId ? 'Complete your character details to continue your saved journey.' : 'Who will answer the dungeon’s call?'}</Text>
    {!ready ? <View style={menu.section}>{error ? <><MenuError message={error} /><MenuButton label="Retry" onPress={retry} /></> : <DungeonLoading label="Loading character" />}</View> : <>
      <TextField isRequired isDisabled={busy} isInvalid={!!nameError}>
        <Label className="text-accent">Character name</Label>
        <Input accessibilityLabel="Character name" value={name} onChangeText={setName} onBlur={() => setNameTouched(true)} maxLength={24}
          placeholder="Enter a name" autoCorrect={false} autoCapitalize="words" returnKeyType="done" className="min-h-[54px] border border-border text-base" />
        <Description>1–24 characters</Description>
        <FieldError>{nameError}</FieldError>
      </TextField>
      <View style={menu.section}><Text className="text-accent" style={menu.label}>Talent</Text>
        <KeyboardChoiceGroup itemRole="radio" value={talent}><RadioGroup role="radiogroup" accessibilityLabel="Talent" value={talent} isDisabled={busy}
          onValueChange={(value) => { const choice = TALENTS.find((entry) => entry === value); if (choice) setTalent(choice); }} className="gap-3">
          {TALENTS.map((choice) => <RadioGroup.Item key={choice} value={choice} accessibilityLabel={TALENT_LABELS[choice]} accessibilityHint={descriptions[choice]}
            className={cn('min-h-12 rounded-lg border border-border bg-surface p-4', talent === choice && 'border-accent bg-surface-tertiary')}>
            <View className="flex-1 gap-1"><Label>{TALENT_LABELS[choice]}</Label><Description>{descriptions[choice]}</Description></View>
            <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="text-xl text-accent">{talent === choice ? '●' : '○'}</Text>
          </RadioGroup.Item>)}
        </RadioGroup></KeyboardChoiceGroup>
      </View>
      <View style={menu.section}><Text className="text-accent" style={menu.label}>Age</Text><Text className="text-muted" style={menu.body}>Age changes your character details; it does not affect stats.</Text>
        <KeyboardChoiceGroup itemRole="radio" value={age?.toString()}><RadioGroup role="radiogroup" accessibilityLabel="Age" value={age?.toString()} onValueChange={(value) => setAge(Number(value))} isDisabled={busy} className="flex-row flex-wrap gap-2.5">
          {ages.map((choice) => <RadioGroup.Item key={choice} value={String(choice)} accessibilityLabel={`Age ${choice}`}
            className={cn('min-h-[52px] grow basis-[22%] justify-center rounded-lg border border-border bg-surface', age === choice && 'border-accent bg-surface-tertiary')}>
            <Label className="text-center text-lg">{choice}</Label>
          </RadioGroup.Item>)}
        </RadioGroup></KeyboardChoiceGroup>
      </View>
      <MenuError message={error} />
      <MenuButton label={busy ? 'Saving Character…' : importId ? 'Save Character' : 'Create Character'} busy={busy} disabled={!valid} onPress={() => { void submit(); }} />
    </>}
    <MenuButton label="Cancel" secondary disabled={busy} onPress={() => router.dismissTo('/characters')} />
  </MenuPage>;
}
