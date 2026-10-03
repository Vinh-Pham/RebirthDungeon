import { BattleSession as CoreBattleSession } from '@rebirth/game-core/game/BattleSession';
import { PresentationQueue } from '../renderer/animations/PresentationQueue';
export * from '@rebirth/game-core/game/BattleSession';
export class BattleSession extends CoreBattleSession {
  constructor(...args: ConstructorParameters<typeof CoreBattleSession>) {
    args[9] = (engine) => new PresentationQueue(engine);
    super(...args);
  }
}
