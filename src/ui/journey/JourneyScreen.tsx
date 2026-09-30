import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadGameContent } from '../../data/content';
import type { JourneySession } from '../../game/JourneySession';
import { JourneyHost } from '../../game/JourneyHost';
import { createSaveStorage } from '../../persistence/createSaveStorage';
import { AudioManager, type AudioSettings } from '../../audio/AudioManager';
import { ExpoAudioBackend } from '../../audio/ExpoAudioBackend';
import { BattleView, ArenaBoundary } from '../battle/BattleScreen';
import { heroStats, experienceToNextLevel } from '../../engine/rpg/Character';
import { distance, findPath, isWalkable } from '../../engine/world/TileMap';
import type { GameCommand } from '../../engine/commands';
import WorldCanvas from '../../renderer/WorldCanvas';
import { bossCleared, inRoom, remainingEnemies } from '../../engine/dungeon/Dungeon';
function Button({ label, onPress, disabled = false, selected = false }: { label: string; onPress(): void; disabled?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, disabled && styles.disabled, selected && styles.selected, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
export default function JourneyScreen() {
  const [host] = useState(() => new JourneyHost(loadGameContent(), createSaveStorage));
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const session = snapshot.session;
  const [error, setError] = useState<string>();
  const [unlockedSession, setUnlockedSession] = useState<JourneySession>();
  const audio = useRef<AudioManager | null>(null);
  useEffect(() => {
    if (!session) return;
    const report = (error: unknown) => setError(error instanceof Error ? error.message : 'Audio is unavailable');
    const manager = new AudioManager(new ExpoAudioBackend(report), report); audio.current = manager;
    const disconnect = manager.connect(session.engine.events);
    manager.setSettings(session.getSnapshot().state.audio);
    if (Platform.OS !== 'web' && session.getSnapshot().state.audio.enabled) void manager.enable(session.getSnapshot().state.audio);
    const lifecycle = AppState.addEventListener('change', (state) => { manager.suspend(state !== 'active'); if (state !== 'active') void host.flush(); });
    return () => { disconnect(); lifecycle.remove(); manager.dispose(); audio.current = null; };
  }, [session, host]);
  useEffect(() => {
    audio.current?.setScene(snapshot.battle ? 'battle' : 'exploration');
    return snapshot.battle && audio.current ? audio.current.connect(snapshot.battle.engine.events) : undefined;
  }, [snapshot.battle, session]);
  if (!session) return <SafeAreaView style={styles.screen}><View style={styles.loading}><Text style={styles.title}>Rebirth Dungeon</Text><Text style={styles.body}>{snapshot.error ?? 'Loading your journey…'}</Text></View></SafeAreaView>;
  if (snapshot.battle) return <BattleView session={snapshot.battle} restart={host.returnFromBattle} finishedLabel="Return to the journey" />;
  return <Exploration key={snapshot.revision} host={host} session={session} soundReady={Platform.OS !== 'web' || unlockedSession === session} onAudioSettings={(settings) => { if (settings.enabled) void audio.current?.enable(settings).then(() => setUnlockedSession(session)); else audio.current?.setSettings(settings); }} error={error} setError={setError} />;
}
function Exploration({ host, session, soundReady, onAudioSettings, error, setError }: {
  host: JourneyHost; session: NonNullable<ReturnType<JourneyHost['getSnapshot']>['session']>; soundReady: boolean; onAudioSettings(settings: AudioSettings): void;
  error?: string; setError(error?: string): void;
}) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hostView = useSyncExternalStore((listener) => {
    // The parent owns the host lifetime; this subscription only observes its UI notices.
    const unsubscribe = host.subscribe(listener); return unsubscribe;
  }, host.getSnapshot, host.getServerSnapshot);
  const { width: windowWidth } = useWindowDimensions(); const width = Math.max(240, Math.min(windowWidth - 40, 560));
  const { state, map } = view; const run = state.dungeon; const stats = heroStats(state.hero, session.content, run?.effects);
  const currentRoom = run?.blueprint.rooms.find((room) => inRoom(room, state.position));
  const around = run ? map.objects.filter((obj) => (currentRoom && inRoom(currentRoom, obj)) || distance(obj, state.position) <= 5) : map.objects;
  const dispatch = (command: GameCommand) => { if (hostView.busy) return; try { setError(undefined); session.dispatch(command); } catch (error) { setError(error instanceof Error ? error.message : 'Action failed'); } };
  const approach = (objectId: string) => {
    const object = map.objects.find((obj) => obj.id === objectId)!;
    const points = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }))
      .filter((point) => isWalkable(map, point)).map((point) => ({ point, path: findPath(map, state.position, point) }))
      .filter((entry) => entry.path.length).sort((a, b) => a.path.length - b.path.length);
    if (!points.length) { setError('No reachable approach to this object'); return; }
    dispatch({ type: 'TRAVEL_TO', ...points[0].point });
  };
  const interact = (objectId: string) => {
    const obj = map.objects.find((obj) => obj.id === objectId);
    if (!obj || session.isClaimed(objectId)) return;
    if (obj.kind === 'encounter' || (obj.kind === 'gate' && !obj.blocked)) dispatch({ type: 'TRAVEL_TO', x: obj.x, y: obj.y });
    else if (distance(obj, state.position) <= 1) dispatch({ type: 'INTERACT', objectId });
    else approach(objectId);
  };
  const setVolume = (channel: 'music' | 'sfx', delta: number) => {
    const next = { ...state.audio, [channel]: Math.round(Math.max(0, Math.min(1, state.audio[channel] + delta)) * 10) / 10 };
    session.setAudio(next); onAudioSettings(next);
  };
  return <SafeAreaView style={styles.screen}><ScrollView key={map.id} contentContainerStyle={styles.scroll}><View style={[styles.content, { width }]}>
    <Text style={styles.eyebrow}>REBIRTH DUNGEON · JOURNEY</Text><Text style={styles.title}>{map.name}</Text>
    <Text style={styles.body}>Tap a floor tile to move. Tap an object to approach it, then tap again to interact.</Text>
    <View style={styles.map}><ArenaBoundary><WorldCanvas key={map.id} session={session} width={width} dispatch={dispatch} onObjectPress={interact} /></ArenaBoundary></View>
    <Text style={styles.legend}>C Chest · ! Enemy · G Goddess · F Fountain · B Locked door · k Key · D Dungeon · &gt; Passage</Text>
    {run ? <View style={styles.card}><Text style={styles.heading}>{currentRoom ? currentRoom.kind === 'start' ? 'Goddess sanctuary' : currentRoom.kind === 'boss' ? 'Boss chamber' : currentRoom.kind === 'treasure' ? 'Final treasure room' : 'Dungeon chamber' : 'Corridor'}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.body}>{remainingEnemies(run)} enemies remain · {bossCleared(run) ? 'Boss defeated' : run.bossDoorOpened ? 'Boss room open' : 'Boss room locked'}</Text>
      <Text style={styles.body}>Boss key: {run.bossKey.status} · Treasure key: {run.treasureKey.status}</Text>
      <Text style={styles.body}>Find every enemy, including hidden mimics. Pick up dropped keys before using them.</Text>
      {run.effects.map((effect) => { const status = session.content.status(effect.statusId); return <Text key={effect.statusId} style={styles.body}>{status.name} ×{effect.stacks} · {status.modifier * effect.stacks > 0 ? '+' : ''}{status.modifier * effect.stacks} {status.stat} · lasts this run</Text>; })}
      {currentRoom?.kind === 'treasure' ? <Text style={styles.body}>{run.selectedChest ? 'Your reward is claimed. The other four chests remain sealed.' : 'Choose one of five hidden rewards. Your treasure key opens only one chest.'}</Text> : null}
      {run.selectedChest && currentRoom?.kind === 'treasure' ? <Button label="Return to the refuge" disabled={hostView.busy} onPress={() => dispatch({ type: 'EXIT_DUNGEON' })} /> : null}
    </View> : null}
    <View style={styles.card}>
      <Text style={styles.heading}>Warden · Level {state.hero.level}</Text>
      <Text style={styles.body}>{state.hero.health}/{stats.maxHealth} HP · {state.hero.mana}/{stats.maxMana} Mana · {state.hero.gold} gold</Text>
      <Text style={styles.body}>Attack {stats.combatant.attack} · Defense {stats.combatant.defense} · Speed {stats.combatant.speed}</Text>
      <Text style={styles.body}>{state.hero.level < 99 ? `${state.hero.experience}/${experienceToNextLevel(state.hero.level)} XP to next level` : 'Maximum level'}</Text>
      <View style={styles.actions}>{[[0, -1, 'Up'], [-1, 0, 'Left'], [1, 0, 'Right'], [0, 1, 'Down']].map(([dx, dy, label]) => <Button key={label} label={`Move ${label}`} disabled={hostView.busy || !isWalkable(map, { x: state.position.x + Number(dx), y: state.position.y + Number(dy) })} onPress={() => dispatch({ type: 'MOVE', entityId: 'player', dx: Number(dx), dy: Number(dy) })} />)}</View>
    </View>
    {view.message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{view.message}</Text> : null}
    <View style={styles.card}><Text style={styles.heading}>Around you</Text>{!around.length ? <Text style={styles.body}>Follow the corridor to the next chamber.</Text> : null}{around.map((obj) => {
      const claimed = session.isClaimed(obj.id);
      const nearby = distance(obj, state.position) <= 1;
      return <View key={obj.id} style={styles.object}><Text style={styles.body}>{obj.name}{claimed ? ' · cleared' : ''}</Text>
        <Button label={`${obj.kind === 'encounter' ? 'Challenge' : nearby ? obj.kind === 'key' ? 'Pick up' : obj.kind === 'finalChest' ? 'Open' : 'Interact with' : 'Approach'} ${obj.name}`}
          disabled={claimed || hostView.busy || (obj.kind === 'gate' && !obj.blocked)} onPress={() => interact(obj.id)} /></View>;
    })}</View>
    <View style={styles.card}><Text style={styles.heading}>Your pack</Text>{Object.entries(state.hero.inventory).map(([id, quantity]) => {
      const item = session.content.item(id); const equipped = Object.values(state.hero.equipment).includes(id);
      return <View key={id} style={styles.object}><Text style={styles.body}>{item.name} ×{quantity}{equipped ? ' · equipped' : ''}</Text>
        <Button disabled={hostView.busy} selected={equipped} label={`${item.kind === 'consumable' ? 'Use' : equipped ? 'Unequip' : 'Equip'} ${item.name}`} onPress={() => dispatch(item.kind === 'consumable' ? { type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: id } : equipped ? { type: 'UNEQUIP_ITEM', slot: item.kind } : { type: 'EQUIP_ITEM', itemId: id })} /></View>;
    })}</View>
    <View style={styles.card}><Text style={styles.heading}>Save your journey</Text><Text style={styles.body}>{hostView.storageAvailable ? 'Autosave follows your steps. Encounters resume at their starting checkpoint.' : 'Saves are unavailable. Your current journey continues in memory.'}</Text>
      {(['1', '2', '3'] as const).map((slot) => <View key={slot} style={styles.object}><Text style={styles.body}>Slot {slot} · {hostView.slots.find((entry) => entry.id === slot)?.savedAt ? 'Saved' : 'Empty'}</Text><View style={styles.actions}>
        <Button label={`Save slot ${slot}`} disabled={hostView.busy || !hostView.storageAvailable} onPress={() => { void host.save(slot); }} /><Button label={`Load slot ${slot}`} disabled={hostView.busy || !hostView.storageAvailable || !hostView.slots.some((entry) => entry.id === slot)} onPress={() => { void host.load(slot); }} /></View></View>)}
      {hostView.notice ? <Text accessibilityLiveRegion="polite" style={styles.message}>{hostView.notice}</Text> : null}
    </View>
    <View style={styles.card}><Text style={styles.heading}>Sound</Text><Button label={state.audio.enabled ? soundReady ? 'Mute sound' : 'Resume sound' : 'Enable sound'} selected={state.audio.enabled} onPress={() => {
      const settings = { ...state.audio, enabled: !state.audio.enabled || !soundReady }; session.setAudio(settings);
      onAudioSettings(settings);
    }} />{(['music', 'sfx'] as const).map((channel) => <View key={channel} style={styles.object}><Text style={styles.body}>{channel === 'music' ? 'Music' : 'Effects'} · {Math.round(state.audio[channel] * 100)}%</Text><View style={styles.actions}>
      <Button label={`Lower ${channel} volume`} disabled={state.audio[channel] === 0} onPress={() => setVolume(channel, -0.1)} /><Button label={`Raise ${channel} volume`} disabled={state.audio[channel] === 1} onPress={() => setVolume(channel, 0.1)} /></View></View>)}</View>
    {error || hostView.error ? <Text accessibilityRole="alert" style={styles.error}>{error ?? hostView.error}</Text> : null}
    <Text style={styles.legend}>Position {state.position.x}, {state.position.y} · Seed {run?.blueprint.seed ?? state.seed}</Text>
  </View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10161c' }, scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 88 : 12, paddingBottom: 110 },
  content: { gap: 16 }, loading: { padding: 30, gap: 20 }, eyebrow: { color: '#a79474', fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontSize: 34, color: '#e4d9c5' },
  body: { color: '#91a0a2', fontSize: 12, lineHeight: 20 }, heading: { color: '#d4c3a5', fontSize: 17, fontWeight: '600' },
  card: { backgroundColor: '#182127', padding: 16, gap: 12, borderRadius: 7 }, map: { overflow: 'hidden', borderRadius: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, object: { gap: 8, paddingVertical: 6 },
  button: { minHeight: 46, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#3a454a', borderRadius: 5, backgroundColor: '#202c32' },
  buttonText: { color: '#cecbbd', fontSize: 12, fontWeight: '600' }, disabled: { opacity: 0.35 }, selected: { borderColor: '#c7a571' }, pressed: { opacity: 0.7 },
  message: { color: '#d0b987', fontSize: 13, lineHeight: 21 }, legend: { color: '#6b8286', fontSize: 10, lineHeight: 18 }, error: { color: '#df9b80', fontSize: 12 },
});
