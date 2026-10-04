import type { JourneyObservation, GameplayJourney } from './Gameplay';
import type { HeroFacts } from '../engine/rpg/Character';
import type { FeatureData, GameFeature } from '@rebirth/game-core/online/Features';
import type { Immutable } from '../engine/immutableState';
export type HeroFeature = 'inventory' | 'equipment' | 'skills' | 'quests' | 'titles';
type Keys<K extends HeroFeature> = K extends 'equipment'
  ? 'equipment'
  : K extends HeroFeature
    ? Extract<keyof FeatureData[K], keyof HeroFacts>
    : never;
export type FeatureHero<K extends HeroFeature> = Pick<
  HeroFacts,
  keyof FeatureData['progression'] | keyof FeatureData['resources'] | Keys<K>
>;
export function heroFeatures<K extends HeroFeature>(
  session: GameplayJourney,
  features: readonly K[],
  observation: JourneyObservation,
): FeatureHero<K> {
  if (!session.getFeature) return observation.state.hero as FeatureHero<K>;
  const hero: Record<string, unknown> = { ...observation.state.hero };
  for (const feature of features) {
    const data = session.getFeature(feature);
    if (data === undefined) throw new Error('Character feature has not loaded: ' + feature);
    if (feature === 'equipment') hero.equipment = data;
    else Object.assign(hero, data);
  }
  return hero as FeatureHero<K>;
}
export function characterReviewFeature(session: GameplayJourney, observation: JourneyObservation) {
  const data = observation.statReview ?? session.getFeature?.('stats'),
    hero = observation.state.hero;
  if (!data) return;
  return { ...data, ...hero, statuses: [] };
}
export interface FeatureReadPort {
  getFeature?<K extends GameFeature>(feature: K): Immutable<FeatureData[K]> | undefined;
  loadFeatures?(features: readonly GameFeature[]): Promise<void>;
}
