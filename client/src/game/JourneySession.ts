import { JourneySession as CoreJourneySession } from '@rebirth/game-core/game/JourneySession';
import { PresentationQueue } from '../renderer/animations/PresentationQueue';
export * from '@rebirth/game-core/game/JourneySession';
export class JourneySession extends CoreJourneySession {
  constructor(...args: ConstructorParameters<typeof CoreJourneySession>) {
    args[6] = (engine) => new PresentationQueue(engine);
    super(...args);
  }
}
