import { Surface } from 'heroui-native/surface';
import {
  Component,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadGameContent } from '../../data/content';
import type { BattleAction } from '../../engine/battle/BattleMachine';
import type { GameCommand } from '../../engine/commands';
import { BattleHost } from '../../game/BattleHost';
import { BattleSession, type BattleView as BattleSnapshot } from '../../game/BattleSession';
import GameCanvas from '../../renderer/GameCanvas';
import { DungeonButton as Button, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import GameImage from '../shared/GameImage';
import ResourceBar from '../shared/ResourceBar';
import BattleHotbar from './BattleHotbar';
import { useAppScreenChrome } from '../navigation/AppScreenChrome';

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export class ArenaBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <DungeonNotice message="The arena couldn’t load. Restart the app to try again." />
    ) : (
      this.props.children
    );
  }
}

export default function BattleScreen() {
  const { edges } = useAppScreenChrome();
  const [host] = useState(() => new BattleHost(() => new BattleSession(loadGameContent())));
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  if (!snapshot.session)
    return (
      <SafeAreaView edges={edges} className="bg-background" style={styles.screen}>
        <View style={styles.notice}>
          {snapshot.error ? (
            <DungeonNotice message={snapshot.error} />
          ) : (
            <DungeonLoading label="Opening the dungeon" />
          )}
          {snapshot.error ? <Button label="Try again" onPress={host.restart} /> : null}
        </View>
      </SafeAreaView>
    );
  return <BattleView key={snapshot.revision} session={snapshot.session} restart={host.restart} />;
}

export function BattleView({
  session,
  restart,
  finishedLabel = 'Descend again',
  busy = false,
  victoryContent,
  hideCharacterResources = false,
}: {
  session: BattleSession;
  restart(): void;
  finishedLabel?: string;
  busy?: boolean;
  victoryContent?: ReactNode;
  hideCharacterResources?: boolean;
}) {
  const { edges } = useAppScreenChrome();
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const presentation = useSyncExternalStore(
    session.presentation.subscribe,
    session.presentation.getSnapshot,
    session.presentation.getSnapshot,
  );
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(240, Math.min(windowWidth - 40, 560));
  const scroll = useRef<ScrollView>(null);
  const decisionY = useRef(0);
  const hasVictoryLoot = !!victoryContent;
  const turnKey = `${view.turnId}:${view.actionCount}`;
  const [errorState, setErrorState] = useState<{ turn: string; value?: string }>({ turn: turnKey });
  const [inspectState, setInspectState] = useState<{ turn: string; value?: string }>({
    turn: turnKey,
  });
  const error = errorState.turn === turnKey ? errorState.value : undefined;
  const inspected = inspectState.turn === turnKey ? inspectState.value : undefined;
  const setError = (value?: string) => setErrorState({ turn: turnKey, value });
  const inspect = (value?: string) => setInspectState({ turn: turnKey, value });
  const finished = view.phase === 'victory' || view.phase === 'defeat';
  const canChoose =
    !busy && !presentation.busy && ['selectingAction', 'selectingTarget'].includes(view.phase);
  useEffect(() => {
    // Simulation advances independently of presentation completion.
    if (!busy && view.phase === 'enemyTurn') session.advanceEnemyTurns();
  }, [session, view.phase, busy]);
  useEffect(() => {
    if (view.phase === 'victory' && hasVictoryLoot && !presentation.busy)
      scroll.current?.scrollTo({ y: decisionY.current, animated: true });
  }, [view.phase, hasVictoryLoot, presentation.busy]);
  function attempt(run: () => boolean): boolean {
    try {
      const accepted = run();
      if (accepted) setError(undefined);
      return accepted;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Action could not resolve');
      return false;
    }
  }
  function dispatch(command: GameCommand): boolean {
    return attempt(() => {
      if (!session.canAcceptPlayerInput(view.actionCount)) return false;
      session.dispatch(command);
      return true;
    });
  }
  function selectAction(action: BattleAction) {
    if (attempt(() => session.selectPlayerAction(action, view.actionCount))) {
      inspect(undefined);
      scroll.current?.scrollTo({ y: 0, animated: true });
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
    if (attempt(() => session.executePlayerAction(action, targetId, expectedActionCount)))
      scroll.current?.scrollTo({ y: 0, animated: true });
  }

  return (
    <SafeAreaView className="bg-background" style={styles.screen} edges={edges}>
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll}>
        <View style={[styles.content, { width }]}>
          <Text className="text-foreground" style={styles.title}>
            {session.map.name}
          </Text>
          <Text className="text-muted" style={styles.subtitle}>
            DESCENT I / AN UNWELCOME GUEST
          </Text>
          <View className="border-border" style={styles.arena}>
            <ArenaBoundary>
              <GameCanvas
                session={session}
                width={width}
                targetIds={targetIds}
                inputEnabled={inputEnabled}
                onTargetPress={execute}
              />
            </ArenaBoundary>
          </View>
          <View
            style={styles.decision}
            onLayout={(event) => {
              decisionY.current = event.nativeEvent.layout.y;
            }}
          >
            {!finished ? (
              <BattleActions
                session={session}
                view={view}
                canChoose={canChoose}
                inspected={inspected}
                inspect={inspect}
                selectAction={selectAction}
                cancel={cancel}
              />
            ) : view.phase === 'victory' && victoryContent ? (
              victoryContent
            ) : (
              <View style={styles.actions}>
                <Button
                  primary
                  label={finishedLabel}
                  disabled={presentation.busy || busy}
                  busy={busy}
                  onPress={restart}
                />
              </View>
            )}
            {error || session.battle.context.error ? (
              <DungeonNotice message={error ?? session.battle.context.error} />
            ) : null}
          </View>
          <View className="border-border" style={styles.roster}>
            {view.entities
              .filter((entity) => entity.side === 'player')
              .map((entity) => (
                <View key={entity.id} style={styles.unit}>
                  <Text className="text-accent" style={styles.unitLabel}>
                    {entity.name}
                  </Text>
                  {!hideCharacterResources ||
                  entity.id !== view.entities.find((unit) => unit.side === 'player')?.id ? (
                    <>
                      <ResourceBar
                        label="HP"
                        value={entity.health}
                        max={entity.maxHealth}
                        name={entity.name}
                      />
                      {entity.maxMana > 0 ? (
                        <ResourceBar
                          label="Mana"
                          value={entity.mana}
                          max={entity.maxMana}
                          name={entity.name}
                        />
                      ) : (
                        <Text className="text-muted" style={styles.resource}>
                          {entity.dead ? 'DEFEATED' : 'ENEMY'}
                        </Text>
                      )}
                      {entity.maxStamina !== undefined ? (
                        <ResourceBar
                          label="Stamina"
                          value={entity.stamina ?? 0}
                          max={entity.maxStamina}
                          name={entity.name}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {entity.maxStamina !== undefined ? (
                    <Text className="text-muted" style={styles.resource}>
                      {entity.wounds ?? 0} WOUNDS · {(100 - (entity.fullness ?? 100)).toFixed(1)}%
                      HUNGER
                    </Text>
                  ) : null}
                  {entity.weapon || entity.secondaryHand ? (
                    <View className="flex-row flex-wrap gap-x-6 gap-y-2">
                      {entity.weapon ? (
                        <View className="flex-row items-center gap-2" style={styles.hand}>
                          <GameImage kind="item" id={entity.weapon.itemId} size={32} />
                          <Text className="min-w-0 shrink text-muted" style={styles.resource}>
                            {entity.weapon.name} · {entity.weapon.durability}/
                            {entity.weapon.maxDurability}
                            {entity.weapon.durability === 0 ? ' · BROKEN' : ''}
                          </Text>
                        </View>
                      ) : null}
                      {entity.secondaryHand ? (
                        <View className="flex-row items-center gap-2" style={styles.hand}>
                          <GameImage kind="item" id={entity.secondaryHand.itemId} size={32} />
                          <Text
                            className="min-w-0 shrink text-muted"
                            style={styles.resource}
                            accessibilityLabel={`Secondary hand: ${entity.secondaryHand.name}, ${entity.secondaryHand.quantity} remaining`}
                          >
                            {entity.secondaryHand.name} · {entity.secondaryHand.quantity} remaining
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {(session.engine.getEntity(entity.id)?.statuses ?? []).map((status) => (
                    <Text className="text-muted" key={status.id} style={styles.resource}>
                      {session.content.status(status.id).name} · {status.remainingTurns} turns
                    </Text>
                  ))}
                </View>
              ))}
          </View>
          <Surface className="bg-surface-secondary" style={styles.log}>
            <Text className="text-accent" style={styles.eyebrow}>
              BATTLE CHRONICLE
            </Text>
            <View accessibilityLiveRegion="polite">
              {view.log.length ? (
                view.log.slice(-4).map((line, index) => (
                  <Text className="text-muted" key={`${index}:${line}`} style={styles.logLine}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text className="text-muted" style={styles.logLine}>
                  A moss slime stirs in the dark.
                </Text>
              )}
            </View>
          </Surface>
          <Text className="text-muted" style={styles.footer}>
            ONE CHAMBER. ONE CHANCE. ANOTHER REBIRTH.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BattleActions({
  session,
  view,
  canChoose,
  inspected,
  inspect,
  selectAction,
  cancel,
}: {
  session: BattleSession;
  view: BattleSnapshot;
  canChoose: boolean;
  inspected?: string;
  inspect(id?: string): void;
  selectAction(action: BattleAction): void;
  cancel(): void;
}) {
  return (
    <>
      <BattleHotbar
        session={session}
        view={view}
        canChoose={canChoose}
        inspected={inspected}
        inspect={inspect}
        selectAction={selectAction}
      />
      {view.selectedAction ? (
        <Button label="Cancel" disabled={!canChoose} onPress={cancel} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  content: { gap: 18 },
  eyebrow: { fontSize: 10, letterSpacing: 2.4, fontFamily: mono },
  title: {
    fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia',
    fontSize: 36,
    letterSpacing: -1,
  },
  subtitle: { fontFamily: mono, fontSize: 9, letterSpacing: 1.3, marginTop: -7 },
  arena: { overflow: 'hidden', borderRadius: 8 },
  roster: {
    flexDirection: 'row',
    gap: 16,
    borderBottomWidth: 1,
    paddingBottom: 18,
    flexWrap: 'wrap',
  },
  unit: { flex: 1, minWidth: 112, gap: 10 },
  unitLabel: { fontSize: 12, fontWeight: '600' },
  hand: { minWidth: 160, maxWidth: '100%', flexShrink: 1 },
  resource: { fontFamily: mono, fontSize: 9, letterSpacing: 1 },
  decision: { gap: 12 },
  headline: { fontSize: 20, fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia' },
  body: { fontSize: 12, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  log: { borderRadius: 5, padding: 16, gap: 12 },
  logLine: { fontSize: 11, lineHeight: 19 },
  footer: { textAlign: 'center', fontSize: 8, letterSpacing: 1.5, fontFamily: mono },
  notice: { padding: 24, gap: 20 },
});
