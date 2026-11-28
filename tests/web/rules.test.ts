import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { levelForXp, maxExperience, maxLevel, xpForLevel, xpProgress } from "../../src/game/content/level-experience";
import { Combat, skillCooldownSeconds } from "../../src/game/systems/combat";
import { deriveStats } from "../../src/game/core/stats";
import {
  canPlace,
  equipItem,
  equipmentSlot,
  moveItem,
  type Inventory,
} from "../../src/game/systems/inventory";
import { transferGold, craft } from "../../src/game/systems/economy";
import { skillCatalog } from "../../src/game/content/skills";
const player = {
  name: "Player",
  health: 100,
  stamina: 50,
  damage_min: 10,
  damage_max: 10,
};
const enemy = { name: "Spider", health: 100, damage_min: 8, damage_max: 8 };
describe("ported gameplay rules", () => {
  it("starts each level at the XP threshold used by the progress bar", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(400);
    expect(xpForLevel(3)).toBe(1_100);
    expect(xpForLevel(100)).toBe(18_323_500);
    expect(xpForLevel(101) - xpForLevel(100)).toBe(249_000);
    expect(maxLevel).toBe(200);
    expect(maxExperience).toBe(279_988_500);
    expect(levelForXp(maxExperience + 1)).toBe(maxLevel);
    expect(xpProgress(maxLevel, maxExperience)).toEqual({ xpInLevel: 0, xpToAdvance: 0 });
    for (let level = 2; level <= maxLevel; level++) {
      const threshold = xpForLevel(level);
      expect(levelForXp(threshold - 1)).toBe(level - 1);
      expect(levelForXp(threshold)).toBe(level);
    }
  });
  it("executes back-to-back attacks immediately without an ATB delay and replaces loaded skills", () => {
    const battle = new Combat(player, [enemy]);
    battle.queue("attack");
    expect(battle.enemies[0].health).toBe(95);
    battle.queue("attack");
    expect(battle.enemies[0].health).toBe(90);
    battle.loadSkill("smash");
    expect(battle.loadedSkill).toBe("smash");
    battle.loadSkill("defend");
    expect(battle.loadedSkill).toBe("defend");
    expect(battle.guarded).toBe(true);
  });
  it("tonics restore HP without clearing a loaded skill", () => {
    const battle = new Combat(player, [enemy]);
    battle.health = 40;
    battle.loadSkill("smash");
    battle.useTonic();
    expect(battle.health).toBe(70);
    expect(battle.loadedSkill).toBe("smash");
  });
  it("reports ranked action costs and damage before mitigation", () => {
    const battle = new Combat(
      {
        ...player,
        weapon_hands: 2,
        skill_effects: {
          smash: {
            damage_human_elf: 150,
            additional_multiplier_two_handed_weapons: "x1.2",
            stamina_use: 7,
          },
        },
      },
      [enemy],
    );
    expect(battle.actionDetails.find(({ action }) => action === "smash")).toEqual({
      action: "smash",
      stamina: 7,
      cooldown: 3,
      damage: { min: 18, max: 18 },
    });
  });
  it("normal attack interrupts smash", () => {
    const battle = new Combat(player, [enemy]);
    battle.enemies[0].intent = "smash";
    battle.enemies[0].gauge = 0.3;
    battle.queue("attack");
    expect(battle.enemies[0].intent).toBe("defend");
    expect(battle.enemies[0].gauge).toBe(0);
  });
  it("smash bypasses guard", () => {
    const battle = new Combat(player, [enemy]);
    battle.queue("smash");
    battle.advance(2.5);
    expect(battle.enemies[0].health).toBe(87);
  });
  it("elapsed time is invariant to frame subdivision", () => {
    const a = new Combat(player, [enemy]);
    const b = new Combat(player, [enemy]);
    a.advance(14);
    for (let i = 0; i < 140; i++) b.advance(0.1);
    expect(a.health).toBe(b.health);
    expect(a.enemies[0].actions).toBe(b.enemies[0].actions);
    expect(a.enemies[0].gauge).toBeCloseTo(b.enemies[0].gauge);
  });
  it("bank transfers conserve balances", () =>
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (amount) => {
        const state = {
          gold: 2000,
          bankGold: 0,
          health: 80,
          tonics: 0,
          materials: {},
        };
        const deposited = transferGold(state, amount, true)!;
        expect(deposited.gold + deposited.bankGold).toBe(2000);
        expect(transferGold(deposited, amount, false)).toEqual(state);
      }),
    ));
  it("recipes conserve ingredients and rejected cooking preserves state", () => {
    const state = {
      gold: 0,
      bankGold: 0,
      health: 100,
      tonics: 0,
      materials: { grain: 1 },
    };
    expect(craft(state, "mill", 100)?.materials).toEqual({
      grain: 0,
      flour: 1,
    });
    expect(craft(state, "bake", 100)).toBeNull();
    expect(state.materials.grain).toBe(1);
  });
  it("inventory rejects overlap and out of bounds without moving", () => {
    const inventory: Inventory = {
      width: 6,
      height: 10,
      items: [
        {
          id: "sword",
          name: "Sword",
          width: 1,
          height: 3,
          x: 0,
          y: 0,
          quantity: 1,
          stackLimit: 1,
        },
        {
          id: "shield",
          name: "Shield",
          width: 2,
          height: 2,
          x: 2,
          y: 2,
          quantity: 1,
          stackLimit: 1,
        },
      ],
    };
    expect(moveItem(inventory, "sword", 2, 2)).toBe(false);
    expect(inventory.items[0].x).toBe(0);
    expect(canPlace(inventory, inventory.items[0], 5, 9)).toBe(false);
  });
  it("fills both accessory slots and replaces only the first when full", () => {
    const inventory: Inventory = {
      width: 3,
      height: 1,
      items: ["Bracelet", "Ring", "Amulet"].map((name, x) => ({
        id: name,
        name,
        x,
        y: 0,
        width: 1,
        height: 1,
        quantity: 1,
        stackLimit: 1,
        slot: "accessory",
        equipped: x === 0,
      })),
    };
    const [bracelet, ring, amulet] = inventory.items;
    expect(equipmentSlot(bracelet)).toBe("accessory_1");
    expect(equipItem(inventory, ring.id)).toBe(true);
    expect(equipmentSlot(ring)).toBe("accessory_2");
    expect(bracelet.equipped).toBe(true);
    expect(equipItem(inventory, amulet.id)).toBe(true);
    expect(equipmentSlot(amulet)).toBe("accessory_1");
    expect(ring.equipped).toBe(true);
    expect(bracelet).toMatchObject({ equipped: false, x: 2, y: 0 });
  });
  it("all authored combat skill catalogs retain rank tables", () => {
    expect(Object.keys(skillCatalog)).toHaveLength(11);
    for (const skill of Object.values(skillCatalog))
      expect(skill.ranks.length).toBeGreaterThan(1);
  });
  it("enforces Smash 3s cooldown on use", () => {
    const battle = new Combat(
      {
        ...player,
        learned_skills: ["smash"],
        skill_effects: { smash: { rank: "F", damage_pct: 180, cooldown_s: 3 } },
      },
      [enemy],
    );
    expect(battle.executeAttack(0, "smash")).toHaveLength(1);
    expect(battle.cooldownRemaining("smash")).toBe(3);
    expect(battle.canLoad("smash")).toBe(false);
    battle.advance(1);
    expect(battle.cooldownRemaining("smash")).toBe(2);
    battle.advance(1);
    expect(battle.cooldownRemaining("smash")).toBe(1);
    battle.advance(1);
    expect(battle.cooldownRemaining("smash")).toBe(0);
    expect(battle.canLoad("smash")).toBe(true);
  });
  it("starts Defense 7s cooldown only when blocking an attack, not on cancel or guard break", () => {
    const blocked = new Combat(player, [enemy]);
    blocked.enemies[0].intent = "attack";
    blocked.enemies[0].gauge = 0.99;
    expect(blocked.loadSkill("defend")).toBe(true);
    expect(blocked.cooldownRemaining("defend")).toBe(0);
    blocked.advance(0.1);
    expect(blocked.guarded).toBe(false);
    expect(Math.ceil(blocked.cooldownRemaining("defend"))).toBe(7);
    expect(blocked.cooldownRemaining("defend")).toBeGreaterThan(6.9);
    expect(blocked.canLoad("defend")).toBe(false);

    const canceled = new Combat(player, [enemy]);
    expect(canceled.loadSkill("defend")).toBe(true);
    canceled.unloadSkill();
    expect(canceled.loadedSkill).toBeNull();
    expect(canceled.guarded).toBe(false);
    expect(canceled.cooldownRemaining("defend")).toBe(0);

    const broken = new Combat(player, [enemy]);
    broken.enemies[0].intent = "smash";
    broken.enemies[0].gauge = 0.99;
    broken.loadSkill("defend");
    broken.advance(0.1);
    expect(broken.cooldownRemaining("defend")).toBe(0);
  });
  it("starts Counterattack cooldown only after countering (7s normal, 4s knuckles)", () => {
    const sword = new Combat(
      { ...player, learned_skills: ["counterattack"] },
      [enemy],
    );
    sword.enemies[0].intent = "attack";
    sword.enemies[0].gauge = 0.99;
    expect(sword.loadSkill("counterattack")).toBe(true);
    expect(sword.cooldownRemaining("counterattack")).toBe(0);
    sword.advance(0.1);
    expect(Math.ceil(sword.cooldownRemaining("counterattack"))).toBe(7);
    expect(sword.cooldownRemaining("counterattack")).toBeGreaterThan(6.9);

    const knuckle = new Combat(
      { ...player, weapon_type: "knuckle", learned_skills: ["counterattack"] },
      [enemy],
    );
    knuckle.enemies[0].intent = "attack";
    knuckle.enemies[0].gauge = 0.99;
    knuckle.loadSkill("counterattack");
    knuckle.advance(0.1);
    expect(Math.ceil(knuckle.cooldownRemaining("counterattack"))).toBe(4);
    expect(knuckle.cooldownRemaining("counterattack")).toBeGreaterThan(3.9);
  });
  it("uses current skill rank and race/weapon cooldown times from the skill tables", () => {
    const form = {
      name: "Rank Checker",
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
    const skillsFor = (windmillRank: string) => ({
      smash: { rank: "F", training: {} },
      defense: { rank: "1", training: {} },
      counterattack: { rank: "1", training: {} },
      windmill: { rank: windmillRank, training: {} },
    });
    const humanF = new Combat(deriveStats({ ...form, race: 0 }, 1, skillsFor("F")), [enemy]);
    expect(humanF.cooldownDuration("smash")).toBe(3);
    expect(humanF.cooldownDuration("defend")).toBe(7);
    expect(humanF.cooldownDuration("counterattack")).toBe(7);
    expect(humanF.cooldownDuration("windmill")).toBe(4);

    const human9 = new Combat(deriveStats({ ...form, race: 0 }, 1, skillsFor("9")), [enemy]);
    expect(human9.cooldownDuration("windmill")).toBe(3.5);

    const elfF = new Combat(deriveStats({ ...form, race: 1 }, 1, skillsFor("F")), [enemy]);
    const elf9 = new Combat(deriveStats({ ...form, race: 1 }, 1, skillsFor("9")), [enemy]);
    expect(elfF.cooldownDuration("windmill")).toBe(4.5);
    expect(elf9.cooldownDuration("windmill")).toBe(4);

    const giantF = new Combat(deriveStats({ ...form, race: 2 }, 1, skillsFor("F")), [enemy]);
    const giant9 = new Combat(deriveStats({ ...form, race: 2 }, 1, skillsFor("9")), [enemy]);
    expect(giantF.cooldownDuration("windmill")).toBe(3.5);
    expect(giant9.cooldownDuration("windmill")).toBe(3);

    const knuckle = new Combat(
      deriveStats(form, 1, skillsFor("1"), { weapon_type: "knuckle", damage_min: 5, damage_max: 10 }),
      [enemy],
    );
    expect(knuckle.cooldownDuration("counterattack")).toBe(4);
  });
  it("falls back to positive cooldowns when skill effect fields are missing or invalid", () => {
    expect(skillCooldownSeconds("smash", { smash: { cooldown_time_sec: 0 } })).toBe(3);
    expect(skillCooldownSeconds("smash", { smash: { cooldown_time_sec: "invalid" } })).toBe(3);
    expect(skillCooldownSeconds("defend", { defense: { cooldown_time_sec: -2 } })).toBe(7);
    expect(skillCooldownSeconds("counterattack", { counterattack: { cooldown_time_sec: 0 } })).toBe(7);
    expect(skillCooldownSeconds("windmill", { windmill: { cooldown_time_sec_human: 0 } })).toBe(4);
  });
  it("enforces Smash 3s cooldown on Defend-break, enemy kill, and Normal Attack interruption", () => {
    const interrupted = new Combat({ ...player, learned_skills: ["smash"] }, [{ ...enemy }]);
    interrupted.enemies[0].intent = "attack";
    expect(interrupted.loadSkill("smash")).toBe(true);
    const interruptEvents = interrupted.executeAttack(0);
    expect(interruptEvents[0]?.message).toBe("Normal Attack interrupts your Smash.");
    expect(interrupted.cooldownRemaining("smash")).toBe(3);
    expect(interrupted.loadedSkill).toBeNull();
    expect(interrupted.canLoad("smash")).toBe(false);
    expect(interrupted.canQueue("smash")).toBe(false);
    expect(interrupted.loadSkill("smash")).toBe(false);
    expect(interrupted.executeAttack(0, "smash")).toEqual([]);

    const lethal = new Combat({ ...player, damage_min: 120, damage_max: 120, learned_skills: ["smash"] }, [
      { ...enemy, health: 20 },
      { ...enemy, health: 100 },
    ]);
    lethal.enemies[0].intent = "defend";
    expect(lethal.executeAttack(0, "smash")).toHaveLength(1);
    expect(lethal.cooldownRemaining("smash")).toBe(3);
    expect(lethal.target).toBe(1);
    expect(lethal.canLoad("smash")).toBe(false);
    lethal.advance(3);
    expect(lethal.canLoad("smash")).toBe(true);
  });
  it("advances target and starts cooldown when Counterattack defeats an enemy in a multi-enemy battle", () => {
    const battle = new Combat(
      { ...player, damage_min: 80, damage_max: 80, learned_skills: ["counterattack"] },
      [
        { name: "First", health: 10, damage_min: 8, damage_max: 8 },
        { name: "Second", health: 100, damage_min: 8, damage_max: 8 },
      ],
    );
    battle.enemies[0].intent = "attack";
    battle.enemies[0].gauge = 0.99;
    expect(battle.loadSkill("counterattack")).toBe(true);
    battle.advance(0.1);
    expect(battle.enemies[0].health).toBe(0);
    expect(battle.target).toBe(1);
    expect(Math.ceil(battle.cooldownRemaining("counterattack"))).toBe(7);
    expect(battle.canLoad("counterattack")).toBe(false);
  });
});
