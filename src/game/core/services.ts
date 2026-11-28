import { pouches } from "./stacks";
import { canLeaveForSpindleHollow, starterItems, thresholdCleared } from "./profile";
import type { ActionOption } from "../../app/contracts";
import blacksmith from "../content/data/blacksmith_shop.json";
import swords from "../content/data/swords.json";
import type { Landmark } from "../world/world";
import type { Profile } from "./profile";

export const option = (id: string, label: string, disabled = false): ActionOption => ({ id, label, disabled });
interface ShopItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  width?: number;
  height?: number;
  slot?: string;
  max_durability?: number;
  damage_min?: number;
  damage_max?: number;
  defense?: number;
  protection?: number;
  magic_defense?: number;
  magic_protection?: number;
  bonus_damage?: number;
  armor_class?: string;
  equipment_type?: string;
  balance?: number;
  critical?: number;
  hands?: number;
  weapon_type?: string;
}
export const shopItems = blacksmith.categories.flatMap<ShopItem>((category) => category.items);

export function itemWeaponDefinition(item: { id: string }) {
  const sword = swords.find((entry) => entry.id === item.id);
  if (sword) {
    return {
      weapon_type: "sword",
      hands: sword.hands ?? 1,
      damage_min: sword.damage_min,
      damage_max: sword.damage_max,
    };
  }
  const shop = shopItems.find((entry) => entry.id === item.id);
  if (shop && (shop.weapon_type || shop.slot === "main_hand")) {
    return {
      weapon_type: shop.weapon_type,
      hands: shop.hands ?? 1,
      damage_min: shop.damage_min,
      damage_max: shop.damage_max,
      balance: shop.balance,
      critical: shop.critical,
    };
  }
  return undefined;
}

export function isSwordItem(item: { id: string }) {
  return itemWeaponDefinition(item)?.weapon_type === "sword";
}

export function isOneHandedSword(item: { id: string }) {
  const def = itemWeaponDefinition(item);
  return def?.weapon_type === "sword" && (def.hands ?? 1) === 1;
}

export function isTwoHandedWeapon(item: { id: string }) {
  return (itemWeaponDefinition(item)?.hands ?? 1) === 2;
}

export function itemArmorClass(item: { id: string }): "light" | "heavy" | undefined {
  if (item.id === "riveted_jack") return "light";
  const armorClass = shopItems.find((entry) => entry.id === item.id)?.armor_class;
  return armorClass === "light" || armorClass === "heavy" ? armorClass : undefined;
}

export function isShieldItem(item: { id: string }) {
  return shopItems.find((entry) => entry.id === item.id)?.equipment_type === "shield";
}
export const serviceStory = {
  bank: "bank",
  blacksmith: "blacksmith",
  gate: "gate",
  grocery_store: "grocery",
  healer: "healer",
  general_shop: "shop",
} as const;
export type ServiceId = keyof typeof serviceStory;

export const descriptions: Record<string, string> = {
  warden: "The Threshold connects Lantern Rest and Spindle Hollow. Keep your lantern lit on the lower road.",
  blacksmith: "A good blade and sound armor will bring you back to town.",
  school: "Study the principles, train through action, then spend AP to advance your rank.",
  magic_school:
    "Welcome to the Lantern Rest Magic School. I am Archivist Ivara. The old conduits beneath our town still carry aether. Our first lesson is to listen before drawing upon it.\n\nSet both feet on the stone, breathe slowly, and watch the orrery. Let its light settle before you reach toward the next ring. A steady focus begins with patience.",
  magic_school_bookshelf:
    "Field journals and carefully repaired spell primers fill the Aether Shelves. Ivara has marked a beginner's passage about tracing aether through the dungeon's stone.",
  magic_school_focus:
    "The Aether Orrery holds a pale mote between its rings. Each ring turns as the conduits beneath Lantern Rest pulse. A brass plate asks students to observe before touching.",
  magic_school_chart:
    "The Glyph Board maps the flow of aether through branching conduits. Ivara's notes connect each symbol to a breath, a stance, and a moment of stillness.",
  magic_school_sign: "Lantern Rest Magic School. Archivist Ivara welcomes new students at the orrery.",
  lantern_notice_board:
    "Nera has pinned up patrol routes, missing gear notices, and a sketch of the Threshold entrance.",
  lantern_anvil: "Hammer marks cover Venn's anvil. A shallow groove runs down the horn where Venn tests blade edges.",
  lantern_smith_forge: "A clay-lined hearth holds enough heat to soften the salvage Venn brings up from the dungeon.",
  lantern_training_shelf: "Elian keeps illustrated footwork drills, field notes, and practice journals on this shelf.",
  lantern_shrine: "Maelin keeps a lamp lit for travelers crossing the Threshold. Its glass is warm to the touch.",
  lantern_grocery_display: "Corin has stacked cave roots and fresh bread by the open entrance.",
  lantern_healer_cot: "A clean blanket and a rolled bandage wait on Sera's recovery cot.",
  lantern_healer_cot_east: "Sera has set aside this cot for travelers who need a quiet place to recover.",
  lantern_shop_rack: "Tamsin's rack holds spare straps, trail packs, and bottles wrapped for travel.",
  lantern_bank_safe: "Thick iron plates cover the safe behind the Ledger Keeper's counter.",
  church: "Touch a Moon Gate to register it. Once awakened, you can travel to it from anywhere.",
  general_shop: "Stock up before taking the lower road.",
  grocery_store: "Mill grain into flour at the windmill, then bake it at the oven.",
  healer: "Rest here until your strength returns.",
  gate: "Pale light traces a crescent through the stone.",
  dungeon: "Hostile chambers connect Lantern Rest to Spindle Hollow.",
  return: "This door leads back to the settlement you entered from.",
  "far-exit": "The passage opens onto Spindle Hollow.",
  bank: "Deposit spare gold and withdraw it from either town.",
  oven: "Prepare a meal to recover up to 15 Life.",
  loom: "Weave thread into cloth. The General Shop buys finished cloth.",
  spinning_wheel: "Spin fiber into thread for the loom.",
  fishing: "Cave fish gather in the quiet pools.",
  windmill: "Grind grain into flour for the oven.",
  tree: "Cavewood regrows one piece every five minutes.",
  rack: "Choose a practice weapon to train with.",
  practice: "Strike the practice post to train your equipped weapon and combat skills.",
  treasure: "The Threshold’s signal is yours to recover.",
};

export function describeService(place: Landmark, profile: Profile) {
  if (place.id === "dungeon" && profile.completions) {
    const destination = profile.location === "spindle_hollow" ? "Lantern Rest" : "Spindle Hollow";
    return `The cleared Threshold leads to ${destination}.`;
  }
  if (place.id === "return" && profile.thresholdVersion) return "This door opens onto Lantern Rest.";
  if (place.id === "far-exit" && !canLeaveForSpindleHollow(profile))
    return "Clear the six rooms and claim the Signal Cache to open the passage to Spindle Hollow.";
  return descriptions[place.id] ?? "";
}

const actionOptions: Record<string, ActionOption[]> = {
  oven: [option("craft:cook_fish", "Cook Cave Fish"), option("craft:bake", "Bake Bread")],
  loom: [option("craft:weave", "Weave Cloth")],
  spinning_wheel: [option("craft:spin", "Spin Thread")],
  fishing: [option("craft:fish", "Cast Your Line")],
  windmill: [option("craft:mill", "Mill Grain")],
  grocery_store: [option("craft:buy_grain", "Buy Grain · 2 Gold")],
  church: [],
  tree: [option("harvest", "Collect Firewood")],
  dungeon: [option("enter", "Enter the Threshold")],
  rack: [option("starter-sword", "Take an Ashen Arcblade")],
  practice: [option("practice", "Strike the Practice Post")],
  school: [option("study", "Study Skills")],
};

export function serviceOptions(place: Landmark, p: Profile): ActionOption[] {
  switch (place.id) {
    case "blacksmith":
      return [
        option("shop", "Browse Equipment"),
        option("repair", "Repair Equipment"),
        option(
          "starter-sword",
          "Claim Starter Sword",
          p.inventory.items.some((item) => item.id === starterItems.sword.id),
        ),
        option(
          "starter-armor",
          "Claim Riveted Jack",
          p.inventory.items.some((item) => item.id === starterItems.armor.id),
        ),
      ];
    case "general_shop":
      return [
        option("buy-tonic", "Buy Healing Tonic · 8 Gold", p.gold < 8),
        option("pouch", "Buy Bag Expansion · 18 Gold", p.gold < 18 || p.inventory.height >= 12),
        ...Object.entries(pouches).map(([id, item]) =>
          option(`buy-pouch:${id}`, `${item.name} · ${item.price} Gold`, p.gold < item.price),
        ),
        option("craft:buy_fiber", "Buy Fiber · 3 Gold"),
        option("craft:sell_cloth", "Sell Cloth · 4 Gold"),
      ];
    case "bank":
      return [
        option("deposit:10", "Deposit 10 Gold", p.gold < 10),
        option(`deposit:${p.gold}`, "Deposit All", p.gold === 0),
        option("withdraw:10", "Withdraw 10 Gold", p.bank < 10),
        option(`withdraw:${p.bank}`, "Withdraw All", p.bank === 0),
      ].map((entry, index) => ({
        ...entry,
        id: index === 1 ? "deposit:all" : index === 3 ? "withdraw:all" : entry.id,
      }));
    case "gate":
      return p.location !== "arrival" && p.location !== "threshold" && !p.gates.includes(p.location)
        ? [option("gate-register", "Register This Moon Gate")]
        : [];
    case "healer":
      return [option("heal", "Rest and Recover")];
    case "return":
      if (p.room !== 1) return [];
      return [
        option(
          "retreat",
          p.thresholdVersion && p.origin === "spindle_hollow" ? "Travel to Lantern Rest" : "Return to the Settlement",
        ),
      ];
    case "far-exit":
      return [
        option(
          "complete",
          p.origin === "spindle_hollow" ? "Return to Spindle Hollow" : "Travel to Spindle Hollow",
          !canLeaveForSpindleHollow(p),
        ),
      ];
    case "treasure":
      return [
        option("treasure", "Open the Signal Cache", p.treasure || !thresholdCleared(p)),
        option("collect-open", "Collect Pending Loot", !Object.keys(p.pending).length),
        ...(p.thresholdVersion
          ? []
          : [option("complete", "Travel to the Next Town", !p.treasure || !!Object.keys(p.pending).length)]),
      ];
    default:
      if (/^chest[-_]?\d+$/.test(place.id)) {
        const index = Number(place.id.match(/\d+$/)?.[0]);
        return [option(`treasure:${index}`, `Open Chest ${index}`, p.treasure)];
      }
      return actionOptions[place.id] ?? [];
  }
}
