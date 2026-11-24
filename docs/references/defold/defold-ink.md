# defold-ink

[Upstream documentation](https://github.com/abadonna/defold-ink) · Reviewed **2026-09-20** through Firecrawl.

**Status:** integrated at the exact revision in [dependencies.json](../../../tools/dependencies.json). API notes below describe the original research; [verification](../../verification.md) records tests of the selected revision. Expansion contracts remain requirements, not automatic completion claims.

## Purpose and setup

Use **abadonna/defold-ink** to run authored Ink conversations for town NPCs, services, and dungeon onboarding. It parses compiled Ink JSON in Lua; it is not the C# Ink runtime and not Narrator.

The README's dependency example is `https://github.com/abadonna/defold-ink/archive/master.zip`; pin a tested revision. The inspected README explicitly cites **Inky 0.14.1 / Ink 1.1.1** compatibility and warns that the JSON format changes. Treat that as the documented compatibility baseline, not a claim of current compiler support. Compile a representative fixture with the selected toolchain before adopting a newer compiler.

Compile authored `.ink` into UTF-8 JSON outside the runtime. Include the compiled assets under `project.custom_resources` in `game.project` so `sys.load_resource` can read them in bundles. Keep source stories and compiled assets versioned together. See [Defold project settings](https://defold.com/manuals/project-settings/#project).

## Documented API

```lua
local ink = require("ink.story")
local story = ink.create(sys.load_resource("/assets/dialogue/healer.json"))
local paragraphs, choices = story.continue()
-- After the player selects a displayed choice:
-- paragraphs, choices = story.continue(choice_index)
```

The resource path above is proposed. Story functions in this runtime are documented with **dot calls**, not colon calls. `continue` returns paragraph and choice tables; their entries expose text. Other APIs include `jump(path)`, `variables`, `assign_value(name, value)`, and add/remove variable observers.

## Save and restore

`story.get_state()` pairs with `story.restore(state, with_externals)`. This restoration replays saved choices and randomness; enabling `with_externals` calls external functions during replay. Keep it disabled for ordinary restoration and prevent observers from producing duplicate gameplay effects.

The alternative `serialize()` / `deserialize(data, path, reset_observers)` mode restores variables at an explicitly supplied story path. The README states that the two save methods are **not compatible**. Choose one format, tag it in the save envelope, and test it; do not mix them.

Store the story content version with its saved state. Exact continuation depends on compatible content; when stories change, provide a tested migration or an explicit safe restart point rather than claiming arbitrary edits preserve progress.

## Project contract and checks

Druid renders paragraphs and choices; Monarch owns the dialogue popup. The dialogue service restores/recreates a candidate instance for a choice, stages allowed quest/service commands, saves resulting story and domain state together, and only then publishes text. Ink variables do not become a second inventory or quest store.

Verify a compiled story in a release bundle, branching dialogue, close/resume, character switching, save failure, observers, suppressed external effects on replay, and content-version mismatch. Never grant rewards directly from a story observer or restore callback.

## Consuming project contract

Use the [quest/dialogue contract](../../gameplay/quests.md) and [town services](../../gameplay/towns.md). Integration order and cross-library responsibilities are in the [Defold library integration plan](../../turn-based-rpg-battle-libraries.md). These are implementation requirements; source research does not establish an installed or passing integration.
