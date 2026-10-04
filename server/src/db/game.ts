import { drizzle } from 'drizzle-orm/d1';
import { gameRelations } from './relations.js';
/** Typed relational access for game tooling; runtime snapshots use bounded descriptor-driven D1 batches. */
export const gameDatabase = (database: D1Database) =>
  drizzle(database, { relations: gameRelations });
