# Town services and the saved dungeon loop

The delivery status is in [Project phases](project-phases.md). This implementation follows the temporary economy in [Free exploration](free-exploration.md); inventory, paid healing, banking, progression and quests remain later features.

## Services and provisional balance

The keeper in Haven offers conversation, recovery and potion sales. The eastern arch opens an explicit dungeon-entry conversation. The dungeon HUD offers Abandon with a confirmation that displays the pending gold to lose.

| Action | Rule |
| --- | --- |
| Purchase | One potion costs 5 committed gold; carry at most 5. |
| Potion | Restore up to 15 HP, capped at maximum. Available only to the living active hero before rolling, with missing HP. Consumes one potion and one full activation, including normal end-of-activation effects and the enemy response. No dice/RNG draw. |
| Recovery | Explicit, free restoration of HP/MP/SP; clears reservations, temporary statuses, cooldowns and shield. Does not grant gold or supplies. |
| New hero | Starts with zero gold and zero potions; free recovery and the starter skills support the first expedition. |
| Exit | Both sentinels must be resolved; commit the 10 + 15 pending gold once. |
| Defeat / abandonment | Lose pending gold, retain committed gold and unconsumed potions. Abandonment is exploration-only; app closure resumes the run. |

These values are temporary starter balance, not a full inventory/economy model.

## Ownership and dialogue lifecycle

`content/dialogue/haven.dialogue` supplies Dialogue Manager 4 cues for the keeper, advice, purchase, recovery, entrance and abandonment. Conditions read copied hero observations. Authored dialogue contains no economic mutations. Service-tagged lines render an explicit Confirm button; only that button requests a transaction.

`scripts/presentation/town_dialogue.gd` is a game-owned CanvasLayer balloon under persistent Main. It renders actual Dialogue Manager lines and responses, owns focus, provides a scrollable landscape layout, 52-pixel buttons and an explicit cyclic focus chain. Epoch/liveness checks reject obsolete awaited results. Escape, normal end, focus loss and scene replacement dismiss the conversation. Resume reconstructs exploration and requires a new conversation; no conversation stack or callback is saved.

Dialogue Manager 4.1 adds a resource reference to its working line dictionaries. The adapter uses a private uncached load and removes these runtime self-references after traversal and at teardown. Shared authored resources and vendored addon code are unchanged. Main supplies the explicit current dialogue/mode context and restores the default callback when closing.

World input freezes during conversation. A conversation PhantomCamera2D uses priority 30 above exploration priority 20, then releases its registration on dismissal. Held movement and paths are cleared; focus is released before resuming exploration. Entrance overlap is suppressed until another approach/re-entry so cancelling does not immediately reopen the same conversation.

## Commands and persistence

Main revalidates the live conversation serial, session/revision, active mode, proximity and line of sight on confirmation. The pure resolver then validates mode, actor, target, gold, supply bound and health before copying state. Purchases, recovery, entry and abandonment use the same checkpoint-before-publication boundary as combat. Operation IDs prevent duplicate grants; stale requests and rejected commands consume no RNG.

Battle potion use is a normal command exposed in the pre-roll UI and State Charts presentation permissions. A failed write keeps the original supplies/resources visible and blocks further actions. Retry writes the retained candidate. There is no re-roll or re-execution of service logic.

The envelope is now `rebirth.session.v2`, adding a bounded integer hero potion count. A validated v1 checkpoint explicitly migrates to zero potions, preserving all existing gold, combat/RNG and continuation state. New saves write v2. Unknown formats and invalid counts remain recovery errors, never new-profile fallbacks. Abandonment may produce a Results checkpoint without a battle; pending gold must be zero.

Existing battle entry, encounter return, resolved-marker removal and required-encounter exit checkpoints remain active. Town return clears the ended expedition/battle. QuestSystem remains unused by gameplay.

## Verification

See [dated evidence](evidence/phase7/README.md) for focused domain/application checks, separate-process service continuation, rendered loop screenshots, baseline verification and mobile export blockers. Host filesystem tests and synthetic touch/layout checks do not establish Android/iOS device durability.
