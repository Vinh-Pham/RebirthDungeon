import { BundledContentRepository } from '@/data/content/bundled-content-repository';

/**
 * Exit-criterion check: every bundled content file validates and all
 * cross-references resolve. If this test fails after a content edit, the
 * problem list names the exact file and field.
 */
describe('BundledContentRepository', () => {
  it('loads a fully validated catalog from the bundled files', async () => {
    const repository = new BundledContentRepository();
    const catalog = await repository.loadCatalog();

    expect(catalog.version).toBe(1);
    expect(Object.keys(catalog.dice)).toEqual([
      'dice_d6',
      'dice_d8',
      'dice_d12',
    ]);
    expect(Object.keys(catalog.heroes)).toEqual(['hero_knight', 'hero_rogue']);
    expect(Object.keys(catalog.monsters)).toEqual([
      'monster_slime',
      'monster_bat',
      'monster_brute',
    ]);
    expect(catalog.items['item_healing_potion']).toBeDefined();
    expect(Object.keys(catalog.statusEffects)).toEqual([
      'status_poison',
      'status_strength',
      'status_guard',
    ]);
    expect(Object.keys(catalog.dungeons)).toEqual(['dungeon_gloom_cellar']);
    expect(Object.keys(catalog.banners)).toHaveLength(2);
    expect(catalog.experienceCurves['curve_standard']).toBeDefined();
  });

  it('serves consistent, frozen content', async () => {
    const repository = new BundledContentRepository();
    const catalog = await repository.loadCatalog();

    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.heroes)).toBe(true);
    expect(catalog.dungeons['dungeon_gloom_cellar']?.bossEncounterId).toBe(
      'enc_boss_cellar_king',
    );
    const knight = catalog.heroes['hero_knight'];
    expect(knight?.abilities).toContain('ability_power_slash');
  });

  it('caches the catalog promise across calls', async () => {
    const repository = new BundledContentRepository();
    const first = repository.loadCatalog();
    const second = repository.loadCatalog();
    expect(second).toBe(first);
    await Promise.all([first, second]);
  });
});
