import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { levelForXp, xpForLevel } from "../../src/game/core/stats";
import { Combat } from "../../src/game/systems/combat";
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
    expect(xpForLevel(2)).toBe(100);
    for (const level of [2, 3, 10, 100]) {
      const threshold = xpForLevel(level);
      expect(levelForXp(threshold - 1)).toBe(level - 1);
      expect(levelForXp(threshold)).toBe(level);
    }
  });
  it("latest queued action replaces the previous command", () => {
    const battle = new Combat(player, [enemy]);
    battle.queue("attack");
    battle.queue("defend");
    battle.advance(2.5);
    expect(battle.enemies[0].health).toBe(100);
    expect(battle.guarded).toBe(true);
  });
  it("tonics preserve readiness", () => {
    const battle = new Combat(player, [enemy]);
    battle.health = 40;
    battle.advance(1);
    const gauge = battle.playerGauge;
    battle.useTonic();
    expect(battle.health).toBe(70);
    expect(battle.playerGauge).toBe(gauge);
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
      damage: { min: 18, max: 18 },
    });
  });
  it("normal attack interrupts smash", () => {
    const battle = new Combat(player, [enemy]);
    battle.enemies[0].intent = "smash";
    battle.enemies[0].gauge = 0.3;
    battle.queue("attack");
    battle.advance(2.5);
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
});
