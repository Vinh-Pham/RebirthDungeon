import type { z } from 'zod';
import { DeletionResponseSchema } from '@rebirth/game-core/online/Contracts';
import type { OnlineAccess } from './Access';
export class APIError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterMs = 0,
  ) {
    super(message);
  }
}
export class StaleAccessError extends Error {
  constructor() {
    super('The account or connection changed. Reconnect before continuing.');
  }
}
export interface GameAPIOptions {
  origin: string;
  access: OnlineAccess;
  credentials(): Promise<Pick<RequestInit, 'headers' | 'credentials'>>;
  fetch?: typeof fetch;
  onUnauthorized(): void;
  timeoutMs?: number;
}
export class GameAPI {
  readonly origin: string;
  constructor(private options: GameAPIOptions) {
    this.origin = options.origin;
  }
  assertAccount(userId: string) {
    if (!this.options.access.ready() || this.options.access.getSnapshot().userId !== userId)
      throw new StaleAccessError();
  }
  async deleteCharacter(id: string, permanent = false) {
    const result = await this.request(
      '/api/game/characters/' + encodeURIComponent(id) + (permanent ? '/permanent' : ''),
      DeletionResponseSchema,
      undefined,
      undefined,
      'DELETE',
    );
    if (result.characterId !== id || result.permanent !== permanent)
      throw new Error('Unexpected character deletion response');
    return result;
  }
  async request<S extends z.ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    signal?: AbortSignal,
    method: 'GET' | 'POST' | 'DELETE' = body === undefined ? 'GET' : 'POST',
  ): Promise<z.output<S>> {
    const lease = this.options.access.getSnapshot();
    if (!this.options.access.ready()) throw new StaleAccessError();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(abort, this.options.timeoutMs ?? 15000);
    try {
      const credentials = await this.options.credentials();
      if (!this.options.access.matches(lease)) throw new StaleAccessError();
      const headers = new Headers(credentials.headers);
      if (body !== undefined) headers.set('Content-Type', 'application/json');
      const encoded = body === undefined ? undefined : JSON.stringify(body);
      if (encoded !== undefined && new TextEncoder().encode(encoded).length > 4096)
        throw new APIError(413, 'This action exceeds the request size limit.');
      const response = await (this.options.fetch ?? fetch)(this.origin + path, {
        ...credentials,
        headers,
        method,
        body: encoded,
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!this.options.access.matches(lease)) throw new StaleAccessError();
      if (!response.ok) {
        if (response.status === 401) this.options.onUnauthorized();
        let message = 'The server could not complete this request.';
        try {
          const error = (await response.json()) as { message?: unknown };
          if (typeof error.message === 'string') message = error.message;
        } catch {
          /* HTTP status remains authoritative. */
        }
        const retryAfter = Number(response.headers.get('Retry-After'));
        throw new APIError(
          response.status,
          message,
          Number.isFinite(retryAfter) ? Math.max(0, retryAfter * 1000) : 0,
        );
      }
      const result = schema.parse(await response.json());
      if (!this.options.access.matches(lease)) throw new StaleAccessError();
      return result;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
}
export function retryRead(failures: number, error: Error): boolean {
  return (
    failures < 2 &&
    !(error instanceof StaleAccessError) &&
    (!(error instanceof APIError) || error.status >= 500)
  );
}
