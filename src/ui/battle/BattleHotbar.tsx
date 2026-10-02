import { Button as HeroButton } from 'heroui-native/button';
import { Popover } from 'heroui-native/popover';
import { type ReactNode, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BattleAction } from '../../engine/battle/BattleMachine';
import { staminaCost } from '../../engine/rpg/Resources';
import type { BattleSession, BattleView } from '../../game/BattleSession';
import { DungeonButton } from '../shared/DungeonUI';
import GameImage from '../shared/GameImage';
import type { GameImageReference } from '../shared/gameImages';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import {
  BATTLE_CATEGORIES,
  battleActionDetails,
  battleHotbarActions,
  battleHotbarItems,
  type BattleSkillCategory,
} from './battleActionDetails';
import PopoverAccessibility from '../shared/PopoverAccessibility';

export default function BattleHotbar({
  session,
  view,
  canChoose,
  inspected,
  inspect,
  selectAction,
}: {
  session: BattleSession;
  view: BattleView;
  canChoose: boolean;
  inspected?: string;
  inspect(id?: string): void;
  selectAction(action: BattleAction): void;
}) {
  const [category, setCategory] = useState<BattleSkillCategory>('combat');
  const source = session.engine.getEntity(view.turnId ?? '');
  const actions = battleHotbarActions(session, category);
  const items = category === 'items' ? battleHotbarItems(session) : [];
  const attackCost = source?.stamina ? staminaCost(source, 2) : 0;
  function actionIcon(
    id: string,
    label: string,
    image: GameImageReference,
    children: ReactNode,
    unavailable = false,
  ) {
    const selected =
      id ===
      (view.selectedAction?.itemId ?? view.selectedAction?.skillId ?? view.selectedAction?.action);
    return (
      <ActionPopover
        key={id}
        label={label}
        image={image}
        disabled={!canChoose}
        unavailable={unavailable}
        selected={selected}
        open={canChoose && inspected === id}
        onOpenChange={(open) => inspect(open ? id : undefined)}
      >
        {children}
      </ActionPopover>
    );
  }
  return (
    <View className="gap-2">
      <KeyboardChoiceGroup itemRole="tab" value={category}>
        <View
          className="flex-row gap-6 border-b border-border"
          accessibilityRole="tablist"
          accessibilityLabel="Skill categories"
        >
          {(Object.keys(BATTLE_CATEGORIES) as BattleSkillCategory[]).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityLabel={BATTLE_CATEGORIES[tab]}
              accessibilityState={{ selected: category === tab }}
              aria-selected={category === tab}
              className={`min-h-12 justify-center border-b-2 px-1 ${category === tab ? 'border-accent' : 'border-transparent'}`}
              onPress={() => {
                inspect(undefined);
                setCategory(tab);
              }}
            >
              <Text className={`text-sm ${category === tab ? 'text-accent' : 'text-muted'}`}>
                {BATTLE_CATEGORIES[tab]}
              </Text>
            </Pressable>
          ))}
        </View>
      </KeyboardChoiceGroup>
      <ScrollView
        key={category}
        horizontal
        showsHorizontalScrollIndicator
        indicatorStyle="white"
        nestedScrollEnabled
        accessibilityLabel={`${BATTLE_CATEGORIES[category]} actions`}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {actions.map(({ id, label, skill, rank, action }) => {
          const title = `${label}${action.action === 'skill' ? '' : ` · ${skill.name}`}${rank ? ` · Rank ${rank}` : ''}`;
          if (action.action === 'attack')
            return actionIcon(
              id,
              title,
              { kind: 'skill', id: skill.id },
              <>
                <Text className="text-sm text-muted">
                  {attackCost} SP · One enemy
                  {source?.stamina && source.stamina.current < attackCost ? ' · Bare hands' : ''}
                </Text>
                <ActionStats session={session} action={action} />
                <DungeonButton
                  primary
                  label="Use Attack"
                  disabled={!canChoose}
                  onPress={() => selectAction(action)}
                />
              </>,
            );
          if (action.action === 'defend')
            return actionIcon(
              id,
              title,
              { kind: 'skill', id: skill.id },
              <>
                <Text className="text-sm text-muted">Self · No MP or SP cost</Text>
                <Text className="text-sm text-muted">
                  Halve incoming attack and spell damage until your next turn, except skills that
                  bypass Defend. Recover stamina at the rest rate.
                </Text>
                <DungeonButton
                  primary
                  label="Use Defend"
                  disabled={!canChoose}
                  onPress={() => selectAction(action)}
                />
              </>,
            );
          const details = battleActionDetails(session, action);
          const cost = source ? staminaCost(source, skill.staminaCost) : 0;
          return actionIcon(
            id,
            title,
            { kind: 'skill', id: skill.id },
            <>
              <Text className="text-sm text-accent">
                {skill.manaCost} MP ·{' '}
                {skill.effect === 'heal' && skill.target === 'ally'
                  ? `0 SP ally / ${cost} SP self`
                  : `${cost} SP`}
              </Text>
              <Text className="text-sm text-muted">
                {skill.target === 'allEnemies'
                  ? 'All enemies'
                  : skill.target === 'enemy'
                    ? 'One enemy'
                    : skill.target === 'ally'
                      ? 'Self or ally'
                      : 'Self'}{' '}
                · {skill.effect === 'heal' ? 'Healing' : skill.element}
              </Text>
              {skill.physicalMultiplier !== 1 ? (
                <Text className="text-sm text-muted">
                  {Math.round(skill.physicalMultiplier * 100)}% physical damage
                </Text>
              ) : null}
              {skill.bypassDefend ? (
                <Text className="text-sm text-muted">
                  Bypasses Defend. Defense and Protection still apply.
                </Text>
              ) : null}
              <ActionStats session={session} action={action} />
              <DungeonButton
                primary
                label="Use Skill"
                disabled={!canChoose || !!details.unavailableReason}
                onPress={() => selectAction(action)}
              />
            </>,
            !!details.unavailableReason,
          );
        })}
        {items.map(({ item, quantity, recovery, unavailableReason }) =>
          actionIcon(
            item.id,
            `${item.name} · ${quantity} owned`,
            { kind: 'item', id: item.id },
            <>
              <Text className="text-sm text-muted">{item.description}</Text>
              <Text className="text-sm text-muted">{quantity} owned · Self · Uses one turn</Text>
              {recovery ? (
                <Text className="text-sm text-foreground">
                  Restore {recovery.amount}{' '}
                  {recovery.resource === 'health'
                    ? 'HP'
                    : recovery.resource === 'mana'
                      ? 'MP'
                      : 'SP'}
                  {recovery.staminaBonus ? ` · +${recovery.staminaBonus} SP` : ''}
                </Text>
              ) : null}
              {item.restores === 'health' ? (
                <Text className="text-xs text-muted">Healing respects wounds.</Text>
              ) : null}
              {recovery && recovery.amount === 0 && recovery.staminaBonus === 0 ? (
                <Text className="text-sm text-muted">
                  Already at your recovery limit. Using this still consumes one copy.
                </Text>
              ) : null}
              {unavailableReason ? (
                <Text className="text-sm text-danger">{unavailableReason}</Text>
              ) : null}
              <DungeonButton
                primary
                label="Use Item"
                disabled={!canChoose || !!unavailableReason}
                onPress={() => selectAction({ action: 'item', itemId: item.id })}
              />
            </>,
            !!unavailableReason,
          ),
        )}
        {!items.length && category === 'items' ? (
          <Text className="py-3 text-sm text-muted">Add consumables from your inventory.</Text>
        ) : null}
        {!actions.length && category !== 'items' ? (
          <Text className="py-3 text-sm text-muted">No {category} skills learned.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
function ActionPopover({
  label,
  image,
  disabled,
  unavailable,
  selected,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  image: GameImageReference;
  disabled: boolean;
  unavailable: boolean;
  selected: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Popover isOpen={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild isDisabled={disabled}>
        <HeroButton
          isIconOnly
          variant={Platform.OS === 'web' ? 'primary' : 'outline'}
          isDisabled={disabled}
          accessibilityLabel={`${label}${unavailable ? ', unavailable; view details' : ''}`}
          accessibilityState={{ disabled, selected, expanded: open }}
          aria-pressed={selected}
          aria-expanded={open}
          className={`size-14 rounded-lg border p-1 ${selected ? 'border-accent bg-surface-tertiary' : 'border-border bg-surface-secondary'}`}
        >
          <View style={{ opacity: unavailable ? 0.5 : 1 }}>
            <GameImage {...image} size={44} />
          </View>
        </HeroButton>
      </Popover.Trigger>
      <Popover.Portal unstable_accessibilityContainerViewIsModal>
        <Popover.Overlay className="bg-transparent" />
        <Popover.Content
          presentation="popover"
          placement="top"
          width={Math.min(320, width - insets.left - insets.right - 24)}
          accessibilityLabel={label}
          insets={{
            top: insets.top + 12,
            bottom: insets.bottom + 12,
            left: insets.left + 12,
            right: insets.right + 12,
          }}
          className="rounded-xl border border-border bg-surface p-3"
        >
          <PopoverAccessibility open={open} close={() => onOpenChange(false)}>
            <ScrollView
              style={{ maxHeight: Math.max(120, (height - insets.top - insets.bottom) * 0.6) }}
              contentContainerStyle={{ gap: 12 }}
            >
              <View className="flex-row items-center gap-2">
                <Popover.Title className="min-w-0 flex-1 text-base text-foreground">
                  {label}
                </Popover.Title>
                <Popover.Close accessibilityLabel="Close action details" className="size-12" />
              </View>
              {open ? children : null}
            </ScrollView>
          </PopoverAccessibility>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}

function ActionStats({ session, action }: { session: BattleSession; action: BattleAction }) {
  const { previews, failures, unavailableReason } = battleActionDetails(session, action);
  const name = (id: string) =>
    session.getSnapshot().entities.find((entity) => entity.id === id)?.name ?? id;
  return (
    <View className="gap-2">
      {previews.flatMap((preview) =>
        preview.targets.map((target) => (
          <View key={target.targetId} className="gap-1">
            <Text className="text-sm text-foreground">
              {name(target.targetId)} · {preview.healing ? 'Restore' : 'Damage'} {target.min}–
              {target.max} HP
            </Text>
            <Text className="text-xs text-muted">
              {preview.manaCost} MP · {preview.staminaCost} SP
              {preview.healing
                ? ''
                : ` · Hit ${Math.round(target.hitChance * 100)}% · Critical ${Math.round(target.criticalChance * 100)}%`}
            </Text>
            {!preview.healing ? (
              <Text className="text-xs text-muted">
                Critical damage {target.criticalMin}–{target.criticalMax} HP
              </Text>
            ) : null}
          </View>
        )),
      )}
      {unavailableReason ? (
        <Text className="text-sm text-danger">{unavailableReason}</Text>
      ) : (
        failures.map((failure) => (
          <Text key={failure.targetId} className="text-sm text-danger">
            {name(failure.targetId)} · {failure.reason}
          </Text>
        ))
      )}
    </View>
  );
}
