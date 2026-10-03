import { createAuthClient } from 'better-auth/react';
import { requireAPIURL } from './config';
function createClient() {
  return createAuthClient({ baseURL: requireAPIURL(), fetchOptions: { timeout: 15000 } });
}
let client: ReturnType<typeof createClient> | undefined;
export function getAuthClient() {
  return (client ??= createClient());
}
export async function requestCredentials(): Promise<Pick<RequestInit, 'headers' | 'credentials'>> {
  return { credentials: 'include' };
}
