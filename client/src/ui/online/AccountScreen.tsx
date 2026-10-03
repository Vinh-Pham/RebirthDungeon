import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Input } from 'heroui-native/input';
import { Label } from 'heroui-native/label';
import { TextField } from 'heroui-native/text-field';
import { useOnline, useOnlineAccess } from '../../online/OnlineProvider';
import { MenuButton, MenuError, MenuPage, menu } from '../menu/MenuUI';
import { connectionMessages } from '../../online/ConnectionStatus';
import { openOnlineWebAddress } from '../../online/localWeb';
import { apiConfiguration } from '../../online/config';
import { DungeonLoading } from '../shared/DungeonUI';
export default function AccountScreen() {
  const online = useOnline(),
    connection = useOnlineAccess();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const connected = connection.online && connection.foreground;
  const status = online.connectionStatus;
  const needsSetup = status === 'missing-configuration' || status === 'invalid-configuration';
  const retryable = status === 'unreachable' || status === 'server-error' || status === 'offline';
  const usable = status === 'ready' || status === 'signed-out';
  const run = async (operation: () => Promise<void>) => {
    setError(undefined);
    try {
      await operation();
      setPassword('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Account request failed.');
    }
  };
  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 12 &&
    password.length <= 128;
  return (
    <MenuPage>
      <Text className="text-accent" style={menu.eyebrow}>
        REBIRTH DUNGEON · ACCOUNT
      </Text>
      <Text className="text-foreground" accessibilityRole="header" style={menu.title}>
        {needsSetup
          ? 'Set up online play'
          : !usable
            ? 'Connect to online play'
            : online.session
              ? 'Your account'
              : mode === 'sign-up'
                ? 'Create an account'
                : 'Sign in'}
      </Text>
      <Text className="text-muted" style={menu.body}>
        Sign in to play. A connection is required, and your progress is saved on the server.
      </Text>
      {online.loading ? <DungeonLoading label="Checking session" /> : null}
      <MenuError message={connectionMessages[status]} />
      {usable ? <MenuError message={error ?? online.error} /> : null}
      {needsSetup && __DEV__ ? (
        <View style={menu.section}>
          <Text className="text-foreground" style={menu.body}>
            From the project folder, run pnpm online:setup, then pnpm online:dev. Restart Expo and
            fully reload this app after setup.
          </Text>
          {apiConfiguration.error ? <MenuError message={apiConfiguration.error} /> : null}
        </View>
      ) : null}
      {__DEV__ && apiConfiguration.url ? (
        <Text className="text-muted" style={menu.body}>
          Server: {apiConfiguration.url}
        </Text>
      ) : null}
      {__DEV__ && online.webAddress ? (
        <View style={menu.section}>
          <Text className="text-foreground" style={menu.body}>
            Online play: {new URL(online.webAddress).origin}
          </Text>
          <Text className="text-muted" style={menu.body}>
            Open this address to connect to the game server and sign in.
          </Text>
          <MenuButton label="Open online play address" onPress={openOnlineWebAddress} />
        </View>
      ) : null}
      {retryable ? (
        <MenuButton
          label="Retry connection"
          secondary
          disabled={!connected || online.changing}
          onPress={() => {
            void run(online.refreshSession);
          }}
        />
      ) : null}
      {usable && online.session ? (
        <View style={menu.section}>
          <Text className="text-foreground" style={menu.body}>
            {online.session.user.email}
          </Text>
          <MenuButton
            label="Online characters"
            disabled={!connected || online.changing}
            onPress={() => router.navigate('/online/characters')}
          />
          <MenuButton
            label="Sign out"
            secondary
            busy={online.changing}
            disabled={!connected}
            onPress={() => {
              void run(online.signOut);
            }}
          />
        </View>
      ) : status !== 'signed-out' ? null : (
        <View style={menu.section}>
          <TextField isRequired isDisabled={online.changing}>
            <Label>Email</Label>
            <Input
              accessibilityLabel="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              placeholder="you@example.com"
            />
          </TextField>
          <TextField isRequired isDisabled={online.changing}>
            <Label>Password</Label>
            <Input
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
              maxLength={128}
              placeholder="12–128 characters"
            />
          </TextField>
          <MenuButton
            label={mode === 'sign-up' ? 'Create account' : 'Sign in'}
            busy={online.changing}
            disabled={!connected || !online.api || !valid}
            onPress={() => {
              void run(() => online.authenticate(mode, email, password));
            }}
          />
          <MenuButton
            label={mode === 'sign-up' ? 'Already have an account? Sign in' : 'Create an account'}
            secondary
            disabled={online.changing}
            onPress={() => {
              setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up');
              setError(undefined);
            }}
          />
          <MenuButton
            label="Retry connection"
            secondary
            disabled={!connected || !online.api || online.changing}
            onPress={() => {
              void run(online.refreshSession);
            }}
          />
        </View>
      )}
      <MenuButton label="Back to title" secondary onPress={() => router.navigate('/')} />
    </MenuPage>
  );
}
