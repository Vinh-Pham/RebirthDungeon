# User Interface Plan

> **Active migration (2026-09-10):** [Free exploration and separate battles](../free-exploration.md) supersedes the grid-world, shared dungeon/battle screen, spatial combat, and legacy-save contracts below. Earlier phase evidence is retained as history.

Planning date: **2026-09-08**. Status: **proposed implementation plan; no UI implementation or platform acceptance claimed**.

Build a landscape, pixel-art dungeon interface with **libGDX Scene2D UI, KTX Scene2D builders and KTX actor listeners**. Adapt Mabinogi's persistent status/menu bar and reusable information windows around Rebirth Dungeon's five-dice combat. Keep the dungeon readable and make every action's cost, availability and consequence explicit.

[game-plan.md](../game-plan.md) owns architecture, [directory.md](../directory.md) owns placement, and [project-phases.md](../project-phases.md) owns delivery order. [Battle](battle.md), [stats](stats.md), [skills](skills.md), [character](character.md), [inventory](inventory.md), [titles](titles.md), [quests](quests.md), [enchants](enchants.md) and [towns](towns.md) own gameplay behavior. This plan specifies presentation and interaction; it does not settle their open balance or outcome rules. Dimensions, shortcuts beyond the town specification, and layout breakpoints below are provisional defaults to verify on devices.

## 1. Mabinogi reference and adaptation

The linked [Mabinogi User Interface page](https://wiki.mabinogiworld.com/view/User_Interface) describes a movable bottom gamebar combining resources, menus and progression; separate character windows; categorized quest lists and a pinned tracker; a minimap; and configurable shortcuts. Its many social and auxiliary panels reflect an MMO. The inspection here covers the wiki's documented controls, captions and image references, not a hands-on test of the current client. The page includes historical features; use its interaction patterns as inspiration, not a current-client specification.

| Reference pattern | Rebirth Dungeon decision |
| --- | --- |
| Bottom gamebar with resources, level/XP and menu access | A persistent anchored status/menu bar; preserve HP/MP/SP and menu access in town and dungeon. |
| Separate Character, Skills, Quests and Inventory windows | Reuse the same feature views across town and dungeon, with context-specific action availability. |
| Character information grouped into sections | Overview, Stats, Equipment, Titles and Talent/Age sections; keep detailed source breakdowns behind inspection. |
| Categorized quest journal and pinned objectives | Use our Chapter/Generation structure, Sidequests, Skills and RP badges. Clicking a tracked objective opens its details. |
| Minimap and marker legend | Optional compact map using explored terrain and currently observed actors; town shows authored landmarks. |
| System message history alongside chat | A bounded local combat/system log with readable costs and results. |
| Customizable windows and shortcuts | Keyboard shortcuts, scalable text, reset layout and limited desktop window movement; compact touch panels. |
| MMO channels, friends, guilds, pets, auction house, cash shop, weather and recording tools | Outside this offline UI slice. No placeholder toolbar buttons for unsupported systems. |

Do not copy Mabinogi's hunger meter, complete currency catalog, 30-quest tracking limit, map auto-pathing or exact hotkey set. Those do not establish Rebirth Dungeon rules. Original art, icons and fonts are required; the wiki images are research references, not shipped assets.

## 2. Technology choice and current baseline

**Choose Scene2D UI + KTX, without adopting VisUI widgets for the initial interface.** Scene2D provides the needed tables, windows, dialogs, scroll panes, buttons, progress bars and drag/drop support. KTX makes those widgets easier to compose in Kotlin; it does not add a second UI model. See the [Scene2D UI guide](https://libgdx.com/wiki/graphics/2d/scene2d/scene2d-ui) and [KTX builders documentation](https://github.com/libktx/ktx/tree/master/scene2d).

VisUI is built around useful additional widgets, including tabbed panes, popup menus, validators and list views, documented in its [official wiki](https://github.com/kotcrab/vis-ui/wiki). None is necessary to begin this game HUD. Implement feature tabs with a small button group and content container. Reconsider individual VisUI widgets only when a concrete feature benefits, with matching skin styles and lifecycle ownership; do not introduce a second Stage or parallel navigation system merely to use them.

Repository inspection found:

- `core/build.gradle.kts` already declares `ktx-scene2d`, `ktx-actors`, `ktx-vis`, `ktx-vis-style` and `vis-ui`. Pins are KTX `io.github.quillraven.libktx` **1.14.2-rc1** and VisUI **1.5.9** in `gradle.properties`. This plan neither adds dependencies nor changes pins. Upstream KTX examples illustrate APIs; retain the repository's coordinates and verify examples against its resolved version during implementation.
- `presentation/screens/DungeonScreen.kt` already owns a `Stage(ScreenViewport())`, a separate `ExtendViewport(320, 180)` world, prototype labels/buttons, stage-first input and clamped UI animation delta. It consumes `RunController.observe()` and submits commands with a session token.
- The existing screen includes prototype New run/Reload controls and an HP/actions/turns/tick readout. These are not the finished game menu or battle HUD. Move developer controls behind development gating as the playable flow replaces them; ordinary navigation must not replace an unfinished run.
- `RebirthDungeon` owns managed UI assets and disposes screens through its navigation coordinator. Preserve fresh screen activation rather than populating the inherited class-keyed screen registry.

No simulation dependencies change. All shared code continues to target Java 8 APIs and JVM 1.8 bytecode.

## 3. Screen composition and visual hierarchy

Use one UI Stage per active screen above the existing world renderer. Add layers in explicit order: HUD, ordinary windows, modal shield/dialog, then non-interactive tooltips/toasts. A screen composes feature views; opening Inventory is not navigation to a new game screen.

Provisional wide-landscape composition:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Floor / location     Turn / selected visible target       Map toggle │
│                                                     Quest objectives│
│                                                                     │
│                 WORLD: hero, visible enemies, terrain                │
│                                                                     │
│ Recent result                              Context interaction       │
├─────────────────────────────────────────────────────────────────────┤
│ Skill / rank / locked target       Costs and predicted effect        │
│ [die 1] [die 2] [die 3] [die 4] [die 5]   Pips · Combo · Multiplier    │
│ Keep markers · 2 rerolls remaining    Roll  Reroll  Use Skill  Pass    │
├─────────────────────────────────────────────────────────────────────┤
│ HP / MP / SP   Level / XP   Gold   Character Skills Quests Inventory  │
│                                                                Menu │
└─────────────────────────────────────────────────────────────────────┘
```

The dice panel appears for an activation and collapses outside combat. Town replaces it with contextual interaction hints and optional movement controls. A short landscape layout places the five dice and action row above the status bar, moves detailed odds/breakdowns into an inspection sheet, and collapses map/tracker/log before reducing primary control sizes. Never hide the locked skill/target, dice, reroll budget or commit/pass consequences to make secondary information fit.

Use dark opaque or near-opaque panels, restrained warm borders, crisp item/die art, clear headings and readable body text. Keep resource labels and numbers beside color-coded bars. Use a border plus a `Kept` marker for held dice, a visible focus outline for keyboard selection, and text reasons for unavailable actions. Decorative pixel fonts belong in short headings only if legibility tests pass.

### Layout and scaling contract

- Retain separate world and UI viewports. Scale UI logical units through a centralized density/user-scale policy; do not enlarge the entire Stage with actor transforms or tie font size to world zoom.
- Begin with 48-logical-unit primary touch targets, 8-unit spacing and 16–18-unit body text. Verify physical size, font rasterization and actual fit on Android/iOS; these values alone do not prove accessibility.
- Select wide versus compact composition from usable UI width **and height after safe insets and text scaling**, rather than platform name. Suggested wide threshold: 960 × 540 logical units; smaller surfaces use the compact arrangement. Keep all five dice visible in either mode.
- Convert safe insets into UI units once. Update both viewports on nonzero resize, recompute layout and clamp windows to the safe rectangle. Reflow text and scroll detail content; never leave a close button outside the viewport.
- Desktop may show two ordinary windows for comparison if space permits. Compact mode shows one feature sheet at a time, with list → detail → back navigation. Preserve selection and scroll position while switching.
- Keep the bottom bar anchored initially. Optional desktop dragging applies to windows, with saved normalized placement and Reset Layout. It must not obstruct the active combat controls.
- Designate the world interaction rectangle explicitly, excluding HUD/panels and letterbox margins. Apply the appropriate viewport before drawing each layer and use its unprojection for input.

## 4. Persistent HUD and navigation

| Surface | Required contents and behavior |
| --- | --- |
| Status bar | Current/max HP, MP and SP with reservations visibly distinguished from spendable amounts; status icons with affected-actor activation counts and inspectable sources. |
| Progress/currency | Current level/XP and carried gold/capacity when those features exist. Banked gold is separately labeled in relevant town views. Dungeon rewards/training remain clearly pending until retained and committed. |
| Menu bar | Character (`C`), Skills (`Z`), Quests (`Q`), Inventory (`I`), Menu. These match towns.md. Feature actions remain run-gated even though inspection windows are accessible. |
| Target/location | Current floor/location and selected visible target with relevant known defenses/intent. Unknown information remains unknown. |
| Context action | A reachable door, pickup, NPC or entrance and its action/cost. Controllers revalidate adjacency and eligibility on submission. |
| Quest tracker | Initially display up to three objective rows, with a More control; this is a display default, not a new cap on tracked quests. Distinguish objective completion, return to NPC and reward claimed. |
| Map | Player, explored terrain and allowed visible markers; no unseen enemy location, intent, HP or tooltip derived from restore data. No auto-walk in this slice. |
| Result log | Bounded, scrollable observed events, with combat/system filters. New entries do not steal focus or advance the simulation. No chat input or social channels. |
| Menu panel | Settings, input help, save state, credits, and return/continue actions. Abandon is separate and shows the authored loss preview before confirmation. Platform quit behavior belongs to the launcher. |

Unavailable future features need no empty windows. Introduce each menu destination with its phase; if a staged skill or feature must be visible by its owning spec, clearly label its prototype limitation.

## 5. Five-dice interaction contract

The UI mirrors [battle.md](battle.md) and Phase 4 authoritative state. UI phase labels below are illustrative view states, not a second combat state machine.

| Observed state | Available interaction | Required feedback |
| --- | --- | --- |
| Pre-roll player activation | Choose legal active skill and target, inspect rank/cost/odds, Roll; Pass; eligible item action once enabled | Explain unmet equipment/range/cooldown/resource conditions. Pre-roll Pass costs no skill resources. |
| Rolled, checkpoint pending | Inspect current result; gameplay input gated | Show Saving; retry acts on persistence, never rolls again. |
| Rolled, durable, rerolls available | Toggle kept dice; Reroll unkept dice; Use Skill; paid Pass | Five stable slots, exact kept flags, budget, pip total, one combination/multiplier and shared effect preview. Skill/rank/target/profile remain locked. |
| Rolled, no rerolls | Inspect, Use Skill or paid Pass | `0 rerolls remaining`; no automatic attack. Disable Reroll with its reason. |
| Resolving or presenting events | Inspect safe details; skip/reduce animation where supported | Suppress duplicate actions. Presentation completion releases gating only. |
| Save failure | Inspect; Retry save; controller-supported recovery choices | Persistent error with explanation that progress is waiting for a successful checkpoint. Do not offer a fresh random attempt. |
| Encounter ended | Show committed encounter outcome, then eligible continuation | Distinguish encounter victory from floor completion and expedition results; defeat priority follows rules. |

### Control details

1. Render five die widgets by stable die ID, without sorting them by face value. Tapping or focused activation toggles the authoritative kept flag through a request. Face animation displays already committed results; it never samples gameplay RNG.
2. Use **Reroll unkept (N)** as the first slice's batch policy. Highlight exactly those N dice before submission. All kept disables Reroll with `Unkeep at least one die`; the whole nonempty subset is submitted atomically. This is a UI policy within the rule allowing a subset of unkept dice.
3. Keep Roll, Reroll and Use Skill as separate labeled controls. A second pointer, keyboard repeat or stale click must not submit a duplicate action. Keep toggles cost no initiative/RNG but are still authoritative saved state, not merely button decoration.
4. Show final HP/MP/SP costs and reserved amounts. Post-roll Pass reads `Pass — spend [costs] and discard hand`, with a confirmation identifying those costs. Cancel closes the confirmation while retaining the hand. Escape/back never implicitly passes or resets an activation.
5. Pre-roll odds expose all six face probabilities, including impossible faces. Post-roll preview explains base/attack/pips, the single combination, mitigation and shield as appropriate. Use the pure shared resolver and only permitted observations. Unknown or random future outcomes must be labeled as estimates/ranges, not guaranteed values.
6. Include an inspectable eight-combination reference sourced from content/rules, without duplicating the scoring algorithm in widget code. Weighted rolls are not promised to improve on reroll.
7. Passive skills have no Use button. Consumables remain pre-roll full actions and unavailable until inventory consumption exists. No equipment changes, rank-ups or title swaps can bypass the run boundary through a window.
8. Reopening the panel or restoring a save reconstructs the same committed hand, reservations and budget. Inspecting details must not reselect a locked skill/target or reset the panel's authoritative activation.

## 6. Reusable feature windows

### Character

Provide Overview, Stats, Equipment, Titles and Talent/Age sections. Show level/XP, cumulative level, AP, age, selected talent and mastery. Stats expose base and modifier sources, derived values and current/max pools. Dungeon views identify the active run snapshot rather than silently displaying mutable town values as combat inputs.

Titles show First/Second slots and a separate cosmetic talent display, search over revealed entries, Known/Earned status, hints, favorites, benefits and penalties. Unknown entries cannot leak hidden acquisition text. Preview combined stat changes and current-pool clamping; replacing a title cannot refill resources. Title changes are town-only. Rebirth later shows reset/retain effects, eligibility and costs before confirmation; the UI does not invent these rules.

### Skills

Use a searchable list and detail panel, active/passive filters, rank, equipment conditions and prototype caps. Show each training objective, capped contribution and progress toward 100 points, plus AP cost. Distinguish Training incomplete, Training complete but insufficient AP, Ready to rank up and Max rank. Rank Up submits one town transaction; AP cannot buy missing training or cause automatic advancement.

Show instructor, complete-book and page-collection routes, learned/unknown state and linked Skill Quests where revealed. Book reading/page insertion/assembly previews identify consumed items and resulting skill or book. A combat shortcut selects a learned active skill; it does not purchase ranks or bypass requirements.

### Inventory and equipment

Present equipment beside backpack and a labeled bag selector; compact mode switches sections without spawning many floating bags. The provisional 6 × 10 backpack and item footprints come from inventory content. Show quantities, footprint, lock/favorite/reservation markers, gold capacity and saved reward overflow.

Desktop drag/drop is optional convenience. Always provide tap/select item → action → quantity/destination → confirm. Preview the complete target rectangle, and retain the original placement until the transaction succeeds. Distinguish Gather Stacks, Sort Container and bag pickup order. Comparisons evaluate the full proposed loadout including displaced equipment, mastery and active/inactive enchant clauses.

Inspection stays available during a run. Layout requests cost no initiative but are disabled during locked dice; equipment changes, learning, selling and destruction follow their spec's restrictions. World pickup consumes an action only on successful validation; failed fit offers an explicit smaller quantity. Overflow is withdraw-only, cannot supply usable items until withdrawal, and visibly blocks the next run while retaining access to already-earned results and recovery.

### Quests

Use named Chapter tabs with Generations grouped inside, plus Sidequests and Skills, completed filtering and RP badges. Show discovered availability without future-story spoilers; quest details distinguish offer, received quest, objective completion, NPC turn-in and claimed reward. Track/untrack never grants progress or spends a turn. Preserve tracked IDs through the existing application persistence contract, without coupling them to reward logic.

During a run show its quest snapshot and pending evidence. Claims remain unavailable. RP entry later previews the borrowed character, isolated inventory and outcome policy; returning cannot replace the hero's inventory with the mission character's gear.

### NPC services

An adjacent town interaction opens a shared dialogue shell with Talk and the NPC's implemented services. Shops, Bank, Healer, Inn and instructors arrive with Phase 7; quest offers, enchanting and gathering follow their owning slices. Do not make NPC services remotely executable from the menu bar. Revalidate location/session on confirm and close stale service views on context change.

Show buy/sell quantities, final prices, carried balance/capacity and resulting inventory space. Bank deposit/withdraw shows both balances; shops spend carried gold only. Recovery previews show affected pools, cost and eligibility. Enchant application shows old/new slot effects, chance, materials/MP and protected-equipment failure consequences. Burning has a separate destructive preview including zero/partial/full recovery possibilities and maximum output space requirements. Save-pending controls prevent repeated purchases or random attempts; publish success only after the application transaction commits.

### Results and recovery

Show the authored outcome, spent provisions, retained/lost items and gold, XP/AP/training/title/quest effects and overflow. Clearly distinguish pending reconciliation from durable rewards. Continue becomes available when the application confirms the result's durable disposition. Reopening or retrying renders the same result ID rather than granting again. Save failure and unsupported/corrupt-save flows offer only recovery choices the repository actually supports; never silently start over.

## 7. Input, focus and accessibility

- Route modal input, UI controls and then world controls through one explicit policy. Stage-first alone is insufficient: disabled widgets and empty panel areas must not let touches through to the map. Full-screen layout containers should not unintentionally consume the uncovered world either.
- Track pointer ownership from down to up/cancel. A gesture started over a panel remains UI-owned even if dragged outside. Cancel world gestures and clear held keys when opening a modal, pausing, losing focus or navigating.
- Provide a focus order and visible focus ring, Tab/Shift-Tab navigation and Enter/Space activation on the focused control. Scene2D keyboard/controller navigation is application work, not assumed automatic widget behavior. While UI focus is active, these keys cannot also wait/move in the dungeon.
- Preserve C/Z/Q/I window toggles when no text field is consuming input. Provisional dice shortcuts 1–5 toggle kept slots only in the proper activation. Do not bind one global key to Roll, Reroll and Commit by changing its meaning silently.
- Escape/Android Back dismisses the top inspection/confirmation, then the ordinary window, then opens Menu. Restore focus to the opener; cancel must not spend resources, abandon the run or reset a roll. iOS exposes an on-screen back/close control.
- Hover descriptions also open by tap/focus through an explicit info action. Disabled actions have a reachable explanation. Destructive confirmations identify exact items/quantities and costs; routine inspection needs no confirmation.
- Offer text/UI scaling, independent audio levels, reduced motion and optional haptics as their services arrive. Status, rarity, kept state and selection use shape/text as well as color. Important errors persist; transient toasts also enter the log.
- Controller support requires its own mapping/launcher verification before being advertised. Scene2D is a rendered UI, so native screen-reader support requires an explicit platform design and acceptance; this plan does not claim it.

## 8. Implementation boundaries and resource ownership

All paths below are relative to `core/src/main/kotlin/cloud/vinh/rebirthdungeon/`; names are proposed and created only with a consuming slice.

| Owner | Responsibility |
| --- | --- |
| `presentation/screens` | Screen composition, Stage lifecycle, world/UI viewport coordination and navigation requests. |
| `presentation/hud` | Status/menu bar, DicePanel, target information, quest tracker and observed event log. |
| `presentation/windows` | Small shared window host and modal/focus policy; feature views under character/, skills/, inventory/, quests/, services/. |
| `presentation/input` | Input context, focus/shortcut mapping, pointer ownership and world exclusion regions. |
| `presentation/dungeon`, `presentation/town` | World/map rendering and contextual selection using permitted observations. |
| `application/run`, `application/profile` | Validate context/revisions, serialize commands and transactions, coordinate durability and expose immutable results/availability. |
| `game/projection`, feature rules | Detached observations and pure eligibility/stat/effect calculations; no Actor, Skin, Gdx, I/O or clock access. |
| `bootstrap`, `data`, `platform` | Wire views/controllers, implement persistence and native capabilities in their established owners. |

Flow: **input intent → application request → pure rules/ordered World processing or profile transaction → immutable observation/result → view binding → cosmetic animation**. Presentation never edits components, reconstructs hidden enemies from restore exports, saves a feature fragment independently or grants rewards from listeners/animation callbacks.

View models contain display text/IDs, permitted values, availability reasons and relevant session/revision identity. Local selection, open tab, search and scroll are presentation state; dice, kept flags, resources and progression are authoritative. Revalidate stale selections on submit. Build actors once per screen/window activation and update changed fields; avoid rebuilding the full hierarchy every frame. Suppress model-to-widget change callbacks from resubmitting user requests.

Use KTX builders with the managed Skin passed explicitly, avoiding static references to an old application's GL resources. Use Table constraints and ScrollPane content; custom inventory/die widgets report useful preferred/minimum sizes. Consult the [Scene2D layout and focus guidance](https://libgdx.com/wiki/graphics/2d/scene2d/scene2d-ui) when implementing custom widgets.

The application AssetManager owns `assets/ui` skins, fonts and atlases. Initially extend the prototype skin with named selected/kept/disabled/focus/error styles; later replace art behind the same semantic roles. Use prebuilt font assets at suitable sizes initially, with no new font/native dependency just for styling. Screens own their Stage and private batches; dispose each resource once, detach input and cancel callbacks/tracks on exit. Shared managed assets survive screen transitions. Rebuild UI from committed state after pause/resume and reject stale worker callbacks through session generation tokens.

Persist only actual preferences when settings storage arrives: UI/text scale, bindings, audio/motion settings and optional window placement. Window placement cannot alter replay hashes or rules. Authoritative tracked quest IDs, inventory layout and activation state follow the existing bundle contract, outside assets.

## 9. Delivery plan and acceptance

This document does not change Current Focus: **Phase 4 remains the earliest unfinished phase**. No phase boxes are closed by planning the UI.

| Slice | Work | Exit evidence required |
| --- | --- | --- |
| Phase 4 prerequisites | Author exhaustion/recovery and terminal-scope rules; implement five-dice commands, pure previews and observation fields. | Command tests prove legal continuation, locking and deterministic combat before UI controls are enabled. |
| Phase 5A: shell and playable dice | Extract reusable HUD composition from DungeonScreen; add adaptive root, focus/input policy, resources, target/skill view and five stable dice with distinct controls. | Desktop encounter through real controls; UI clicks do not move hero, invalid actions explain why, all-kept/zero-reroll/post-roll-pass cases work. |
| Phase 5B: durability and presentation | Bind save-pending/failure states; reconstruct mid-activation; event animations and skip; minimal item action only with its inventory prerequisite. | Same hand, kept flags, budget, costs and continuation after reload; rapid input and animation interruption cannot duplicate effects. Exercise desktop/Android/iOS controls and retain unmet gates. |
| Phase 6 | Integrate durable recovery/menu states with migrations and application writer. | Interrupted saves and stale callbacks preserve the newest valid state; recovery never grants fresh dice/results. |
| Phase 7A–B | Resolve town contract gates, then status/menu bar, Character/Inventory views and adjacent service shells. | Carried/banked totals, capacity errors, recovery access, overflow and run locks agree with owning rules; transactions survive retry. |
| Phase 7C–D | Skills/training/rank-up, acquisition routes, talent/age and base Titles. | One retained run changes the next run through a deliberate rank-up; title/equipment previews match shared calculations without refills. |
| Phase 8 | Rebirth, quest journal/tracker, claims, enchant previews and staged gathering services. | Reset/retain previews, quest claims, burn capacity and random attempts remain correct across interruption. |
| Phases 9–10 | RP context and enabled multi-target/reaction/path skill details, dungeon depth. | Correct borrowed identity, frozen targets/path and visible-only event rendering; no unsupported extension implied. |
| Phases 11–12 | Final skin/fonts, optional desktop placement, complete remapping, motion/audio/haptics and device acceptance. | Usability/performance/accessibility checks below; earlier functional checks remain required in their own phases. |

### Verification matrix for implementation

| Check | Method and pass condition |
| --- | --- |
| Pure UI decisions | JVM tests for availability mapping, context transitions and permitted observations; no Gdx.app/OpenGL/native UI in core tests. Same command sequence with different UI timing/filtering gives the same simulation hash. |
| Real input | Desktop mouse/keyboard and Android/iOS touch: overlapping windows, disabled buttons, empty panel regions, drag cancellation, two pointers, repeated keys, back/focus and world click-through. No unintended command. |
| Combat resume | Save after initial roll, each reroll and kept changes; pause/kill/reload around persistence and presentation. Compare faces, reservations, budget and future continuation to an uninterrupted fixture. |
| Window transactions | Failed fit, insufficient AP/gold, stale item/target, active run, full overflow and failed save retain correct state and actionable reasons. Retry does not repeat costs or grants. |
| Visibility | Hide enemies beyond FOV; confirm map, target list, tooltips, log and animations expose only permitted observations, including event-time visibility. |
| Layout | Capture 1280×720 and 1920×1080 desktop, short landscape phone, tablet and notched/safe-inset devices at normal and enlarged text. Five dice/actions and close controls remain reachable; long names/localized strings wrap or scroll. Test zero-size resize and restoration. |
| Lifecycle/performance | Repeated menu/window/screen transitions retain no disposed actors/listeners or extra batches. Measure frame/GC behavior with full inventories and long journals; bound logs and add list virtualization only if measurements justify it. |
| Platform gates | `./gradlew :core:check :core:compileKotlin :lwjgl3:compileKotlin`; desktop `:lwjgl3:run`; Android duplicate-class check/assemble plus actual input testing; full iOS AOT/simulator launch and interaction per README. Compilation alone is not mobile runtime acceptance. |

Record commands, device/target, screenshots/log paths and results in the phase tracker when implementation is verified. A missing device remains an unmet gate. Documentation validation for this change checks local links, consistency with owning specs and diff hygiene; no runtime verification is implied.

## 10. Open decisions and explicit deferrals

- Resolve Phase 4's exhaustion and encounter/floor/run outcome rules before enabling their controls. The UI cannot invent a free attack, refill or automatic expedition reward.
- Before town implementation, reconcile towns.md's carried/banked gold, gold reward capacity, retention and guaranteed recovery access with game-plan/tracker and older inventory assumptions, per directory.md section 7. Display proposed carried/banked values, but do not ship unresolved overflow/reward behavior.
- Validate compact breakpoint, target sizes, font sizes and whether wide-mode two-window comparison remains useful on the supported hardware. Provide anchored defaults before optional window customization.
- Settle settings ownership and keyboard remapping persistence with their concrete implementation; screen-reader and controller support need explicit platform work.
- Defer freeform HUD rearrangement, multiple skill hotbars, map auto-walk, MMO/social windows and production gacha/store screens until their own requirements and phases. Keep the existing developer screenshot aid separate from a player-facing photo mode.

## Research notes

Sources below were fetched through **Firecrawl** and inspected on **2026-09-08**. Local caches are gitignored research artifacts; public links remain usable without them. Library documentation describes widget capabilities, while the layout, scope and implementation recommendations above are project-specific decisions.

| Source | Saved cache |
| --- | --- |
| [Mabinogi User Interface](https://wiki.mabinogiworld.com/view/User_Interface) | `.firecrawl/mabinogi-user-interface.md` |
| [libGDX Scene2D UI](https://libgdx.com/wiki/graphics/2d/scene2d/scene2d-ui) | `.firecrawl/ui-plan-scene2d-ui.md` |
| [KTX Scene2D builders](https://github.com/libktx/ktx/tree/master/scene2d) | `.firecrawl/ui-plan-ktx-scene2d.md` |
| [VisUI official wiki and widget index](https://github.com/kotcrab/vis-ui/wiki) | `.firecrawl/ui-plan-visui.md` |
