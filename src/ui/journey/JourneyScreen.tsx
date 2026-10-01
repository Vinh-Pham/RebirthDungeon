import ProgressionFeedback from '../skills/ProgressionFeedback';
import { DungeonButton as Button, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import { useState, useSyncExternalStore } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JourneyHost } from '../../game/JourneyHost';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { BattleView, ArenaBoundary } from '../battle/BattleScreen';
import { distance, findPath, isWalkable } from '../../engine/world/TileMap';
import type { GameCommand } from '../../engine/commands';
import WorldCanvas from '../../renderer/WorldCanvas';
import { bossCleared, inRoom, remainingEnemies } from '../../engine/dungeon/Dungeon';
import TownServicePanel from './TownServicePanel';
import JourneyCharacterTabs from './JourneyCharacterTabs';
import QuestTracker from '../quests/QuestTracker';

export default function JourneyScreen() {
  const { host } = useCharacterGame();
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const session = snapshot.session;
  const [error, setError] = useState<string>();
  if (!session) return <SafeAreaView className="bg-background" style={styles.screen}><View style={styles.loading}><Text className="text-foreground" style={styles.title}>Rebirth Dungeon</Text>{snapshot.error ? <DungeonNotice message={snapshot.error} /> : <DungeonLoading label="Loading your journey" />}</View></SafeAreaView>;
  if (snapshot.battle) return <View className="flex-1"><View className="px-4"><ProgressionFeedback host={host} /></View><BattleView session={snapshot.battle} busy={snapshot.busy} restart={() => { void host.returnFromBattle(); }} finishedLabel={snapshot.retryAvailable ? 'Retry save and return' : 'Return to the journey'} /></View>;
  return <Exploration key={snapshot.revision} host={host} session={session} error={error} setError={setError} />;
}
function Exploration({ host, session, error, setError }: {
  host: JourneyHost; session: NonNullable<ReturnType<JourneyHost['getSnapshot']>['session']>;
  error?: string; setError(error?: string): void;
}) {
  const [characterTab, setCharacterTab] = useState('character');
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const hostView = useSyncExternalStore((listener) => {
    // The parent owns the host lifetime; this subscription only observes its UI notices.
    const unsubscribe = host.subscribe(listener); return unsubscribe;
  }, host.getSnapshot, host.getServerSnapshot);
  const { width: windowWidth } = useWindowDimensions(); const width = Math.max(240, Math.min(windowWidth - 40, 560));
  const { state, map } = view; const run = state.dungeon;
  const currentRoom = run?.blueprint.rooms.find((room) => inRoom(room, state.position));
  const dispatch = (command: GameCommand) => { if (hostView.busy) return false; try { setError(undefined); session.dispatch(command); return true; } catch (error) { setError(error instanceof Error ? error.message : 'Action failed'); return false; } };
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
  if (view.activeService) return <SafeAreaView className="bg-background" edges={['left', 'right']} style={styles.screen}><ScrollView contentContainerStyle={styles.scroll}><View style={[styles.content, { width }]}>
    <TownServicePanel key={view.activeService} session={session} objectId={view.activeService} busy={hostView.busy || !!hostView.retryAvailable} dispatch={dispatch} progress={(command) => { void host.progress(command); }} />
    {view.message ? <DungeonNotice status="accent" message={view.message} /> : null}
    <DungeonNotice message={error} /><ProgressionFeedback host={host} showNotice={false} />
  </View></ScrollView></SafeAreaView>;
  return <SafeAreaView className="bg-background" edges={['left', 'right']} style={styles.screen}><ScrollView key={map.id} contentContainerStyle={styles.scroll}><View style={[styles.content, { width }]}>
    <Text className="text-accent" style={styles.eyebrow}>REBIRTH DUNGEON · JOURNEY</Text><Text className="text-foreground" style={styles.title}>{map.name}</Text>
    <Text className="text-muted" style={styles.body}>Tap a floor tile to move. Tap an object to approach it, then tap again to interact.</Text>
    <View className="border-border" style={styles.map}><ArenaBoundary><WorldCanvas key={map.id} session={session} width={width} dispatch={dispatch} onObjectPress={interact} /></ArenaBoundary></View>
    <Text className="text-muted" style={styles.legend}>{map.theme ? 'G Goddess altar · $ Merchant · + Healer · > Door or passage · C Supplies' : 'C Chest · ! Enemy · G Goddess · F Fountain · B Locked door · k Key · D Dungeon · > Passage'}</Text>
    {run ? <DungeonCard><Text className="text-accent" style={styles.heading}>{currentRoom ? currentRoom.kind === 'start' ? 'Goddess sanctuary' : currentRoom.kind === 'boss' ? 'Boss chamber' : currentRoom.kind === 'treasure' ? 'Final treasure room' : 'Dungeon chamber' : 'Corridor'}</Text>
      <Text className="text-muted" accessibilityLiveRegion="polite" style={styles.body}>{remainingEnemies(run)} enemies remain · {bossCleared(run) ? 'Boss defeated' : run.bossDoorOpened ? 'Boss room open' : 'Boss room locked'}</Text>
      <Text className="text-muted" style={styles.body}>Boss key: {run.bossKey.status} · Treasure key: {run.treasureKey.status}</Text>
      <Text className="text-muted" style={styles.body}>Find every enemy, including hidden mimics. Pick up dropped keys before using them.</Text>
      {run.effects.map((effect) => { const status = session.content.status(effect.statusId); return <Text className="text-muted" key={effect.statusId} style={styles.body}>{status.name} ×{effect.stacks} · {status.modifier * effect.stacks > 0 ? '+' : ''}{status.modifier * effect.stacks} {status.stat} · lasts this run</Text>; })}
      {currentRoom?.kind === 'treasure' ? <Text className="text-muted" style={styles.body}>{run.selectedChest ? 'Your reward is claimed. The other four chests remain sealed.' : 'Choose one of five hidden rewards. Your treasure key opens only one chest.'}</Text> : null}
      {run.selectedChest && currentRoom?.kind === 'treasure' ? <Button label="Return to the refuge" disabled={hostView.busy || !!hostView.retryAvailable} onPress={() => { void host.progress({ type: 'EXIT_DUNGEON' }); }} /> : null}
    </DungeonCard> : null}
    <JourneyCharacterTabs host={host} session={session} value={characterTab} onValueChange={setCharacterTab} dispatch={dispatch} />
    <QuestTracker session={session} />
    {view.message ? <DungeonNotice status="accent" message={view.message} /> : null}
    <DungeonNotice message={error} /><ProgressionFeedback host={host} showNotice={false} />
    <Text className="text-muted" style={styles.legend}>Position {state.position.x}, {state.position.y} · Seed {run?.blueprint.seed ?? state.seed}</Text>
  </View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  content: { gap: 16 }, loading: { padding: 30, gap: 20 }, eyebrow: { fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontSize: 34 },
  body: { fontSize: 12, lineHeight: 20 }, heading: { fontSize: 17, fontWeight: '600' },
   map: { overflow: 'hidden', borderRadius: 8 },

   legend: { fontSize: 10, lineHeight: 18 },
});
