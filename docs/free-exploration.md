# Free exploration and separate dice battles

Godot revision: **2026-09-10**. Status: **planned; not implemented**. This is the active exploration and first-loop contract. It replaces the old grid traversal, spatial combat, fixed-point geometry and shared-world implementation requirements. [Game Plan](game-plan.md) owns engine architecture.

## Ownership and time

A long-lived application controller owns a profile, an optional expedition and at most one battle session. Exploration uses continuous Godot 2D movement in physics updates. Battle advances only through accepted commands. Exploration is stopped during battles, blocking panels, scene transitions and save failures. Animation and UI activity never spend turns, tick statuses or consume gameplay RNG.

Use `CharacterBody2D` with collision, `NavigationAgent2D` for click/tap routes and `NavigationRegion2D` for walkable polygons. Movement replay is not assumed deterministic across engine builds or devices. Save exploration continuation explicitly; validate integer battle replay separately. [Movement](https://docs.godotengine.org/en/stable/tutorials/2d/2d_movement.html), [Navigation](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationagents.html).

## Navigation and discovery

Start with authored room scenes joined at stable connectors. Godot navigation and collision must agree on clearance through doorways. Stop safely on unreachable targets; do not teleport through walls. Town is fully visible and safe. Dungeons reveal visited rooms and their doorway approaches; navigation/selection must not reveal or route through undiscovered rooms before the discovery rule permits it. Observations omit hidden actors, rewards and encounter details.

NPCs and enemies are stationary in the first slice. NPC/pickup interactions require the hero to reach an authored interaction point/radius with an unobstructed approach. World distance is used for exploration only. Seeded room assembly, additional floors, patrols and moving obstacles are later features.

## Encounters and return

Clicking/tapping a visible enemy requests an approach; reaching its authored trigger radius with an unobstructed detection path starts a separate one-enemy battle. Guard against overlapping triggers with a transition token and stable encounter ID. Checkpoint entry before enabling battle input.

Targets are living encounter members with valid allegiance; there are no battle cells, range checks or line-of-sight rules. On victory, record the outcome, remove that encounter once and restore the saved exploration location. Required encounters unlock the exit. Defeat takes precedence over victory if both arise at the same resolution boundary.

Combat status durations advance only at actor activations. Surviving effects can persist between encounters with frozen duration; world movement and pickup do not tick or regenerate them. Run end/recovery clears temporary combat effects. Battle pose and attack motion are cosmetic.

## First-loop economy and outcomes

Use one nonnegative committed gold balance and bounded potion counts before inventory/banking. Town provides a dialogue NPC, potion vendor, explicit free full recovery and dungeon entry. Purchases and potion use validate all quantities/costs before a single saved transaction. In battle a potion is a pre-roll full action; exploration potion use is deferred.

| Outcome | Initial policy |
| --- | --- |
| Encounter victory | Preserve current resources and surviving statuses; put rewards in the expedition's pending bundle and resume exploration. |
| Successful dungeon exit | Commit pending rewards once, consume spent supplies, preserve remaining supplies and return to town. |
| Defeat | Discard pending rewards, preserve unconsumed brought supplies and previously committed gold, end the run and offer town recovery. |
| Voluntary abandonment from exploration | Preview the same pending-reward loss as defeat; preserve unconsumed brought supplies and committed gold. No battle fleeing in the slice. |
| App close/resume | Continue the same run/hand and remaining supplies; never count as an outcome. |

These defaults apply to the small loop only. Full inventory, XP/training/title/quest evidence and banking require an explicit per-outcome retention table in Phase 8 before becoming active. Proposed town fees and carried-gold losses are later economy choices and do not override free recovery or the temporary balance.

## Persistence and verification

Checkpoint room layout, position, discovery, resolved encounter IDs, RNG states, resources, battle continuation, supplies, pending rewards and operation sequence. Required write failures block dependent actions. Retrying saves the same result. Periodic movement checkpoints may lose movement since the last successful checkpoint on abrupt termination.

Test blocked paths, narrow connectors, discovery, duplicate triggers, repeated victories, full exit, defeat, abandonment, purchases and failed-save retries. Verify restart during a kept/rerolled hand, battle return and mobile suspension using actual Godot exports. Follow [Phases 3–7](project-phases.md); no old platform test result closes these gates.

## Historical evidence

[evidence/free-exploration](evidence/free-exploration/README.md) contains retained pre-Godot screenshots and logs. They document an earlier prototype only. They do not establish current Godot implementation, runtime behavior or outstanding Godot blockers.
