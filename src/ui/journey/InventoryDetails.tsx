import EquipmentEnchants from './EquipmentEnchants';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import type { GameCommand } from '../../engine/commands';
import { heroStats, ownedEquipment, previewEquipment, type Hero } from '../../engine/rpg/Character';
import { consumableRecovery } from '../../engine/rpg/Consumables';
import type { CharacterReview } from '../../game/BattleSession';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonNotice } from '../shared/DungeonUI';
import { inventoryRowLabel, type InventoryRow } from './inventoryRows';
import { questItemNeeds } from '../../engine/rpg/Quests';
import { npcLabel } from '../quests/questLabels';

export default function InventoryDetails({ row, hero, host, session, review, disabled, town, dispatch, back }: {
  row: InventoryRow; hero: Hero; host: JourneyHost; session: JourneySession; review?: CharacterReview;
  disabled: boolean; town: boolean; dispatch(command: GameCommand): void; back(): void;
}) {
  const { profile } = useCharacterGame();
  const item = row.item;
  const equipment = 'itemId' in row.reference ? undefined : ownedEquipment(hero, row.reference);
  const effects = session.getSnapshot().state.dungeon?.effects;
  const stats = review?.stats ?? heroStats(hero, session.content, effects);
  const resource = { health: { current: review?.health ?? hero.health, max: stats.maxHealth }, mana: { current: review?.mana ?? hero.mana, max: stats.maxMana }, stamina: { current: review?.stamina ?? hero.stamina, max: stats.maxStamina }, wounds: review?.wounds ?? hero.wounds, fullness: review?.fullness ?? hero.fullness };
  const recovery = item.kind === 'consumable' && resource.health.current > 0 ? consumableRecovery(item, resource) : undefined;
  const slot = item.kind === 'weapon' ? 'weapon' : 'armor';
  const comparison = !review && ['weapon', 'armor'].includes(item.kind) ? previewEquipment(hero, row.equipped ? { slot } : row.reference as Exclude<typeof row.reference, { itemId: string }>, session.content, effects) : undefined;
  const openJournal = () => router.navigate({ pathname: '/game/[characterId]/skills', params: { characterId: profile.id } });
  const needs = questItemNeeds(hero, session.content, item.id);
  return <View className="gap-3">
    <DungeonButton label="Back to pack" onPress={back} />
    <DungeonCard>
      <Text className="text-accent" accessibilityRole="header" style={menu.heading}>{inventoryRowLabel(row)}</Text>
      <Text className="text-muted" style={menu.body}>{item.description}</Text>
      <Text className="text-muted" style={menu.body}>Character pack · {equipment ? 'Individually owned equipment' : `${row.quantity} / ${item.kind === 'incompleteBook' ? 1 : 999} owned${row.equipped ? ' · One copy assigned to armor' : ''}`}</Text>
      {'weaponId' in row.reference ? <>
        <Text className="text-foreground" style={menu.body}>{row.durability} / {item.maxDurability} durability</Text>
        <Text className="text-muted" style={menu.body}>{row.durability === 0 ? 'Broken: supplies no combat bonuses. Repair this copy at the town blacksmith.' : 'Physical hits wear this copy once per action. Misses and spells do not wear it.'}</Text>
      </> : null}
      {recovery ? <>
        <Text className="text-foreground" style={menu.body}>Current recovery: +{recovery.amount} {item.restores === 'health' ? 'HP' : item.restores === 'mana' ? 'mana' : 'stamina'}{recovery.staminaBonus ? ` · +${recovery.staminaBonus} stamina` : ''}{recovery.fullnessAfter > resource.fullness ? ` · +${Math.round((recovery.fullnessAfter - resource.fullness) * 10) / 10}% fullness` : ''}</Text>
        <Text className="text-muted" style={menu.body}>{item.battleUsable ? 'Usable in exploration and through the battle Item menu.' : 'Food is usable during exploration only.'}{item.restores === 'health' ? ' Healing respects wounds and does not remove them.' : ''}</Text>
        {recovery.amount === 0 && recovery.staminaBonus === 0 && recovery.fullnessAfter === resource.fullness ? <DungeonNotice status="accent" message="Your resources are already at their recovery limits. Using this item still consumes one copy." /> : null}
        <DungeonButton label={`Use ${item.name}`} disabled={disabled} onPress={() => dispatch({ type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: item.id })} />
      </> : null}
      {item.kind === 'consumable' && !recovery ? <Text className="text-muted" style={menu.body}>Consumables cannot revive you. Return to the journey for defeat recovery.</Text> : null}
      {['weapon', 'armor'].includes(item.kind) ? <DungeonButton label={`${row.equipped ? 'Unequip' : 'Equip'} ${item.name}${'weaponId' in row.reference ? ` · Copy ${row.reference.weaponId.slice(7)}` : ''}`} selected={row.equipped} disabled={disabled}
        onPress={() => { if (row.equipped) dispatch({ type: 'UNEQUIP_ITEM', slot }); else if ('weaponId' in row.reference) dispatch({ type: 'EQUIP_WEAPON', weaponId: row.reference.weaponId }); else if ('armorId' in row.reference) dispatch({ type: 'EQUIP_ARMOR', armorId: row.reference.armorId }); }} /> : null}
      {equipment ? <>
        <EquipmentEnchants equipment={equipment} facts={hero} content={session.content} />
        <Text className="text-muted" style={menu.body}>Saved values stay on this copy. Conditions use your level, talent and learned ranks. Bonuses apply while equipped.</Text>
        <DungeonButton label={equipment.locked ? 'Unlock this equipment' : 'Lock this equipment'} disabled={disabled}
          onPress={() => { if (!('itemId' in row.reference)) void host.progress({ type: 'LOCK_EQUIPMENT', target: row.reference, locked: !equipment.locked }); }} />
        <Text className="text-muted" style={menu.body}>{equipment.locked ? 'Locked: cannot be sold, offered, enchanted or burned. You can still equip it.' : 'Visit the town blacksmith to apply enchants or burn this copy for scrolls.'}</Text>
      </> : null}
      {item.kind === 'titleCoupon' ? <>
        <DungeonButton label={hero.earnedTitles.includes(item.titleId!) ? 'Title already earned · coupon kept' : 'Redeem title coupon'} disabled={disabled || !town || hero.earnedTitles.includes(item.titleId!)} onPress={() => { void host.progress({ type: 'UNLOCK_TITLE_COUPON', itemId: item.id }); }} />
        {!town ? <Text className="text-muted" style={menu.body}>Redeem title coupons in town.</Text> : null}
        <DungeonButton label="View title collection" onPress={() => router.navigate({ pathname: '/game/[characterId]/titles', params: { characterId: profile.id } })} />
      </> : null}
      {item.kind === 'skillBook'   ? <>
        <DungeonButton label={hero.learnedSkills[item.skillId!] ? 'Skill already learned' : `Read ${item.name}`} disabled={disabled || !town || !!hero.learnedSkills[item.skillId!]}
          onPress={() => { void host.progress({ type: 'READ_SKILL_BOOK', itemId: item.id }); }} />
        {!town ? <Text className="text-muted" style={menu.body}>Return to town to read skill books.</Text> : null}
      </> : null}
      {['skillPage', 'incompleteBook', 'skillBook'].includes(item.kind) ? <DungeonButton label="View skill and book collection" onPress={openJournal} /> : null}
      <Text className="text-muted" style={menu.body}>{item.kind === 'titleCoupon' ? 'This quest gift does not expire and cannot be sold or offered. Redeem it in town.' : 'Buy, sell and repair through a nearby town service.'}</Text>
    </DungeonCard>
    {needs.length ? <DungeonCard>
      <Text className="text-accent" style={menu.heading}>Quest supplies</Text>
      {needs.map(({ quest, objective, count }) => <View key={`${quest.id}/${objective.id}`} className="gap-1">
        <Text className="text-foreground" style={menu.body}>{quest.name} · {count}/{objective.target} {item.name}</Text>
        <Text className="text-muted" style={menu.body}>{objective.kind === 'deliverItem' ? `Deliver to ${npcLabel(session.content, quest.claimNpc)}. ` : ''}{Math.max(0, objective.target - count)} more needed.</Text>
      </View>)}
      <Text className="text-muted" style={menu.body}>These copies stay usable. Using, selling or offering them can make the quest unfinished again.</Text>
      <DungeonButton label="View quest journal" onPress={() => router.navigate({ pathname: '/game/[characterId]/quests', params: { characterId: profile.id } })} />
    </DungeonCard> : null}
    {comparison ? <DungeonCard>
      <Text className="text-accent" style={menu.heading}>{row.equipped ? 'After unequipping' : 'After equipping'}</Text>
      <Text className="text-muted" style={menu.body}>Physical damage: {comparison.before.combatant.minDamage}–{comparison.before.combatant.maxDamage} → {comparison.after.combatant.minDamage}–{comparison.after.combatant.maxDamage}</Text>
      <Text className="text-muted" style={menu.body}>Defense: {comparison.before.combatant.defense} → {comparison.after.combatant.defense} · Protection: {comparison.before.combatant.protection} → {comparison.after.combatant.protection}</Text>
      <Text className="text-muted" style={menu.body}>Balance: {Math.round((comparison.before.combatant.balance ?? 0) * 1000) / 10}% → {Math.round((comparison.after.combatant.balance ?? 0) * 1000) / 10}%</Text>
      <Text className="text-muted" style={menu.body}>Changing equipment does not restore resources.</Text>
    </DungeonCard> : null}
  </View>;
}
