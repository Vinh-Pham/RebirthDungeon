import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readSetup, assertFreePort, workspace } from './online-config.mjs';
import { forwardWorker, internalPort } from './online-forwarder.mjs';

export function applicationCommands(
  config,
  root = workspace,
  environment = process.env,
) {
  return [
    {
      name: 'API',
      cwd: resolve(root, 'server'),
      args: [
        'exec',
        'wrangler',
        'dev',
        '--local',
        '--ip',
        '127.0.0.1',
        '--port',
        String(config.workerPort ?? config.apiPort),
        '--show-interactive-dev-session=false',
        ...(environment.LOCAL_D1_STATE
          ? ['--persist-to', resolve(environment.LOCAL_D1_STATE)]
          : []),
      ],
      env: { ...environment, WRANGLER_SEND_METRICS: 'false' },
    },
    {
      name: 'Expo',
      cwd: resolve(root, 'client'),
      args: [
        'exec',
        'expo',
        'start',
        '--web',
        config.host === 'localhost' ? '--localhost' : '--lan',
        '--port',
        String(config.webPort),
      ],
      env: {
        ...environment,
        NODE_ENV: 'development',
        BROWSER: 'none',
        EXPO_PUBLIC_API_URL: config.apiURL,
        REACT_NATIVE_PACKAGER_HOSTNAME: config.host,
        EXPO_OFFLINE: '1',
      },
    },
  ];
}
export async function runApplications(
  commands,
  {
    spawnChild = spawn,
    signals = process,
    log = console.log,
    stopTimeout = 3000,
    onStop = () => {},
  } = {},
) {
  const children = [];
  let stopping = false,
    result = 0;
  let finish;
  const completed = new Promise((accept) => {
    finish = accept;
  });
  const kill = (child, signal) => {
    try {
      if (process.platform !== 'win32' && child.pid)
        process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) {
      if (error.code !== 'ESRCH') log('Unable to stop a development process.');
    }
  };
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    result = code;
    onStop();
    for (const child of children) kill(child, 'SIGTERM');
    const timer = setTimeout(() => {
      // Kill each process group even if its wrapper exited before a grandchild.
      for (const child of children) kill(child, 'SIGKILL');
      finish(result);
    }, stopTimeout);
    timer.unref();
    Promise.all(
      children.map((child) =>
        child.exitCode !== null || child.signalCode !== null
          ? undefined
          : new Promise((accept) => child.once('exit', accept)),
      ),
    ).then(() => {
      clearTimeout(timer);
      for (const child of children) kill(child, 'SIGKILL');
      finish(result);
    });
  };
  const interrupt = () => stop(0);
  signals.on('SIGINT', interrupt);
  signals.on('SIGTERM', interrupt);
  try {
    for (const command of commands) {
      const child = spawnChild(command.executable ?? 'pnpm', command.args, {
        cwd: command.cwd,
        env: command.env,
        stdio: ['ignore', 'inherit', 'inherit'],
        detached: process.platform !== 'win32',
      });
      children.push(child);
      child.once('error', () => {
        log(`${command.name} could not start. Check installed dependencies.`);
        stop(1);
      });
      child.once('exit', (code) => {
        if (!stopping) {
          log(`${command.name} stopped; shutting down both applications.`);
          stop(code || 1);
        }
      });
    }
    return await completed;
  } catch (error) {
    stop(1);
    await completed;
    throw error;
  } finally {
    signals.off('SIGINT', interrupt);
    signals.off('SIGTERM', interrupt);
  }
}
export async function dev({
  root = workspace,
  environment = process.env,
  args = process.argv.slice(2),
  log = console.log,
} = {}) {
  const { values } = parseArgs({
    args,
    options: { help: { type: 'boolean' } },
  });
  if (values.help) {
    log(
      'pnpm online:dev — validates local setup and starts API + Expo. Configure with pnpm online:setup.',
    );
    return 0;
  }
  const config = await readSetup(root, environment);
  await assertFreePort(
    config.host === 'localhost' ? '127.0.0.1' : config.host,
    config.apiPort,
  );
  await assertFreePort('0.0.0.0', config.webPort);
  log(
    `Open ${config.webURL} in your browser. Use this hostname rather than localhost to keep cookies working.`,
  );
  log(
    `API: ${config.apiURL}. ${config.host === 'localhost' ? 'Computer-only mode.' : 'LAN mode: connect your SDK 57 development build on the same network.'}`,
  );
  log('Press Ctrl+C to stop both applications.');
  // workerd LAN sockets can stall on macOS; Node forwards through loopback without changing the public address.
  const forwarder =
    config.host === 'localhost'
      ? undefined
      : await forwardWorker({
          host: config.host,
          port: config.apiPort,
          workerPort: (config.workerPort = await internalPort()),
        });
  try {
    return await runApplications(
      applicationCommands(config, root, environment),
      {
        log,
        onStop: () => {
          void forwarder?.close();
        },
      },
    );
  } finally {
    await forwarder?.close();
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await dev();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
