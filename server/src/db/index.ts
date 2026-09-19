import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

/** Create a Drizzle instance backed by a Cloudflare D1 binding. */
export function createDb(d1: D1Database) {
    return drizzle(d1, { schema });
}

export { schema };