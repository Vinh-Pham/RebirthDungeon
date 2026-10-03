import type { Draft } from './immutableState';

/** Detached JSON data, also supported on Hermes runtimes without structuredClone. */
export function cloneData<T>(value: T): Draft<T> {
  return JSON.parse(JSON.stringify(value)) as Draft<T>;
}
