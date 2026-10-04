/** D1's REST query API accepts the same parameterized atomic batches as the Worker binding. */
export function contentDatabase({
  account,
  database,
  token,
  fetch: send = fetch,
}) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`;
  async function execute(statements) {
    const response = await send(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batch: statements.map(({ sql, params }) => ({ sql, params })),
      }),
    });
    const data = await response.json();
    if (
      !response.ok ||
      !data.success ||
      data.result?.length !== statements.length ||
      data.result.some((r) => !r.success)
    )
      throw new Error('D1 content operation failed. No release was activated.');
    return data.result.map((r) => ({
      ...r,
      results: r.results ?? [],
      meta: r.meta ?? {},
    }));
  }
  function statement(sql, params = []) {
    const self = {
      sql,
      params,
      bind: (...values) => statement(sql, values),
      run: async () => (await execute([self]))[0],
      all: async () => (await execute([self]))[0],
      first: async (column) => {
        const row = (await self.all()).results[0] ?? null;
        return column && row ? row[column] : row;
      },
    };
    return self;
  }
  return { prepare: statement, batch: execute };
}
