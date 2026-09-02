/**
 * Domain-event convention: gameplay systems emit ordered domain events
 * (`ACTOR_MOVED`, `DAMAGE_DEALT`, …) that the scene exports as an immutable
 * batch after each command; presentation maps events to instructions and
 * never subscribes to the ECS directly. `EngineResult` remains available for
 * pure helper engines (dice rolls, loot rolls) that return a new state plus
 * the events they produced. Invalid commands throw a DomainError (or return
 * an error Result) and leave state untouched.
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
