import { HeroSchema } from '../engine/rpg/Character';

/** Debug tools share the saved hero's currency limit rather than a UI-only balance. */
export const DEBUG_GOLD_CAP = HeroSchema.shape.gold.maxValue!;
export const DEBUG_GOLD_SHORTCUTS = [100, 1000, 10000] as const;
export type DebugCommand = { type: 'ADD_GOLD'; amount: number };

export function debugGoldError(gold: number, amount: number): string | undefined {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > DEBUG_GOLD_CAP)
    return 'Enter a positive whole-number gold amount within the gold cap.';
  if (gold + amount > DEBUG_GOLD_CAP)
    return `This addition would exceed the ${DEBUG_GOLD_CAP.toLocaleString()} gold cap.`;
}

export function validateDebugCommand(command: DebugCommand, gold: number): void {
  if (command?.type !== 'ADD_GOLD') throw new Error('Invalid debug command');
  const error = debugGoldError(gold, command.amount);
  if (error) throw new Error(error);
}
