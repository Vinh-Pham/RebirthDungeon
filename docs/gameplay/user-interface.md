# Rebirth Dungeon: React Native User Interface

Updated **October 1, 2026**. The app uses Expo SDK 57, Expo Router, React Native, HeroUI, Uniwind and Skia/Reanimated presentation. Existing screens cover character selection/setup, exploration, combat, stats, inventory, save/load and sound settings. Skills, quests, titles and the town enchanting service are implemented. Aging and deliberate rebirth remain planned screens/services. The [game plan](../game-plan.md) owns delivery; this document owns interaction and mobile acceptance.

## 1. Composition and navigation

Routes remain thin files under src/app. CharacterGameLayout owns one selected character's JourneyHost and provides CharacterGameContext; every feature view shares it. Routes, tabs, sheets and drawers do not create additional campaigns or award gameplay progress. Components/hooks live outside the route directory.

| Existing surface | Owner and purpose |
| --- | --- |
| Character selection/setup | CharacterSelectScreen / NewCharacterScreen; independent saved characters |
| Character game stack | src/app/(screens)/game/[characterId]/_layout.tsx; shared host/context |
| Journey tabs | Explore and character content; Character/Stats/Inventory detail tabs inside the journey UI |
| Exploration/service panel | JourneyScreen / TownServicePanel; world interaction and supported NPC actions |
| Active encounter | BattleView embedded by the journey; no separate authoritative battle route required |
| Inventory route | InventoryScreen; same inventory content as the character tab |
| Stats overlay | CharacterStatsOverlay / CharacterStatsDetails; selected character's observed stats |
| Save/load route | SaveLoadScreen; autosave status and manual slots |
| App drawer/settings | Shared navigation, character exit, inventory/save access and global preferences |

The standalone BattleScreen/BattleHost is also present for the battle surface; campaign features use JourneyHost's actual encounter instead of constructing that standalone session. Reuse shared DungeonUI, ResourceBar and menu components, HeroUI controls and current theme tokens. There is no Godot scene/Control tree or desktop floating-window framework to implement.

New Skills/Quests routes should reuse the same character stack as the existing Skills plan. Titles can begin as Character list/detail content; enchanting can begin as a town service. Expose destinations only when their commands/data exist. [Expo Router guidance](https://docs.expo.dev/router/introduction/).

## 2. Exploration surface

Exploration shows the current tile map, hero, authored objects/encounters, map identity, resource summary and applicable interactions. Movement is cardinal tile commands; tap-to-travel uses the validated pathfinder and stops at the first encounter. Interaction requires Manhattan distance at most one. Camera motion and tweened sprites cannot bypass tile/proximity rules.

Current maps have no fog-of-war/discovered-room filter. Do not promise hidden rooms or secret-marker suppression without adding saved discovery state and filtered observations. Dungeon key/chest/fountain state comes from the session, not sprite appearance.

Town panels show supported actions and exact prices: grocery food, general-store items/sales, blacksmith weapons/repair and paid full recovery. Close or disable a panel when its NPC/context becomes invalid. Shop browsing, stats inspection and inventory scrolling never perform a resource tick; accepted movement and explicit Rest do.

When an encounter starts, replace exploration input with the battle surface. Map coordinates and battle staging are separate; a sprite's visual distance does not make a target legal. Block world gestures behind panels, drawer, stats overlay and active battle.

## 3. Portrait battle layout and flow

Use a readable portrait stack, preserving named controls when the canvas becomes small:

```text
Encounter name / active actor / turn order
Hero and enemy presentation
Combatant HP/MP/SP, wounds, fullness and weapon wear
Selected action / rank / target / costs / status details
[Attack] [Skill] [Defend] [Item]
Skill/item list, then legal named targets
[Confirm action] [Back]
Recent battle feedback
```

The existing UI supports four action groups and both sprite taps and named target buttons. Keep those named buttons usable without precise sprite targeting. Rest exists in the engine but has no separate current action-group button. No dice slots, kept markers, rerolls, reserved pools or paid Pass controls belong in this interface.

| Observed state | Interaction |
| --- | --- |
| Initializing | Loading feedback; no gameplay requests |
| Selecting action | Choose Attack/Skill/Defend/Item; inspect information |
| Selecting target | Choose a valid target, confirm or cancel for free |
| Executing / enemy turn | Observe outcome; prevent additional player commands |
| Presenting | Show committed events; duplicate inputs remain gated |
| Victory/defeat | Show the completed encounter outcome and its return/continue action |

The current BattleView gates player choices while presentation is busy; enemy turns advance from simulation phase independently of animation completion. Keep that separation. Rendering, audio and skipped/reduced animation must produce the same result and RNG continuation.

Previews should call the engine's preparation/eligibility logic without drawing RNG. Display target-dependent costs accurately, especially self-Healing versus another ally. The existing skill list's broad cost display needs that target-aware treatment when expanded. Basic Attack explains the current bare-hand fallback when SP is insufficient; unsupported/unlearned adapters do not appear as usable skills.

Defend explicitly previews damage reduction until the owner's next turn and rest-rate recovery. Status detail shows remaining affected-owner ticks; a self turn-end cast ticks on its casting turn. Forecasts are ranges/conditions, not promises of an exact critical or damage roll. Confirmation remains the single spending action; Cancel/Back spends nothing.

## 4. Character, progression and inventory views

| Feature | Existing baseline / planned extension |
| --- | --- |
| Character/Stats | Current level/XP, talent, setup age, attributes, combat values, resources, wounds/fullness and equipment; AP/mastery/cumulative level later |
| Skills, planned | Learned/unlearned, rank/prototype cap, objectives, training/AP, lessons/books/pages and Rank Up from Skills |
| Inventory | Current item rows, weapon pages of 20, equipment and use controls; grid/bags/locks/overflow later |
| Quests, planned | Chapter/Generation and side/skill groups, stages, objective progress, exact rewards and manual claim |
| Titles, planned | First/Second selections, known/earned collection, benefits/penalties and stat preview |
| Enchanting, planned | Owned instance/scroll/powder, compatibility, replacement, chance/cost and separate destructive burning |

Current setup age is static; do not show an aging countdown or lifetime progression until those fields exist. Current gold is one balance; no bank capacity display is available. Avoid showing implemented combat values as deferred merely because a related feature is not present.

The Character summary shows an XP progress bar using current-level XP and the engine's next-level threshold; at the level cap it shows “Maximum level.” Beneath Stamina, the recovery limit appears on the left and Hunger on the right, wrapping on compact layouts. Hunger displays `100 - fullness` to one decimal place (91.2% fullness displays as 8.8% Hunger); the engine and saved fullness values retain their existing meaning.

Inventory equip/use commands are available during exploration, including between dungeon encounters. During battle its ordinary screen is read-only and observes battle supplies/wear; consumables use the battle Item action. Future learning/rank-up, quest claims, title changes and enchanting are town-only. Journals may still be inspected during combat without ticking time.

For future grids, use tap item → action → destination as a complete mobile path. Dragging may supplement it and cannot be required. Preview every occupied cell, exact quantity and displaced equipment. Invalid commands restore the view to authoritative state; the drag cursor never owns an item. Search identifies the actual container and does not reveal undiscovered quest/title spoilers.

Quest details distinguish “Return to [NPC]” from “Claim in town.” Title previews include penalties and resource clamping without recovery. Enchant application states material loss on failure and equipment protection; Burn names the destroyed item and possible zero recoveries. Rebirth/RP preview reset/preserved or borrowed state only when those later features exist.

## 5. Size, style and performance

Keep the portrait baseline configured in app.json. Use available width/height after safe insets and text scaling, rather than treating all web layouts as desktop. Small screens use one scrollable list/detail surface; wider tablets/web can add comparisons. The arena may shrink before labels/confirm controls become unusable.

Target at least 48 logical units for primary touch areas, 8-unit spacing and readable 16–18-unit body text. These are acceptance goals, not a claim that every current text style meets them. Preserve dark readable panels, restrained accent borders, original pixel art and font clarity. Text/icons accompany color for targets, disabled reasons, equipment wear and progression states.

Use the installed safe-area integration and avoid double-insetting nested surfaces. Keep bottom actions above system bars/keyboards, wrap long names, and allow large text/details to scroll. Pixel-art camera scale and UI text scale are separate concerns. [Expo safe-area guidance](https://docs.expo.dev/develop/user-interface/safe-areas/).

Retain cached map/catalog work and existing Skia/Reanimated motion. Do not send every animation frame through React or Zustand. Subscribe to detached host/session observations, use stable item/entity IDs and virtualize long future journals/inventory lists. Bound logs, presentation queues and playback resources. Backgrounding or leaving a character cleans subscriptions/gestures without making gameplay outcomes depend on cleanup timing.

## 6. Input and accessibility

React Native gestures/controls own UI input; map handlers accept only exploration gestures in the valid mode. A gesture beginning on a panel stays panel-owned through release/cancel. Empty panel space and disabled buttons must not forward a tap to the map. Cancel active gestures on context/focus changes and reject concurrent gesture requests where necessary.

Keep on-screen Back/Close and text-labeled confirmations. Existing Android handling closes the drawer/stats/service context or leaves through the character flow with a save flush; feature routes use normal back navigation. Verify new dialogs close before their parent view. Back never implicitly pays a skill cost, sells gear, burns an item or marks an encounter defeated. iOS must have visible navigation controls without relying on a hardware key.

Use accessibility labels, roles, selected/disabled state and meaningful resource values. Announce resolved feedback without reading an unbounded combat log. Disabled reasons remain available through detail/help actions. Support dynamic text, contrast, reduced motion and independent music/effect levels. Haptics are optional future work, not an assumed dependency.

Keep the existing platform-specific keyboard choice/drawer accessibility helpers. Web acceptance includes visible focus, keyboard-only list/target selection and focus restoration after closing a surface. Do not require hover for item/status information or let shortcuts fire inside editable text. Controller support needs its own mapping/device acceptance before being advertised.

## 7. Save, lifecycle and error feedback

Manual save/load uses slots 1–3 and is blocked during active combat; autosave is separate. Current pending-encounter checkpoints store entry hero/seed, so relaunch **restarts the encounter**. Do not promise the same partial turn, target selection or animation on load. Unfinished attempt costs/statuses/progression are discarded; completed encounter gains already committed to the campaign remain.

App background/character exit requests a flush through the host. Background duration and animation time do not advance turns or resource ticks. The current 250ms autosave is coalesced and may lose the most recent change on abrupt termination; show actual save errors without claiming every action was synchronously durable.

Skills/quests/titles/enchanting use the durable operation states: confirm → saving candidate → saved success, or failed-write candidate with Retry. Suppress dependent gameplay while unresolved, and retry the same result. A persistent save failure cannot offer a new free random attempt. Keep authoritative busy/error observations in the host rather than unrelated button-local flags.

Missing characters, corrupt/unsupported saves and render/audio failures are separate errors. Preserve the loaded campaign when a replacement load is invalid; offer only implemented retry/back/recovery options. Never silently replace a damaged save with a fresh hero. Audio failure affects playback only; global sound settings are independent of character slots and web playback may require an explicit user gesture.

## 8. Delivery and platform acceptance

First preserve the existing shared host, exploration/service panels, battle action/target flow, inventory and save/restart behavior. Add the Skills journal from its unchanged plan, then quests/titles, grid storage and enchanting. Aging/rebirth/RP and advanced combat get controls only after their engine/save contracts exist.

| Check | Evidence |
| --- | --- |
| Rules versus presentation | Identical accepted commands with varied animation timing yield identical state/RNG |
| Small portrait touch | Named targeting, reachable confirmation, no panel click-through, safe insets and large text |
| iOS/Android installation | Full refuge → dungeon → encounter → return loop, sound, local saves and suspend/relaunch |
| Web | Keyboard focus/targeting, responsive panels, explicit audio resume and IndexedDB saves |
| Persistence | Pending-encounter restart, failed load preserving session, candidate retry without duplicate costs/rewards |
| Accessibility | Labels/state, readable cues, reduced motion, screen-reader traversal and focus restoration |
| Performance | Long lists/maps/logs do not introduce per-frame React work or unbounded observers/resources |

Implementation runs lint/typecheck and relevant engine/UI-adapter tests. Exported bundles and headless engine tests are useful checks, but device installation/input/audio/SQLite/accessibility need actual platform smoke tests. Build/sign/submit through the future EAS setup in the game plan; this documentation revision claims no new native acceptance.
