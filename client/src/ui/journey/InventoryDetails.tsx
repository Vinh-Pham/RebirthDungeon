import { gameHref } from '../navigation/gameHref';
import { useGameplayPreview } from '../../hooks/useGameplayPreview';
import { useState } from 'react';
import EquipmentEnchants, { enchantStatLabel } from './EquipmentEnchants';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import type { GameCommand } from '../../engine/commands';
import {
  heroStats,
  itemCount,
  ownedEquipment,
  removableCount,
  type HeroFacts,
} from '../../engine/rpg/Character';
import { consumableRecovery } from '../../engine/rpg/Consumables';
import type { CharacterReview } from '../../game/BattleSession';
import type { GameplayHost as JourneyHost } from '../../game/Gameplay';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonNotice } from '../shared/DungeonUI';
import type { InventoryRow } from './inventoryRows';
import { questItemNeeds } from '../../engine/rpg/Quests';
import { npcLabel } from '../quests/questLabels';

export default function InventoryDetails({
  row,
  hero,
  host,
  session,
  characterId,
  review,
  disabled,
  hotbarDisabled,
  town,
  dispatch,
}: {
  row: InventoryRow;
  hero: HeroFacts;
  host: JourneyHost;
  session: JourneySession;
  characterId: string;
  review?: CharacterReview;
  disabled: boolean;
  hotbarDisabled: boolean;
  town: boolean;
  dispatch(command: GameCommand): void;
}) {
  const item = row.item;
  const equipment = 'itemId' in row.reference ? undefined : ownedEquipment(hero, row.reference);
  const effects = session.getSnapshot().state.dungeon?.effects;
  const stats = review?.stats ?? heroStats(hero, session.content, effects);
  const resource = {
    health: { current: review?.health ?? hero.health, max: stats.maxHealth },
    mana: { current: review?.mana ?? hero.mana, max: stats.maxMana },
    stamina: { current: review?.stamina ?? hero.stamina, max: stats.maxStamina },
    wounds: review?.wounds ?? hero.wounds,
    fullness: review?.fullness ?? hero.fullness,
  };
  const recovery =
    item.kind === 'consumable' && resource.health.current > 0
      ? consumableRecovery(item, resource)
      : undefined;
  const slot =
    item.kind === 'weapon' ? 'weapon' : item.kind === 'ammunition' ? 'secondaryHand' : 'armor';
  const equippedWeapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
  const hasBow =
    !!equippedWeapon && session.content.item(equippedWeapon.itemId).weaponTags.includes('bow');
  const preview = useGameplayPreview(
    session,
    !review && (['weapon', 'armor'].includes(item.kind) || (item.kind === 'ammunition' && hasBow))
      ? { type: 'EQUIPMENT', item: row.equipped ? { slot } : row.reference }
      : undefined,
    !disabled,
  );
  const comparison = preview.data?.preview.type === 'EQUIPMENT' ? preview.data.preview : undefined;
  const openJournal = () => router.navigate(gameHref(characterId, 'skills'));
  const needs = questItemNeeds(hero, session.content, item.id);
  const [dropQuantity, setDropQuantity] = useState(1);
  const droppable = removableCount(hero, row.reference);
  const count = Math.max(1, Math.min(dropQuantity, droppable));
  return (
    <View className="gap-3">
      <DungeonNotice message={preview.error?.message} />
      <View className="gap-3">
        <Text className="text-muted" style={menu.body}>
          {item.description}
        </Text>
        <Text className="text-muted" style={menu.body}>
          {itemCount(hero, item.id)} owned{equipment ? ' · Individually owned equipment' : ''}
          {row.equipped
            ? item.kind === 'ammunition'
              ? ' · This stack is equipped'
              : ' · This copy is equipped'
            : ''}
        </Text>
        {item.weaponStats ? (
          <Text className="text-foreground" style={menu.body}>
            Damage {item.weaponStats.minDamage}–{item.weaponStats.maxDamage} · Balance{' '}
            {Math.round(item.weaponStats.balance * 100)}% · Critical{' '}
            {Math.round(item.weaponStats.critical * 100)}%
          </Text>
        ) : item.stat ? (
          <Text className="text-foreground" style={menu.body}>
            +{item.power} {item.stat}
          </Text>
        ) : null}
        {item.protection || item.magicDefense || item.magicProtection ? (
          <Text className="text-foreground" style={menu.body}>
            Protection {item.protection} · Magic defense {item.magicDefense} · Magic protection{' '}
            {item.magicProtection}
          </Text>
        ) : null}
        {Object.entries(item.statBonuses ?? {}).map(([stat, bonus]) => (
          <Text key={stat} className="text-foreground" style={menu.body}>
            {enchantStatLabel[stat as keyof typeof enchantStatLabel] ?? stat}:{' '}
            {bonus >= 0 ? '+' : ''}
            {bonus}
          </Text>
        ))}
        {'weaponId' in row.reference ? (
          <>
            <Text className="text-foreground" style={menu.body}>
              {row.durability} / {item.maxDurability} durability
            </Text>
            <Text className="text-muted" style={menu.body}>
              {row.durability === 0
                ? 'Broken: supplies no combat bonuses. Repair this copy at the town blacksmith.'
                : 'Physical hits wear this copy once per action. Misses and spells do not wear it.'}
            </Text>
          </>
        ) : null}
        {recovery ? (
          <>
            <Text className="text-foreground" style={menu.body}>
              Current recovery: +{recovery.amount}{' '}
              {item.restores === 'health' ? 'HP' : item.restores === 'mana' ? 'mana' : 'stamina'}
              {recovery.staminaBonus ? ` · +${recovery.staminaBonus} stamina` : ''}
              {recovery.fullnessAfter > resource.fullness
                ? ` · +${Math.round((recovery.fullnessAfter - resource.fullness) * 10) / 10}% fullness`
                : ''}
            </Text>
            <Text className="text-muted" style={menu.body}>
              {item.battleUsable
                ? 'Usable in exploration and from the combat Items hotbar.'
                : 'Food is usable during exploration only.'}
              {item.restores === 'health'
                ? ' Healing respects wounds and does not remove them.'
                : ''}
            </Text>
            {recovery.amount === 0 &&
            recovery.staminaBonus === 0 &&
            recovery.fullnessAfter === resource.fullness ? (
              <DungeonNotice
                status="accent"
                message="Your resources are already at their recovery limits. Using this item still consumes one copy."
              />
            ) : null}
            <DungeonButton
              label={`Use ${item.name}`}
              disabled={disabled || row.quantity < 1}
              onPress={() =>
                dispatch({
                  type: 'USE_ITEM',
                  sourceId: 'player',
                  targetId: 'player',
                  itemId: item.id,
                })
              }
            />
          </>
        ) : null}
        {item.kind === 'consumable' && !recovery ? (
          <Text className="text-muted" style={menu.body}>
            Consumables cannot revive you. Return to the journey for defeat recovery.
          </Text>
        ) : null}
        {item.kind === 'consumable' && item.battleUsable ? (
          <DungeonButton
            label={
              hero.itemHotbar.includes(item.id) ? 'Remove from Items hotbar' : 'Add to Items hotbar'
            }
            disabled={hotbarDisabled || (!hero.itemHotbar.includes(item.id) && row.quantity < 1)}
            onPress={() => {
              void host.progress({
                type: 'SET_ITEM_HOTBAR',
                itemId: item.id,
                assigned: !hero.itemHotbar.includes(item.id),
              });
            }}
          />
        ) : null}
        {item.kind === 'ammunition' ? (
          <>
            <Text className="text-muted" style={menu.body}>
              Secondary hand · {row.quantity} arrows remaining. Each shot consumes one arrow, even
              on a miss.
              {!hasBow ? ' Equip a bow in the main hand first.' : ''}
            </Text>
            <DungeonButton
              label={`${row.equipped ? 'Unequip' : 'Equip'} arrows · Secondary hand`}
              selected={row.equipped}
              disabled={
                disabled || hotbarDisabled || (!row.equipped && (!hasBow || row.quantity < 1))
              }
              onPress={() => {
                if (row.equipped) dispatch({ type: 'UNEQUIP_ITEM', slot: 'secondaryHand' });
                else void host.progress({ type: 'EQUIP_AMMUNITION', itemId: item.id });
              }}
            />
          </>
        ) : null}
        {droppable > 1 ? (
          <View className="flex-row items-center gap-3">
            <DungeonButton
              label="−"
              accessibilityLabel={`Drop fewer ${item.name}`}
              disabled={disabled || count <= 1}
              onPress={() => setDropQuantity(count - 1)}
            />
            <Text className="text-foreground" style={menu.body}>
              ×{count}
            </Text>
            <DungeonButton
              label="+"
              accessibilityLabel={`Drop more ${item.name}`}
              disabled={disabled || count >= droppable}
              onPress={() => setDropQuantity(count + 1)}
            />
            <DungeonButton
              label="All"
              accessibilityLabel={`Drop all ${item.name}`}
              disabled={disabled}
              onPress={() => setDropQuantity(droppable)}
            />
          </View>
        ) : null}
        <DungeonButton
          label="Drop"
          detail={`Remove ${count} ${count === 1 ? 'copy' : 'copies'} from your inventory`}
          disabled={disabled || hotbarDisabled || !droppable}
          onPress={() => {
            void host.progress({ type: 'DROP_ITEM', item: row.reference, quantity: count });
          }}
        />
        {row.equipped || equipment?.locked ? (
          <Text className="text-muted" style={menu.body}>
            {row.equipped
              ? item.kind === 'ammunition'
                ? 'Unequip this stack before dropping it.'
                : 'Unequip this copy before dropping it.'
              : 'Unlock this copy before dropping it.'}
          </Text>
        ) : null}
        {item.kind === 'incompleteBook' ? (
          <Text className="text-muted" style={menu.body}>
            Dropping this unfinished manual also discards its inserted pages.
          </Text>
        ) : null}
        {['weapon', 'armor'].includes(item.kind) ? (
          <DungeonButton
            label={`${row.equipped ? 'Unequip' : 'Equip'} ${item.name}${'weaponId' in row.reference ? ` · Copy ${row.reference.weaponId.slice(7)}` : ''}`}
            selected={row.equipped}
            disabled={disabled}
            onPress={() => {
              if (row.equipped) dispatch({ type: 'UNEQUIP_ITEM', slot });
              else if ('weaponId' in row.reference)
                dispatch({ type: 'EQUIP_WEAPON', weaponId: row.reference.weaponId });
              else if ('armorId' in row.reference)
                dispatch({ type: 'EQUIP_ARMOR', armorId: row.reference.armorId });
            }}
          />
        ) : null}
        {equipment ? (
          <>
            <EquipmentEnchants equipment={equipment} facts={hero} content={session.content} />
            <Text className="text-muted" style={menu.body}>
              Saved values stay on this copy. Conditions use your level, talent and learned ranks.
              Bonuses apply while equipped.
            </Text>
            <DungeonButton
              label={equipment.locked ? 'Unlock this equipment' : 'Lock this equipment'}
              disabled={disabled}
              onPress={() => {
                if (!('itemId' in row.reference))
                  void host.progress({
                    type: 'LOCK_EQUIPMENT',
                    target: row.reference,
                    locked: !equipment.locked,
                  });
              }}
            />
            <Text className="text-muted" style={menu.body}>
              {equipment.locked
                ? 'Locked: cannot be dropped, sold, offered, enchanted or burned. You can still equip it.'
                : 'Visit the town blacksmith to apply enchants or burn this copy for scrolls.'}
            </Text>
          </>
        ) : null}
        {item.kind === 'titleCoupon' ? (
          <>
            <DungeonButton
              label={
                hero.earnedTitles.includes(item.titleId!)
                  ? 'Title already earned · coupon kept'
                  : 'Redeem title coupon'
              }
              disabled={disabled || !town || hero.earnedTitles.includes(item.titleId!)}
              onPress={() => {
                void host.progress({ type: 'UNLOCK_TITLE_COUPON', itemId: item.id });
              }}
            />
            {!town ? (
              <Text className="text-muted" style={menu.body}>
                Redeem title coupons in town.
              </Text>
            ) : null}
            <DungeonButton
              label="View title collection"
              onPress={() => router.navigate(gameHref(characterId, 'titles'))}
            />
          </>
        ) : null}
        {item.kind === 'skillBook' ? (
          <>
            <DungeonButton
              label={
                hero.learnedSkills[item.skillId!] ? 'Skill already learned' : `Read ${item.name}`
              }
              disabled={disabled || !town || !!hero.learnedSkills[item.skillId!]}
              onPress={() => {
                void host.progress({ type: 'READ_SKILL_BOOK', itemId: item.id });
              }}
            />
            {!town ? (
              <Text className="text-muted" style={menu.body}>
                Return to town to read skill books.
              </Text>
            ) : null}
          </>
        ) : null}
        {['skillPage', 'incompleteBook', 'skillBook'].includes(item.kind) ? (
          <DungeonButton label="View skill and book collection" onPress={openJournal} />
        ) : null}
        <Text className="text-muted" style={menu.body}>
          {item.kind === 'titleCoupon'
            ? 'This quest gift does not expire and cannot be sold or offered. Redeem it in town.'
            : 'Buy, sell and repair through a nearby town service.'}
        </Text>
      </View>
      {needs.length ? (
        <DungeonCard>
          <Text className="text-accent" style={menu.heading}>
            Quest supplies
          </Text>
          {needs.map(({ quest, objective, count }) => (
            <View key={`${quest.id}/${objective.id}`} className="gap-1">
              <Text className="text-foreground" style={menu.body}>
                {quest.name} · {count}/{objective.target} {item.name}
              </Text>
              <Text className="text-muted" style={menu.body}>
                {objective.kind === 'deliverItem'
                  ? `Deliver to ${npcLabel(session.content, quest.claimNpc)}. `
                  : ''}
                {Math.max(0, objective.target - count)} more needed.
              </Text>
            </View>
          ))}
          <Text className="text-muted" style={menu.body}>
            These copies stay usable. Using, dropping, selling or offering them can make the quest
            unfinished again.
          </Text>
          <DungeonButton
            label="View quest journal"
            onPress={() => router.navigate(gameHref(characterId, 'quests'))}
          />
        </DungeonCard>
      ) : null}
      {comparison ? (
        <DungeonCard>
          <Text className="text-accent" style={menu.heading}>
            {row.equipped ? 'After unequipping' : 'After equipping'}
          </Text>
          <Text className="text-muted" style={menu.body}>
            Physical damage: {comparison.before.combatant.minDamage}–
            {comparison.before.combatant.maxDamage} → {comparison.after.combatant.minDamage}–
            {comparison.after.combatant.maxDamage}
          </Text>
          <Text className="text-muted" style={menu.body}>
            Defense: {comparison.before.combatant.defense} → {comparison.after.combatant.defense} ·
            Protection: {comparison.before.combatant.protection} →{' '}
            {comparison.after.combatant.protection}
          </Text>
          <Text className="text-muted" style={menu.body}>
            Balance: {Math.round((comparison.before.combatant.balance ?? 0) * 1000) / 10}% →{' '}
            {Math.round((comparison.after.combatant.balance ?? 0) * 1000) / 10}%
          </Text>
          <Text className="text-muted" style={menu.body}>
            Changing equipment does not restore resources.
          </Text>
        </DungeonCard>
      ) : null}
    </View>
  );
}
