/** A closed, generated mapping between domain fields and typed SQL columns/child tables. */
export interface ModelField {
  name: string;
  kind: 'scalar' | 'object' | 'array' | 'record' | 'json';
  column?: string;
  boolean?: boolean;
  optional?: boolean;
  presence?: string;
  fields?: ModelField[];
  table?: string;
  key?: string;
  element?: ModelField;
}
export interface RelationalModel {
  table: string;
  keys: string[];
  fields: ModelField[];
}
export type SqlRow = Record<string, string | number | null>;
export type ModelRows = Record<string, SqlRow[]>;

export function encodeModel(
  model: RelationalModel,
  value: Record<string, unknown>,
  identity: SqlRow,
  rows: ModelRows,
): void {
  const encodeFields = (
    fields: ModelField[],
    data: Record<string, unknown>,
    row: SqlRow,
    context: SqlRow,
  ) => {
    for (const field of fields) {
      const item = data[field.name];
      if (field.presence) row[field.presence] = item === undefined ? 0 : 1;
      if (field.kind === 'scalar' || field.kind === 'json') {
        row[field.column!] =
          item === undefined
            ? null
            : field.kind === 'json'
              ? JSON.stringify(item)
              : field.boolean
                ? +Boolean(item)
                : (item as string | number);
      } else if (field.kind === 'object') {
        encodeFields(
          field.fields!,
          (item as Record<string, unknown>) ?? {},
          row,
          context,
        );
      } else if (item !== undefined) {
        const entries =
          field.kind === 'array'
            ? (item as unknown[]).map((entry, i) => [i, entry] as const)
            : Object.entries(item as Record<string, unknown>);
        for (const [key, entry] of entries) {
          const childContext = { ...context, [field.key!]: key };
          const child = { ...childContext };
          encodeFields([field.element!], { value: entry }, child, childContext);
          (rows[field.table!] ??= []).push(child);
        }
      }
    }
  };
  const row = { ...identity };
  encodeFields(model.fields, value, row, identity);
  (rows[model.table] ??= []).push(row);
}

export function decodeModel(
  model: RelationalModel,
  identity: SqlRow,
  rows: ModelRows,
): Record<string, unknown> {
  const matches = (row: SqlRow, context: SqlRow) =>
    Object.entries(context).every(([key, value]) => row[key] === value);
  const decodeFields = (
    fields: ModelField[],
    row: SqlRow,
    context: SqlRow,
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.presence && row[field.presence] === 0) continue;
      if (field.kind === 'scalar' || field.kind === 'json') {
        const value = row[field.column!];
        if (value === null && field.optional) continue;
        if (value === null || value === undefined)
          throw new Error(`Missing column ${field.column}`);
        result[field.name] =
          field.kind === 'json'
            ? JSON.parse(String(value))
            : field.boolean
              ? Boolean(value)
              : value;
      } else if (field.kind === 'object') {
        result[field.name] = decodeFields(field.fields!, row, context);
      } else {
        const children = (rows[field.table!] ?? []).filter((child) =>
          matches(child, context),
        );
        if (field.kind === 'array')
          children.sort(
            (a, b) => Number(a[field.key!]) - Number(b[field.key!]),
          );
        const entries = children.map(
          (child) =>
            [
              child[field.key!],
              decodeFields([field.element!], child, {
                ...context,
                [field.key!]: child[field.key!],
              }).value,
            ] as const,
        );
        result[field.name] =
          field.kind === 'array'
            ? entries.map(([, value]) => value)
            : Object.fromEntries(entries);
      }
    }
    return result;
  };
  const found = (rows[model.table] ?? []).filter((row) =>
    matches(row, identity),
  );
  if (found.length !== 1)
    throw new Error(`Missing or duplicate ${model.table} row`);
  return decodeFields(model.fields, found[0], identity);
}
