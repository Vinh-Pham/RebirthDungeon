import { APIError, StaleAccessError } from './API';
export type ConnectionStatus =
  | 'missing-configuration'
  | 'invalid-configuration'
  | 'wrong-web-address'
  | 'offline'
  | 'inactive'
  | 'connecting'
  | 'unreachable'
  | 'server-error'
  | 'signed-out'
  | 'ready';
export class UnreachableServerError extends Error {
  constructor() {
    super('Cannot reach the online server. Check your connection and try again.');
  }
}
/** Better Fetch reports transport failures without an HTTP status (or with status zero). */
export function authenticationError(
  error: { status?: number; message?: string },
  fallback: string,
): Error {
  return error.status && error.status >= 100
    ? new APIError(error.status, error.message ?? fallback)
    : new UnreachableServerError();
}
export function connectionStatus(input: {
  configured: boolean;
  configurationError?: string;
  webAddress?: string;
  online: boolean;
  foreground: boolean;
  fetching: boolean;
  verified: boolean;
  error?: Error | null;
}): ConnectionStatus {
  if (input.configurationError) return 'invalid-configuration';
  if (!input.configured) return 'missing-configuration';
  if (input.webAddress) return 'wrong-web-address';
  if (!input.online) return 'offline';
  if (!input.foreground) return 'inactive';
  if (input.fetching && !input.verified) return 'connecting';
  if (input.error && !(input.error instanceof StaleAccessError))
    return input.error instanceof APIError ? 'server-error' : 'unreachable';
  if (input.verified) return 'ready';
  return 'signed-out';
}
export const connectionMessages: Partial<Record<ConnectionStatus, string>> = {
  'missing-configuration':
    'Online play needs to be set up for this app. You can keep playing with local characters.',
  'invalid-configuration':
    'This app’s online connection settings are invalid. Local play is still available.',
  'wrong-web-address':
    'This browser address does not match your local online setup. Open the online play address below to connect.',
  offline:
    'Your device is disconnected. Reconnect to manage your account. Saved credentials are kept.',
  inactive: 'Return to the app to reconnect. Saved credentials are kept.',
  unreachable:
    'Cannot reach the online server. Check that it is running and your device is connected. Saved credentials are kept.',
  'server-error':
    'The online server could not complete the connection check. Try again shortly. Saved credentials are kept.',
};

/** Better Fetch ignores its timeout option when a query supplies an abort signal. */
export async function withConnectionTimeout<T>(
  signal: AbortSignal,
  operation: (signal: AbortSignal) => Promise<T>,
  milliseconds = 15000,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, milliseconds);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
