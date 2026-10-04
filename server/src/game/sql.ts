import { getTableConfig, type AnySQLiteTable } from 'drizzle-orm/sqlite-core';
export const tableDescriptor = (table: AnySQLiteTable) => {
  const config = getTableConfig(table);
  return {
    name: config.name,
    columns: config.columns.map((c) => c.name),
    keys:
      config.primaryKeys[0]?.columns.map((c) => c.name) ??
      config.columns.filter((c) => c.primary).map((c) => c.name),
  };
};
export function jsonColumns(columns: readonly string[], alias: string) {
  const parts = Array.from(
    { length: Math.ceil(columns.length / 16) },
    (_, i) =>
      `json_object(${columns
        .slice(i * 16, (i + 1) * 16)
        .map((c) => `'${c}',${alias}.${c}`)
        .join(',')})`,
  );
  // json_patch removes null keys, which would erase optional typed columns.
  return parts.length === 1
    ? parts[0]
    : `('{' || ${parts.map((part) => `substr(${part},2,length(${part})-2)`).join(" || ',' || ")} || '}')`;
}
export function grouped<T>(values: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, i) =>
    values.slice(i * size, (i + 1) * size),
  );
}
