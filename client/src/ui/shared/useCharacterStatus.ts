import { useSyncExternalStore } from 'react';
import type { GameplayHost as JourneyHost } from '../../game/Gameplay';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { characterReviewFeature, heroFeatures } from '../../game/FeatureReads';
import { characterExperience, characterReview } from './characterStatus';

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;

/** Subscribe to resolved observations only, including replacement sessions and encounters. */
export function useCharacterStatus(host: JourneyHost, session: JourneySession) {
  const hosted = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  const campaign = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const battle = useSyncExternalStore(
    hosted.battle?.subscribe ?? noSubscribe,
    hosted.battle?.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  const hero = campaign.state.hero;
  const effects = campaign.state.dungeon?.effects;
  const review =
    battle?.character ??
    characterReviewFeature(session, campaign) ??
    characterReview(
      heroFeatures(session, ['inventory', 'equipment', 'skills', 'titles'], campaign),
      host.content,
      effects,
    );
  return {
    hero,
    review,
    experience: characterExperience(hero),
  };
}
