import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DungeonButton, DungeonNotice } from '../shared/DungeonUI';

export function MenuPage({ children }: PropsWithChildren) {
  return <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-background">
    <KeyboardAvoidingView style={menu.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={menu.scroll}>
        <View style={menu.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function MenuButton({ label, onPress, secondary = false, disabled = false, busy = false }: {
  label: string; onPress(): void; secondary?: boolean; disabled?: boolean; busy?: boolean;
}) {
  return <DungeonButton label={label} onPress={onPress} primary={!secondary} disabled={disabled} busy={busy} className="min-h-[52px]" />;
}
export function MenuError({ message }: { message?: string }) {
  return <DungeonNotice message={message} />;
}
export const menu = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 28 },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 20, flexGrow: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 3, lineHeight: 18 },
  title: { fontSize: 34, lineHeight: 42, fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia' },
  body: { fontSize: 14, lineHeight: 23 },
  heading: { fontSize: 18, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600' },
  section: { gap: 12 },
});
