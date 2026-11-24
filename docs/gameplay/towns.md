# Rebirth Dungeon: Town1 and services

**Planned Defold town**, governed by [game-plan.md](../game-plan.md). Build one original Tir Chonaill-inspired safe settlement with a square, stream, bridge, outskirts and northern Alby approach. The [saved town reference](../references/mabinogi-town.md) informs setting; it does not prescribe economy or engine behavior.

## World and interaction

Author a Defold collection/tilemap with static walls, kinematic player movement, zero gravity and trigger interactions. Town has no enemies, fog or battle-turn consumption. One controller writes movement: normalize keyboard diagonals; clicks convert through the active camera to an A* grid derived from collision occupancy. Start with four-direction routes. Keyboard input cancels a route; clicking an NPC targets a reachable nearby interaction cell. Validate proximity again when opening its service.

Use original exterior art and dialogue/service panels instead of separate interiors. NPC names and coordinates are content data. Later quest names below must resolve to the same NPC catalog rather than introducing inconsistent placeholders.

| Place | First-loop service |
| --- | --- |
| Healer House | Full resource restoration for 10 gold; free full recovery after defeat |
| Grocery Store | Food: 5 gold, restore 20 Stamina |
| Bank | Character-specific item/gold deposits and withdrawals; 60 item slots |
| Blacksmith | Weapons and repairs; one gold per missing durability point |
| General Shop | Resource potions: 10 gold, restore 30 of their resource; basic armor and item sales |
| Alby entrance | Dungeon entry and onboarding conversation |

Start with 100 gold and 30 carried inventory slots. Consumable stacks cap at 99; equipment is individual. Weapons begin at durability 20 and lose one per committed attack action, with half weapon contribution at zero. Keep unarmed attacks available; ammunition is deferred. Sell value is **25% of purchase price, rounded down**. Catalogs hold prices/restrictions/loot rather than service GUI scripts.

## Dialogue and service commands

Use defold-ink for authored greetings/topics/choices, Druid for readable text/choice/service controls and Monarch for sibling popups. Compile compatible Ink JSON into custom resources and persist versioned story continuation. A choice can request a validated purchase, bank, healing or quest command; observers/restore callbacks cannot spend or grant anything.

First-slice service panels block controls and pause world updates. Clear held keys and routes on opening/closing/focus changes; explicitly gate bootstrap simulation outside the paused proxy. Escape closes the top eligible popup; a confirmation takes priority. Do not permit clicks through a panel into movement or another NPC.

Commerce is RNG-free. Preview exact costs/effects, validate full inventory capacity and funds, compute one candidate and save before publication. A service must not charge without its transfer or restore resources on merely opening dialogue. Bank transfer and character/run ownership commit together. Opening another service must validate current proximity and close/replace transient content cleanly.

## Return, recovery and progression

Defeat ends the run and returns the hero to the healer fully restored for free, preserving claimed rewards and EXP. There is **no carried-gold defeat penalty**. Confirm early abandonment; retain claimed rewards. Neither outcome counts as a dungeon clear. Successful treasure Continue returns to Town1 and completes the run once.

Rank-ups, rebirth, title changes, equipment changes, later quest claims and enchanting use the town/no-active-run gates in their contracts. Persistent HUD buttons remain visible elsewhere with unavailable actions explained. Raising resource maxima does not heal; restoration is a specific service/outcome command.

Aging uses Saturday noon America/Los_Angeles via the tested time adapter. Town entry reconciles pending boundaries transactionally; it does not use a rolling seven-day timer.

## Later town content

Milestone 6 can add Aren's trainer/quest service and the broader quest catalog. Reuse one NPC mapping: Aren (training/story), Bram (Blacksmith), Nell (Grocery), Elara (Healer); other names remain content decisions. Enchanting needs authored powder/herb/holy-water suppliers and an MP recovery loop before enabling recipes. These dependencies do not require a whole Church/School/Inn in the first loop.

Gathering, crafting stations, cooking, an Inn, jobs, NPC favor/gifts, keyword unlocks, schedules and additional towns remain deferred. Gold bags/capacity penalties from older proposals are not adopted. Any later economy change must amend the game plan and preserve saved balances/possessions through explicit migration.

## Defold integration and checks

Monarch owns town lifetime; bootstrap owns session/save/audio/HUD. A* map handles, Event subscriptions and Tweener effects release on unload; only plain layout/position/service/story data is saved. Save movement periodically and at interaction/transition boundaries, not every frame.

Lester tests prices, full transfers, repair, healing, bank isolation, duplicate commands and rollback. Engine tests prove A* coordinate/clearance, collision agreement, keyboard cancellation, NPC reachability, GUI consumption, saved Ink choices and repeated town/battle transitions. Complete the town services portion of [desktop acceptance](../verification.md).

## First-loop implementation (2026-09-20)

Town1 now uses the authored cell layout in `game/content/town.lua` for both exterior presentation and occupancy. Roads join the square, a three-cell bridge across the stream, four houses and the northern approach. The town collection creates static walls, a persistent kinematic hero and six physics service triggers; it reuses the existing CC0 placeholder art. No saved coordinates or balances change.

NPC clicks and map markers choose the shortest reachable cardinal neighbor, checkpoint arrival and revalidate the catalog service’s three-cell proximity. E selects the nearest service. Keyboard input cancels travel, and a control generation cancels routes even when a panel opens and closes between world updates. Town service and dialogue collections are sibling Monarch popups; the persistent Druid HUD renders their controls while Monarch pauses the town proxy and the session separately gates simulation.

`services_presenter.lua` supplies bounded message-only service models with exact quantities, prices, healing effects, equipment restrictions and rule-derived rejection reasons. Sales, carried/equipped weapon repairs and exact bank transfers reuse the inventory panel. Every transaction builds and saves one candidate before publication.

Six compiled Ink stories provide distinct NPC greetings and topics. New conversations use story version 2; existing version-1 continuations keep the unchanged original story. Explicitly restarting a finished conversation adopts the NPC story. Tagged healing and bread choices request catalog-allowlisted commands in the same transaction as story advancement. Restore suppresses bindings and never submits a purchase or healing request. Broader trainers, favor, jobs, gathering and crafting remain deferred as above.
