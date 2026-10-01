import { DungeonButton as Button, DungeonNotice, DungeonLoading } from '../shared/DungeonUI';
import { Surface } from 'heroui-native/surface';
import ResourceBar from '../shared/ResourceBar';
import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { loadGameContent } from '../../data/content';
import { BattleHost } from '../../game/BattleHost';
import { BattleSession, type BattleView as BattleSnapshot } from '../../game/BattleSession';
import type { GameCommand } from '../../engine/commands';
import { staminaCost } from '../../engine/rpg/Resources';
import GameCanvas from '../../renderer/GameCanvas';

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

export function BattleView({ session, restart, finishedLabel = 'Descend again' }: { session: BattleSession; restart(): void; finishedLabel?: string }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const presentation = useSyncExternalStore(session.presentation.subscribe, session.presentation.getSnapshot, session.presentation.getSnapshot);
  const debug = useStore(session.ui, (state) => state.debugVisible);
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(240, Math.min(windowWidth - 40, 560));
  const [error, setError] = useState<string>();
  const finished = view.phase === 'victory' || view.phase === 'defeat';
  const canChoose = !presentation.busy && ['selectingAction', 'selectingTarget'].includes(view.phase);
  useEffect(() => {
    // Simulation advances independently of presentation completion.
    if (view.phase === 'enemyTurn') session.advanceEnemyTurns();
  }, [session, view.phase]);
  function dispatch(command: GameCommand): boolean {
    try { session.dispatch(command); setError(undefined); return true; }
    catch (error) { setError(error instanceof Error ? error.message : 'Action could not resolve'); return false; }
  }
  const defending = view.selectedAction?.action === 'defend';
  const headline = view.phase === 'victory' ? 'Chamber cleared' : view.phase === 'defeat' ? 'A warden falls' :
    presentation.busy ? 'Steel, spell & consequence' : defending ? 'Hold your ground' : view.phase === 'selectingTarget' ? 'Choose your target' : 'Your move, warden';
  const hint = view.phase === 'victory' ? 'A small victory. The dungeon runs deeper.' : view.phase === 'defeat' ? 'Every descent teaches something.' :
    presentation.busy ? 'The battle unfolds before you.' : defending ? 'Halve damage from attacks and spells until your next turn and recover stamina. Confirm to defend.' :
    view.phase === 'selectingTarget' ? 'Tap a sprite or choose a name below, then confirm.' : 'Choose Attack, Skill, Defend, or Item.';

  return <SafeAreaView className="bg-background" style={styles.screen} edges={['left', 'right']}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.content, { width }]}>
        <View style={styles.headingRow}><Text className="text-accent" style={styles.eyebrow}>REBIRTH DUNGEON</Text>
          <Button label="◈" accessibilityLabel="Toggle battle debug overlay" selected={debug} onPress={() => session.ui.getState().toggleDebug()} />
        </View>
        <Text className="text-foreground" style={styles.title}>{session.map.name}</Text>
        <Text className="text-muted" style={styles.subtitle}>DESCENT I   /   AN UNWELCOME GUEST</Text>
        <View className="border-border" style={styles.arena}>
          <ArenaBoundary><GameCanvas session={session} width={width} onSelectTarget={(targetId) => dispatch({ type: 'SELECT_TARGET', targetId })} /></ArenaBoundary>
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
            {entity.weapon ? <Text className="text-muted" style={styles.resource}>{entity.weapon.name} · {entity.weapon.durability}/{entity.weapon.maxDurability}{entity.weapon.durability === 0 ? ' · BROKEN' : ''}</Text> : null}
            {(session.engine.getEntity(entity.id)?.statuses ?? []).map((status) => <Text className="text-muted" key={status.id} style={styles.resource}>{session.content.status(status.id).name} · {status.remainingTurns} turns</Text>)}
          </View>)}
        </View>
        <View style={styles.decision}>
          <Text className="text-foreground" style={styles.headline}>{headline}</Text><Text className="text-muted" style={styles.body}>{hint}</Text>
          {!finished ? <BattleActions key={`${view.turnId}:${canChoose}`} session={session} view={view} canChoose={canChoose} dispatch={dispatch} /> :
            <View style={styles.actions}><Button primary label={finishedLabel} disabled={presentation.busy} onPress={restart} /></View>}
          {error || session.battle.context.error ? <DungeonNotice message={error ?? session.battle.context.error} /> : null}
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

function BattleActions({ session, view, canChoose, dispatch }: {
  session: BattleSession; view: BattleSnapshot; canChoose: boolean; dispatch(command: GameCommand): boolean;
}) {
  const [menu, setMenu] = useState<'skill' | 'item'>();
  const source = session.engine.getEntity(view.turnId ?? '');
  const skills = (source?.skills ?? []).map((id) => session.content.skill(id)).filter((skill) => skill.battleUsable !== false);
  const items = Object.entries(source?.inventory ?? {}).flatMap(([id, quantity]) => {
    const item = session.content.item(id);
    return quantity > 0 && item.kind === 'consumable' && item.battleUsable ? [{ item, quantity }] : [];
  });
  const attackCost = source?.stamina ? staminaCost(source, 2) : 0;
  const selectedGroup = menu ?? view.selectedAction?.action;
  function selectAction(command: Extract<GameCommand, { type: 'SELECT_ACTION' }>) {
    if (!dispatch(command)) return;
    const targets = session.battle.validTargetIds();
    if (targets.length === 1 && targets[0] === view.turnId) dispatch({ type: 'SELECT_TARGET', targetId: targets[0] });
  }
  function chooseGroup(group: 'attack' | 'skill' | 'defend' | 'item') {
    if (view.phase === 'selectingTarget' && !dispatch({ type: 'CANCEL_ACTION' })) return;
    setMenu(group === 'skill' || group === 'item' ? group : undefined);
    if (group === 'attack' || group === 'defend') selectAction({ type: 'SELECT_ACTION', action: group });
  }
  return <>
    <View style={styles.actions}>
      <Button group label="Attack" detail={source?.stamina && source.stamina.current < attackCost ? 'Bare hands' : attackCost ? `${attackCost} SP` : 'Basic strike'}
        disabled={!canChoose} selected={selectedGroup === 'attack'} onPress={() => chooseGroup('attack')} />
      <Button group label="Skill" detail="Choose a skill" disabled={!canChoose} selected={selectedGroup === 'skill'} onPress={() => chooseGroup('skill')} />
      <Button group label="Defend" detail="Guard & recover" disabled={!canChoose} selected={selectedGroup === 'defend' || selectedGroup === 'rest'} onPress={() => chooseGroup('defend')} />
      <Button group label="Item" detail="Use a consumable" disabled={!canChoose} selected={selectedGroup === 'item'} onPress={() => chooseGroup('item')} />
    </View>
    {menu ? <View className="border-border" style={styles.actionList}>
      <Text className="text-accent" style={styles.eyebrow}>{menu === 'skill' ? 'SKILLS' : 'ITEMS'}</Text>
      {menu === 'skill' ? skills.length ? <View style={styles.skillGrid}>{skills.map((skill) => {
        const cost = source && !(skill.effect === 'heal' && skill.target === 'ally') ? staminaCost(source, skill.staminaCost) : 0;
        const unavailable = !source?.mana || source.mana.current < skill.manaCost || !!source.stamina && source.stamina.current < cost;
        return <View key={skill.id} style={styles.skillColumn}><Button className="min-h-[68px] flex-1" label={skill.name} detail={`${skill.manaCost} MP${cost ? ` · ${cost} SP` : ''}`}
          disabled={!canChoose || unavailable} selected={view.selectedAction?.skillId === skill.id}
          onPress={() => selectAction({ type: 'SELECT_ACTION', action: 'skill', skillId: skill.id })} /></View>;
      })}</View> : <Text className="text-muted" style={styles.body}>No battle skills learned.</Text> : items.length ? items.map(({ item, quantity }) =>
        <Button key={item.id} label={`${item.name} ×${quantity}`} disabled={!canChoose} selected={view.selectedAction?.itemId === item.id}
          onPress={() => selectAction({ type: 'SELECT_ACTION', action: 'item', itemId: item.id })} />)
        : <Text className="text-muted" style={styles.body}>No usable items in your inventory.</Text>}
      {view.phase !== 'selectingTarget' ? <Button label="Back" disabled={!canChoose} onPress={() => setMenu(undefined)} /> : null}
    </View> : null}
    {view.phase === 'selectingTarget' ? <>
      {view.selectedAction?.action !== 'defend' ? <View style={styles.targets}>{view.targets.map((targetId) => <Button key={targetId}
        label={view.entities.find((entity) => entity.id === targetId)?.name ?? targetId}
        disabled={!canChoose} selected={view.selectedTargetId === targetId}
        onPress={() => dispatch({ type: 'SELECT_TARGET', targetId })} />)}</View> : null}
      <View style={styles.actions}><Button primary label={view.selectedAction?.action === 'defend' ? 'Confirm defend' : 'Confirm action'} disabled={!canChoose || !view.selectedTargetId}
        onPress={() => dispatch({ type: 'CONFIRM_ACTION' })} /><Button label="Back" disabled={!canChoose} onPress={() => dispatch({ type: 'CANCEL_ACTION' })} /></View>
    </> : null}
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, targets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
   actionList: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 5 },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  skillColumn: { width: '50%', padding: 4 },

  log: { borderRadius: 5, padding: 16, gap: 12 }, logLine: { fontSize: 11, lineHeight: 19 },
  footer: { textAlign: 'center', fontSize: 8, letterSpacing: 1.5, fontFamily: mono },
  debug: { padding: 12, gap: 4 }, debugText: { fontFamily: mono, fontSize: 10 },
   notice: { padding: 24, gap: 20 },
});
