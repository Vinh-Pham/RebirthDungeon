import {
  err,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  unwrapOr,
} from '@/core/utils/result';

describe('Result', () => {
  it('wraps success values', () => {
    const result = ok(42);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('wraps errors without a value', () => {
    const result = err('boom');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('boom');
    }
  });

  it('maps success values and leaves errors untouched', () => {
    expect(map(ok(2), (v) => v * 10)).toEqual({ ok: true, value: 20 });
    expect(map(err('nope'), (v: number) => v * 10)).toEqual({
      ok: false,
      error: 'nope',
    });
  });

  it('maps errors and leaves success values untouched', () => {
    expect(mapErr(err(1), (e) => `code-${e}`)).toEqual({
      ok: false,
      error: 'code-1',
    });
    expect(mapErr(ok('fine'), (e: number) => `code-${e}`)).toEqual({
      ok: true,
      value: 'fine',
    });
  });

  it('unwraps with a fallback', () => {
    expect(unwrapOr(ok(7), 0)).toBe(7);
    expect(unwrapOr(err('bad'), 0)).toBe(0);
  });
});
