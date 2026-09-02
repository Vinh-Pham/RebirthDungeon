import {
  buildContentCatalog,
  ContentValidationError,
  type ContentCatalog,
} from '@/domain/content/catalog';

/** A minimal, fully valid content input; individual tests mutate one piece. */
function validInput() {
  return {
    dice: {
      version: 1,
      dice: [{ id: 'dice_d6', name: 'D6', sides: 6 }],
    },
    'status-effects': {
      version: 1,
      statusEffects: [
        {
          id: 'status_poison',
          name: 'Poison',
          kind: 'debuff',
          maxStacks: 5,
          damagePerTurnPerStack: 2,
        },
      ],
    },
    abilities: {
      version: 1,
      abilities: [
        {
          id: 'ability_slash',
          name: 'Slash',
          description: 'Cut.',
          kind: 'attack',
          target: 'enemy',
          diceCost: 1,
          power: 4,
          appliesStatus: { statusId: 'status_poison', stacks: 1 },
        },
      ],
    },
    heroes: {
      version: 1,
      heroes: [
        {
          id: 'hero_knight',
          name: 'Knight',
          maxHp: 30,
          baseAttack: 2,
          baseDefense: 1,
          dice: ['dice_d6'],
          abilities: ['ability_slash'],
        },
      ],
    },
    monsters: {
      version: 1,
      monsters: [
        {
          id: 'monster_slime',
          name: 'Slime',
          hp: 12,
          attack: 2,
          defense: 0,
          dice: ['dice_d6'],
          abilities: ['ability_slash'],
          lootTableId: 'loot_slime',
          resistances: { status_poison: 0.5 },
        },
      ],
    },
    items: {
      version: 1,
      items: [
        {
          kind: 'equipment',
          id: 'item_sword',
          name: 'Sword',
          rarity: 'common',
          value: 10,
          equipment: {
            slot: 'weapon',
            attackBonus: 1,
            defenseBonus: 0,
            maxHpBonus: 0,
          },
        },
      ],
    },
    'loot-tables': {
      version: 1,
      lootTables: [
        {
          id: 'loot_slime',
          name: 'Slime Drops',
          rolls: 1,
          entries: [{ itemId: 'item_sword', weight: 1 }],
        },
      ],
    },
    'rarity-tables': {
      version: 1,
      rarityTables: [
        {
          id: 'rarity_standard',
          name: 'Standard',
          entries: [
            { rarity: 'common', weight: 7 },
            { rarity: 'rare', weight: 3 },
          ],
        },
      ],
    },
    encounters: {
      version: 1,
      encounters: [
        {
          id: 'enc_slime',
          name: 'Slimy Corner',
          monsterIds: ['monster_slime'],
          lootTableId: 'loot_slime',
        },
      ],
    },
    dungeons: {
      version: 1,
      dungeons: [
        {
          id: 'dungeon_cellar',
          name: 'Cellar',
          description: 'Damp.',
          floorCount: 1,
          encountersPerFloor: 1,
          encounterIds: ['enc_slime'],
          bossEncounterId: 'enc_slime',
        },
      ],
    },
    banners: {
      version: 1,
      banners: [
        {
          id: 'banner_standard',
          name: 'Standard',
          kind: 'featured',
          currency: 'gems',
          costPerPull: 100,
          costPerTenPull: 1000,
          rarityTableId: 'rarity_standard',
          featuredHeroId: 'hero_knight',
        },
      ],
    },
    'experience-curves': {
      version: 1,
      experienceCurves: [
        {
          id: 'curve_standard',
          name: 'Standard',
          levels: [
            { level: 1, totalXp: 0 },
            { level: 2, totalXp: 20 },
          ],
        },
      ],
    },
  };
}

function expectProblems(
  input: unknown,
  ...fragments: string[]
): readonly string[] {
  try {
    buildContentCatalog(input as never);
    throw new Error('expected ContentValidationError but validation passed');
  } catch (error) {
    expect(error).toBeInstanceOf(ContentValidationError);
    const problems = (error as ContentValidationError).problems;
    for (const fragment of fragments) {
      expect(problems.some((problem) => problem.includes(fragment))).toBe(true);
    }
    return problems;
  }
}

describe('buildContentCatalog', () => {
  it('accepts a fully consistent catalog and freezes it', () => {
    const catalog: ContentCatalog = buildContentCatalog(validInput());
    expect(catalog.version).toBe(1);
    expect(Object.keys(catalog.heroes)).toEqual(['hero_knight']);
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.heroes)).toBe(true);
    expect(catalog.monsters['monster_slime']?.lootTableId).toBe('loot_slime');
  });

  it('rejects an unsupported content version with an actionable path', () => {
    const input = validInput();
    (input.dice as { version: number }).version = 2;
    expectProblems(input, 'dice.version');
  });

  it('reports missing files', () => {
    const input = validInput();
    delete (input as Record<string, unknown>).banners;
    expectProblems(input, 'banners.json: file is missing');
  });

  it('reports schema violations with field paths', () => {
    const input = validInput();
    (input.monsters as { monsters: { hp: number }[] }).monsters[0].hp = 0;
    expectProblems(input, 'monsters.monsters.0.hp');
  });

  it('reports duplicate ids inside a collection', () => {
    const input = validInput();
    const dice = input.dice as {
      dice: { id: string; name: string; sides: number }[];
    };
    dice.dice.push({ id: 'dice_d6', name: 'D6 again', sides: 6 });
    expectProblems(input, "duplicate id 'dice_d6'");
  });

  it('flags unknown hero dice references', () => {
    const input = validInput();
    const heroes = input.heroes as { heroes: { dice: string[] }[] };
    heroes.heroes[0].dice = ['dice_missing'];
    expectProblems(input, "references unknown dice[0] 'dice_missing'");
  });

  it('flags unknown ability status references', () => {
    const input = validInput();
    const abilities = input.abilities as {
      abilities: { appliesStatus: { statusId: string } }[];
    };
    abilities.abilities[0].appliesStatus.statusId = 'status_missing';
    expectProblems(
      input,
      "references unknown appliesStatus.statusId 'status_missing'",
    );
  });

  it('flags unknown monster resistance keys', () => {
    const input = validInput();
    const monsters = input.monsters as {
      monsters: { resistances: Record<string, number> }[];
    };
    monsters.monsters[0].resistances = { status_ghost: 0.5 };
    expectProblems(input, "references unknown resistances 'status_ghost'");
  });

  it('flags loot entries referencing unknown items', () => {
    const input = validInput();
    const lootTables = input['loot-tables'] as {
      lootTables: { entries: { itemId: string }[] }[];
    };
    lootTables.lootTables[0].entries[0].itemId = 'item_missing';
    expectProblems(
      input,
      "references unknown entries[0].itemId 'item_missing'",
    );
  });

  it('flags duplicate item entries inside one loot table', () => {
    const input = validInput();
    const lootTables = input['loot-tables'] as {
      lootTables: { entries: { itemId: string; weight: number }[] }[];
    };
    lootTables.lootTables[0].entries.push({ itemId: 'item_sword', weight: 2 });
    expectProblems(input, 'duplicate itemId entries');
  });

  it('flags dungeons whose boss encounter does not exist', () => {
    const input = validInput();
    const dungeons = input.dungeons as {
      dungeons: { bossEncounterId: string }[];
    };
    dungeons.dungeons[0].bossEncounterId = 'enc_missing';
    expectProblems(input, "references unknown bossEncounterId 'enc_missing'");
  });

  it('flags featured banners without a featured hero', () => {
    const input = validInput();
    const banners = input.banners as { banners: { featuredHeroId?: string }[] };
    delete banners.banners[0].featuredHeroId;
    expectProblems(input, 'featured banners must declare featuredHeroId');
  });

  it('flags banners referencing unknown heroes', () => {
    const input = validInput();
    const banners = input.banners as { banners: { featuredHeroId: string }[] };
    banners.banners[0].featuredHeroId = 'hero_missing';
    expectProblems(input, "references unknown featuredHeroId 'hero_missing'");
  });

  it('rejects non-monotonic experience curves', () => {
    const input = validInput();
    const curves = input['experience-curves'] as {
      experienceCurves: { levels: { level: number; totalXp: number }[] }[];
    };
    curves.experienceCurves[0].levels.reverse();
    expectProblems(input, 'strictly increasing');
  });

  it('rejects consumable items without any effect', () => {
    const input = validInput();
    const items = input.items as { items: unknown[] };
    items.items.push({
      kind: 'consumable',
      id: 'item_empty_tonic',
      name: 'Empty Tonic',
      rarity: 'common',
      value: 1,
      consumable: {},
    });
    expectProblems(input, 'consumable items need healAmount or a statusId');
  });

  it('rejects ids that are not lowercase snake case', () => {
    const input = validInput();
    const heroes = input.heroes as { heroes: { id: string }[] };
    heroes.heroes[0].id = 'Hero Knight';
    expectProblems(input, 'heroes.heroes.0.id');
  });
});
