/** Bundled content fixture for portable engine tests; server execution injects D1 content. */
import { loadGameContent } from '../data/content';
import { createOnlineRuntime } from './Runtime';
export const gameContent = loadGameContent();
export const { newOnlineState, execute, preview, publicView, validateOnlineState } =
  createOnlineRuntime(gameContent);
