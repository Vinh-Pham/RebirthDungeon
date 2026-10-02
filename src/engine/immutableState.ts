import { Immer, freeze, current, isDraft, type Draft, type Immutable } from 'immer';

// Campaign producers must not alter settings used by another library's Immer instance.
const campaignImmer = new Immer({ autoFreeze: true });

/** Only owned JSON data belongs here; live engine objects remain mutable. */
export function immutableData<T>(value: T): Immutable<T> {
  return freeze(value, true) as Immutable<T>;
}

/** Recipes finish synchronously before state is published, saved, or observed. */
export function produceState<T>(base: T, recipe: (draft: Draft<T>) => void): Immutable<T> {
  return campaignImmer.produce(base, recipe) as Immutable<T>;
}

export type { Draft, Immutable };

/** Synchronous read projection of the latest draft; never publish or mutate this value. */
export function readPlain<T extends object>(value: T): T {
  return isDraft(value) ? current<T>(value as Draft<T>) : value;
}
