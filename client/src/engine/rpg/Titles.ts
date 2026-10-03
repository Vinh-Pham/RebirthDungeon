import type { TitleCondition, TitleDefinition } from '../../data/schemas/titles';
import { SKILL_RANKS } from '../../data/schemas/skillRank';
import type { ContentRegistry } from '../data/ContentRegistry';
import { cloneData } from '../cloneData';
import { produceState, readPlain, type Draft } from '../immutableState';
import { calculateCharacterStats } from './Stats';
import {
  clampHeroResources,
  consumeItem,
  heroStats,
  itemCount,
  type Hero,
  type HeroSnapshot,
} from './Character';
import type { EnchantContribution } from './EnchantEffects';

export type TitleSlot = 'first' | 'second';
export function titleState(hero: HeroSnapshot, id: string) {
  return hero.earnedTitles.includes(id)
    ? 'Earned'
    : hero.titleCollection.discovered.includes(id)
      ? 'Known'
      : 'Unknown';
}
export function titleEligible(hero: HeroSnapshot, title: Pick<TitleDefinition, 'eligibility'>) {
  const requirement = title.eligibility;
  return (
    !requirement ||
    (!!hero.learnedSkills[requirement.skillId] &&
      SKILL_RANKS.indexOf(hero.learnedSkills[requirement.skillId].rank) >=
        SKILL_RANKS.indexOf(requirement.rank))
  );
}
/** Progression-only basis excludes equipment, titles, enchantments and temporary effects. */
export function titleConditionProgress(
  hero: HeroSnapshot,
  c: TitleCondition,
  content: ContentRegistry,
): { met: boolean; text: string } {
  const evidence = hero.titleCollection.evidence;
  const count = (key: string, target: number, label: string) => ({
    met: (evidence[key] ?? 0) >= target,
    text: `${label}: ${Math.min(target, evidence[key] ?? 0)}/${target}`,
  });
  if (c.kind === 'all' || c.kind === 'any') {
    const children = c.conditions.map((child) => titleConditionProgress(hero, child, content));
    return {
      met: c.kind === 'all' ? children.every((p) => p.met) : children.some((p) => p.met),
      text: `(${children.map((p) => p.text).join(c.kind === 'all' ? ' AND ' : ' OR ')})`,
    };
  }
  if (c.kind === 'level')
    return {
      met: hero.level >= c.minimum,
      text: `Reach level ${c.minimum}: ${hero.level}/${c.minimum}`,
    };
  if (c.kind === 'attribute') {
    const stats = calculateCharacterStats(
      {
        classId: hero.classId,
        level: hero.level,
        growthTalent: hero.growthTalent,
        learnedSkills: hero.learnedSkills,
        effects: [],
      },
      content,
    );
    return {
      met: stats.base[c.attribute] >= c.minimum,
      text: `Progression ${c.attribute} ≥ ${c.minimum}: ${stats.base[c.attribute]} (gear and titles excluded)`,
    };
  }
  if (c.kind === 'skill')
    return {
      met: titleEligible(hero, { eligibility: c }),
      text: `${content.skill(c.skillId).name} Rank ${c.rank} or better`,
    };
  if (c.kind === 'questKnown' || c.kind === 'questClaimed')
    return {
      met:
        c.kind === 'questKnown'
          ? !!hero.quests[c.questId]
          : hero.quests[c.questId]?.status === 'completed',
      text: `${c.kind === 'questKnown' ? 'Discover' : 'Claim the final reward of'} ${content.data.quests.find((q) => q.id === c.questId)?.name}`,
    };
  if (c.kind === 'item')
    return { met: itemCount(hero, c.itemId) > 0, text: `Obtain ${content.item(c.itemId).name}` };
  const dungeonName =
    'dungeonId' in c ? content.data.dungeons.find((d) => d.id === c.dungeonId)?.name : '';
  if (c.kind === 'enteredDungeon')
    return count(`entered/${c.dungeonId}`, 1, `Enter ${dungeonName}`);
  if (c.kind === 'clearDungeon')
    return count(`clear/${c.dungeonId}`, 1, `Claim final treasure and exit ${dungeonName}`);
  if (c.kind === 'encounteredBoss')
    return count(
      `guardian/${c.dungeonId}/${c.enemyId}`,
      1,
      `Encounter ${content.data.enemies.find((e) => e.id === c.enemyId)?.name} in ${dungeonName}`,
    );
  if (c.kind === 'bossVictory')
    return count(
      `boss/${c.dungeonId}/${c.enemyId}`,
      1,
      `Defeat ${content.data.enemies.find((e) => e.id === c.enemyId)?.name} in ${dungeonName}`,
    );
  if (c.kind === 'encounter')
    return count(
      `encounter/${c.mapId}/${c.allowDefeat ? 'completed' : 'victory'}${c.flawless ? '/flawless' : ''}`,
      c.minimum,
      `${c.allowDefeat ? 'Complete (victory or defeat)' : 'Win'} ${content.data.maps.find((m) => m.id === c.mapId)?.name}${c.flawless ? ' without taking damage' : ''}`,
    );
  throw new Error('Unsupported title condition');
}
export function awardTitle(hero: Hero, id: string, source: string, content: ContentRegistry) {
  if (!content.data.titles.some((t) => t.id === id)) throw new Error('Unknown title');
  if (hero.earnedTitles.includes(id)) return false;
  hero.earnedTitles.push(id);
  hero.earnedTitles.sort();
  if (!hero.titleCollection.discovered.includes(id)) hero.titleCollection.discovered.push(id);
  hero.titleCollection.records[id] = { source };
  return true;
}
/** Called only at saved progression/result boundaries, or by a saved load reconciliation. */
export function reconcileTitles(
  hero: Hero,
  content: ContentRegistry,
  source: string,
  allowAwards = true,
) {
  const awarded: string[] = [];
  // These predicates depend on progression facts, not awards made by this loop.
  const facts = readPlain(hero);
  for (const title of [...content.data.titles].sort((a, b) => a.id.localeCompare(b.id))) {
    const knownBefore = titleState(hero, title.id) !== 'Unknown';
    if (!knownBefore && title.hint && titleConditionProgress(facts, title.hint, content).met)
      hero.titleCollection.discovered.push(title.id);
    if (
      allowAwards &&
      !hero.earnedTitles.includes(title.id) &&
      title.award &&
      (!title.discoveryFirst || knownBefore) &&
      titleConditionProgress(facts, title.award, content).met &&
      awardTitle(hero, title.id, source, content)
    )
      awarded.push(title.id);
  }
  // A future reset can make an earned selection ineligible, but never erases ownership.
  for (const slot of ['first', 'second'] as const) {
    const id = hero.titleCollection.selected[slot],
      title = content.data.titles.find((t) => t.id === id);
    if (allowAwards && title && !titleEligible(hero, title))
      delete hero.titleCollection.selected[slot];
  }
  clampHeroResources(hero, content);
  return awarded;
}
export function recordTitleEvidence(hero: Hero, key: string) {
  hero.titleCollection.evidence[key] = Math.min(
    1000000,
    (hero.titleCollection.evidence[key] ?? 0) + 1,
  );
}
export function selectedTitleEffects(
  hero: HeroSnapshot,
  content: ContentRegistry,
): EnchantContribution[] {
  return (['first', 'second'] as const).flatMap((slot) => {
    const id = hero.titleCollection.selected[slot],
      title = content.data.titles.find((t) => t.id === id);
    if (
      !title ||
      title.slot !== slot ||
      !hero.earnedTitles.includes(title.id) ||
      !titleEligible(hero, title)
    )
      return [];
    return title.effects.map((e) => ({
      ...e,
      sourceId: `title/${slot}/${title.id}/${e.stat}`,
      name: title.name,
      active: true,
      condition: '',
    }));
  });
}
export function titleSelectionProblem(
  hero: HeroSnapshot,
  slot: TitleSlot,
  id: string | undefined,
  content: ContentRegistry,
) {
  if (!id) return undefined;
  const title = content.data.titles.find((t) => t.id === id);
  if (!title) return 'This title definition is unavailable. Its achievement record is preserved.';
  if (title.slot !== slot) return `This is a ${title.slot === 'first' ? 'First' : 'Second'} Title.`;
  if (!hero.earnedTitles.includes(id)) return 'Earn this title before selecting it.';
  if (!titleEligible(hero, title))
    return 'The required learned skill rank is not currently eligible.';
}
export function selectTitleDraft(
  hero: Draft<Hero>,
  slot: TitleSlot,
  id: string | undefined,
  content: ContentRegistry,
) {
  const problem = titleSelectionProblem(hero, slot, id, content);
  if (problem) throw new Error(problem);
  if (id) hero.titleCollection.selected[slot] = id;
  else delete hero.titleCollection.selected[slot];
  clampHeroResources(hero, content);
}
export function selectTitle(
  hero: HeroSnapshot,
  slot: TitleSlot,
  id: string | undefined,
  content: ContentRegistry,
): HeroSnapshot {
  return produceState(hero, (draft) => selectTitleDraft(draft, slot, id, content));
}
export function previewTitle(
  hero: HeroSnapshot,
  slot: TitleSlot,
  id: string | undefined,
  content: ContentRegistry,
) {
  const candidate = selectTitle(Object.isFrozen(hero) ? hero : cloneData(hero), slot, id, content);
  return {
    before: heroStats(hero, content),
    after: heroStats(candidate, content),
    pools: {
      health: candidate.health,
      mana: candidate.mana,
      stamina: candidate.stamina,
      wounds: candidate.wounds,
    },
  };
}
export function unlockTitleCouponDraft(
  hero: Draft<Hero>,
  itemId: string,
  content: ContentRegistry,
) {
  const item = content.item(itemId),
    title = content.data.titles.find((t) => t.id === item.titleId);
  if (item.kind !== 'titleCoupon' || !title || hero.earnedTitles.includes(title.id))
    throw new Error('Invalid coupon or title already earned. The coupon was kept.');
  consumeItem(hero.inventory, itemId);
  awardTitle(hero, title.id, `coupon/${itemId}/once`, content);
}
export function unlockTitleCoupon(
  hero: HeroSnapshot,
  itemId: string,
  content: ContentRegistry,
): HeroSnapshot {
  return produceState(hero, (draft) => unlockTitleCouponDraft(draft, itemId, content));
}
export function validateTitleProgression(hero: HeroSnapshot, content: ContentRegistry) {
  const { discovered, records, selected } = hero.titleCollection;
  if (
    new Set(discovered).size !== discovered.length ||
    new Set(hero.earnedTitles).size !== hero.earnedTitles.length ||
    Object.keys(records).some((id) => !hero.earnedTitles.includes(id)) ||
    hero.earnedTitles.some((id) => !records[id] || !discovered.includes(id))
  )
    throw new Error('Invalid title collection');
  for (const slot of ['first', 'second'] as const) {
    const id = selected[slot],
      title = content.data.titles.find((t) => t.id === id);
    // Missing definitions retain identity, but supply no effects and cannot be selected anew.
    if (id && (!hero.earnedTitles.includes(id) || (title && title.slot !== slot)))
      throw new Error('Invalid title selection');
  }
}
/** Attempt evidence has no saved side effects until the matching encounter result commits. */
export class EncounterTitles {
  private damaged = false;
  constructor(
    readonly encounterId: string,
    private eligible: boolean,
  ) {}
  damage(targetId: string, amount: number) {
    if (targetId === 'player' && amount > 0) this.damaged = true;
  }
  snapshot() {
    return { encounterId: this.encounterId, eligible: this.eligible, flawless: !this.damaged };
  }
}
export function mergeTitleEncounter(
  hero: Hero,
  ledger: ReturnType<EncounterTitles['snapshot']>,
  result: 'victory' | 'defeat',
  mapId: string,
  content: ContentRegistry,
  guardian?: { dungeonId: string; enemyId: string },
) {
  if (!ledger.eligible) return;
  const authored = content.data.maps.some((m) => m.id === mapId);
  if (authored) recordTitleEvidence(hero, `encounter/${mapId}/completed`);
  if (authored && ledger.flawless)
    recordTitleEvidence(hero, `encounter/${mapId}/completed/flawless`);
  if (result === 'victory') {
    if (authored) recordTitleEvidence(hero, `encounter/${mapId}/victory`);
    if (authored && ledger.flawless)
      recordTitleEvidence(hero, `encounter/${mapId}/victory/flawless`);
    if (guardian) recordTitleEvidence(hero, `boss/${guardian.dungeonId}/${guardian.enemyId}`);
  }
}
