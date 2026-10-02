import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  MAX_LEVEL,
  experienceToNextLevel,
  heroStats,
  heroStatSource,
} from '../../engine/rpg/Character';
import {
  ATTRIBUTE_KEYS,
  characterStatBreakdown,
  protectionReduction,
} from '../../engine/rpg/Stats';
import { TALENT_LABELS } from '../../persistence/CharacterProfile';
import type { CharacterReview } from '../../game/BattleSession';
import type { JourneyHost } from '../../game/JourneyHost';
import type { JourneySession } from '../../game/JourneySession';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;
const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;
const number = (value: number) => String(Math.round(value * 10) / 10);
function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View className="border-border" style={styles.row}>
      <View style={styles.label}>
        <Text className="text-foreground" style={styles.rowLabel}>
          {label}
        </Text>
        {note ? (
          <Text className="text-muted" style={styles.note}>
            {note}
          </Text>
        ) : null}
      </View>
      <Text className="text-accent" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

/** Shared read-only details for the Journey tab and character stats overlay. */
export default function CharacterStatsDetails({
  host,
  session,
}: {
  host: JourneyHost;
  session: JourneySession;
}) {
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const campaign = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const battle = useSyncExternalStore(
    hosted.battle?.subscribe ?? noSubscribe,
    hosted.battle?.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  const hero = campaign.state.hero;
  const weapon = hero.equipment.weapon ? hero.weapons[hero.equipment.weapon] : undefined;
  const review: CharacterReview = battle?.character ?? {
    source: heroStatSource(hero, campaign.state.dungeon?.effects, host.content),
    stats: heroStats(hero, host.content, campaign.state.dungeon?.effects),
    health: hero.health,
    mana: hero.mana,
    stamina: hero.stamina,
    wounds: hero.wounds,
    fullness: hero.fullness,
    statuses: [],
    weapon: weapon
      ? {
          name: host.content.item(weapon.itemId).name,
          durability: weapon.durability,
          maxDurability: host.content.item(weapon.itemId).maxDurability!,
        }
      : undefined,
  };
  const { stats } = review;
  const combat = stats.combatant;
  const {
    base: baseCombat,
    titles: titleCombat,
    equipment: equippedCombat,
    dungeon: dungeonCombat,
  } = characterStatBreakdown(review.source, host.content);
  const signed = (value: number) => `${value >= 0 ? '+' : ''}${number(value)}`;
  const breakdown = (key: 'attack' | 'defense' | 'speed' | 'minDamage' | 'maxDamage') =>
    `Base ${number(baseCombat[key]!)} · Titles ${signed(titleCombat[key]! - baseCombat[key]!)} · Equipment ${signed(equippedCombat[key]! - titleCombat[key]!)} · Dungeon ${signed(dungeonCombat[key]! - equippedCombat[key]!)} · Statuses ${signed(combat[key]! - dungeonCombat[key]!)}`;
  return (
    <View className="gap-1">
      <Text className="text-accent" style={styles.section}>
        PROGRESSION
      </Text>
      <Row label="Level" value={`${hero.level} / ${MAX_LEVEL}`} />
      <Row
        label="Cumulative level"
        value={String(hero.cumulativeLevel)}
        note="Total levels earned across all lives"
      />
      <Row
        label="Growth talent"
        value={TALENT_LABELS[hero.growthTalent]}
        note="Fixed for this character"
      />
      <Row
        label="Experience"
        value={
          hero.level === MAX_LEVEL
            ? 'Maximum level'
            : `${hero.experience} / ${experienceToNextLevel(hero.level)}`
        }
        note="Each earned level grants 1 AP and fully restores resources."
      />
      <Row
        label="Ability points"
        value={String(hero.ap)}
        note="Spend in town after completing skill training"
      />
      <Row label="Gold" value={String(hero.gold)} />
      <Text className="text-accent" style={styles.section}>
        VITALS
      </Text>
      <Row
        label="Health"
        value={`${review.health} / ${stats.maxHealth}`}
        note={`${stats.maxHealth - review.wounds} recoverable · ${review.wounds} wounds`}
      />
      <Row label="Mana" value={`${review.mana} / ${stats.maxMana}`} />
      <Row
        label="Stamina"
        value={`${review.stamina} / ${stats.maxStamina}`}
        note={`${Math.floor((stats.maxStamina * review.fullness) / 100)} recoverable through rest`}
      />
      <Row label="Fullness" value={`${number(review.fullness)}%`} />
      <Text className="text-accent" style={styles.section}>
        ATTRIBUTES
      </Text>
      <Text className="text-muted" style={styles.note}>
        Starting attributes, talent, earned levels and current learned ranks contribute once.
        Effective attributes cap at 1,500.
      </Text>
      {ATTRIBUTE_KEYS.map((key) => (
        <Row
          key={key}
          label={key[0].toUpperCase() + key.slice(1)}
          value={number(stats.effective[key])}
          note={`Starting ${number(stats.attributeSources.starting[key])} · Talent ${signed(stats.attributeSources.talent[key])} · Levels ${signed(stats.attributeSources.levels[key])} · Skills ${signed(stats.attributeSources.skills[key])} · Titles ${signed(stats.attributeSources.titles[key])} · Equipment ${signed(stats.equipment[key])}`}
        />
      ))}
      <Text className="text-accent" style={styles.section}>
        COMBAT
      </Text>
      <Row
        label="Physical damage"
        value={`${combat.minDamage}–${combat.maxDamage}`}
        note={`Minimum: ${breakdown('minDamage')}\nMaximum: ${breakdown('maxDamage')}`}
      />
      <Row label="Balance" value={percent(combat.balance ?? 0)} />
      <Row
        label="Critical rating"
        value={percent(combat.criticalRating ?? 0)}
        note="Chance after target protection is capped at 30%"
      />
      <Row label="Defense" value={number(combat.defense)} note={breakdown('defense')} />
      <Row
        label="Protection"
        value={String(combat.protection ?? 0)}
        note={`${percent(protectionReduction(combat.protection ?? 0))} physical damage reduction`}
      />
      <Row label="Armor pierce" value={String(combat.armorPierce ?? 0)} />
      <Row
        label="Injury"
        value={`${percent(combat.minInjury ?? 0)}–${percent(combat.maxInjury ?? 0)}`}
      />
      <Row label="Magic attack" value={String(combat.magicAttack ?? 0)} />
      <Row label="Magic balance" value={percent(combat.magicBalance ?? 0)} />
      <Row label="Magic critical rating" value={percent(combat.magicCriticalChance ?? 0)} />
      <Row label="Magic defense" value={String(combat.magicDefense ?? 0)} />
      <Row
        label="Magic protection"
        value={String(combat.magicProtection ?? 0)}
        note={`${percent(protectionReduction(combat.magicProtection ?? 0))} magic damage reduction`}
      />
      <Row label="Hit chance" value={percent(combat.hitChance ?? 0)} />
      <Row label="Evasion" value={percent(combat.evasion ?? 0)} />
      <Row
        label="Speed"
        value={String(combat.speed)}
        note={`${breakdown('speed')}\nInitiative order stays fixed during an encounter.`}
      />
      <Text className="text-accent" style={styles.section}>
        EQUIPMENT & EFFECTS
      </Text>
      <Row
        label="Weapon"
        value={review.weapon?.name ?? 'Bare hands'}
        note={
          review.weapon
            ? `${review.weapon.durability} / ${review.weapon.maxDurability} durability${review.weapon.durability === 0 ? ' · Broken; repair at the blacksmith' : ''}`
            : undefined
        }
      />
      <Row
        label="Armor"
        value={
          hero.equipment.armor
            ? host.content.item(hero.armors[hero.equipment.armor].itemId).name
            : 'None'
        }
      />
      {stats.modifiers.map((modifier, index) => (
        <View key={`${modifier.name}-${index}`} style={styles.effect}>
          <Text className="text-foreground" style={styles.rowLabel}>
            {modifier.name}
          </Text>
          <Text className="text-muted" style={styles.note}>
            {modifier.description}
          </Text>
        </View>
      ))}
      {review.statuses.map((status) => (
        <Row
          key={status.name}
          label={status.name}
          value={`${status.turns} ticks`}
          note={`${status.stacks} stacks · expires on the affected actor's turn boundary`}
        />
      ))}
      {!stats.modifiers.length && !review.statuses.length ? (
        <Text className="text-muted" style={styles.note}>
          No equipment bonuses or active effects.
        </Text>
      ) : null}
      <Text className="text-muted" style={styles.footnote}>
        Physical damage uses the displayed range and Balance. Spells use Magic Attack and Magic
        Balance. Protection is a rating; target protection determines final critical chance.
        Starting age does not advance or change growth.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  label: { flex: 1, gap: 4 },
  section: { fontSize: 11, letterSpacing: 2, marginTop: 24, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 14 },
  value: { fontSize: 16, fontVariant: ['tabular-nums'], flexShrink: 1 },
  note: { fontSize: 12, lineHeight: 19 },
  effect: { paddingVertical: 8, gap: 4 },
  footnote: { fontSize: 12, lineHeight: 20, marginTop: 24, marginBottom: 12 },
});
