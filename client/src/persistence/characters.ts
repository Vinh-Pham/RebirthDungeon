import { loadGameContent } from '../data/content';
import { createSaveStorage } from './createSaveStorage';
import { CharacterRepository } from './CharacterRepository';
import { settleJourneySaves } from '../game/JourneyHost';

/** Short-lived menu operations do not leave idle database connections open. */
export async function withCharacters<T>(
  operation: (repository: CharacterRepository) => Promise<T>,
): Promise<T> {
  await settleJourneySaves();
  const repository = new CharacterRepository(await createSaveStorage(), loadGameContent());
  try {
    return await operation(repository);
  } finally {
    await repository.close();
  }
}
