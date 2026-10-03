# Character action logs

Implemented October 2, 2026. Logs are a transient journal of the selected character's current visit. Every supported typed gameplay command is observed after dispatch, including rejected commands, together with every gameplay event. Presentation-only animation requests, rendering, scrolling, audio playback, and reading/filtering/clearing the journal do not produce messages. No future system mechanics are implied by the System category.

## Journal and categories

The drawer's **Logs** destination shares the active `CharacterGameContext` and `JourneyHost`; it does not create a campaign or advance a turn. Its tabs are **All, Combat, Movement, User, System**. Each entry has exactly one primary category; All shows every entry once, newest first. Ordering uses a monotonically increasing sequence even if the device clock moves backward.

- Combat: encounter commands and resolved events, including selection/cancellation, enemy decisions, damage/misses, skill/item use, defenses, resource/status changes, deaths, results and durable encounter settlement.
- Movement: exploration steps, travel requests, map changes, dungeon entry/offering and exit. Each accepted travel step keeps its own receipt and event.
- User: town services, equipment/inventory, quests, skills, titles, debug requests, save/load/retry requests, screen navigation, Stats, sound preferences, journal/detail/filter interactions and battle action inspection. Battle action inspections use User; resolving an action uses Combat.
- System: automatic Rest recovery outside battle, exploration resource ticks, automatic saves, journey initialization, app background transitions and host operation failures. The exhaustive command/event maps in `GameActionLogging.ts` require classification when a new union member is added.

Rows show an immutable message, primary category and a full local timestamp formatted with date-fns as `MMM d, yyyy 'at' h:mm:ss a`. **Clear logs** discards the entire journal from every tab and does not add a clear message. The empty state remains until another game action occurs. Rows have no editing or individual deletion controls.

## Ownership and extension

`src/engine/logging/LogEngine.ts` is headless and independent of React, storage and the device clock. Construct it with an explicit `() => number` epoch-millisecond clock; `OnlineGameplayHost` injects `Date.now`. `append` accepts a batch of typed `LogInput` messages; `LogSink` permits adapters. Input validation creates detached plain JSON metadata and deep-freezes entries, snapshots and chunks. Invalid batches or clocks publish nothing. Existing entries can never be changed through the public API, including after clear. This is runtime immutability, not a cryptographic audit service.

`getSnapshot` is stable until append/clear and subscriptions are cleaned up on disposal. Append shares completed 128-entry chunks. No history is silently evicted; the UI virtualizes rows. `appendLogs` isolates sink failures from gameplay. `observeGameLogging` formats command receipts and events, batches a nested dispatch into one publication, and excludes animation-only events. Producers add messages through the host's character-enriched sink or `recordLog(category, type, message)`. Engine code never reads the clock for rules or consumes RNG to log.

Messages include stable sequence IDs, timestamps, event/command types and optional character, encounter, actor/action IDs and detached JSON metadata. Timestamping occurs when a batch is published; staged durable results receive their publication timestamp. Inspection handlers log explicitly when invoked, never from view projection or rendering.

## Saves and character lifetime

Ordinary exploration and live battle logs report the accepted in-memory action immediately. A battle journal can therefore contain an attempt later restarted from its checkpoint. Progression/transaction/encounter settlement candidates retain detached messages and events privately until their save succeeds. Failures and retry requests appear immediately; the identical retained candidate publishes its success receipts/events once after a successful write. Log observation cannot reject a committed action or authorize replay after a notification failure.

History survives host session replacement, slot loading, battle entry/exit, and feature navigation during the visit. Manual clearing changes neither gameplay nor storage. Successfully leaving the character clears the journal; a failed exit save keeps it available. Disposing the character host also releases its history, and obsolete asynchronous writes cannot repopulate it. Reopening a character or reloading the app begins a new journal.

Logs are never serialized into campaign saves, profiles, settings, IndexedDB, SQLite, or another storage adapter. Save version 13 and migrations are unchanged. The host supplies context to all game messages; no global cross-character journal exists.

## Verification

Engine logging tests cover deep ownership, invalid batch atomicity, category filtering, backward clocks, stable IDs, retained immutable snapshots, subscriptions and 10,000-entry histories. Game tests compare logged and unlogged state/RNG, per-step travel, poison/enemy outcomes, rejection and committed notification errors. Host tests cover exact failed-write retries, once-only durable receipts, blocked exit retention, session replacement, clearing without writes and character disposal. Verify drawer navigation, scrollable filters, keyboard arrows, timestamps and clearing on compact/wide web layouts; native safe-area and touch behavior require device verification.
