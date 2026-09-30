export interface CombatStats {
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
  const multiplier = stats.criticalMultiplier ?? 1.5;
  if (!Number.isFinite(multiplier) || multiplier < 1) throw new RangeError('Critical multiplier must be finite and at least 1');
}
