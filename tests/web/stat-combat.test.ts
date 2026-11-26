import { expect, it } from "vitest";
import { Combat } from "../../src/game/systems/combat";

it("applies effective protection before flat defense and ignores only defense with pierce", () => {
  const battle = new Combat({ name: "Player", health: 100, damage_min: 500, damage_max: 500, armor_pierce: 5 }, [
    { name: "Target", health: 1000, defense: 25, effective_protection: 10 },
  ]);
  battle.enemies[0].intent = "counterattack";
  battle.queue("attack");
  battle.advance(2.5);
  expect(battle.enemies[0].health).toBe(570);
});

it("applies ranked Defense after passive mitigation using the wiki's worked example", () => {
  const battle = new Combat(
    {
      name: "Player",
      health: 1000,
      defense: 20,
      effective_protection: 10,
      skill_effects: { defense: { defense_bonus_human_elf: 65, protection_bonus_human_elf: 35 } },
    },
    [{ name: "Target", health: 1000, damage_min: 500, damage_max: 500 }],
  );
  battle.enemies[0].intent = "attack";
  battle.queue("defend");
  battle.advance(4.5);
  expect(battle.health).toBe(798);
});

it("lets Windmill ignore protection for the shared critical roll", () => {
  const battle = new Combat(
    { name: "Player", health: 100, stamina: 50, damage_min: 100, damage_max: 100, critical: 100, critical_cap: 100 },
    [
      { name: "Selected", health: 1000, effective_protection: 90 },
      { name: "Other", health: 1000 },
    ],
  );
  battle.enemies.forEach((enemy) => {
    enemy.intent = "counterattack";
  });
  battle.queue("windmill");
  battle.advance(2.5);
  expect(battle.events.some((event) => event.training.includes("score_a_critical_hit"))).toBe(true);
  expect(battle.enemies[1].health).toBe(850);
});

it("uses maximum damage as the critical bonus before skill multiplication", () => {
  const battle = new Combat(
    {
      name: "Player",
      health: 100,
      stamina: 50,
      damage_min: 10,
      damage_max: 20,
      balance: 0,
      critical: 100,
      critical_cap: 100,
      critical_multiplier: 1.5,
      skill_effects: { smash: { damage_human_elf: 200 } },
    },
    [{ name: "Target", health: 1000 }],
  );
  battle.enemies[0].intent = "defend";
  battle.queue("smash");
  battle.advance(2.5);
  expect(battle.events.some((event) => event.training.includes("score_a_critical_hit"))).toBe(true);
  expect(battle.enemies[0].health).toBeLessThanOrEqual(960);
});

it("retains wounds and prevents tonics healing past them", () => {
  const battle = new Combat({ name: "Player", health: 100 }, [
    { name: "Target", health: 100, damage_min: 20, damage_max: 20, injury_min: 50, injury_max: 50 },
  ]);
  battle.enemies[0].intent = "attack";
  battle.advance(4.5);
  expect(battle.playerWounds).toBe(10);
  expect(battle.useTonic()).toBe(90);
  expect(battle.snapshot().playerWounds).toBe(10);
});

it("survives one lethal hit from half life in Deadly and falls on the next", () => {
  const battle = new Combat({ name: "Player", health: 100, deadly_enabled: true }, [
    { name: "Target", health: 1000, damage_min: 200, damage_max: 200 },
  ]);
  battle.enemies[0].intent = "attack";
  battle.advance(4.5);
  expect(battle.health).toBe(-100);
  expect(battle.active).toBe(true);
  battle.enemies[0].intent = "attack";
  battle.advance(4.5);
  expect(battle.active).toBe(false);
});

it("allows an exhausted normal attack with unarmed damage and no weapon wear", () => {
  const battle = new Combat(
    { name: "Player", health: 100, stamina: 0, damage_min: 50, damage_max: 50, unarmed_min: 5, unarmed_max: 5 },
    [{ name: "Target", health: 1000 }],
  );
  battle.enemies[0].intent = "counterattack";
  expect(battle.queue("attack")).toBe(true);
  battle.advance(2.5);
  expect(battle.enemies[0].health).toBe(995);
  expect(battle.events[0].weaponWear).toBe(0);
});
