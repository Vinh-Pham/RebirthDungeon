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
import { skillForEntity, skillEquipmentReason } from '../../engine/rpg/Skills';
import { staminaCost } from '../../engine/rpg/Resources';
import GameCanvas from '../../renderer/GameCanvas';
import GameImage from '../shared/GameImage';

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
  const [menuState, setMenuState] = useState<{ turn: string; value?: 'skill' | 'item' }>({ turn: turnKey });
  const error = errorState.turn === turnKey ? errorState.value : undefined;
  const menu = menuState.turn === turnKey ? menuState.value : undefined;
  const setError = (value?: string) => setErrorState({ turn: turnKey, value });
  const setMenu = (value?: 'skill' | 'item') => setMenuState({ turn: turnKey, value });
  const finished = view.phase === 'victory' || view.phase === 'defeat';
  const canChoose = !presentation.busy && ['selectingAction', 'selectingTarget'].includes(view.phase);
  useEffect(() => {
    // Simulation advances independently of presentation completion.
    if (view.phase === 'enemyTurn') session.advanceEnemyTurns();
  }, [session, view.phase]);
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
      setMenu(undefined); scroll.current?.scrollTo({ y: 0, animated: true });
    }
  }
  function chooseGroup(group: 'attack' | 'skill' | 'defend' | 'item') {
    if (!session.canAcceptPlayerInput(view.actionCount)) return;
    if (view.phase === 'selectingTarget' && !dispatch({ type: 'CANCEL_ACTION' })) return;
    setMenu(group === 'skill' || group === 'item' ? group : undefined);
    if (group === 'defend') selectAction({ action: 'defend' });
  }
  function cancel() {
    if (!session.canAcceptPlayerInput(view.actionCount)) return;
    if (view.phase === 'selectingTarget' && !dispatch({ type: 'CANCEL_ACTION' })) return;
    setMenu(undefined);
    scroll.current?.scrollTo({ y: 0, animated: true });
  }
  const action: BattleAction = view.selectedAction ?? { action: 'attack' };
  const inputEnabled = canChoose && (!menu || !!view.selectedAction);
  const targetIds = inputEnabled ? session.battle.validTargetIds(action) : [];
  function execute(targetId: string, expectedActionCount = view.actionCount) {
    if (!inputEnabled) return;
    if (attempt(() => session.executePlayerAction(action, targetId, expectedActionCount))) scroll.current?.scrollTo({ y: 0, animated: true });
  }
  const source = session.engine.getEntity(view.turnId ?? '');
  const selectedSkill = action.action === 'skill' && source ? skillForEntity(session.content, source, action.skillId!) : undefined;
  const skillCost = selectedSkill && source ? staminaCost(source, selectedSkill.staminaCost) : 0;
  const headline = view.phase === 'victory' ? 'Chamber cleared' : view.phase === 'defeat' ? 'A warden falls' :
    presentation.busy ? 'Steel, spell & consequence' : menu ? `Choose a ${menu}` : selectedSkill ? selectedSkill.name : 'Your move, warden';
  const hint = view.phase === 'victory' ? victoryContent ? 'Choose your loot, then confirm to continue.' : 'A small victory. The dungeon runs deeper.' : view.phase === 'defeat' ? 'Every descent teaches something.' :
    presentation.busy ? 'The battle unfolds before you.' : menu ? 'Targeting pauses while you choose. Cancel to return to basic attack.' :
    selectedSkill ? `${selectedSkill.manaCost} MP · ${selectedSkill.effect === 'heal' && selectedSkill.target === 'ally' ? `0 SP ally / ${skillCost} SP self` : `${skillCost} SP`} · ` +
      (selectedSkill.target === 'allEnemies' ? `Tap any monster to cast ${selectedSkill.name} against all enemies.` :
      `Tap ${selectedSkill.target === 'ally' ? 'an ally' : 'a monster'} to cast ${selectedSkill.name}.`) : 'Tap a monster to attack. Choose Skill, Defend, or Item for another action.';

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
          {!finished ? <BattleActions key={`${view.turnId}:${view.actionCount}`} session={session} view={view} canChoose={canChoose} menu={menu} chooseGroup={chooseGroup} selectAction={selectAction} cancel={cancel} targetIds={targetIds} execute={execute} /> : view.phase === 'victory' && victoryContent ? victoryContent :
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

function BattleActions({ session, view, canChoose, menu, chooseGroup, selectAction, cancel, targetIds, execute }: {
  session: BattleSession; view: BattleSnapshot; canChoose: boolean; menu?: 'skill' | 'item';
  chooseGroup(group: 'attack' | 'skill' | 'defend' | 'item'): void;
  selectAction(action: BattleAction): void; cancel(): void;
  targetIds: readonly string[]; execute(targetId: string): void;
}) {
  const [targetsExpanded, setTargetsExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const source = session.engine.getEntity(view.turnId ?? '');
  const skills = (source?.skills ?? []).map((id) => skillForEntity(session.content, source!, id)).filter((skill) => skill.battleUsable !== false);
  const items = Object.entries(source?.inventory ?? {}).flatMap(([id, quantity]) => {
    const item = session.content.item(id);
    return quantity > 0 && item.kind === 'consumable' && item.battleUsable ? [{ item, quantity }] : [];
  });
  const attackCost = source?.stamina ? staminaCost(source, 2) : 0;
  const selectedGroup = menu ?? view.selectedAction?.action ?? 'attack';
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
        const equipmentReason = source ? skillEquipmentReason(source, skill, session.content) : undefined;
        const cooldown = source?.cooldowns?.[skill.id] ?? 0;
        const unavailable = !!equipmentReason || cooldown > 0 || !source?.mana || source.mana.current < skill.manaCost || !!source.stamina && source.stamina.current < cost;
        return <View key={skill.id} style={styles.skillColumn}><Button className="min-h-[68px] flex-1" image={{ kind: 'skill', id: skill.id }} label={`${skill.name} · ${skill.rank ?? 'F'}`} detail={`${skill.manaCost} MP${skill.effect === 'heal' && skill.target === 'ally' && source ? ` · 0 SP ally / ${staminaCost(source, skill.staminaCost)} SP self` : ` · ${cost} SP`} · ${skill.target === 'allEnemies' ? 'All enemies' : skill.target}${equipmentReason ? ` · ${equipmentReason}` : cooldown ? ` · Cooldown ${cooldown}` : unavailable ? ' · Insufficient resources' : ''}`}
          disabled={!canChoose || unavailable} selected={view.selectedAction?.skillId === skill.id}
          onPress={() => selectAction({ action: 'skill', skillId: skill.id })} /></View>;
      })}</View> : <Text className="text-muted" style={styles.body}>No battle skills learned.</Text> : items.length ? items.map(({ item, quantity }) =>
        <Button key={item.id} image={{ kind: 'item', id: item.id }} label={`${item.name} ×${quantity}`} disabled={!canChoose} selected={view.selectedAction?.itemId === item.id}
          onPress={() => selectAction({ action: 'item', itemId: item.id })} />)
        : <Text className="text-muted" style={styles.body}>No usable items in your inventory.</Text>}

    </View> : null}
    {menu || view.selectedAction ? <Button label="Cancel" disabled={!canChoose} onPress={cancel} /> : null}
    {targetIds.length ? <>
      <View style={styles.actions}>
        <Button label="Targets" secondary accessibilityState={{ expanded: targetsExpanded }} disabled={!canChoose} onPress={() => setTargetsExpanded(!targetsExpanded)} />
        {['attack', 'skill'].includes(view.selectedAction?.action ?? 'attack') ? <Button label="Action details" secondary accessibilityState={{ expanded: detailsExpanded }} disabled={!canChoose} onPress={() => setDetailsExpanded(!detailsExpanded)} /> : null}
      </View>
      {targetsExpanded ? <View style={styles.targets}>{targetIds.map((targetId) => {
        const entity = view.entities.find((entry) => entry.id === targetId)!;
        return <Button key={targetId} label={entity.name} detail={`${entity.health}/${entity.maxHealth} HP`}
          accessibilityLabel={`${view.selectedAction?.action === 'skill' ? 'Cast on' : 'Attack'} ${entity.name}, ${entity.health} of ${entity.maxHealth} health`}
          disabled={!canChoose} onPress={() => execute(targetId)} />;
      })}</View> : null}
      {detailsExpanded ? <ActionPreview session={session} view={view} targetIds={targetIds} /> : null}
    </> : null}
  </>;
}

function ActionPreview({ session, view, targetIds }: { session: BattleSession; view: BattleSnapshot; targetIds: readonly string[] }) {
  let preview: ReturnType<BattleSession['combat']['previewSkill']> | undefined;
  let errorMessage: string | undefined;
  try {
    const previews = targetIds.map((targetId) => view.selectedAction?.action === 'skill'
      ? session.combat.previewSkill(view.turnId!, targetId, view.selectedAction.skillId!)
      : session.combat.previewBasic(view.turnId!, targetId));
    if (previews.length) preview = { ...previews[0], targets: previews[0].area ? previews[0].targets : previews.flatMap((entry) => entry.targets) };
  } catch (error) { errorMessage = error instanceof Error ? error.message : 'Preview unavailable'; }
  if (!preview) return <DungeonNotice message={errorMessage} />;
  return <View className="gap-2" accessibilityLiveRegion="polite">
      <Text className="text-accent" style={styles.body}>{preview.area ? 'All enemies · ' : ''}{preview.manaCost} MP · {preview.staminaCost} SP</Text>
      {preview.targets.map((target) => <Text key={target.targetId} className="text-muted" style={styles.body}>{view.entities.find((e) => e.id === target.targetId)?.name ?? target.targetId}: {preview.healing ? 'Restore' : 'Damage'} {target.min}–{target.max} HP{preview.healing ? '' : ` · Hit ${Math.round(target.hitChance * 100)}% · Critical ${Math.round(target.criticalChance * 100)}% (${target.criticalMin}–${target.criticalMax} HP)`}</Text>)}
    </View>;
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
