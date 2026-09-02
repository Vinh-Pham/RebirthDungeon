/**
 * Command convention (game plan §5): commands are flat discriminated unions
 * tagged with an UPPER_SNAKE `type`; combat, dungeon, and gacha engines each
 * define their own union in their domain folder. This module only fixes the
 * shared plumbing.
 */

export interface Command<TType extends string = string> {
  readonly type: TType;
}

/** Payload-bearing command variant helper. */
export interface CommandWithPayload<
  TType extends string,
  TPayload,
> extends Command<TType> {
  readonly payload: TPayload;
}
