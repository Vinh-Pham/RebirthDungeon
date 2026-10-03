import { describe, expect, it } from 'vitest';
import { APIError, StaleAccessError, retryRead } from '../../online/API';
import {
  authenticationError,
  withConnectionTimeout,
  connectionStatus,
  UnreachableServerError,
} from '../../online/ConnectionStatus';
const base = { configured: true, online: true, foreground: true, fetching: false, verified: false };
describe('account connection feedback', () => {
  it('separates missing and invalid setup from signed-out and verified sessions', () => {
    expect(connectionStatus({ ...base, configured: false })).toBe('missing-configuration');
    expect(connectionStatus({ ...base, configured: false, configurationError: 'invalid' })).toBe(
      'invalid-configuration',
    );
    expect(
      connectionStatus({
        ...base,
        webAddress: 'http://192.168.4.38:8081/account',
        error: new TypeError('Failed to fetch'),
      }),
    ).toBe('wrong-web-address');
    expect(connectionStatus(base)).toBe('signed-out');
    expect(connectionStatus({ ...base, verified: true })).toBe('ready');
  });
  it('separates device disconnection, unreachable servers and HTTP failures', () => {
    expect(connectionStatus({ ...base, online: false })).toBe('offline');
    expect(connectionStatus({ ...base, foreground: false })).toBe('inactive');
    expect(connectionStatus({ ...base, error: new TypeError('Failed to fetch') })).toBe(
      'unreachable',
    );
    expect(connectionStatus({ ...base, error: new APIError(503, 'unavailable') })).toBe(
      'server-error',
    );
    expect(
      connectionStatus({ ...base, fetching: true, error: new APIError(503, 'unavailable') }),
    ).toBe('connecting');
    expect(connectionStatus({ ...base, error: new StaleAccessError() })).toBe('signed-out');
  });
  it('treats SDK status zero as transport failure and bounds read retries', () => {
    for (const status of [undefined, 0]) {
      const error = authenticationError({ status, message: 'fetch failed' }, 'fallback');
      expect(error).toBeInstanceOf(UnreachableServerError);
      expect(retryRead(0, error)).toBe(true);
      expect(retryRead(2, error)).toBe(false);
    }
    const invalid = authenticationError(
      { status: 401, message: 'Invalid credentials' },
      'fallback',
    );
    expect(invalid).toBeInstanceOf(APIError);
    expect(invalid.message).toBe('Invalid credentials');
    expect(retryRead(0, invalid)).toBe(false);
  });
});

it('bounds session checks and forwards query cancellation', async () => {
  const request = (signal: AbortSignal) =>
    new Promise<void>((_, reject) => {
      if (signal.aborted) reject(new Error('aborted'));
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  const controller = new AbortController();
  await expect(withConnectionTimeout(controller.signal, request, 10)).rejects.toThrow('aborted');
  const pending = withConnectionTimeout(controller.signal, request, 10000);
  controller.abort();
  await expect(pending).rejects.toThrow('aborted');
  await expect(withConnectionTimeout(controller.signal, request)).rejects.toThrow('aborted');
});
