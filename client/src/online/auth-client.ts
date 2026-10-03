import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { requireAPIURL } from './config';
function createClient() {
  return createAuthClient({
    baseURL: requireAPIURL(),
    plugins: [
      expoClient({
        scheme: 'rebirthdungeon',
        storagePrefix: 'rebirthdungeon-auth',
        storage: SecureStore,
        disableCache: true,
      }),
    ],
  });
}
let client: ReturnType<typeof createClient> | undefined;
export function getAuthClient() {
  return (client ??= createClient());
}
export async function requestCredentials(): Promise<Pick<RequestInit, 'headers' | 'credentials'>> {
  const cookie = await getAuthClient().getCookie();
  return { headers: cookie ? { Cookie: cookie } : {}, credentials: 'omit' };
}
