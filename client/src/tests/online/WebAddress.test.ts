import { describe, expect, it } from 'vitest';
import { localWebAddress } from '../../online/config';

describe('local web account address', () => {
  it('corrects localhost to the configured LAN hostname while preserving the web port and route', () => {
    expect(
      localWebAddress(
        'http://192.168.4.38:8787',
        'http://localhost:8081/account?from=title#account',
        true,
      ),
    ).toBe('http://192.168.4.38:8081/account?from=title#account');
  });
  it('supports computer-only setup and changed local interface aliases', () => {
    expect(localWebAddress('http://localhost:8787', 'http://127.0.0.1:8081/account', true)).toBe(
      'http://localhost:8081/account',
    );
    expect(localWebAddress('http://10.0.0.2:8787', 'http://192.168.1.2:8081/account', true)).toBe(
      'http://10.0.0.2:8081/account',
    );
  });
  it('does not intervene on the canonical hostname or without configured API', () => {
    expect(
      localWebAddress('http://192.168.4.38:8787', 'http://192.168.4.38:8081/account', true),
    ).toBeUndefined();
    expect(localWebAddress(undefined, 'http://localhost:8081/account', true)).toBeUndefined();
  });
  it('keeps production, remote hosts and HTTPS outside local setup advice', () => {
    for (const [api, page, development] of [
      ['http://192.168.4.38:8787', 'http://localhost:8081/account', false],
      ['https://api.example.com', 'https://example.com/account', true],
      ['http://192.168.4.38:8787', 'http://example.com/account', true],
      ['http://example.com', 'http://localhost:8081/account', true],
      ['http://192.168.4.38:8787', 'https://localhost:8081/account', true],
    ] as const)
      expect(localWebAddress(api, page, development)).toBeUndefined();
  });
  it('ignores malformed addresses and credentials', () => {
    for (const api of ['invalid', 'http://user:password@192.168.4.38:8787'])
      expect(localWebAddress(api, 'http://localhost:8081/account', true)).toBeUndefined();
    expect(localWebAddress('http://192.168.4.38:8787', 'invalid', true)).toBeUndefined();
  });
});
