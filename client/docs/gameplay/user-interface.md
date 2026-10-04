# Rebirth Dungeon: React Native User Interface

Updated **October 2, 2026**. The app uses Expo SDK 57, Expo Router, React Native, HeroUI, Uniwind and Skia/Reanimated presentation. Existing screens cover character selection/setup, exploration, combat, stats, inventory, transient action logs and sound settings. Skills, quests, titles and the town enchanting service are implemented. Aging and deliberate rebirth remain planned screens/services. The [game plan](../game-plan.md) owns delivery; this document owns interaction and mobile acceptance.

The client is online-only. Play opens the online roster behind verified account/connection access; Account provides registration and sign-in. Online routes under `/online/game/[characterId]` share the existing journals, service and battle screens through an authoritative public-view host. Their drawer omits Save/Load and debug controls; progression feedback offers explicit pending-action recovery and Rest resumes only on request after an interruption. Old local character links redirect to online selection/creation, and old `/game/...` links redirect to the online roster. Existing device saves remain untouched and inaccessible in the client. See [online play](../online-play.md).

## 1. Composition and navigation

Routes remain thin files under src/app. OnlineGameLayout owns one selected character's OnlineGameplayHost and provides CharacterGameContext; every feature view shares it. Routes, tabs, sheets and drawers do not create additional campaigns or award gameplay progress. Components/hooks live outside the route directory.

The app drawer lists Journey first, then Codex. Selecting either closes the drawer and navigates within the selected character's stack, preserving the shared host and any active encounter. Both are disabled until a character session is ready and show their selected state on the matching screen. Shared page headers are removed throughout the app. The footer menu and drawer handle navigation from character pages; browser and Android Back return from auxiliary routes before leaving the character. Detail-level Back/Close controls remain. Game links use `/online/game/[characterId]` and its journal routes.

A shared screen shell inside the drawer keeps one full-width character footer outside page scrolling, reserving its height instead of covering page content. It appears on every selected-character route, including shops and encounters, and on Settings while a character session remains active. Title, roster and character creation never show it; Settings without a character also hides it and provides an in-page Back action. The title menu retains access to Settings. Loading character routes show the menu and a status placeholder without borrowing another character's values. Drawers, dialogs and popovers may cover the footer.

The footer places a 48-unit menu button at the far left, three compact HP/Mana/Stamina bars stacked next to it, then name, level and XP filling the remaining width. It uses the existing dark theme with red/blue/yellow resources and light-blue XP. The compact tracks scale with text. No shortcut/collapse buttons are included. Name truncation retains the full accessible label; HP/Mana/Stamina omit visible labels and place white current/max values inside each track, aligned left. Values use a subtle text shadow for readability; accessible labels still identify each resource. Stamina also shows live Hunger as a right-aligned percentage inside its track, using `100 - fullness` to one decimal place and including it in the accessible value. The shell handles the top safe inset, the footer handles the bottom inset, and nested pages avoid double padding. Footer height grows with text scaling. Save/navigation errors remain visible above page content. Its observers use the registered JourneyHost and existing campaign/battle snapshots, never a second campaign or gameplay command.

The Character tab is removed. The Journey detail row now contains Stats (initially selected), Skills, Inventory and Quests, with Quests immediately after Inventory. Its content is the quest tracker with the existing journal link; the tracker no longer sits below every detail tab. The row scrolls horizontally on narrow screens so labels and touch targets stay readable, and supports keyboard tab switching on web.

Selecting Skills in that row shows the learned-skills summary and journal link,
followed by Life, Combat and Magic category tabs, with Life selected initially.
Each category shows only its learned skills, using the catalog category (or Combat
when absent), and provides an empty message when none are learned. Rank and
training details remain on each skill card. The category controls use HeroUI tabs
with 48-unit touch targets and web arrow-key, Home and End navigation. Switching
categories only changes presentation and never advances gameplay.

| Existing surface          | Owner and purpose                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Character selection/setup | OnlineCharactersScreen / NewOnlineCharacterScreen; account-owned characters                  |
| Character game stack      | src/app/(screens)/online/game/[characterId]/_layout.tsx; shared host/context                 |
| Journey/Codex routes      | Separate stack screens; Stats/Skills/Inventory/Quests detail tabs stay inside the journey UI |
| Exploration/service panel | JourneyScreen / TownServicePanel; world interaction and supported NPC actions                |
| Active encounter          | BattleView embedded by the journey; no separate authoritative battle route required          |
| Inventory route           | InventoryScreen; same inventory content as the Journey Inventory tab                         |
| Stats overlay             | CharacterStatsOverlay / CharacterStatsDetails; selected character's observed stats           |
| App drawer/settings       | Shared navigation, character exit, inventory/save access and global preferences              |

The standalone BattleScreen/BattleHost is also present for the battle surface; campaign features use JourneyHost's actual encounter instead of constructing that standalone session. Reuse shared DungeonUI, ResourceBar and menu components, HeroUI controls and current theme tokens. There is no Godot scene/Control tree or desktop floating-window framework to implement.

New Skills/Quests routes should reuse the same character stack as the existing Skills plan. Titles can begin as Character list/detail content; enchanting can begin as a town service. Expose destinations only when their commands/data exist. [Expo Router guidance](https://docs.expo.dev/router/introduction/).

### Online-only controls

The client has no Save/Load route, local character import/setup, or development debug menu. Pending server commands expose explicit recovery; loss of a verified session or connection blocks gameplay through the online gate.

## 2. Exploration surface

Exploration shows the current tile map, hero, authored objects/encounters, map identity, resource summary and applicable interactions. Movement is cardinal tile commands; tap-to-travel uses the validated pathfinder and stops at the first encounter. Interaction requires Manhattan distance at most one. Camera motion and tweened sprites cannot bypass tile/proximity rules.

Current maps have no fog-of-war/discovered-room filter. Do not promise hidden rooms or secret-marker suppression without adding saved discovery state and filtered observations. Dungeon key/chest/fountain state comes from the session, not sprite appearance.

Town panels show supported actions and exact prices: grocery food, general-store items/sales, blacksmith weapons/repair and paid full recovery. Close or disable a panel when its NPC/context becomes invalid. Shop browsing, stats inspection and inventory scrolling never perform a resource tick; accepted movement and explicit Rest do.

Shops use HeroUI Native Buy and Sell tabs, with Buy selected initially. Buy shows merchant stock and Sell shows the character inventory; both use the same image-only tiles and item popovers as Inventory. Popovers contain the description, owned count, quantity controls, price, total and a Buy or Sell button that confirms through the shared host and closes the details. The selected tab remains after a transaction. Unaffordable/full-pack offers and protected or unsupported sales stay inspectable with explanations and disabled trade controls. Sale details preserve equipment-copy identity/durability and quest warnings; the character inventory uses 20-item pages. Merchants that do not buy items expose inventory inspection with selling disabled. The tabs support web arrows, Home and End. Popovers stay within safe viewport bounds, scroll on compact layouts, and retain Close, outside tap, Android Back, web Escape and keyboard focus behavior. Other NPC services keep their existing layouts.

When an encounter starts, replace exploration input with the battle surface. Map coordinates and battle staging are separate; a sprite's visual distance does not make a target legal. Block world gestures behind panels, drawer, stats overlay and active battle.

## 3. Portrait battle layout and flow

Use a readable portrait stack with reachable action controls and canvas targets on small screens:

```text
Encounter name / active actor / turn order
Hero and enemy presentation
Wounds, hunger, weapon wear, ammunition and statuses
Persistent footer: current character HP/MP/SP, level and XP
Selected action / rank / target / costs / status details
Combat / Magic / Life / Items label tabs → horizontally scrollable action icons
Combat: talent-based Attack / Defense-based Defend / learned combat skills
Action popover → stats / eligibility / Use Skill (or Use Attack/Defend)
Cancel selected action
Recent battle feedback
```

Attack and Defend live inside the Combat hotbar, followed by learned combat skills. Owned Rest lives in the separate Life category. Attack uses the talent’s backing skill: Warrior → Combat Mastery, Archery → Human Ranged Attack, Mage → Magic Mastery. Defend uses Defense. Loaded bows instead show Human Ranged Attack or owned Elf Ranged Attack regardless of talent; empty or broken bows show Combat Mastery for fist damage. Attack popovers show one-arrow cost and the live remaining count, or the reason for fist fallback. Saved ranks appear only when owned. Minimal Combat, Magic, Life and Items label tabs do not use HeroUI Tabs. Items contains assigned battle-usable consumables. Its popovers show remaining quantity, capped recovery, wounds and Use Item; out-of-stock icons stay inspectable with use disabled. An empty category points to Inventory. The skill row scrolls horizontally on overflow. Other passive, life and unsupported skills do not become action icons; Rest is an explicit life-skill exception routed through the basic Rest action; the basic Attack/Defend identities are explicit exceptions without granting skill ownership. Icons retain accessible names and selected states; unavailable skills remain inspectable with their equipment, cooldown or resource reason.

Every icon opens a HeroUI Native Popover. Skill details show saved rank, effective costs, targeting and engine-derived damage/healing previews, with a **Use Skill** button. Basic actions use **Use Attack** and **Use Defend**. Popover content scrolls within safe viewport bounds; Close, outside tap, Android Back and web Escape dismiss it. The web adapter refreshes HeroUI's initial offscreen measurement after positioning, since RN Web's size observer does not report moves. Web focus stays inside the panel and returns to its trigger on dismissal. All focus transfers use `preventScroll` so opening, tabbing, focus containment and dismissal preserve page scroll even while HeroUI measures the panel offscreen. The same adapter handles inventory item popovers. The workspace pnpm patch for `heroui-native@1.0.10` skips the primitive’s hardware Back subscription on web while retaining native dismissal and layout cleanup. The game layout also registers its hardware Back listener only on native; browser navigation and popover Escape remain handled separately. Tab labels support keyboard arrows, Home and End.

Browsing details pauses arena targeting without selecting or cancelling the existing engine action. Closing resumes targeting only when an action has already been confirmed. Confirm Attack or an enemy-targeted skill with its Use button. With exactly one living enemy, select and resolve against it immediately through the existing controller flow; with multiple enemies, tap a monster in the game canvas. Ally targeting keeps its own selection rules. Before confirmation, canvas target taps are disabled. There is no Targets button or named target list. Cancel clears the selection and pauses targeting again. Self-only actions resolve once from their Use button. Owned Rest has a Life icon with Use Rest; it resolves one self turn with rest-rate recovery and no guard mitigation. No dice slots, kept markers, rerolls, reserved pools or paid Pass controls belong in this interface.

| Observed state         | Interaction                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| Initializing           | Loading feedback; no gameplay requests                                        |
| Selecting action       | Inspect a basic-action or skill icon, then choose Use                         |
| Selecting target       | Tap a valid canvas target to resolve the confirmed action, or cancel for free |
| Executing / enemy turn | Observe outcome; prevent additional player commands                           |
| Presenting             | Show committed events; duplicate inputs remain gated                          |
| Victory/defeat         | Show the completed encounter outcome and its return/continue action           |

The selected character’s scrolling battle summary no longer duplicates the footer resource bars; ally bars and the standalone BattleScreen remain available. The combat equipment summary shows the weapon icon/name and durability alongside the equipped secondary-hand item icon/name and remaining quantity. Both read the live battle snapshot, so spent arrows update immediately, including on misses; depletion clears the secondary-hand item. Equipment summaries wrap onto separate rows on compact screens.

The current BattleView gates player choices while presentation is busy; enemy turns advance from simulation phase independently of animation completion. Keep that separation. Rendering, audio and skipped/reduced animation must produce the same result and RNG continuation.

After the final victory presentation completes, the loot picker opens in a centered modal over the game with a dimmed backdrop. It does not occupy the scrolling battle stack or scroll the page to the rewards. The modal fits inside the safe viewport; longer item lists and save errors scroll inside it while the reward summary and Confirm loot button remain visible. Gold and XP are always collected, and item selection, capacity limits and exact pending-save retries retain their existing behavior. Back, Escape and outside taps do not settle or discard pending loot; confirmation returns to exploration after the host accepts settlement.

Previews call the engine's preparation/eligibility logic without drawing RNG. Display target-dependent costs accurately, especially self-Healing versus another ally. Self-Healing requires its stamina payment; another living ally can remain an affordable target when self-Healing is unavailable. Basic Attack explains the current bare-hand fallback when SP is insufficient; unsupported/unlearned adapters do not appear as usable skills.

Defend explicitly previews damage reduction until the owner's next turn and rest-rate recovery. Status detail shows remaining affected-owner ticks; a self turn-end cast ticks on its casting turn. Forecasts are ranges/conditions, not promises of an exact critical or damage roll. Confirmation remains the single spending action; Cancel/Back spends nothing.

## 4. Character, progression and inventory views

| Feature             | Existing baseline / planned extension                                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Character/Stats     | Footer level/XP and live resources; Stats retains talent, class, setup age, gold/AP, cumulative level, titles, attributes, combat values, wounds/fullness/hunger, equipment and journal links; mastery remains later |
| Skills, planned     | Learned/unlearned, rank/prototype cap, objectives, training/AP, lessons/books/pages and Rank Up from Skills                                                                                                          |
| Inventory           | Shared image grid, pages of 20, HeroUI item popovers with quantity/stats/actions; spatial placement/bags/overflow later                                                                                              |
| Quests, planned     | Chapter/Generation and side/skill groups, stages, objective progress, exact rewards and manual claim                                                                                                                 |
| Titles, planned     | First/Second selections, known/earned collection, benefits/penalties and stat preview                                                                                                                                |
| Enchanting, planned | Owned instance/scroll/powder, compatibility, replacement, chance/cost and separate destructive burning                                                                                                               |

Current setup age is static; do not show an aging countdown until it exists. Cumulative level is implemented. Current gold is one balance; no bank capacity display is available. Avoid showing implemented combat values as deferred merely because a related feature is not present.

The footer XP progress bar uses current-level XP and the engine’s next-level threshold; at the engine’s level cap it is filled and shows “Maximum level.” The footer presents percentage progress and exposes exact XP to accessibility and Stats. Stats preserves the healable HP/wound state and stamina recovery limit alongside fullness and Hunger. Hunger displays `100 - fullness` to one decimal place (91.2% fullness displays as 8.8% Hunger); the engine and saved fullness values retain their existing meaning.

Inventory equip/use and durable Drop commands are available during exploration, including between dungeon encounters. The route and Journey Inventory tab share an image-only grid; item names, descriptions, counts, stats and existing equipment/book/quest controls live in scrollable HeroUI Native popovers. Drop removes the selected quantity with no rewards or ground loot and protects equipped/locked copies. During battle it observes live supplies/wear and permits Items hotbar assignments while equip/exploration-use/drop remain disabled. Battle-usable consumable details expose Add to / Remove from Items hotbar; the assigned list permits removing depleted slots. Saving/retry locks dependent actions, and assignment never resets the live battle. Combat use occurs from the Items popover. Future learning/rank-up, quest claims, title changes and enchanting are town-only. Journals may still be inspected during combat without ticking time.

For future grids, use tap item → action → destination as a complete mobile path. Dragging may supplement it and cannot be required. Preview every occupied cell, exact quantity and displaced equipment. Invalid commands restore the view to authoritative state; the drag cursor never owns an item. Search identifies the actual container and does not reveal undiscovered quest/title spoilers.

Quest details distinguish “Return to [NPC]” from “Claim in town.” Title previews include penalties and resource clamping without recovery. Enchant application states material loss on failure and equipment protection; Burn names the destroyed item and possible zero recoveries. Rebirth/RP preview reset/preserved or borrowed state only when those later features exist.

## Action journal

**Logs** in the drawer navigates inside the active character stack and stays available during an encounter. It observes the shared host journal without spending turns. All is first, followed by Combat, Movement, User and System; messages belong to one category. Scrollable HeroUI tabs support touch and web arrow keys, and a virtualized newest-first list displays category, immutable text and a date-fns local date/time. Clear logs empties every category; it is disabled when empty. Clearing or reading the journal produces no messages. Successful character exit clears it; blocked exit retains it. Logs never go to storage. See [logging](logging.md) for producer/category contracts and durable publication.

## 5. Size, style and performance

Keep the portrait baseline configured in app.json. Use available width/height after safe insets and text scaling, rather than treating all web layouts as desktop. Small screens use one scrollable list/detail surface; wider tablets/web can add comparisons. The arena may shrink before labels/confirm controls become unusable.

Target at least 48 logical units for primary touch areas, 8-unit spacing and readable 16–18-unit body text. These are acceptance goals, not a claim that every current text style meets them. Preserve dark readable panels, restrained accent borders, original pixel art and font clarity. Text/icons accompany color for targets, disabled reasons, equipment wear and progression states.

Use the installed safe-area integration and avoid double-insetting nested surfaces. Keep bottom actions above system bars/keyboards, wrap long names, and allow large text/details to scroll. Pixel-art camera scale and UI text scale are separate concerns. [Expo safe-area guidance](https://docs.expo.dev/develop/user-interface/safe-areas/).

Retain cached map/catalog work and existing Skia/Reanimated motion. Do not send every animation frame through React or Zustand. Subscribe to detached host/session observations, use stable item/entity IDs and virtualize long future journals/inventory lists. Bound the compact battle chronicle, presentation queues and playback resources. The action journal retains its current-visit history without eviction and virtualizes visible rows. Backgrounding or leaving a character cleans subscriptions/gestures without making gameplay outcomes depend on cleanup timing.

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

| Check                     | Evidence                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Rules versus presentation | Identical accepted commands with varied animation timing yield identical state/RNG                                     |
| Small portrait touch      | Canvas targeting after action confirmation, reachable confirmation, no panel click-through, safe insets and large text |
| iOS/Android installation  | Full refuge → dungeon → encounter → return loop, sound, server progress and suspend/relaunch                           |
| Web                       | Keyboard action controls, canvas target selection, responsive panels, explicit audio resume and IndexedDB saves        |
| Persistence               | Pending-encounter restart, failed load preserving session, candidate retry without duplicate costs/rewards             |
| Accessibility             | Labels/state, readable cues, reduced motion, screen-reader traversal and focus restoration                             |
| Performance               | Long lists/maps/logs do not introduce per-frame React work or unbounded observers/resources                            |

Implementation runs lint/typecheck and relevant engine/UI-adapter tests. Exported bundles and headless engine tests are useful checks, but device installation/input/audio/SQLite/accessibility need actual platform smoke tests. Build/sign/submit through the future EAS setup in the game plan; this documentation revision claims no new native acceptance.

Bow arrows equip through Inventory into the secondary hand after a bow is equipped. The Equipment section shows the live stack and remaining quantity, or an empty-hand/fist warning. Supplies and Equipment filters include ammunition. Equip is disabled without a bow or during battle; arrows remain inspectable while spent quantities update.

Rest is learned at F by default and appears under Life in the Journey Skills tab. Its Life card and journal details show current stamina and a Use/Stop toggle. Use starts recovery at up to 10 stamina each second in towns and dungeons outside encounters. Stop ends resting immediately, including during saves/retries. The Journey has no standalone Rest panel or Character-summary Rest button; use Skills → Life to start or stop resting. The map character emits animated sleeping Z letters through Skia/Reanimated, with no per-frame React updates. Canvas movement and traversal/interaction controls are blocked until Stop. Accepted exploration use preserves the selected Journey detail tab and scroll position while saving before publishing recovery; saving/failed candidates pause recovery and expose Retry save for the same tick. Close active town services first. Backgrounding, character exit, load and disposal end resting; reload never restores the pose or grants offline recovery. During combat these exploration controls direct players to Use Rest in the Life hotbar, preserving encounter isolation. The Rest icon is a seated adventurer on a bedroll, transparent at 32×32 and registered in the shared artwork registry.

## Enemy combat presentation

Enemy turns execute through the dedicated headless enemy battle engine. Spider
Defense and Poison Attack reuse the current log and status presentation; no enemy
resource panel or intent forecast is added. Poison Attack catalog details explicitly
say enemy-only passive and do not offer learning or rank progression. The existing
missing-artwork fallback is used. Player targeting, keyboard controls, footer and
layout are unchanged.
