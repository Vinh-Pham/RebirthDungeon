export interface CombatStats {
  minDamage?: number; maxDamage?: number; balance?: number;
  magicAttack?: number; magicDefense?: number; protection?: number; magicProtection?: number;
  magicBalance?: number; criticalRating?: number; magicCriticalChance?: number;
  minInjury?: number; maxInjury?: number; armorPierce?: number;
  attack: number;
  defense: number;
  speed: number;
  hitChance?: number;
  evasion?: number;
  criticalChance?: number;
  criticalMultiplier?: number;
}

export function validateProbability(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError('Combat probabilities must be between 0 and 1');
  }
}

export function validateCombatStats(stats: CombatStats): void {
  for (const value of [stats.attack, stats.defense, stats.speed]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Combat stats must be nonnegative safe integers');
  }
  for (const value of [stats.hitChance ?? 0.95, stats.evasion ?? 0, stats.criticalChance ?? 0.1]) {
    validateProbability(value);
  }
  for (const value of [stats.minDamage, stats.maxDamage, stats.magicAttack, stats.magicDefense, stats.protection, stats.magicProtection, stats.armorPierce]) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new RangeError('Invalid derived combat stat');
  }
  if ((stats.minDamage === undefined) !== (stats.maxDamage === undefined) || (stats.minDamage ?? stats.attack) > (stats.maxDamage ?? stats.attack) || (stats.minInjury ?? 0) > (stats.maxInjury ?? 0)) throw new RangeError('Invalid combat range');
  for (const value of [stats.balance, stats.magicBalance, stats.minInjury, stats.maxInjury]) if (value !== undefined) validateProbability(value);
  for (const value of [stats.criticalRating, stats.magicCriticalChance]) if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 9.999)) throw new RangeError('Invalid critical rating');
  const multiplier = stats.criticalMultiplier ?? 1.5;
  if (!Number.isFinite(multiplier) || multiplier < 1) throw new RangeError('Critical multiplier must be finite and at least 1');
}
