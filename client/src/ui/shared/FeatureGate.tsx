import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { GameplayJourney } from '../../game/Gameplay';
import type { GameFeature } from '@rebirth/game-core/online/Features';
import { DungeonButton, DungeonLoading, DungeonNotice } from './DungeonUI';
/** Feature screens mount only after their real slices agree with the journey revision. */
export default function FeatureGate({
  session,
  features,
  children,
}: {
  session: GameplayJourney;
  features: readonly GameFeature[];
  children: ReactNode;
}) {
  const observation = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const ready =
    !session.getFeature ||
    features.every((feature) => observation.availableFeatures?.includes(feature));
  const key = features.join(',');
  useEffect(() => {
    if (ready) return;
    let active = true;
    void session.loadFeatures?.(key.split(',') as GameFeature[]).catch((failure) => {
      if (active)
        setError(failure instanceof Error ? failure.message : 'Character features unavailable');
    });
    return () => {
      active = false;
    };
  }, [session, key, observation.revision, ready, attempt]);
  if (ready) return children;
  return error ? (
    <>
      <DungeonNotice message={error} />
      <DungeonButton
        label="Retry"
        onPress={() => {
          setError(undefined);
          setAttempt((value) => value + 1);
        }}
      />
    </>
  ) : (
    <DungeonLoading label="Loading character features" />
  );
}
