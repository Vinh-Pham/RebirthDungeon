export interface Health {
  current: number;
  max: number;
}

/** Normalization is explicit; malformed authoritative health is rejected in combat. */
export function createHealth(max: number, current = max): Health {
  if (!Number.isSafeInteger(max) || max <= 0 || !Number.isSafeInteger(current)) {
    throw new RangeError('Health requires positive safe-integer max and safe-integer current');
  }
  return { current: Math.min(max, Math.max(0, current)), max };
}

export function validateHealth(health: Health): void {
  if (!Number.isSafeInteger(health.max) || health.max <= 0 ||
      !Number.isSafeInteger(health.current) || health.current < 0 || health.current > health.max) {
    throw new RangeError('Health must be safe integers with 0 <= current <= max');
  }
}

/** Returns actual HP lost, so overkill never produces misleading damage events. */
export function applyDamage(health: Health, damage: number): number {
  validateHealth(health);
  if (!Number.isSafeInteger(damage) || damage < 0) throw new RangeError('Damage must be a nonnegative safe integer');
  const amount = Math.min(health.current, damage);
  health.current -= amount;
  return amount;
}
