import { Button as HeroButton } from 'heroui-native/button';
import { Popover } from 'heroui-native/popover';
import { type ReactNode, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BattleAction } from '../../engine/battle/BattleMachine';
import { consumableRecovery } from '../../engine/rpg/Consumables';
import { staminaCost } from '../../engine/rpg/Resources';
import type { BattleSession, BattleView } from '../../game/BattleSession';
import { DungeonButton } from '../shared/DungeonUI';
import GameImage from '../shared/GameImage';
import type { GameImageReference } from '../shared/gameImages';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import { battleActionDetails, battleSkills, type BattleSkillCategory } from './battleActionDetails';
import PopoverAccessibility from './PopoverAccessibility';

export default function BattleHotbar({ session, view, canChoose, inspected, inspect, selectAction }: {
  session: BattleSession; view: BattleView; canChoose: boolean; inspected?: string;
  inspect(id?: string): void; selectAction(action: BattleAction): void;
}) {
  const skills = battleSkills(session);
  const [category, setCategory] = useState<BattleSkillCategory>(() => skills.some((skill) => skill.category === 'combat') ? 'combat' : 'magic');
  const source = session.engine.getEntity(view.turnId ?? '');
  const visibleSkills = skills.filter((skill) => skill.category === category);
  const attackCost = source?.stamina ? staminaCost(source, 2) : 0;
  function actionIcon(id: string, label: string, image: GameImageReference, children: ReactNode, unavailable = false) {
    const selected = id === (view.selectedAction?.skillId ?? view.selectedAction?.action ?? 'attack');
    return <ActionPopover key={id} label={label} image={image} disabled={!canChoose} unavailable={unavailable}
      selected={selected} open={canChoose && inspected === id} onOpenChange={(open) => inspect(open ? id : undefined)}>
      {children}
    </ActionPopover>;
  }
  return <View className="gap-2">
    <View className="flex-row gap-2" accessibilityLabel="Basic actions">
      {actionIcon('attack', 'Attack', { kind: 'item', id: 'iron-blade' }, <>
        <Text className="text-sm text-muted">{attackCost} SP · One enemy{source?.stamina && source.stamina.current < attackCost ? ' · Bare hands' : ''}</Text>
        <ActionStats session={session} action={{ action: 'attack' }} />
        <DungeonButton primary label="Use Attack" disabled={!canChoose} onPress={() => selectAction({ action: 'attack' })} />
      </>)}
      {actionIcon('defend', 'Defend', { kind: 'skill', id: 'defense' }, <>
        <Text className="text-sm text-muted">Self · No MP or SP cost</Text>
        <Text className="text-sm text-muted">Halve incoming attack and spell damage until your next turn. Recover stamina at the rest rate.</Text>
        <DungeonButton primary label="Use Defend" disabled={!canChoose} onPress={() => selectAction({ action: 'defend' })} />
      </>)}
      {actionIcon('item', 'Item', { kind: 'item', id: 'potion' }, <BattleItems session={session} canChoose={canChoose} selectAction={selectAction} />)}
    </View>
    <KeyboardChoiceGroup itemRole="tab" value={category}>
      <View className="flex-row gap-6 border-b border-border" accessibilityRole="tablist" accessibilityLabel="Skill categories">
        {(['combat', 'magic'] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab"
          accessibilityLabel={tab === 'combat' ? 'Combat' : 'Magic'} accessibilityState={{ selected: category === tab }}
          aria-selected={category === tab}
          className={`min-h-12 justify-center border-b-2 px-1 ${category === tab ? 'border-accent' : 'border-transparent'}`}
          onPress={() => { inspect(undefined); setCategory(tab); }}>
          <Text className={`text-sm ${category === tab ? 'text-accent' : 'text-muted'}`}>{tab === 'combat' ? 'Combat' : 'Magic'}</Text>
        </Pressable>)}
      </View>
    </KeyboardChoiceGroup>
    <ScrollView key={category} horizontal showsHorizontalScrollIndicator indicatorStyle="white" nestedScrollEnabled
      accessibilityLabel={`${category === 'combat' ? 'Combat' : 'Magic'} skills`} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {visibleSkills.length ? visibleSkills.map((skill) => {
        const action: BattleAction = { action: 'skill', skillId: skill.id };
        const details = battleActionDetails(session, action);
        const cost = source ? staminaCost(source, skill.staminaCost) : 0;
        return actionIcon(skill.id, `${skill.name} · Rank ${skill.rank ?? 'F'}`, { kind: 'skill', id: skill.id }, <>
          <Text className="text-sm text-accent">{skill.manaCost} MP · {skill.effect === 'heal' && skill.target === 'ally' ? `0 SP ally / ${cost} SP self` : `${cost} SP`}</Text>
          <Text className="text-sm text-muted">{skill.target === 'allEnemies' ? 'All enemies' : skill.target === 'enemy' ? 'One enemy' : skill.target === 'ally' ? 'Self or ally' : 'Self'} · {skill.effect === 'heal' ? 'Healing' : skill.element}</Text>
          <ActionStats session={session} action={action} />
          <DungeonButton primary label="Use Skill" disabled={!canChoose || !!details.unavailableReason} onPress={() => selectAction(action)} />
        </>, !!details.unavailableReason);
      }) : <Text className="py-3 text-sm text-muted">No {category} skills learned.</Text>}
    </ScrollView>
  </View>;
}

function ActionPopover({ label, image, disabled, unavailable, selected, open, onOpenChange, children }: {
  label: string; image: GameImageReference; disabled: boolean; unavailable: boolean; selected: boolean;
  open: boolean; onOpenChange(open: boolean): void; children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <Popover isOpen={open} onOpenChange={onOpenChange}>
    <Popover.Trigger asChild isDisabled={disabled}>
      <HeroButton isIconOnly variant={Platform.OS === 'web' ? 'primary' : 'outline'} isDisabled={disabled}
        accessibilityLabel={`${label}${unavailable ? ', unavailable; view details' : ''}`} accessibilityState={{ disabled, selected, expanded: open }}
        aria-pressed={selected} aria-expanded={open}
        className={`size-14 rounded-lg border p-1 ${selected ? 'border-accent bg-surface-tertiary' : 'border-border bg-surface-secondary'}`}>
        <View style={{ opacity: unavailable ? 0.5 : 1 }}><GameImage {...image} size={44} /></View>
      </HeroButton>
    </Popover.Trigger>
    <Popover.Portal unstable_accessibilityContainerViewIsModal>
      <Popover.Overlay className="bg-transparent" />
      <Popover.Content presentation="popover" placement="top" width={Math.min(320, width - insets.left - insets.right - 24)}
        accessibilityLabel={label}
        insets={{ top: insets.top + 12, bottom: insets.bottom + 12, left: insets.left + 12, right: insets.right + 12 }}
        className="rounded-xl border border-border bg-surface p-3">
        <PopoverAccessibility open={open} close={() => onOpenChange(false)}>
          <ScrollView style={{ maxHeight: Math.max(120, (height - insets.top - insets.bottom) * 0.6) }} contentContainerStyle={{ gap: 12 }}>
            <View className="flex-row items-center gap-2">
              <Popover.Title className="min-w-0 flex-1 text-base text-foreground">{label}</Popover.Title>
              <Popover.Close accessibilityLabel="Close action details" className="size-12" />
            </View>
            {open ? children : null}
          </ScrollView>
        </PopoverAccessibility>
      </Popover.Content>
    </Popover.Portal>
  </Popover>;
}

function ActionStats({ session, action }: { session: BattleSession; action: BattleAction }) {
  const { previews, failures, unavailableReason } = battleActionDetails(session, action);
  const name = (id: string) => session.getSnapshot().entities.find((entity) => entity.id === id)?.name ?? id;
  return <View className="gap-2">
    {previews.flatMap((preview) => preview.targets.map((target) => <View key={target.targetId} className="gap-1">
      <Text className="text-sm text-foreground">{name(target.targetId)} · {preview.healing ? 'Restore' : 'Damage'} {target.min}–{target.max} HP</Text>
      <Text className="text-xs text-muted">{preview.manaCost} MP · {preview.staminaCost} SP{preview.healing ? '' : ` · Hit ${Math.round(target.hitChance * 100)}% · Critical ${Math.round(target.criticalChance * 100)}%`}</Text>
      {!preview.healing ? <Text className="text-xs text-muted">Critical damage {target.criticalMin}–{target.criticalMax} HP</Text> : null}
    </View>))}
    {unavailableReason ? <Text className="text-sm text-danger">{unavailableReason}</Text> : failures.map((failure) =>
      <Text key={failure.targetId} className="text-sm text-danger">{name(failure.targetId)} · {failure.reason}</Text>)}
  </View>;
}

function BattleItems({ session, canChoose, selectAction }: { session: BattleSession; canChoose: boolean; selectAction(action: BattleAction): void }) {
  const source = session.engine.getEntity(session.getSnapshot().turnId ?? '');
  const items = Object.entries(source?.inventory ?? {}).flatMap(([id, quantity]) => {
    const item = session.content.item(id);
    return quantity > 0 && item.kind === 'consumable' && item.battleUsable ? [{ item, quantity }] : [];
  });
  const [selectedId, setSelectedId] = useState(items[0]?.item.id);
  const selected = items.find(({ item }) => item.id === selectedId);
  const recovery = selected && source ? consumableRecovery(selected.item, source) : undefined;
  return <View className="gap-3">
    {items.length ? <>
      <View className="gap-2">{items.map(({ item, quantity }) => <DungeonButton key={item.id} image={{ kind: 'item', id: item.id }}
        label={`${item.name} ×${quantity}`} selected={selectedId === item.id} onPress={() => setSelectedId(item.id)} />)}</View>
      {selected && recovery ? <>
        <Text className="text-sm text-muted">{selected.item.description}</Text>
        <Text className="text-sm text-accent">Restore {recovery.amount} {recovery.resource === 'health' ? 'HP' : recovery.resource === 'mana' ? 'MP' : 'SP'} · Uses one turn</Text>
        <DungeonButton primary label="Use Item" disabled={!canChoose} onPress={() => selectAction({ action: 'item', itemId: selected.item.id })} />
      </> : null}
    </> : <Text className="text-sm text-muted">No usable items in your inventory.</Text>}
  </View>;
}
