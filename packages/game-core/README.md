# Shared game core

`@rebirth/game-core` owns the bundled catalog, deterministic RNG, content and save
validators, RPG rules, and headless journey/combat execution. Both Expo and the
Worker import these TypeScript sources. `client/src/engine`, data TypeScript
modules, and save validators are compatibility re-exports; edit this package's
owning modules and JSON catalog rather than duplicating rules in the client.

React Native, storage adapters, audio, animations, and presentation timers stay in
`client`. Client session wrappers inject its existing presentation queue. The
shared sessions default to immediate headless presentation. Local saves and their
manual rewind behavior are unchanged; online persistence uses relational server
codecs and never accepts a local save upload.

`online/Contracts.ts` defines strict public commands and versioned views.
`online/Runtime.ts` runs candidates with explicitly supplied server time and
provides read-only previews/views. Reads never advance persistent RNG or award
progression. `game/BattlePersistence.ts` validates format 1 battle state at stable
boundaries, including actors, resources, statuses, wear, consumptions, defending,
turn cursor, RNG, enemy history, and pending evidence. Local-save serialization
helpers still accept an explicit saved-at timestamp and default it for existing
local callers; authoritative execution supplies time at the server boundary.

`game/PresentationCollector.ts` gathers version 1 receipt animation facts without timers or RNG. `online/BattleAvailability.ts` derives legal actions, targets, and preview calculations without advancing battle state. The public encounter includes these projections; its ID is independent of the private seed. Public dungeon HUD and object art reveal only currently visible progress. Exploration `USE_ITEM` is restricted to the owning hero. The client consumes these contracts through read-only gameplay ports; see [online client architecture](../../client/docs/online-play.md).

Run `pnpm format`, `pnpm typecheck`, `pnpm lint`, and `pnpm test` from the workspace
root. Client game specifications remain in `client/docs`; see `server/README.md`
for the online API, idempotency rules, storage design, and release steps.
