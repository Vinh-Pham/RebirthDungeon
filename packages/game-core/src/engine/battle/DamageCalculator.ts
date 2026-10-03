export interface DamageInput {
  attack: number;
  defense: number;
  critical?: boolean;
  criticalMultiplier?: number;
}

/** Flat defense, minimum one damage on a hit, then critical scaling and flooring. */
export function calculateDamage({
  attack,
  defense,
  critical = false,
  criticalMultiplier = 1.5,
}: DamageInput): number {
  if (
    !Number.isSafeInteger(attack) ||
    attack < 0 ||
    !Number.isSafeInteger(defense) ||
    defense < 0 ||
    !Number.isFinite(criticalMultiplier) ||
    criticalMultiplier < 1
  ) {
    throw new RangeError('Invalid damage inputs');
  }
  const damage = Math.floor(Math.max(1, attack - defense) * (critical ? criticalMultiplier : 1));
  if (!Number.isSafeInteger(damage))
    throw new RangeError('Calculated damage exceeds safe integer range');
  return damage;
}
