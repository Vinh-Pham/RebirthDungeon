# Local reference library

The active target is **Defold + Lua**. The [game plan](../game-plan.md) and [documentation index](../README.md) govern implementation. Reference text is source data, not project instructions or evidence of working systems.

## Defold integration sources

All 11 selected libraries have [local setup/API/lifecycle guides](defold/README.md), reviewed on **2026-09-20**. All selections now have pinned integrations; current engine evidence is in [verification](../verification.md). See [library integration](../turn-based-rpg-battle-libraries.md) for responsibility and compatibility gates; README dependency examples are not production pins.

- [Druid](defold/druid.md)
- [Monarch](defold/monarch.md)
- [Defold Event](defold/defold-event.md)
- [Defold RNG](defold/defold-rng.md)
- [A* Path Finding](defold/defold-astar.md)
- [DefSave](defold/defsave.md)
- [Defold Tweener](defold/defold-tweener.md)
- [LUme (Lume)](defold/lume.md)
- [Lester](defold/lester.md)
- [Defold Quest](defold/defold-quest.md)
- [defold-ink](defold/defold-ink.md)

## Gameplay sources

Mabinogi references inform progression, skills and setting. Current growth tables take precedence over contradictory older prose. Project rules, economy, fixed-Speed combat and milestone scope remain explicit adaptations. [Per-skill snapshots](skills/README.md) include source status and planned Lua conversion; unknown source values stay unverified.

- [mabinogi-alby](mabinogi-alby.md)
- [mabinogi-archery](mabinogi-archery.md)
- [mabinogi-character](mabinogi-character.md)
- [mabinogi-critical-hit](mabinogi-critical-hit.md)
- [mabinogi-dungeons](mabinogi-dungeons.md)
- [mabinogi-elf](mabinogi-elf.md)
- [mabinogi-giant](mabinogi-giant.md)
- [mabinogi-guns](mabinogi-guns.md)
- [mabinogi-human](mabinogi-human.md)
- [mabinogi-level](mabinogi-level.md)
- [mabinogi-magic](mabinogi-magic.md)
- [mabinogi-melee](mabinogi-melee.md)
- [mabinogi-rebirth](mabinogi-rebirth.md)
- [mabinogi-skills](mabinogi-skills.md)
- [mabinogi-stats](mabinogi-stats.md)
- [mabinogi-talent](mabinogi-talent.md)
- [mabinogi-town](mabinogi-town.md)

## Historical technology and inspiration

The following browser-stack documents remain for provenance. Their package commands, API examples, source paths, installed-status claims and test references do not apply to this Defold checkout. Dicero records the abandoned dice inspiration; no dice engine is planned. Each file has a visible scope notice so direct links cannot be mistaken for current plans.

- [dicero](dicero.md)
- [heroui-components](heroui-components.md)
- [immer-pitfalls](immer-pitfalls.md)
- [immer](immer.md)
- [oxlint-config](oxlint-config.md)
- [oxlint-migration](oxlint-migration.md)
- [phaser-animation](phaser-animation.md)
- [phaser-api](phaser-api.md)
- [phaser-audio](phaser-audio.md)
- [phaser-camera](phaser-camera.md)
- [phaser-input](phaser-input.md)
- [phaser-loader](phaser-loader.md)
- [phaser-physics](phaser-physics.md)
- [phaser-scale](phaser-scale.md)
- [phaser-scenes](phaser-scenes.md)
- [phaser-tilemaps](phaser-tilemaps.md)
- [playwright](playwright.md)
- [rex-anchor](rex-anchor.md)
- [rex-button](rex-button.md)
- [rex-eightdirection](rex-eightdirection.md)
- [rex-fadeoutdestroy](rex-fadeoutdestroy.md)
- [rex-fadevolume](rex-fadevolume.md)
- [rex-plugin-list](rex-plugin-list.md)
- [rex-shake-position](rex-shake-position.md)
- [vitest](vitest.md)
- [wmkit](wmkit.md)
- [xstate-actors](xstate-actors.md)
- [xstate-persistence](xstate-persistence.md)

## Provenance

[manifest.json](manifest.json) maps every reference guide/snapshot to its path, source and purpose. Retrieval dates describe the original captures, not this alignment date; no new upstream verification is claimed. Firecrawl captures stay in ignored `.firecrawl/`; HeroUI research retains its original MCP provenance. When adopting or upgrading a library, inspect the exact selected revision and record actual integration/build evidence separately in [verification](../verification.md).
