// Stats delegates starting attributes and growth to Level and the active Talent.
// Sources retrieved with Exa on 2026-11-26.
// https://wiki.mabinogiworld.com/view/Level#Starting_Stats
// https://wiki.mabinogiworld.com/view/Talent
export const startingAttributes = {
  life: 118,
  mana: 98,
  stamina: 113,
  strength: 55,
  intelligence: 48,
  dexterity: 58,
  will: 57,
  luck: 47,
};
export type Attributes = typeof startingAttributes;
export const startingAp = 5;

export const talentBaseBonuses: Partial<Attributes>[] = [
  { strength: 20 }, // Close Combat
  { intelligence: 10, mana: 10 }, // Magic
  { life: 10, will: 10 }, // Adventure
  { life: 5, stamina: 5, dexterity: 10 }, // Archery
  { mana: 10, stamina: 15 }, // Battle Alchemy
  { strength: 5, dexterity: 5, intelligence: 10, luck: 10 }, // Battle Astrology
  { stamina: 20 }, // Carpentry
  { dexterity: 10, luck: 10 }, // Chain Slash
  { stamina: 10, dexterity: 10 }, // Cooking
  { dexterity: 12, will: 12 }, // Fate Astrology
  { intelligence: 10, dexterity: 10 }, // Glyphwrighting
  { strength: 5, intelligence: 5, life: 5, mana: 5, stamina: 10 }, // Gunslinger
  { life: 10, intelligence: 10 }, // Holy Arts
  { life: 5, strength: 15 }, // Lance Combat
  { life: 10, will: 10 }, // Martial Arts
  { stamina: 10, dexterity: 10 }, // Medicine
  { stamina: 10, luck: 10 }, // Mercantile
  { stamina: 15, strength: 10 }, // Music
  { strength: 10, will: 10 }, // Ninja
  { will: 10, luck: 10 }, // Pet Training
  { stamina: 5, strength: 5, dexterity: 10 }, // Puppetry
  { stamina: 10, dexterity: 10 }, // Smithing
  { stamina: 10, dexterity: 10 }, // Tailoring
  { mana: 10, stamina: 15 }, // Transmutation
];

export const talentLevelGrowth: Partial<Attributes>[] = [
  { strength: 0.5 }, // Close Combat
  { intelligence: 0.5 }, // Magic
  { life: 0.25, stamina: 0.25 }, // Adventure
  { dexterity: 0.5 }, // Archery
  { mana: 0.5, stamina: 0.5 }, // Battle Alchemy
  { intelligence: 0.25, luck: 0.25 }, // Battle Astrology
  { stamina: 0.5 }, // Carpentry
  { dexterity: 0.25, luck: 0.25 }, // Chain Slash
  { stamina: 0.25, dexterity: 0.25 }, // Cooking
  {}, // Fate Astrology — source does not provide a bonus table
  { intelligence: 0.25, dexterity: 0.25 }, // Glyphwrighting
  { strength: 0.25, intelligence: 0.25 }, // Gunslinger
  { intelligence: 0.5 }, // Holy Arts
  { strength: 0.5 }, // Lance Combat
  { will: 0.5 }, // Martial Arts
  { stamina: 0.25, luck: 0.25 }, // Medicine
  { luck: 0.5 }, // Mercantile
  { life: 0.25, stamina: 0.25 }, // Music
  { strength: 0.25, will: 0.25 }, // Ninja
  { will: 0.25, luck: 0.25 }, // Pet Training
  { stamina: 0.25, dexterity: 0.25 }, // Puppetry
  { stamina: 0.25, dexterity: 0.25 }, // Smithing
  { stamina: 0.25, dexterity: 0.25 }, // Tailoring
  { mana: 0.5, stamina: 0.5 }, // Transmutation
];

export const talentAgeGrowth: Partial<Attributes>[] = [
  { strength: 2, life: 1 }, // Close Combat
  { intelligence: 2, mana: 1 }, // Magic
  { life: 1, stamina: 1 }, // Adventure
  { stamina: 1, dexterity: 2 }, // Archery
  { mana: 2, stamina: 2 }, // Battle Alchemy
  { intelligence: 1, luck: 1 }, // Battle Astrology
  { stamina: 3 }, // Carpentry
  { dexterity: 1, luck: 1 }, // Chain Slash
  { stamina: 2, dexterity: 1 }, // Cooking
  { dexterity: 1 }, // Fate Astrology
  { intelligence: 1, dexterity: 1 }, // Glyphwrighting
  { strength: 1, intelligence: 1 }, // Gunslinger
  { mana: 1, intelligence: 2 }, // Holy Arts
  { strength: 2 }, // Lance Combat
  { stamina: 1, will: 2 }, // Martial Arts
  { stamina: 2, luck: 1 }, // Medicine
  { luck: 2 }, // Mercantile
  { life: 1, stamina: 1, strength: 1 }, // Music
  { strength: 1, will: 1 }, // Ninja
  { will: 1, luck: 1 }, // Pet Training
  { stamina: 2, dexterity: 1 }, // Puppetry
  { stamina: 2, dexterity: 1, luck: 2 }, // Smithing
  { stamina: 2, dexterity: 1 }, // Tailoring
  { mana: 2, stamina: 2 }, // Transmutation
];
