/**
 * Exhaustive-switch convention (game plan §23): every discriminated-union
 * switch ends with a default branch calling assertNever, so adding a variant
 * becomes a compile error until it is handled.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
