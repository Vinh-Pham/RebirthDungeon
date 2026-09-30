/** Detached JSON data, also supported on Hermes runtimes without structuredClone. */
export function cloneData<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
