/**
 * App-scoped Effect runtime (composition root). Route-scoped work — fibers
 * that should end when the owning screen/run ends — runs on this runtime and
 * must be interrupted by the owning route on unmount, never left dangling.
 * Services (Phase 7) will be added as layers here.
 */

import { Layer, ManagedRuntime } from 'effect';

export const appRuntime = ManagedRuntime.make(Layer.empty);
