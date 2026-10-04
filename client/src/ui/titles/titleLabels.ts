import type { TitleDefinition } from '../../data/schemas/titles';
import type { HeroFacts } from '../../engine/rpg/Character';
import { titleState } from '../../engine/rpg/Titles';
export const titleStatLabels = {
  strength: 'STR',
  intelligence: 'INT',
  dexterity: 'DEX',
  will: 'WILL',
  luck: 'LUCK',
  maxHealth: 'Max HP',
  maxMana: 'Max MP',
  maxStamina: 'Max SP',
  physicalAttack: 'Physical attack',
  magicAttack: 'Magic attack',
  defense: 'Physical defense',
  protection: 'Protection rating',
  magicDefense: 'Magic defense',
  magicProtection: 'Magic protection rating',
};
export const slotLabel = { first: 'First Title', second: 'Second Title' };
export function visibleTitles(
  hero: Pick<HeroFacts, 'earnedTitles' | 'titleCollection'>,
  definitions: readonly TitleDefinition[],
  search: string,
  slot: 'all' | TitleDefinition['slot'],
  category: 'all' | TitleDefinition['category'],
) {
  const query = search.trim().toLowerCase();
  return definitions
    .filter((t) => {
      const unknown = titleState(hero, t.id) === 'Unknown';
      if (unknown)
        return !query && t.spoiler === 'placeholder' && slot === 'all' && category === 'all';
      return (
        (slot === 'all' || slot === t.slot) &&
        (category === 'all' || category === t.category) &&
        (!query || `${t.name} ${t.description}`.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
