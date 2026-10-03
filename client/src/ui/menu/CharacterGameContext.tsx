import { createContext, useContext } from 'react';
import type { GameplayHost as JourneyHost } from '../../game/Gameplay';
import type { GameplayProfile as CompleteCharacter } from '../../game/Gameplay';

export const CharacterGameContext = createContext<{
  host: JourneyHost;
  profile: CompleteCharacter;
} | null>(null);
export function useCharacterGame() {
  const value = useContext(CharacterGameContext);
  if (!value) throw new Error('Select a character before starting a journey.');
  return value;
}
