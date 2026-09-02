/**
 * Engine-result convention: every valid command returns a NEW state plus the
 * domain events that the presentation layer may react to. Invalid commands
 * throw a DomainError (or return an error Result, once engines adopt it) and
 * leave state untouched.
 */

export interface DomainEvent<
  TType extends string = string,
  TPayload = unknown,
> {
  readonly type: TType;
  readonly payload: TPayload;
}

export interface EngineResult<
  TState,
  TEvent extends { readonly type: string },
> {
  readonly state: TState;
  readonly events: readonly TEvent[];
}
