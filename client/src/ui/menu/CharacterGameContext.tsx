import { createContext, useContext } from 'react';
import type { JourneyHost } from '../../game/JourneyHost';
import type { CompleteCharacter } from '../../persistence/CharacterProfile';

export const CharacterGameContext = createContext<{
  host: JourneyHost;
  profile: CompleteCharacter;
} | null>(null);
export function useCharacterGame() {
  const value = useContext(CharacterGameContext);
  if (!value) throw new Error('Select a character before starting a journey.');
  return value;
}
