import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { argon2id, setWASMModules } from 'argon2-wasm-edge';
import { getPlatformProxy } from 'wrangler';

const require = createRequire(import.meta.url);
export const SEED_EMAIL = 'player@example.invalid';
export const SEED_PASSWORD = 'local-development-password';

export async function seedLocal(db) {
  const existing = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(SEED_EMAIL)
    .first();
  if (existing) return false;

  const [argon2WASM, blake2bWASM] = await Promise.all(
    ['argon2', 'blake2b'].map(async (name) =>
      WebAssembly.compile(
        await readFile(require.resolve(`argon2-wasm-edge/wasm/${name}.wasm`)),
      ),
    ),
  );
  await setWASMModules({ argon2WASM, blake2bWASM });
  const passwordHash = await argon2id({
    password: SEED_PASSWORD,
    salt: randomBytes(16),
    memorySize: 19456,
    iterations: 2,
    parallelism: 1,
    hashLength: 32,
    outputType: 'encoded',
  });
  const now = Date.now();
  const result = await db
    .prepare(
      'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING',
    )
    .bind(randomUUID(), SEED_EMAIL, passwordHash, now, now)
    .run();
  return result.meta.changes > 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 2) {
    throw new Error(
      'This seed command accepts no arguments and only seeds local D1.',
    );
  }
  const proxy = await getPlatformProxy({
    configPath: 'wrangler.jsonc',
    remoteBindings: false,
    persist: process.env.LOCAL_D1_STATE
      ? { path: process.env.LOCAL_D1_STATE }
      : true,
  });
  try {
    const inserted = await seedLocal(proxy.env.DB);
    console.log(
      inserted
        ? `Created local development account: ${SEED_EMAIL}`
        : 'Local development account already exists; left it unchanged.',
    );
  } finally {
    await proxy.dispose();
  }
}
