import { itemCount, rollLoot, type HeroSnapshot } from '../engine/rpg/Character';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import type { GameRandom } from '../engine/Random';

export interface VictoryLoot {
  gold: number;
  experience: number;
  items: { itemId: string; quantity: number; collectable: number }[];
}

/** Roll the whole encounter once, including a guaranteed small gold reward. */
export function rollVictoryLoot(
  enemyIds: readonly string[],
  hero: HeroSnapshot,
  content: ContentRegistry,
  random: GameRandom,
): VictoryLoot {
  let gold = 0,
    experience = 0;
  const items = new Map<string, number>();
  for (const enemyId of enemyIds) {
    const drop = rollLoot(enemyId, content, random);
    gold += drop.gold;
    experience += drop.experience;
    for (const item of drop.items)
      items.set(item.itemId, (items.get(item.itemId) ?? 0) + item.quantity);
  }
  return {
    gold: Math.max(5, gold),
    experience,
    items: [...items].map(([itemId, quantity]) => {
      const item = content.item(itemId);
      const capacity =
        item.kind === 'incompleteBook'
          ? hero.bookCollections[item.recipeId!]?.completed
            ? 0
            : 1 - itemCount(hero, itemId)
          : 999 - itemCount(hero, itemId);
      return { itemId, quantity, collectable: Math.max(0, Math.min(quantity, capacity)) };
    }),
  };
}

/** Only offered item IDs may be selected; gold and XP accompany every victory. */
export function selectedVictoryItems(loot: VictoryLoot, selectedIds?: readonly string[]) {
  const ids =
    selectedIds ?? loot.items.filter((item) => item.collectable > 0).map((item) => item.itemId);
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !loot.items.some((item) => item.itemId === id && item.collectable > 0))
  ) {
    throw new Error('Choose only available victory loot');
  }
  return loot.items.filter((item) => ids.includes(item.itemId));
}
