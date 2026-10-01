import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { loadGameContent } from '../../data/content';
import { BattleHost } from '../../game/BattleHost';
import { BattleSession } from '../../game/BattleSession';
import type { GameCommand } from '../../engine/commands';
import { staminaCost } from '../../engine/rpg/Resources';
import GameCanvas from '../../renderer/GameCanvas';

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export class ArenaBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <View style={styles.notice}><Text style={styles.body}>The arena couldn’t load. Restart the app to try again.</Text></View> : this.props.children;
  }
}

function Button({ label, onPress, disabled = false, selected = false, primary = false }: {
  label: string; onPress(): void; disabled?: boolean; selected?: boolean; primary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, primary && styles.primary,
      selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
    <Text style={[styles.buttonText, primary && styles.primaryText]}>{label}</Text>
  </Pressable>;
}

export default function BattleScreen() {
  const [host] = useState(() => new BattleHost(() => new BattleSession(loadGameContent())));
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  if (!snapshot.session) return <SafeAreaView style={styles.screen}><View style={styles.notice}>
    <Text style={styles.title}>Rebirth Dungeon</Text>
    <Text style={styles.body}>{snapshot.error ?? 'Opening the dungeon…'}</Text>
    {snapshot.error ? <Button label="Try again" onPress={host.restart} /> : null}
  </View></SafeAreaView>;
  return <BattleView key={snapshot.revision} session={snapshot.session} restart={host.restart} />;
}

export function BattleView({ session, restart, finishedLabel = 'Descend again' }: { session: BattleSession; restart(): void; finishedLabel?: string }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const presentation = useSyncExternalStore(session.presentation.subscribe, session.presentation.getSnapshot, session.presentation.getSnapshot);
  const debug = useStore(session.ui, (state) => state.debugVisible);
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(240, Math.min(windowWidth - 40, 560));
  const [error, setError] = useState<string>();
  const actor = view.entities.find((entity) => entity.id === view.turnId);
  const player = view.entities.find((entity) => entity.side === 'player')!;
  const skills = session.engine.getEntity(actor?.id ?? player.id)?.skills ?? [];
  const attackCost = staminaCost({ stamina: actor?.maxStamina !== undefined ? { current: actor.stamina ?? 0, max: actor.maxStamina } : undefined, fullness: actor?.fullness }, 2);
  const finished = view.phase === 'victory' || view.phase === 'defeat';
  const canChoose = !presentation.busy && ['selectingAction', 'selectingTarget'].includes(view.phase);
  useEffect(() => {
    // Simulation advances independently of presentation completion.
    if (view.phase === 'enemyTurn') session.advanceEnemyTurns();
  }, [session, view.phase]);
  function dispatch(command: GameCommand) {
    try { session.dispatch(command); setError(undefined); }
    catch (error) { setError(error instanceof Error ? error.message : 'Action could not resolve'); }
  }
  const headline = view.phase === 'victory' ? 'Chamber cleared' : view.phase === 'defeat' ? 'A warden falls' :
    presentation.busy ? 'Steel, spell & consequence' : view.phase === 'selectingTarget' ? 'Choose your target' : 'Your move, warden';
  const hint = view.phase === 'victory' ? 'A small victory. The dungeon runs deeper.' : view.phase === 'defeat' ? 'Every descent teaches something.' :
    presentation.busy ? 'The battle unfolds before you.' : view.phase === 'selectingTarget' ? 'Tap a sprite or choose a name below, then confirm.' : 'Strike with your blade, or spend mana on a spell.';

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.content, { width }]}>
        <View style={styles.headingRow}><Text style={styles.eyebrow}>REBIRTH DUNGEON</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle battle debug overlay"
            onPress={() => session.ui.getState().toggleDebug()} style={styles.debugButton}><Text style={styles.debugButtonText}>◈</Text></Pressable>
        </View>
        <Text style={styles.title}>{session.map.name}</Text>
        <Text style={styles.subtitle}>DESCENT I   /   AN UNWELCOME GUEST</Text>
        <View style={styles.arena}>
          <ArenaBoundary><GameCanvas session={session} width={width} onSelectTarget={(targetId) => dispatch({ type: 'SELECT_TARGET', targetId })} /></ArenaBoundary>
        </View>
        {debug ? <View style={styles.debug}>
          <Text style={styles.debugText}>Seed {session.engine.seed} · {view.phase}</Text>
          <Text style={styles.debugText}>Entities {session.engine.world.entities.length} · Turn {view.turnId ?? 'complete'}</Text>
          <Text style={styles.debugText}>Order {session.combat.turnOrder.join(' → ')} · Visual queue {presentation.pending}</Text>
          {view.entities.map((entity) => <Text key={entity.id} style={styles.debugText}>{entity.id} ({entity.x}, {entity.y}) · {entity.sprite.atlas}:{entity.sprite.frame}</Text>)}
        </View> : null}
        <View style={styles.roster}>
          {view.entities.map((entity) => <View key={entity.id} style={styles.unit}>
            <Text style={[styles.unitLabel, entity.side === 'player' ? styles.gold : styles.green]}>{entity.name}</Text>
            <Text style={styles.hp}>{entity.health}<Text style={styles.muted}> / {entity.maxHealth} HP</Text></Text>
            <Text style={styles.resource}>{entity.maxMana ? `${entity.mana} / ${entity.maxMana} MANA` : entity.dead ? 'DEFEATED' : 'ENEMY'}</Text>
            {entity.maxStamina !== undefined ? <Text style={styles.resource}>{entity.stamina}/{entity.maxStamina} STAMINA · {entity.wounds ?? 0} WOUNDS · {entity.fullness?.toFixed(1)}% FULLNESS</Text> : null}
            {entity.weapon ? <Text style={styles.resource}>{entity.weapon.name} · {entity.weapon.durability}/{entity.weapon.maxDurability}{entity.weapon.durability === 0 ? ' · BROKEN' : ''}</Text> : null}
            {(session.engine.getEntity(entity.id)?.statuses ?? []).map((status) => <Text key={status.id} style={styles.resource}>{session.content.status(status.id).name} · {status.remainingTurns} turns</Text>)}
          </View>)}
        </View>
        <View style={styles.decision}>
          <Text style={styles.headline}>{headline}</Text><Text style={styles.body}>{hint}</Text>
          {!finished ? <>
            <View style={styles.actions}>
              <Button label={(actor?.stamina ?? 0) >= attackCost ? `Attack · ${attackCost} SP` : 'Attack · bare hands'} disabled={!canChoose} selected={view.selectedAction?.action === 'attack'}
                onPress={() => dispatch({ type: 'SELECT_ACTION', action: 'attack' })} />
              <Button label="Rest · recover stamina" disabled={!canChoose} selected={view.selectedAction?.action === 'rest'} onPress={() => dispatch({ type: 'SELECT_ACTION', action: 'rest' })} />
              {skills.map((id) => { const skill = session.content.skill(id); return <Button key={id}
                label={`${skill.name} · ${skill.manaCost} MP${skill.staminaCost ? ` · ${staminaCost(session.engine.getEntity(actor?.id ?? player.id)!, skill.staminaCost)} SP` : ''}`} disabled={!canChoose || skill.battleUsable === false || (actor?.mana ?? 0) < skill.manaCost || (actor?.stamina ?? 0) < staminaCost(session.engine.getEntity(actor?.id ?? player.id)!, skill.staminaCost)}
                selected={view.selectedAction?.skillId === id} onPress={() => dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: id })} />; })}
              {Object.entries(session.engine.getEntity(actor?.id ?? player.id)?.inventory ?? {}).filter(([id]) => { const item = session.content.item(id); return item.kind === 'consumable' && item.battleUsable; }).map(([id, quantity]) => <Button key={id} label={`${session.content.item(id).name} ×${quantity}`} disabled={!canChoose} selected={view.selectedAction?.itemId === id} onPress={() => dispatch({ type: 'SELECT_ACTION', action: 'item', itemId: id })} />)}
            </View>
            {view.phase === 'selectingTarget' ? <>
              <View style={styles.targets}>{view.targets.map((targetId) => <Button key={targetId}
                label={view.entities.find((entity) => entity.id === targetId)?.name ?? targetId}
                disabled={presentation.busy} selected={view.selectedTargetId === targetId}
                onPress={() => dispatch({ type: 'SELECT_TARGET', targetId })} />)}</View>
              <View style={styles.actions}><Button primary label="Confirm action" disabled={presentation.busy || !view.selectedTargetId}
                onPress={() => dispatch({ type: 'CONFIRM_ACTION' })} /><Button label="Back" disabled={presentation.busy} onPress={() => dispatch({ type: 'CANCEL_ACTION' })} /></View>
            </> : null}
          </> : <View style={styles.actions}><Button primary label={finishedLabel} disabled={presentation.busy} onPress={restart} /></View>}
          {error || session.battle.context.error ? <Text accessibilityRole="alert" style={styles.error}>{error ?? session.battle.context.error}</Text> : null}
        </View>
        <View style={styles.log}>
          <Text style={styles.eyebrow}>BATTLE CHRONICLE</Text>
          <View accessibilityLiveRegion="polite">{view.log.length ? view.log.slice(-4).map((line, index) => <Text key={`${index}:${line}`} style={styles.logLine}>{line}</Text>) : <Text style={styles.logLine}>A moss slime stirs in the dark.</Text>}</View>
        </View>
        <Text style={styles.footer}>ONE CHAMBER. ONE CHANCE. ANOTHER REBIRTH.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10161c' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 88 : 12, paddingBottom: 110 },
  content: { gap: 18 }, headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#a79474', fontSize: 10, letterSpacing: 2.4, fontFamily: mono },
  title: { fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontSize: 36, color: '#e4d9c5', letterSpacing: -1 },
  subtitle: { fontFamily: mono, color: '#68797d', fontSize: 9, letterSpacing: 1.3, marginTop: -7 },
  arena: { overflow: 'hidden', borderRadius: 8, backgroundColor: '#192126' },
  roster: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: '#293137', paddingBottom: 18, flexWrap: 'wrap' },
  unit: { flex: 1, minWidth: 112, gap: 5 }, unitLabel: { fontSize: 12, fontWeight: '600' },
  hp: { fontSize: 23, color: '#dfddd0', fontFamily: mono }, muted: { color: '#637278', fontSize: 12 },
  resource: { color: '#75858b', fontFamily: mono, fontSize: 9, letterSpacing: 1 },
  gold: { color: '#d0ad74' }, green: { color: '#a3bf88' }, decision: { gap: 12 },
  headline: { color: '#ddd6c8', fontSize: 20, fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia' },
  body: { color: '#87969a', fontSize: 12, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, targets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  button: { paddingHorizontal: 15, minHeight: 46, justifyContent: 'center', borderWidth: 1, borderColor: '#3a454a', borderRadius: 5, backgroundColor: '#1b252b' },
  buttonText: { color: '#cecbbd', fontSize: 12, fontWeight: '600' },
  selected: { borderColor: '#ba9a63', backgroundColor: '#302d27' }, primary: { backgroundColor: '#c7a571', borderColor: '#c7a571' },
  primaryText: { color: '#171b1e' }, disabled: { opacity: 0.35 }, pressed: { opacity: 0.7 },
  log: { backgroundColor: '#151e24', borderRadius: 5, padding: 16, gap: 12 }, logLine: { color: '#7f9296', fontSize: 11, lineHeight: 19 },
  footer: { color: '#46595e', textAlign: 'center', fontSize: 8, letterSpacing: 1.5, fontFamily: mono },
  debugButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, debugButtonText: { color: '#75868a', fontSize: 23 },
  debug: { padding: 12, backgroundColor: '#18242b', gap: 4 }, debugText: { fontFamily: mono, fontSize: 10, color: '#93a8aa' },
  error: { color: '#d99780', fontSize: 12 }, notice: { padding: 24, gap: 20 },
});
