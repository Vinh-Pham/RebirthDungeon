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
