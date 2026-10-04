import type { Row, Rows, TableName } from '../tables.js';
export const n = (r: Row, key: string) => {
  const value = r[key];
  if (typeof value !== 'number') throw new Error('Invalid numeric column');
  return value;
};
export const s = (r: Row, key: string) => {
  const value = r[key];
  if (typeof value !== 'string') throw new Error('Invalid text column');
  return value;
};
export const optional = (r: Row, key: string) =>
  r[key] === null ? undefined : s(r, key);
export const ordered = (rows: Row[], key = 'position') =>
  [...rows].sort((a, b) => n(a, key) - n(b, key));
export const singleton = (rows: Row[]) => {
  if (rows.length !== 1) throw new Error('Missing state row');
  return rows[0];
};
export const words = (row: Row) => [0, 1, 2, 3].map((i) => n(row, `word${i}`));
export function rowReader(rows: Rows) {
  const get = (name: string) => rows[`game_${name}` as TableName];
  const map = (name: string, key: string, value: (r: Row) => unknown) =>
    Object.fromEntries(get(name).map((r) => [s(r, key), value(r)]));
  const indexes = new Map<string, Map<Row[string], Row[]>>();
  const matching = (name: string, key: string, value: string) => {
    const identity = JSON.stringify([name, key]);
    let index = indexes.get(identity);
    if (!index) {
      index = new Map();
      for (const row of get(name)) {
        const group = index.get(row[key]) ?? [];
        group.push(row);
        index.set(row[key], group);
      }
      indexes.set(identity, index);
    }
    return index.get(value) ?? [];
  };
  const list = (name: string, key: string) =>
    ordered(get(name)).map((r) => s(r, key));
  const counters = (name: string, key: string, value: string) =>
    Object.fromEntries(
      matching(name, key, value).map((r) => [
        s(r, 'objective_id'),
        n(r, 'count'),
      ]),
    );

  return { get, map, matching, list, counters };
}

export type AddRow = (
  table: string,
  row: Record<string, string | number | null | undefined>,
) => void;
export const wordColumns = (state: number[]) =>
  Object.fromEntries(state.map((word, i) => [`word${i}`, word]));
