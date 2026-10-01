import { useRef, useSyncExternalStore } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { heroStats } from '../../engine/rpg/Character';
import { ATTRIBUTE_KEYS, protectionReduction } from '../../engine/rpg/Stats';
import type { CharacterReview } from '../../game/BattleSession';
import type { JourneyHost } from '../../game/JourneyHost';
import type { CompleteCharacter } from '../../persistence/CharacterProfile';
import { TALENT_LABELS } from '../../persistence/CharacterProfile';
import { menu } from './MenuUI';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;
const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;
const number = (value: number) => String(Math.round(value * 10) / 10);
function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return <View style={styles.row}><View style={styles.label}><Text style={styles.rowLabel}>{label}</Text>{note ? <Text style={styles.note}>{note}</Text> : null}</View><Text style={styles.value}>{value}</Text></View>;
}
/** Read-only subscriptions keep battle resources live without touching a campaign checkpoint. */
export function CharacterWindow({ host, profile, close }: { host: JourneyHost; profile: CompleteCharacter; close(): void }) {
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const journey = hosted.session!;
  const campaign = useSyncExternalStore(journey.subscribe, journey.getSnapshot, journey.getSnapshot);
  const battle = useSyncExternalStore(hosted.battle?.subscribe ?? noSubscribe, hosted.battle?.getSnapshot ?? noSnapshot, noSnapshot);
  const hero = campaign.state.hero;
  const weapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
  const review: CharacterReview = battle?.character ?? { stats: heroStats(hero, host.content, campaign.state.dungeon?.effects), health: hero.health, mana: hero.mana, stamina: hero.stamina, wounds: hero.wounds, fullness: hero.fullness, statuses: [],
    weapon: weapon ? { name: host.content.item(weapon.itemId).name, durability: weapon.durability, maxDurability: host.content.item(weapon.itemId).maxDurability! } : undefined };
  const { stats } = review; const combat = stats.combatant;
  const baseCombat = heroStats({ ...hero, equipment: {} }, host.content).combatant;
  const equippedCombat = heroStats(hero, host.content).combatant;
  const signed = (value: number) => `${value >= 0 ? '+' : ''}${number(value)}`;
  const breakdown = (key: 'attack' | 'defense' | 'speed') => `Base ${baseCombat[key]} · Equipment ${signed(equippedCombat[key] - baseCombat[key])} · Effects ${signed(combat[key] - equippedCombat[key])}`;
  const tablet = useWindowDimensions().width >= 700;
  const closeRef = useRef<View>(null);
  return <Modal visible transparent={tablet} animationType="fade" onRequestClose={close} onShow={() => { if (Platform.OS === 'web') closeRef.current?.focus(); }}>
    <View style={[styles.backdrop, !tablet && menu.fill]}><SafeAreaView style={[styles.window, tablet ? styles.tablet : menu.fill]} accessibilityViewIsModal role="dialog" aria-modal accessibilityLabel="Character stats">
      <View style={styles.header}><View style={styles.label}><Text accessibilityRole="header" style={menu.heading}>Character</Text><Text style={styles.note}>{profile.name} · {TALENT_LABELS[hero.growthTalent]} · Level {hero.level} · Age {profile.age}</Text></View>
        <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Close character stats" onPress={close} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>VITALS</Text>
        <Row label="Health" value={`${review.health} / ${stats.maxHealth}`} note={`${stats.maxHealth - review.wounds} recoverable · ${review.wounds} wounds`} />
        <Row label="Mana" value={`${review.mana} / ${stats.maxMana}`} />
        <Row label="Stamina" value={`${review.stamina} / ${stats.maxStamina}`} note={`${Math.floor(stats.maxStamina * review.fullness / 100)} recoverable through rest`} />
        <Row label="Fullness" value={`${number(review.fullness)}%`} />
        <Row label="Experience" value={hero.level === 99 ? 'Maximum level' : `${hero.experience} / ${hero.level * 20}`} />
        <Text style={styles.section}>ATTRIBUTES</Text>
        <Text style={styles.note}>Base includes talent growth and known rank F skills. Equipment is added before the 1,500 attribute cap.</Text>
        {ATTRIBUTE_KEYS.map((key) => <Row key={key} label={key[0].toUpperCase() + key.slice(1)} value={number(stats.effective[key])} note={`Base ${number(stats.base[key])} · Equipment ${stats.equipment[key] >= 0 ? '+' : ''}${number(stats.equipment[key])}`} />)}
        <Text style={styles.section}>COMBAT</Text>
        <Row label="Physical damage" value={`${combat.minDamage}–${combat.maxDamage}`} note={`Base ${baseCombat.minDamage}–${baseCombat.maxDamage} · Equipment ${signed(equippedCombat.minDamage! - baseCombat.minDamage!)}/${signed(equippedCombat.maxDamage! - baseCombat.maxDamage!)} · Effects ${signed(combat.minDamage! - equippedCombat.minDamage!)}/${signed(combat.maxDamage! - equippedCombat.maxDamage!)}`} />
        <Row label="Balance" value={percent(combat.balance ?? 0)} />
        <Row label="Critical rating" value={percent(combat.criticalRating ?? 0)} note="Chance after target protection is capped at 30%" />
        <Row label="Defense" value={number(combat.defense)} note={breakdown('defense')} />
        <Row label="Protection" value={String(combat.protection ?? 0)} note={`${percent(protectionReduction(combat.protection ?? 0))} physical damage reduction`} />
        <Row label="Armor pierce" value={String(combat.armorPierce ?? 0)} />
        <Row label="Injury" value={`${percent(combat.minInjury ?? 0)}–${percent(combat.maxInjury ?? 0)}`} />
        <Row label="Magic attack" value={String(combat.magicAttack ?? 0)} />
        <Row label="Magic balance" value={percent(combat.magicBalance ?? 0)} />
        <Row label="Magic critical rating" value={percent(combat.magicCriticalChance ?? 0)} />
        <Row label="Magic defense" value={String(combat.magicDefense ?? 0)} />
        <Row label="Magic protection" value={String(combat.magicProtection ?? 0)} note={`${percent(protectionReduction(combat.magicProtection ?? 0))} magic damage reduction`} />
        <Row label="Hit chance" value={percent(combat.hitChance ?? 0)} />
        <Row label="Evasion" value={percent(combat.evasion ?? 0)} />
        <Row label="Speed" value={String(combat.speed)} note={breakdown('speed')} />
        <Text style={styles.section}>EQUIPMENT & EFFECTS</Text>
        <Row label="Weapon" value={review.weapon?.name ?? 'Bare hands'} note={review.weapon ? `${review.weapon.durability} / ${review.weapon.maxDurability} durability${review.weapon.durability === 0 ? ' · Broken; repair at the blacksmith' : ''}` : undefined} />
        <Row label="Armor" value={hero.equipment.armor ? host.content.item(hero.equipment.armor).name : 'None'} />
        {stats.modifiers.map((modifier, index) => <View key={`${modifier.name}-${index}`} style={styles.effect}><Text style={styles.rowLabel}>{modifier.name}</Text><Text style={styles.note}>{modifier.description}</Text></View>)}
        {review.statuses.map((status) => <Row key={status.name} label={status.name} value={`${status.turns} turns`} note={`${status.stacks} stacks`} />)}
        {!stats.modifiers.length && !review.statuses.length ? <Text style={styles.note}>No equipment bonuses or active effects.</Text> : null}
        <Text style={styles.footnote}>Inspired by Mabinogi’s stat formulas. Damage uses a seeded triangular roll; age is cosmetic in this adventure.</Text>
      </ScrollView>
    </SafeAreaView></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center' },
  window: { width: '100%', backgroundColor: '#101719' }, tablet: { width: 580, maxHeight: '90%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#53605e' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#344044' },
  label: { flex: 1, gap: 4 }, close: { minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#53605e', borderRadius: 8 }, closeText: { color: '#d0b987', fontWeight: '600' },
  content: { padding: 20, gap: 4 }, section: { color: '#d0b987', fontSize: 11, letterSpacing: 2, marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#263236' },
  rowLabel: { color: '#e4d9c5', fontSize: 14 }, value: { color: '#d0b987', fontSize: 16, fontVariant: ['tabular-nums'], flexShrink: 1 },
  note: { color: '#aab6b5', fontSize: 12, lineHeight: 19 }, effect: { paddingVertical: 8, gap: 4 }, footnote: { color: '#aab6b5', fontSize: 12, lineHeight: 20, marginTop: 24, marginBottom: 12 },
});
