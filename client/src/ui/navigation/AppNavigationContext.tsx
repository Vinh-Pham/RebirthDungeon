import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import type { GameplayHost as JourneyHost } from '../../game/Gameplay';
import type { GameplayProfile as CompleteCharacter } from '../../game/Gameplay';
import { CharacterWindow } from '../menu/CharacterWindow';

export interface ActiveGame {
  host: JourneyHost;
  profile: CompleteCharacter;
  leave(): Promise<boolean>;
}
interface NavigationValue {
  game?: ActiveGame;
  statsOpen: boolean;
  error?: string;
  menuTrigger: React.RefObject<View | null>;
  registerGame(game: ActiveGame): () => void;
  openStats(): void;
  closeStats(): void;
  characters(): Promise<void>;
}
const NavigationContext = createContext<NavigationValue | null>(null);

export function AppNavigationProvider({ children }: PropsWithChildren) {
  const [game, setGame] = useState<ActiveGame>();
  const [statsOpen, setStatsOpen] = useState(false);
  const [error, setError] = useState<string>();
  const menuTrigger = useRef<View>(null);
  const registerGame = useCallback((next: ActiveGame) => {
    setGame(next);
    setError(undefined);
    return () => {
      setGame((current) => (current === next ? undefined : current));
      setStatsOpen(false);
    };
  }, []);
  const openStats = useCallback(() => {
    if (game?.host.getSnapshot().session) setStatsOpen(true);
  }, [game]);
  const closeStats = useCallback(() => {
    setStatsOpen(false);
    menuTrigger.current?.focus();
  }, []);
  const characters = useCallback(async () => {
    setStatsOpen(false);
    setError(undefined);
    if (!game) {
      router.dismissTo('/online/characters');
      return;
    }
    try {
      if (!(await game.leave()))
        setError('Your latest progress could not be saved. Please try again.');
    } catch (failure: unknown) {
      setError(
        failure instanceof Error ? failure.message : 'Your latest progress could not be saved.',
      );
    }
  }, [game]);
  const value = useMemo(
    () => ({
      game,
      statsOpen,
      error,
      menuTrigger,
      registerGame,
      openStats,
      closeStats,
      characters,
    }),
    [game, statsOpen, error, registerGame, openStats, closeStats, characters],
  );
  return (
    <NavigationContext value={value}>
      {children}
      {game && statsOpen ? (
        <CharacterWindow host={game.host} profile={game.profile} isOpen close={closeStats} />
      ) : null}
    </NavigationContext>
  );
}
export function useAppNavigation() {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error('Navigation requires the app navigation provider.');
  return navigation;
}
