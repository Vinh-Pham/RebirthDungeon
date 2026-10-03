import { networkInterfaces } from 'node:os';
import { parseArgs, parseEnv } from 'node:util';
import { readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { isIP, createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspace = fileURLToPath(new URL('../../', import.meta.url));
export function privateIPv4(address) {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return (
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  );
}
export function addresses(interfaces = networkInterfaces()) {
  return Object.entries(interfaces)
    .flatMap(([name, entries]) =>
      (entries ?? [])
        .filter((entry) => !entry.internal && privateIPv4(entry.address))
        .map((entry) => ({ name, address: entry.address })),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.address.localeCompare(b.address),
    );
}
export function validateHost(host, available = addresses()) {
  if (
    host !== 'localhost' &&
    (!privateIPv4(host) || !available.some((entry) => entry.address === host))
  )
    throw new Error(
      'Choose localhost or a private IPv4 address currently on this computer. Rerun pnpm online:setup after changing networks.',
    );
  return host;
}
export function port(value, label) {
  if (
    !/^\d+$/.test(String(value)) ||
    Number(value) < 1 ||
    Number(value) > 65535
  )
    throw new Error(`${label} must be an integer from 1 to 65535.`);
  return Number(value);
}
export function setupArguments(args) {
  const { values } = parseArgs({
    args,
    options: {
      host: { type: 'string' },
      'api-port': { type: 'string', default: '8787' },
      'web-port': { type: 'string', default: '8081' },
      yes: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  const apiPort = port(values['api-port'], 'API port'),
    webPort = port(values['web-port'], 'Web port');
  if (apiPort === webPort)
    throw new Error('API and web ports must be different.');
  return {
    host: values.host,
    apiPort,
    webPort,
    yes: values.yes,
    help: values.help,
  };
}
export async function envFile(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}
export function envValues(text) {
  return parseEnv(text);
}
export function patchEnv(text, updates) {
  for (const [key, value] of Object.entries(updates)) {
    // Match whole assignments, including quoted multiline values; leave unrelated text intact.
    const pattern = new RegExp(
      `^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[ \\t]*(?:'[^']*'|"(?:\\\\.|[^"])*"|[^\\r\\n]*)(?:[ \\t]*#[^\\r\\n]*)?\\r?$`,
      'gm',
    );
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 1)
      throw new Error(
        `Duplicate ${key} settings; remove duplicates before running setup.`,
      );
    if (matches.length && envValues(text)[key] === value) continue;
    const assignment = `${key}='${value}'`;
    if (value.includes("'") || value.includes('\n'))
      throw new Error(`Cannot write ${key}.`);
    text = matches.length
      ? text.replace(pattern, () => assignment)
      : `${text}${text && !text.endsWith('\n') ? '\n' : ''}${assignment}\n`;
  }
  return text;
}
export async function saveEnv(path, text) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, text, { mode: 0o600 });
  await rename(temporary, path);
  await chmod(path, 0o600);
}
export function validateSecret(value) {
  if (value?.trim() && Buffer.byteLength(value) < 32)
    throw new Error(
      'Existing BETTER_AUTH_SECRET is invalid: at least 32 bytes are required. Correct it explicitly; setup will not rotate it.',
    );
}
export function settings(host, apiPort, webPort) {
  const apiURL = new URL(`http://${host}:${apiPort}`).origin;
  const webURL = new URL(`http://${host}:${webPort}`).origin;
  return {
    client: {
      EXPO_PUBLIC_API_URL: apiURL,
      LOCAL_ONLINE_WEB_PORT: String(webPort),
    },
    server: {
      BETTER_AUTH_URL: apiURL,
      BETTER_AUTH_TRUSTED_ORIGINS: JSON.stringify([
        'rebirthdungeon://',
        webURL,
      ]),
    },
  };
}
export function changedSettings(previous, next) {
  return Object.keys(next).filter(
    (key) => previous[key] !== undefined && previous[key] !== next[key],
  );
}
export function checkOverrides(environment, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (environment[key] !== undefined && environment[key] !== value)
      throw new Error(
        `Conflicting ${key} override. Remove it and rerun pnpm online:setup.`,
      );
  }
  for (const key of [
    'EXPO_NO_DOTENV',
    'EXPO_NO_CLIENT_ENV_VARS',
    'EXPO_PACKAGER_PROXY_URL',
    'REACT_NATIVE_PACKAGER_HOSTNAME',
    'WRANGLER_ENV',
    'CLOUDFLARE_ENV',
  ]) {
    if (environment[key] && environment[key] !== '0')
      throw new Error(
        `${key} conflicts with the local online launcher. Unset it and rerun pnpm online:setup.`,
      );
  }
  if (environment.NODE_ENV && environment.NODE_ENV !== 'development')
    throw new Error('online:dev requires NODE_ENV=development or unset.');
}
export async function readSetup(
  root = workspace,
  environment = process.env,
  available = addresses(),
) {
  const client = envValues(await envFile(resolve(root, 'client/.env.local')));
  const server = envValues(await envFile(resolve(root, 'server/.dev.vars')));
  let url;
  try {
    url = new URL(client.EXPO_PUBLIC_API_URL);
  } catch {
    throw new Error(
      'Online configuration is missing or invalid. Run pnpm online:setup.',
    );
  }
  if (
    url.protocol !== 'http:' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error(
      'The local launcher needs an HTTP API origin. Run pnpm online:setup.',
    );
  const host = validateHost(url.hostname, available);
  const apiPort = port(url.port || '80', 'API port'),
    webPort = port(client.LOCAL_ONLINE_WEB_PORT, 'Web port');
  if (apiPort === webPort)
    throw new Error('API and web ports must be different.');
  validateSecret(server.BETTER_AUTH_SECRET);
  if (!server.BETTER_AUTH_SECRET?.trim())
    throw new Error('Missing BETTER_AUTH_SECRET. Run pnpm online:setup.');
  const expected = settings(host, apiPort, webPort);
  if (
    server.BETTER_AUTH_URL !== expected.server.BETTER_AUTH_URL ||
    client.EXPO_PUBLIC_API_URL !== expected.client.EXPO_PUBLIC_API_URL
  )
    throw new Error(
      'Client and server addresses differ. Run pnpm online:setup.',
    );
  let origins;
  try {
    origins = JSON.parse(server.BETTER_AUTH_TRUSTED_ORIGINS);
  } catch {
    /* explained below */
  }
  if (
    !Array.isArray(origins) ||
    !origins.includes('rebirthdungeon://') ||
    !origins.includes(new URL(`http://${host}:${webPort}`).origin) ||
    origins.some(
      (origin) =>
        typeof origin !== 'string' ||
        origin.includes('*') ||
        (origin !== 'rebirthdungeon://' && !validOrigin(origin)),
    )
  )
    throw new Error(
      'Trusted origins are invalid or do not include the web app and rebirthdungeon://. Run pnpm online:setup.',
    );
  checkOverrides(environment, { ...expected.client, ...server });
  // Expo's development-specific file takes precedence over .env.local. Reject ambiguous settings in every active file.
  for (const file of ['.env.development.local', '.env.development', '.env']) {
    const values = envValues(await envFile(resolve(root, 'client', file)));
    checkOverrides(values, expected.client);
  }
  return {
    host,
    apiPort,
    webPort,
    apiURL: url.origin,
    webURL: new URL(`http://${host}:${webPort}`).origin,
  };
}
function validOrigin(value) {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/' &&
      url.origin === value
    );
  } catch {
    return false;
  }
}
export async function assertFreePort(host, value) {
  const server = createServer();
  await new Promise((accept, reject) => {
    server.once('error', () =>
      reject(
        new Error(
          `Port ${value} is unavailable on ${host}. Stop its application or rerun pnpm online:setup with another port.`,
        ),
      ),
    );
    // Expo listens on all interfaces, so reserve/check the complete IPv4 listener.
    server.listen(value, host, accept);
  });
  await new Promise((accept) => server.close(accept));
}
