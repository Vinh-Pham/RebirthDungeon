import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { createGameEngine, type GameEngine, type GameEvent } from '../../engine';
import { CombatSystem } from '../../engine/ecs/systems/CombatSystem';
import { addItem, applyHero, createHero } from '../../engine/rpg/Character';
import { cloneData } from '../../engine/cloneData';
import { learnSkill } from '../../engine/rpg/Skills';

const content = loadGameContent();
const engines: GameEngine[] = [];
function battle(rank: 'F' | 'E' = 'F', defending = false, seed = 81) {
  const engine = createGameEngine({ seed });
  engines.push(engine);
  const hero = cloneData(learnSkill(createHero(content), 'smash', content));
  hero.learnedSkills.smash.rank = rank;
  addItem(hero, 'iron-blade', 1, content);
  hero.equipment.weapon = 'weapon-1';
  const player = engine.spawn({ id: 'player', player: true });
  applyHero(player, hero, content);
  player.combatant = {
    ...player.combatant!,
    attack: 25,
    minDamage: 25,
    maxDamage: 25,
    armorPierce: 0,
    criticalRating: 0,
    criticalMultiplier: 1.5,
    speed: 1,
  };
  // Use controlled simulation stats so mitigation and rounding have exact expectations.
  delete player.statSource;
  const enemy = engine.spawn({
    id: 'enemy',
    enemy: true,
    health: { current: 1000, max: 1000 },
    combatant: { attack: 1, minDamage: 1, maxDamage: 1, defense: 5, speed: 2, protection: 0 },
  });
  const events: GameEvent[] = [];
  engine.events.subscribe((event) => events.push(cloneData(event)));
  const combat = new CombatSystem(['player', 'enemy'], { content });
  engine.addSystem(combat);
  if (defending) engine.dispatch({ type: 'DEFEND', entityId: 'enemy' });
  else engine.dispatch({ type: 'ATTACK', attackerId: 'enemy', targetId: 'player' });
  return { engine, combat, player, enemy, events };
}
function smash(engine: GameEngine) {
  engine.dispatch({ type: 'USE_SKILL', sourceId: 'player', targetId: 'enemy', skillId: 'smash' });
}
afterEach(() => {
  engines.splice(0).forEach((engine) => engine.dispose());
  vi.restoreAllMocks();
});

describe('Smash physical multipliers and guard breaking', () => {
  it.each([
    ['F', 45, 70],
    ['E', 47, 73],
  ] as const)(
    'previews and resolves rank %s scaling before Defense, including fractional rounding',
    (rank, normal, critical) => {
      const { engine, combat, player, enemy } = battle(rank, true);
      const before = engine.random.snapshot();
      expect(combat.previewSkill('player', 'enemy', 'smash').targets[0]).toMatchObject({
        min: normal,
        max: normal,
        criticalMin: critical,
        criticalMax: critical,
      });
      expect(engine.random.snapshot()).toEqual(before);
      vi.spyOn(engine.random, 'chance').mockReturnValueOnce(true).mockReturnValueOnce(false);
      smash(engine);
      expect(enemy.health!.current).toBe(1000 - normal);
      expect(player.stamina!.current).toBe(110); // 113 - 4 + owner-turn recovery
      expect(player.weapon!.durability).toBe(59);
    },
  );
  it('retains ordinary critical damage and Protection while bypassing Defend', () => {
    const { engine, combat, enemy } = battle('F', true);
    enemy.combatant!.protection = 10;
    const preview = combat.previewSkill('player', 'enemy', 'smash').targets[0];
    expect(preview.min).toBeLessThan(45);
    expect(preview.criticalMin).toBeLessThan(70);
    vi.spyOn(engine.random, 'chance').mockReturnValue(true);
    smash(engine);
    expect(enemy.health!.current).toBe(1000 - preview.criticalMin);
  });
  it('preserves the legacy single-attack critical formula with the new multiplier', () => {
    const { engine, combat, player, enemy } = battle('F', true);
    delete player.combatant!.minDamage;
    delete player.combatant!.maxDamage;
    expect(combat.previewSkill('player', 'enemy', 'smash').targets[0]).toMatchObject({
      min: 45,
      max: 45,
      criticalMin: 67,
      criticalMax: 67,
    });
    vi.spyOn(engine.random, 'chance').mockReturnValue(true);
    smash(engine);
    expect(enemy.health!.current).toBe(933);
  });
  it('keeps basic attacks and other skills subject to Defend in preview and resolution', () => {
    const guarded = battle('F', true),
      open = battle();
    const plain = open.combat.previewBasic('player', 'enemy').targets[0];
    const guardedBasic = guarded.combat.previewBasic('player', 'enemy').targets[0];
    expect(guardedBasic.min).toBe(Math.floor(plain.min / 2));
    const plainMagic = open.combat.previewSkill('player', 'enemy', 'icebolt').targets[0];
    const guardedMagic = guarded.combat.previewSkill('player', 'enemy', 'icebolt').targets[0];
    expect(guardedMagic.min).toBe(Math.max(1, Math.floor(plainMagic.min / 2)));
    expect(guarded.combat.previewSkill('player', 'enemy', 'smash')).toEqual(
      open.combat.previewSkill('player', 'enemy', 'smash'),
    );
    vi.spyOn(guarded.engine.random, 'chance').mockReturnValueOnce(true).mockReturnValueOnce(false);
    guarded.engine.dispatch({ type: 'ATTACK', attackerId: 'player', targetId: 'enemy' });
    expect(guarded.enemy.health!.current).toBe(1000 - guardedBasic.min);
  });
  it('rejects an invalid target, unavailable rank, broken weapon and insufficient stamina without mutation or RNG', () => {
    const { engine, player } = battle();
    const invalid = [
      () =>
        engine.dispatch({
          type: 'USE_SKILL',
          sourceId: 'player',
          targetId: 'player',
          skillId: 'smash',
        }),
      () => {
        player.learnedSkills!.smash.rank = 'D';
      },
      () => {
        player.weapon!.durability = 0;
      },
      () => {
        player.stamina!.current = 0;
      },
    ];
    for (const [index, setup] of invalid.entries()) {
      player.learnedSkills!.smash.rank = 'F';
      player.weapon!.durability = 60;
      player.stamina!.current = 113;
      if (index) setup();
      const before = cloneData(engine.world.entities),
        rng = engine.random.snapshot();
      expect(index ? () => smash(engine) : setup).toThrow();
      expect(engine.world.entities).toEqual(before);
      expect(engine.random.snapshot()).toEqual(rng);
    }
  });
  it('replays the same resolved action and preserves the existing single-target draw order', () => {
    const run = () => {
      const { engine, player, events } = battle('F', true, 42);
      player.combatant!.minDamage = 21;
      player.combatant!.maxDamage = 29;
      const chance = vi.spyOn(engine.random, 'chance'),
        float = vi.spyOn(engine.random, 'float');
      smash(engine);
      expect(chance).toHaveBeenCalledTimes(2);
      expect(float).toHaveBeenCalledTimes(4); // Hit, critical, Balance sample and physical injury
      return { entities: cloneData(engine.world.entities), events, rng: engine.random.snapshot() };
    };
    expect(run()).toEqual(run());
  });
  it.each([-1, 11, NaN, Infinity])('rejects invalid multiplier %s in authored ranks', (value) => {
    const raw = cloneData(content.data);
    raw.skills.find((skill) => skill.id === 'smash')!.gameRanks!.F!.physicalMultiplier = value;
    expect(() => new ContentRegistry(raw)).toThrow();
  });
});
