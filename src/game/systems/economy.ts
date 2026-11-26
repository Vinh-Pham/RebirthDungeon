export interface EconomyState {
  gold: number;
  bankGold: number;
  health: number;
  tonics: number;
  materials: Record<string, number>;
}
export function transferGold(
  state: EconomyState,
  amount: number,
  deposit: boolean,
  capacity = 2_000_000_000,
) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 2_000_000_000)
    return null;
  if (deposit && (amount > state.gold || state.bankGold + amount > 20_000_000))
    return null;
  if (!deposit && (amount > state.bankGold || state.gold + amount > capacity))
    return null;
  return {
    ...state,
    gold: state.gold + (deposit ? -amount : amount),
    bankGold: state.bankGold + (deposit ? amount : -amount),
  };
}
export function craft(state: EconomyState, action: string, maxHealth: number) {
  const next = structuredClone(state);
  const recipes: Record<string, [string, string]> = {
    mill: ["grain", "flour"],
    spin: ["fiber", "thread"],
    weave: ["thread", "cloth"],
  };
  if (action === "fish") next.materials.fish = (next.materials.fish ?? 0) + 1;
  else if (action === "buy_grain" || action === "buy_fiber") {
    const material = action === "buy_grain" ? "grain" : "fiber";
    const price = material === "grain" ? 2 : 3;
    if (next.gold < price) return null;
    next.gold -= price;
    next.materials[material] = (next.materials[material] ?? 0) + 1;
  } else if (recipes[action]) {
    const [input, output] = recipes[action];
    if (!(next.materials[input] > 0)) return null;
    next.materials[input]--;
    next.materials[output] = (next.materials[output] ?? 0) + 1;
  } else if (action === "bake" || action === "cook_fish") {
    const input = action === "bake" ? "flour" : "fish";
    if (
      !(next.materials[input] > 0) ||
      next.health < 0 ||
      next.health >= maxHealth
    )
      return null;
    next.materials[input]--;
    next.health = Math.min(maxHealth, next.health + 15);
  } else if (action === "sell_cloth") {
    if (!(next.materials.cloth > 0)) return null;
    next.materials.cloth--;
    next.gold += 4;
  } else return null;
  if (
    next.gold > 2_000_000_000 ||
    Object.values(next.materials).some(
      (value) =>
        !Number.isSafeInteger(value) || value < 0 || value > 2_000_000_000,
    )
  )
    return null;
  return next;
}
