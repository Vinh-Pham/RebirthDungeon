/**
 * Immutable-update convention: engine states and snapshots are plain frozen
 * objects. Mutation attempts throw in strict mode, making accidental engine
 * corruption loud instead of silent.
 */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}
