import { expect, it } from "vitest";
import type { CharacterForm } from "../../src/app/contracts";
import { deriveStats, movementSpeed } from "../../src/game/core/stats";
import { effectiveProtection } from "../../src/game/content/protection";

const human: CharacterForm = {
  name: "Stat Keeper",
  race: 0,
  gender: 0,
  age: 17,
  talent: 0,
  body: 1,
  skin: 1,
  hair: 0,
  hairColor: 0,
  eyes: 0,
  eyeColor: 0,
  face: 0,
};

it("uses sourced starting pools and Close Combat attributes without invented racial additions", () => {
  const stats = deriveStats(human, 1);
  expect(stats).toMatchObject({
    health: 118,
    mana: 98,
    stamina: 113,
    strength: 75,
    intelligence: 48,
    dexterity: 58,
    will: 57,
    luck: 47,
  });
  expect(stats.damage_min).toBe(21);
  expect(stats.damage_max).toBe(34);
  expect(stats.magic_attack).toBeCloseTo(7.6);
  expect(stats.magic_defense).toBeCloseTo(4.7);
  expect(stats.magic_protection).toBeCloseTo(1.9);
  expect(stats.armor_pierce).toBeCloseTo(3.2);
  expect(stats.critical).toBeCloseTo(22.1);
  expect([movementSpeed(0), movementSpeed(1), movementSpeed(2)]).toEqual([1, 1.14, 1]);
});

it("applies weapon category attributes and prevents minimum damage exceeding maximum", () => {
  const sword = deriveStats(human, 1, {}, { damage_min: 3, damage_max: 6 });
  expect([sword.damage_min, sword.damage_max]).toEqual([24, 32]);
  const bow = deriveStats(human, 1, {}, { weapon_type: "bow", damage_min: 3, damage_max: 6 });
  expect([bow.damage_min, bow.damage_max]).toEqual([16, 25]);
  const reversed = deriveStats(human, 1, {}, { damage_min: 100, damage_max: 1 });
  expect(reversed.damage_min).toBe(reversed.damage_max);
});

it("reads physical and magic rating reductions from the published protection table", () => {
  expect(effectiveProtection(6)).toBe(10);
  expect(effectiveProtection(35)).toBe(38);
  expect(effectiveProtection(6, true)).toBe(11);
  expect(effectiveProtection(35, true)).toBe(38);
  expect(effectiveProtection(10_000)).toBe(90);
  expect(effectiveProtection(10_000, true)).toBe(90);
});

it("activates armor and shield mastery bonuses only with the required equipment", () => {
  const skills = {
    light_armor_mastery: { rank: "E", training: {} },
    heavy_armor_mastery: { rank: "E", training: {} },
    shield_mastery: { rank: "E", training: {} },
  };
  const naked = deriveStats(human, 1, skills);
  const light = deriveStats(human, 1, skills, undefined, 0, { armor: "light" });
  const heavyShield = deriveStats(human, 1, skills, undefined, 0, { armor: "heavy", shield: true });
  expect(naked.defense).toBe(6.5);
  expect(light.defense).toBe(8.5);
  expect(heavyShield.defense).toBe(13.5);
  expect(heavyShield.protection).toBe(2);
  expect(heavyShield.dexterity).toBe(29);
  expect(deriveStats({ ...human, race: 2 }, 1, skills, undefined, 0, { armor: "heavy" }).dexterity).toBe(40.6);
});

it("caps ordinary attributes and resource contributions at their wiki bounds", () => {
  const stats = deriveStats(human, 200, {}, undefined, 0, {
    attributes: {
      strength: 10_000,
      intelligence: 10_000,
      dexterity: 10_000,
      will: 10_000,
      luck: 10_000,
      life: 10_000,
      mana: 10_000,
      stamina: 10_000,
    },
  });
  expect([stats.strength, stats.intelligence, stats.dexterity, stats.will, stats.luck]).toEqual(Array(5).fill(1500));
  expect([stats.health, stats.mana, stats.stamina]).toEqual([2500, 2500, 2500]);
  expect(stats.alchemic_damage).toBe(500);
  expect(stats.life_skill_success_bonus).toBe(18);
});
