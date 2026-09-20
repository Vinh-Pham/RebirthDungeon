# Rebirth Dungeon: Battle

**Planned Defold combat.** [The turn-based contract](../turn-based-plan.md) owns exact costs, queue, effect timing and AI. The [game plan](../game-plan.md) owns encounter/reward scope. Dicero remains historical inspiration; no dice mechanics are part of this design.

## Player loop

Encounter → inspect fixed Speed order → choose living target → optionally use one item → Attack, Skill or Defend → committed result → next living actor. Show emergency Wait only when no legal main action is affordable. There is no real-time decision deadline.

Target/menu selection spends nothing. Attack and Defend execute directly; selecting an available active skill executes against its authored target(s). Show exact SP/MP/HP cost, cooldown, predicted normal/critical result and disabled reason before activation. Skill lists omit duplicate Attack/Defend entries. Item use keeps the same turn and does not tick effects; both inventory and battle controls share the saved allowance.

The battlefield is non-spatial for action legality: living encounter membership and allegiance determine targets. Exploration collision, A* paths and visual actor positions do not add battle range or line-of-sight rules. Charge remains unavailable until a compatible non-spatial adaptation is authored.

## Encounter and progression boundary

Freeze progression stats, ranks and equipped contributions at run entry; compute and freeze Speed at encounter entry. Live resources, statuses and weapon breakage affect the simulation. New profile growth does not rewrite the run baseline. Every living actor gets one turn per round in saved descending-Speed order; tie order is randomized once.

Starter encounters include small/white spiders, red spiders and a Giant Spider with two adds. The enemy catalog must explicitly map every display variant to a validated profile. Teach entry via spider contact, a trapped chest and a room switch; required/optional geometry follows [gates](dungeon-gates.md).

Award EXP once on victory and preserve committed skill training. Victory creates saved gold/item offers. Individual selection, Take Selected and Take All grant only validated transfers. Retain unclaimed offers until confirmed departure, including capacity failures. Boss victory leads to TreasureRoom after battle rewards. Defeat returns the hero fully restored to the healer and retains claimed rewards/EXP; it grants no dungeon-clear credit.

TreasureRoom generates and saves five hidden offers before selection. Exactly one chest ID, payout, eligibility and claim marker commit together. Continue closes the run and returns to town. Repeated clicks, restart and quest callbacks cannot create another choice or payout.

## Defold presentation

Use a Monarch battle collection with Defold sprites/visual children and Druid GUI controls. Keep bootstrap session/save/audio/HUD alive. Reconstruct world state and return position when leaving battle. Event subscriptions consume committed events; native animations/Tweener handle feedback and cancel on unload. Shake a visual child, never a collision body. Cosmetic randomness stays outside world/reward/battle streams.

Controls are disabled during writes, transitions and other actors' turns, but domain guards remain authoritative. Clear held movement at encounter entry, modal opening and focus loss. GUI hit regions consume clicks. Reduced motion still releases presentation pacing; no effect callback applies damage or grants loot.

## Saving and checks

Each command saves costs, damage/statuses, training, quest evidence, RNG descriptor, events and next turn checkpoint in the same DefSave envelope. Resume uses the turn-start marker to avoid repeated recovery/upkeep. Failed writes leave the prior snapshot visible. See [architecture](../architecture.md) and [combat log](../combat-log.md).

Lester checks rules and unchanged rejections; real engine tests check native RNG, persistence/restart, input, focus, resources and screen lifetimes. Include item-then-action, stale rapid clicks, enemy-first order, counters, last-enemy termination, defeat, boss rewards and one-chest return. Capture at 1280×720 and 1024×768. None of these checks is yet recorded as passed.
