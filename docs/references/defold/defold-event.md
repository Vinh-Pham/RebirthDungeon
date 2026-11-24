# Defold Event

[Upstream documentation](https://github.com/Insality/defold-event) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

Use Event for committed-state notifications and library callbacks. Druid and Defold Quest depend on it. The inspected Event README lists `https://github.com/Insality/defold-event/archive/refs/tags/21.zip`; the inspected Druid and Quest READMEs list Event 16 and 14 respectively. These are different documentation baselines, not proof of mutual incompatibility or compatibility. Install exactly one tested Event revision.

## API and lifecycle

`require("event.event")` provides `event.create()`. The resulting object supports `subscribe(callback, context)`, `trigger(...)`, and `unsubscribe(callback, context)` through method calls. Keep both the callback and context used for registration so cleanup removes the same subscription.

The inspected current README also documents `event.events` for named global events, `event.queue` and `event.queues` for queued work, and `event.promise` for asynchronous composition. Verify their availability at the chosen tag before using them. Context-aware invocation matters when callbacks use Defold GUI or game-object functions.

Error handling modes include protected calls that log errors and allow other subscribers to continue. Therefore a successful event trigger is not proof that a required domain operation succeeded.

## Project contract

Use direct guarded commands for required work and events for notifications after commit. Pass stable IDs, revisions, and small payloads. Never mutate authoritative state in HUD listeners or grant rewards from completion callbacks.

Unsubscribe when a GUI/screen closes or a character changes. Handle reentrancy by queueing new commands at the session boundary. An in-memory Event queue is not a durable transaction log. Quest queue notifications can repeat until acknowledged; acknowledge only after the adapter has handled them without repeating side effects.

Verify subscriber context, subscribe/unsubscribe symmetry, callback failures, repeated transitions, character switching, and no notifications from failed candidates. Keep the shared singleton clean between tests.

## Consuming project contract

Use the [transaction architecture](../../architecture.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
