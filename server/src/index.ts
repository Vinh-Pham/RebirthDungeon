import { Hono } from 'hono';
import { createDb } from './db';
import { players } from './db/schema';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get('/', (c) => {
    return c.json({
        name: 'rebirth-dungeon server',
        status: 'ok',
        bindings: { db: !!c.env.DB, cache: !!c.env.CACHE },
    });
});

// --- Players (D1 via Drizzle) ---

app.get('/players', async (c) => {
    const db = createDb(c.env.DB);
    const allPlayers = await db.select().from(players);
    return c.json(allPlayers);
});

app.post('/players', async (c) => {
    const body = await c.req.json<{ name?: unknown }>().catch(() => undefined);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
        return c.json({ error: 'name is required' }, 400);
    }

    const db = createDb(c.env.DB);
    const [player] = await db.insert(players).values({ id: crypto.randomUUID(), name }).returning();

    return c.json(player, 201);
});

// --- Dungeon run cache (KV) ---

app.get('/runs/:playerId', async (c) => {
    const key = `runs:${c.req.param('playerId')}`;
    const run = await c.env.CACHE.get(key, 'json');
    if (run === null) {
        return c.json({ error: 'run not found' }, 404);
    }
    return c.json(run);
});

app.put('/runs/:playerId', async (c) => {
    const key = `runs:${c.req.param('playerId')}`;
    const run = await c.req.json().catch(() => undefined);
    if (run === undefined) {
        return c.json({ error: 'a JSON body is required' }, 400);
    }
    await c.env.CACHE.put(key, JSON.stringify(run));
    return c.json({ key, cached: true }, 201);
});

app.onError((err, c) => {
    return c.json({ error: err.message }, 500);
});

export default app;