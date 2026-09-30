import type { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function MenuPage({ children }: PropsWithChildren) {
  return <SafeAreaView style={menu.screen}>
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
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [menu.button, secondary && menu.secondary, (disabled || busy) && menu.disabled, pressed && menu.pressed]}>
    {busy ? <ActivityIndicator color="#d0b987" /> : null}<Text style={[menu.buttonText, secondary && menu.secondaryText]}>{label}</Text>
  </Pressable>;
}
export function MenuError({ message }: { message?: string }) {
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={menu.error}>{message}</Text> : null;
}
export const menu = StyleSheet.create({
  fill: { flex: 1 }, screen: { flex: 1, backgroundColor: '#101719' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 28 },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 20, flexGrow: 1 },
  eyebrow: { color: '#a79474', fontSize: 10, letterSpacing: 3, lineHeight: 18 },
  title: { color: '#e4d9c5', fontSize: 34, lineHeight: 42, fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia' },
  body: { color: '#aab6b5', fontSize: 14, lineHeight: 23 },
  heading: { color: '#e4d9c5', fontSize: 18, fontWeight: '600' },
  label: { color: '#d0b987', fontSize: 14, fontWeight: '600' },
  section: { gap: 12 }, card: { backgroundColor: '#192326', padding: 20, gap: 10, borderRadius: 12, borderWidth: 1, borderColor: '#344044' },
  button: { minHeight: 52, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#d0b987', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buttonText: { color: '#172124', fontSize: 15, fontWeight: '700' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#53605e' }, secondaryText: { color: '#d0b987' },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.75 }, error: { color: '#efa68d', lineHeight: 22, fontSize: 14 },
  divider: { height: 1, backgroundColor: '#344044', marginVertical: 8 },
});
