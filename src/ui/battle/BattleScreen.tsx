import { DungeonButton as Button, DungeonNotice, DungeonLoading } from '../shared/DungeonUI';
import { Surface } from 'heroui-native/surface';
import ResourceBar from '../shared/ResourceBar';
import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { loadGameContent } from '../../data/content';
import { BattleHost } from '../../game/BattleHost';
import { BattleSession, type BattleView as BattleSnapshot } from '../../game/BattleSession';
import type { GameCommand } from '../../engine/commands';
import type { BattleAction } from '../../engine/battle/BattleMachine';
import { skillForEntity } from '../../engine/rpg/Skills';
import { staminaCost } from '../../engine/rpg/Resources';
import GameCanvas from '../../renderer/GameCanvas';
import GameImage from '../shared/GameImage';
import BattleHotbar from './BattleHotbar';

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export class ArenaBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <DungeonNotice message="The arena couldn’t load. Restart the app to try again." /> : this.props.children;
  }
}

export default function BattleScreen() {
  const [host] = useState(() => new BattleHost(() => new BattleSession(loadGameContent())));
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  if (!snapshot.session) return <SafeAreaView className="bg-background" style={styles.screen}><View style={styles.notice}>
    <Text className="text-foreground" style={styles.title}>Rebirth Dungeon</Text>
    {snapshot.error ? <DungeonNotice message={snapshot.error} /> : <DungeonLoading label="Opening the dungeon" />}
    {snapshot.error ? <Button label="Try again" onPress={host.restart} /> : null}
  </View></SafeAreaView>;
  return <BattleView key={snapshot.revision} session={snapshot.session} restart={host.restart} />;
}

export function BattleView({ session, restart, finishedLabel = 'Descend again', busy = false, victoryContent }: { session: BattleSession; restart(): void; finishedLabel?: string; busy?: boolean; victoryContent?: ReactNode }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const presentation = useSyncExternalStore(session.presentation.subscribe, session.presentation.getSnapshot, session.presentation.getSnapshot);
  const debug = useStore(session.ui, (state) => state.debugVisible);
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(240, Math.min(windowWidth - 40, 560));
  const scroll = useRef<ScrollView>(null);
  const decisionY = useRef(0);
  const hasVictoryLoot = !!victoryContent;
  const turnKey = `${view.turnId}:${view.actionCount}`;
  const [errorState, setErrorState] = useState<{ turn: string; value?: string }>({ turn: turnKey });
  const [inspectState, setInspectState] = useState<{ turn: string; value?: string }>({ turn: turnKey });
  const error = errorState.turn === turnKey ? errorState.value : undefined;
  const inspected = inspectState.turn === turnKey ? inspectState.value : undefined;
  const setError = (value?: string) => setErrorState({ turn: turnKey, value });
  const inspect = (value?: string) => setInspectState({ turn: turnKey, value });
  const finished = view.phase === 'victory' || view.phase === 'defeat';
  const canChoose = !busy && !presentation.busy && ['selectingAction', 'selectingTarget'].includes(view.phase);
  useEffect(() => {
    // Simulation advances independently of presentation completion.
    if (!busy && view.phase === 'enemyTurn') session.advanceEnemyTurns();
  }, [session, view.phase, busy]);
  useEffect(() => {
    if (view.phase === 'victory' && hasVictoryLoot && !presentation.busy) scroll.current?.scrollTo({ y: decisionY.current, animated: true });
  }, [view.phase, hasVictoryLoot, presentation.busy]);
  function attempt(run: () => boolean): boolean {
    try { const accepted = run(); if (accepted) setError(undefined); return accepted; }
    catch (error) { setError(error instanceof Error ? error.message : 'Action could not resolve'); return false; }
  }
  function dispatch(command: GameCommand): boolean {
    return attempt(() => {
      if (!session.canAcceptPlayerInput(view.actionCount)) return false;
      session.dispatch(command); return true;
    });
  }
  function selectAction(action: BattleAction) {
    if (attempt(() => session.selectPlayerAction(action, view.actionCount))) {
      inspect(undefined); scroll.current?.scrollTo({ y: 0, animated: true });
    }
  }
  function cancel() {
    if (!session.canAcceptPlayerInput(view.actionCount)) return;
    if (view.phase === 'selectingTarget' && !dispatch({ type: 'CANCEL_ACTION' })) return;
    inspect(undefined);
    scroll.current?.scrollTo({ y: 0, animated: true });
  }
  const action: BattleAction = view.selectedAction ?? { action: 'attack' };
  const inputEnabled = canChoose && !inspected && !!view.selectedAction;
  const targetIds = inputEnabled ? session.battle.validTargetIds(action) : [];
  function execute(targetId: string, expectedActionCount = view.actionCount) {
    if (!inputEnabled) return;
    if (attempt(() => session.executePlayerAction(action, targetId, expectedActionCount))) scroll.current?.scrollTo({ y: 0, animated: true });
  }
  const source = session.engine.getEntity(view.turnId ?? '');
  const selectedSkill = action.action === 'skill' && source ? skillForEntity(session.content, source, action.skillId!) : undefined;
  const skillCost = selectedSkill && source ? staminaCost(source, selectedSkill.staminaCost) : 0;
  const headline = view.phase === 'victory' ? 'Chamber cleared' : view.phase === 'defeat' ? 'A warden falls' :
    presentation.busy ? 'Steel, spell & consequence' : inspected ? 'Action details' : selectedSkill ? selectedSkill.name : 'Your move, warden';
  const hint = view.phase === 'victory' ? victoryContent ? 'Choose your loot, then confirm to continue.' : 'A small victory. The dungeon runs deeper.' : view.phase === 'defeat' ? 'Every descent teaches something.' :
    presentation.busy ? 'The battle unfolds before you.' : inspected ? 'Review the action, then use it or close to return.' :
    selectedSkill ? `${selectedSkill.manaCost} MP · ${selectedSkill.effect === 'heal' && selectedSkill.target === 'ally' ? `0 SP ally / ${skillCost} SP self` : `${skillCost} SP`} · ` +
      (selectedSkill.target === 'allEnemies' ? `Tap any monster to cast ${selectedSkill.name} against all enemies.` :
      `Tap ${selectedSkill.target === 'ally' ? 'an ally' : 'a monster'} to cast ${selectedSkill.name}.`) :
    view.selectedAction ? 'Tap a monster in the arena to attack.' :
    session.battle.validTargetIds({ action: 'attack' }).length === 1 ? 'Choose an action below. The last monster is targeted automatically.' :
    'Choose an action below, then tap a monster in the arena.';

  return <SafeAreaView className="bg-background" style={styles.screen} edges={['left', 'right']}>
    <ScrollView ref={scroll} contentContainerStyle={styles.scroll}>
      <View style={[styles.content, { width }]}>
        <View style={styles.headingRow}><Text className="text-accent" style={styles.eyebrow}>REBIRTH DUNGEON</Text>
          <Button label="◈" accessibilityLabel="Toggle battle debug overlay" selected={debug} onPress={() => session.ui.getState().toggleDebug()} />
        </View>
        <Text className="text-foreground" style={styles.title}>{session.map.name}</Text>
        <Text className="text-muted" style={styles.subtitle}>DESCENT I   /   AN UNWELCOME GUEST</Text>
        <View className="border-border" style={styles.arena}>
          <ArenaBoundary><GameCanvas session={session} width={width} targetIds={targetIds} inputEnabled={inputEnabled} onTargetPress={execute} /></ArenaBoundary>
        </View>
        <View style={styles.decision} onLayout={(event) => { decisionY.current = event.nativeEvent.layout.y; }}>
          <Text className="text-foreground" style={styles.headline}>{headline}</Text><Text className="text-muted" style={styles.body}>{hint}</Text>
          {!finished ? <BattleActions session={session} view={view} canChoose={canChoose} inspected={inspected} inspect={inspect} selectAction={selectAction} cancel={cancel} /> : view.phase === 'victory' && victoryContent ? victoryContent :
            <View style={styles.actions}><Button primary label={finishedLabel} disabled={presentation.busy || busy} busy={busy} onPress={restart} /></View>}
          {error || session.battle.context.error ? <DungeonNotice message={error ?? session.battle.context.error} /> : null}
        </View>
        {debug ? <Surface className="bg-surface-secondary" style={styles.debug}>
          <Text className="text-muted" style={styles.debugText}>Seed {session.engine.seed} · {view.phase}</Text>
          <Text className="text-muted" style={styles.debugText}>Entities {session.engine.world.entities.length} · Turn {view.turnId ?? 'complete'}</Text>
          <Text className="text-muted" style={styles.debugText}>Order {session.combat.turnOrder.join(' → ')} · Visual queue {presentation.pending}</Text>
          {view.entities.map((entity) => <Text className="text-muted" key={entity.id} style={styles.debugText}>{entity.id} ({entity.x}, {entity.y}) · {entity.sprite.atlas}:{entity.sprite.frame}</Text>)}
        </Surface> : null}
        <View className="border-border" style={styles.roster}>
          {view.entities.map((entity) => <View key={entity.id} style={styles.unit}>
            <Text className={entity.side === 'player' ? 'text-accent' : 'text-success'} style={styles.unitLabel}>{entity.name}</Text>
            <ResourceBar label="HP" value={entity.health} max={entity.maxHealth} name={entity.name} />
            {entity.maxMana > 0 ? <ResourceBar label="Mana" value={entity.mana} max={entity.maxMana} name={entity.name} /> :
              <Text className="text-muted" style={styles.resource}>{entity.dead ? 'DEFEATED' : 'ENEMY'}</Text>}
            {entity.maxStamina !== undefined ? <>
              <ResourceBar label="Stamina" value={entity.stamina ?? 0} max={entity.maxStamina} name={entity.name} />
              <Text className="text-muted" style={styles.resource}>{entity.wounds ?? 0} WOUNDS · {entity.fullness?.toFixed(1)}% FULLNESS</Text>
            </> : null}
            {entity.weapon ? <View className="flex-row items-center gap-2">
              <GameImage kind="item" id={session.engine.getEntity(entity.id)?.weapon?.itemId ?? ''} size={32} />
              <Text className="min-w-0 flex-1 text-muted" style={styles.resource}>{entity.weapon.name} · {entity.weapon.durability}/{entity.weapon.maxDurability}{entity.weapon.durability === 0 ? ' · BROKEN' : ''}</Text>
            </View> : null}
            {(session.engine.getEntity(entity.id)?.statuses ?? []).map((status) => <Text className="text-muted" key={status.id} style={styles.resource}>{session.content.status(status.id).name} · {status.remainingTurns} turns</Text>)}
          </View>)}
        </View>
        <Surface className="bg-surface-secondary" style={styles.log}>
          <Text className="text-accent" style={styles.eyebrow}>BATTLE CHRONICLE</Text>
          <View accessibilityLiveRegion="polite">{view.log.length ? view.log.slice(-4).map((line, index) => <Text className="text-muted" key={`${index}:${line}`} style={styles.logLine}>{line}</Text>) : <Text className="text-muted" style={styles.logLine}>A moss slime stirs in the dark.</Text>}</View>
        </Surface>
        <Text className="text-muted" style={styles.footer}>ONE CHAMBER. ONE CHANCE. ANOTHER REBIRTH.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function BattleActions({ session, view, canChoose, inspected, inspect, selectAction, cancel }: {
  session: BattleSession; view: BattleSnapshot; canChoose: boolean; inspected?: string;
  inspect(id?: string): void; selectAction(action: BattleAction): void; cancel(): void;
}) {
  return <>
    <BattleHotbar session={session} view={view} canChoose={canChoose} inspected={inspected} inspect={inspect} selectAction={selectAction} />
    {view.selectedAction ? <Button label="Cancel" disabled={!canChoose} onPress={cancel} /> : null}
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  content: { gap: 18 }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 2.4, fontFamily: mono },
  title: { fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontSize: 36, letterSpacing: -1 },
  subtitle: { fontFamily: mono, fontSize: 9, letterSpacing: 1.3, marginTop: -7 },
  arena: { overflow: 'hidden', borderRadius: 8 },
  roster: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, paddingBottom: 18, flexWrap: 'wrap' },
  unit: { flex: 1, minWidth: 112, gap: 10 }, unitLabel: { fontSize: 12, fontWeight: '600' },
  resource: { fontFamily: mono, fontSize: 9, letterSpacing: 1 },
    decision: { gap: 12 },
  headline: { fontSize: 20, fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia' },
  body: { fontSize: 12, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  log: { borderRadius: 5, padding: 16, gap: 12 }, logLine: { fontSize: 11, lineHeight: 19 },
  footer: { textAlign: 'center', fontSize: 8, letterSpacing: 1.5, fontFamily: mono },
  debug: { padding: 12, gap: 4 }, debugText: { fontFamily: mono, fontSize: 10 },
   notice: { padding: 24, gap: 20 },
});
