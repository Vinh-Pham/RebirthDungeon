import { openDatabaseAsync } from 'expo-sqlite';
import { SQLiteSaveStorage } from './SQLiteSaveStorage';
export async function createSaveStorage(characterId = 'legacy') {
  const db = await openDatabaseAsync('rebirth-dungeon.db', { useNewConnection: true });
  try { return await new SQLiteSaveStorage(db, characterId).initialize(); }
  catch (error) { await db.closeAsync(); throw error; }
}
