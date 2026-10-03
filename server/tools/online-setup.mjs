import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  addresses,
  validateHost,
  setupArguments,
  envFile,
  envValues,
  patchEnv,
  saveEnv,
  validateSecret,
  settings,
  changedSettings,
  checkOverrides,
  workspace,
} from './online-config.mjs';
import { initializeLocalDatabase } from './online-database.mjs';

export async function setup({
  args = process.argv.slice(2),
  root = workspace,
  environment = process.env,
  available = addresses(),
  interactive = !!process.stdin.isTTY && !!process.stdout.isTTY,
  ask,
  initialize = initializeLocalDatabase,
  log = console.log,
} = {}) {
  const options = setupArguments(args);
  if (options.help) {
    log(
      'pnpm online:setup [--host <private IPv4|localhost>] [--api-port 8787] [--web-port 8081] [--yes]',
    );
    return;
  }
  let prompt;
  ask ??= async (question) => {
    prompt ??= createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return prompt.question(question);
  };
  try {
    let host = options.host;
    if (!host) {
      if (!interactive)
        throw new Error(
          'Noninteractive setup requires --host <private IPv4|localhost>.',
        );
      log(
        'Choose the address for web and mobile (phone and computer must share a network):',
      );
      available.forEach((entry, index) =>
        log(`${index + 1}. ${entry.address} (${entry.name})`),
      );
      log(
        `${available.length + 1}. localhost (this computer only; phones cannot connect)`,
      );
      const answer =
        (
          await ask(
            `Address [${available.length ? '1' : available.length + 1}]: `,
          )
        ).trim() || '1';
      host = /^\d+$/.test(answer)
        ? [...available.map((entry) => entry.address), 'localhost'][
            Number(answer) - 1
          ]
        : answer;
    }
    validateHost(host, available);
    const paths = {
      client: resolve(root, 'client/.env.local'),
      server: resolve(root, 'server/.dev.vars'),
    };
    const texts = {
      client: await envFile(paths.client),
      server: await envFile(paths.server),
    };
    const existing = {
      client: envValues(texts.client),
      server: envValues(texts.server),
    };
    validateSecret(existing.server.BETTER_AUTH_SECRET);
    const next = settings(host, options.apiPort, options.webPort);
    const secret = existing.server.BETTER_AUTH_SECRET?.trim()
      ? existing.server.BETTER_AUTH_SECRET
      : randomBytes(32).toString('base64url');
    checkOverrides(environment, {
      ...next.client,
      ...next.server,
      BETTER_AUTH_SECRET: secret,
    });
    for (const file of ['.env.development.local', '.env.development', '.env'])
      checkOverrides(
        envValues(await envFile(resolve(root, 'client', file))),
        next.client,
      );
    const changed = [
      ...changedSettings(existing.client, next.client),
      ...changedSettings(existing.server, next.server),
    ];
    const output = {
      client: patchEnv(texts.client, next.client),
      server: patchEnv(texts.server, {
        ...next.server,
        BETTER_AUTH_SECRET: secret,
      }),
    };
    if (changed.length && !options.yes) {
      if (!interactive)
        throw new Error(
          `Existing connection settings would change (${changed.join(', ')}). Rerun with --yes to confirm.`,
        );
      log(
        `Update ${changed.join(', ')} to API ${next.client.EXPO_PUBLIC_API_URL} and web http://${host}:${options.webPort}?`,
      );
      if (!/^y(es)?$/i.test((await ask('Confirm [y/N]: ')).trim())) {
        log('Setup cancelled; settings and database left unchanged.');
        return;
      }
    }
    // Inspect legacy state and migrate before changing connection files. No baselining or reset is authorized here.
    await initialize(
      resolve(root, 'server'),
      environment.LOCAL_D1_STATE && resolve(environment.LOCAL_D1_STATE),
    );
    for (const kind of ['client', 'server'])
      if (output[kind] !== texts[kind])
        await saveEnv(paths[kind], output[kind]);
    log(
      `Local online play configured. API: ${next.client.EXPO_PUBLIC_API_URL}`,
    );
    log(
      `Browser: http://${host}:${options.webPort} (use this same hostname for session cookies)`,
    );
    log(
      host === 'localhost'
        ? 'Computer-only mode. Rerun setup with a LAN address to use a phone.'
        : 'Use an SDK 57 native development build on the same network.',
    );
    log(
      'Run pnpm online:dev. Restart development sessions and fully reload the app after configuration changes.',
    );
  } finally {
    prompt?.close();
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await setup();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
