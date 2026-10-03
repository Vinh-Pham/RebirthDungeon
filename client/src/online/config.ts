export function parseAPIURL(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return;
  const url = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('EXPO_PUBLIC_API_URL must be an HTTP(S) API origin.');
  return url.origin;
}
export const apiConfiguration = (() => {
  try {
    return { url: parseAPIURL(process.env.EXPO_PUBLIC_API_URL), error: undefined };
  } catch (error) {
    return { url: undefined, error: error instanceof Error ? error.message : 'Invalid API URL' };
  }
})();
export function requireAPIURL(): string {
  if (!apiConfiguration.url)
    throw new Error(apiConfiguration.error ?? 'Set EXPO_PUBLIC_API_URL to connect to your server.');
  return apiConfiguration.url;
}

/** Development advice only: local browser cookies need the same host as the API. */
export function localWebAddress(
  apiURL: string | undefined,
  pageURL: string,
  development: boolean,
): string | undefined {
  if (!development || !apiURL) return;
  try {
    const api = new URL(parseAPIURL(apiURL)!);
    const page = new URL(pageURL);
    const local = (host: string) => {
      if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
      const words = host.split('.').map(Number);
      if (
        words.length !== 4 ||
        words.some((word) => !Number.isInteger(word) || word < 0 || word > 255)
      )
        return false;
      const [a, b] = words;
      return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    };
    if (
      api.protocol !== 'http:' ||
      page.protocol !== 'http:' ||
      !local(api.hostname) ||
      !local(page.hostname) ||
      api.hostname === page.hostname ||
      page.username ||
      page.password
    )
      return;
    page.hostname = api.hostname;
    return page.href;
  } catch {
    return;
  }
}
