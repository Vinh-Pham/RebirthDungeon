# Defold Quest

[Upstream documentation](https://github.com/Insality/defold-quest) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

Use **Insality/defold-quest** for objective definitions, prerequisites, progress, and quest completion. It is distinct from similarly named timer/quest packages. Initial content is the Alby onboarding chain; richer journal categories can be added later.

The inspected README lists Quest `3` and Event `14`:

- `https://github.com/Insality/defold-quest/archive/refs/tags/3.zip`
- `https://github.com/Insality/defold-event/archive/refs/tags/14.zip`

Select a single Event version tested with both Quest and Druid. Import `require("quest.quest")`.

## API and state

Bind saved state with `quest.set_state(external_state)` **before** `quest.init(config)`. `quest.get_state()` retrieves state. Definitions include `autostart`, `autofinish`, `category`, `required_quests`, and tasks such as `{ action = "kill", object = "boss", required = 1 }`.

Feed evidence through `quest.event(action, object, amount)`. Query progress with `get_progress`, `get_task_progress`, `is_active`, and `is_completed`; manage explicit claims with `complete_quest` only through a validated domain command.

`quest.on_quest_event` is a **queue**. A subscriber returns `true` after handling a notification; unhandled messages may be delivered again. Completion callbacks are not an exactly-once reward mechanism. The README also documents `reset_state` and configuration/query helpers; inspect their selected-version behavior during adapter implementation.

## Project contract

The module exposes shared state, so isolate characters through one adapter. Evaluate progress against a copied transaction candidate, capture notifications, and publish after the whole candidate is saved. On save failure restore the previous binding and reset/rebuild queued notifications so rejected progress cannot leak. Verify whether initialization itself starts or completes quests; those changes must also be part of a transaction.

Quest completion status and reward-claimed status are separate facts in the same envelope. Use `autofinish = false` for explicitly claimed rewards and durable claim IDs. The queue handler updates presentation or stages candidate results; it never independently grants items/gold.

Do not award progress from a GUI click or monster death animation. Translate committed domain evidence once, carrying its operation identity. Persist any run-local evidence needed for later quest semantics. Ink can request a quest command; it cannot bypass validation.

## Project checks

Verify prerequisite activation, objective counts, explicit claims, overflow, duplicate evidence, queue acknowledgment, failed-save rollback, state restoration before init, and character switching. Future RP actors need fully isolated quest state. See the [API reference](https://github.com/Insality/defold-quest/blob/main/api/quest_api.md) for exact config/query fields.

## Consuming project contract

Use the [quest contract](../../gameplay/quests.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
