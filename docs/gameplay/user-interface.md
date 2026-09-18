# Godot user interface plan

Updated **2026-09-10**. Status: **planned; not implemented**. Use Godot `Control` scenes, `Container` layouts, a shared `Theme` and a `CanvasLayer` over the active world/battle view. [Game Plan](../game-plan.md) owns architecture and [Project Phases](../project-phases.md) owns delivery.

The interface adapts Mabinogi's status/menu bar, character panels and quest journal to a small offline game. Original art/fonts are required; historical reference screenshots are not shipped assets. [Mabinogi UI reference](https://wiki.mabinogiworld.com/view/User_Interface). The detailed behavior below belongs to Rebirth Dungeon.

## 1. Godot composition

`Main` owns a persistent UI host. Mode-specific HUDs attach to the active town, dungeon or battle view. Compose HUD → feature panels → modal input shield/dialog → noninteractive tooltips/toasts. Reuse feature scenes for Character, Skills, Inventory, Quests and NPC services; opening one does not replace the game session.

Use `MarginContainer`, `HBoxContainer`, `VBoxContainer`, `GridContainer`, `PanelContainer`, `ScrollContainer`, `Button`, `Label`/`RichTextLabel` and resource bars as needed. Containers control child layout, so resize/reflow through minimum sizes and size flags rather than fighting child positions. Theme resources centralize fonts, colors, spacing and focus styles. [Godot Containers](https://docs.godotengine.org/en/stable/tutorials/ui/gui_containers.html).

The session controller supplies copied observations, availability reasons and revision tokens. Buttons emit requests; no view calculates independent combat results, mutates shared Resources, spends AP or grants loot. Animations show already-resolved outcomes and can be skipped without changing rules.

## 2. Separate exploration and battle surfaces

Exploration shows the town/dungeon, discovered map, permitted encounter markers, interaction prompts, optional quest tracker and persistent status/menu bar. Movement is continuous. Clicking an NPC/pickup approaches an authored interaction point before a validated request. Unknown rooms and actors remain hidden from all panels, tooltips and map markers.

Battle replaces the exploration view with cosmetic hero/enemy staging and its five-dice panel. Exploration movement is disabled. Battle sprite positions do not express range or targeting legality.

```text
Battle: enemy HP / intent / statuses       Selected target

                  Hero and enemy presentation

Selected skill + rank        Cost / reservations / effect preview
[die 1] [die 2] [die 3] [die 4] [die 5]   Keep markers
Pips / combination / multiplier              Rerolls remaining
Roll              Reroll              Use Skill              Pass

HP / MP / SP       Level / XP       Gold       Feature menus
```

Keep five die slots stable throughout an activation. Reflow secondary details into a scrollable inspection sheet on compact landscape. Do not hide the locked skill/target, kept state, remaining budget or cost to fit a map or log. Town uses service prompts in place of dice controls.

## 3. Scale, safe areas and style

Evaluate the existing `canvas_items` stretch and `expand` aspect as the baseline; the main viewport's base size remains a Phase 0 choice. Camera zoom affects world art, while Control layout/text scale remain a separate UI policy. A CanvasLayer separates drawing from camera transforms; it does not by itself create an independent viewport.

Use nearest filtering for pixel textures, dark readable panels, restrained warm borders and clear hierarchy. Provisional targets are 48 logical units for primary touch areas, 8-unit spacing and 16–18-unit body text. Verify actual physical size and font clarity on devices. A wide/compact breakpoint must consider both usable width and height after safe insets and text scaling, not platform name alone.

Convert the platform safe area into UI coordinates once, then apply margins. On resize/orientation change reflow controls and keep close/back actions visible. Ignore zero-sized layout intervals safely. Support scalable body text, wrap long names and scroll details. Color is supplemented by text/shape: show Kept markers, reservations, focus and status duration explicitly.

Desktop may show comparison panels when space permits. Compact mode shows one sheet with list → detail → back, preserving selection and scroll. Keep the bottom bar anchored; movable windows are optional later work with a Reset Layout action.

## 4. Status and feature navigation

| Surface | Required behavior |
| --- | --- |
| Resources | HP/MP/SP current/max, reservation versus available amounts, statuses with source and remaining owner activations |
| Progress/currency | Level/XP and temporary gold in Phase 7; later carried capacity with banked balance separately labeled |
| Menu bar | Character C, Skills Z, Quests Q, Inventory I and Menu; introduce destinations when implemented |
| Location and target | Room/floor or town identity, visible encounter target, known defenses/intent |
| Quest tracker | Initially three visible rows plus More; this is a layout limit, not a cap on quests |
| Map | Discovered rooms, hero and permitted markers; no leaked unseen content |
| Log | Bounded observed combat/system events; filters/scroll never spend a turn or claim rewards |
| Menu | Settings, input help, save state, credits and explicit continue/abandon flows |

Inspection is available during a run, but equipment/title changes, rank-ups, enchant operations and quest claims are town-only. Show concrete reasons for locked actions. Pending dungeon rewards/training/evidence remain visibly distinct from committed possessions and achievements.

## 5. Battle interaction states

| Observed state | Actions and feedback |
| --- | --- |
| Pre-roll | Select legal skill/target; inspect cost/odds; Roll; free-of-skill-cost Pass; pre-roll full-action potion when enabled |
| First roll | Lock skill/rank/target/stats/weights/costs and show five authoritative results |
| Saving | Inspect only; show pending checkpoint and suppress additional gameplay requests |
| Rolled with rerolls | Toggle kept dice; reroll a nonempty unkept subset; Use Skill; paid Pass |
| No rerolls | Inspect, Use Skill or paid Pass; show zero budget and explain disabled Reroll |
| Resolving/presenting | Prevent duplicate requests; skipping animation only releases presentation gating |
| Save failure | Persistent explanation and Retry of the same candidate; never offer a new random result |
| Encounter ended | Show outcome, then return to exploration after its checkpoint; distinguish encounter victory from dungeon exit |

The UI uses [Battle](battle.md) and [Stats](stats.md) observations for pips, one combination multiplier and the exact effect preview. Show weighted odds before rolling. Roll, Reroll and Use Skill remain separate labeled actions. Paid Pass explicitly displays its cost. Stable indices 0–4 identify dice; display reordering must not change their identity.

## 6. Feature views

| View | Required contents and actions |
| --- | --- |
| Character | Life/cumulative levels, age, talent, AP, stats and source breakdown; equipment and First/Second Title choices with no-refill preview |
| Skills | Learned/unlearned states, rank/prototype cap, training goals/progress, AP cost, Rank Up, lesson/book/page progress and visible limitations |
| Inventory | Equipment plus footprint grid, bag tabs, stack/lock state, search/sort and saved overflow; tap-select then destination as a drag alternative |
| Quests | Chapter/Generation, NPC/Skill and RP categories, stage/objective progress, return/claim distinction, rewards and tracked objectives |
| NPC services | Dialogue plus implemented services; validate proximity/session on confirmation and close stale panels on context change |
| Results | Outcome, retained/lost/pending rewards, consumed supplies and overflow; Continue only after durable reconciliation |

Inventory previews displacement/space/cost before submission; rejection restores presentation to authoritative placement. Sorting/filtering/dragging do not award items or move the world. The backend validates whole transactions, including two-handed equipment replacements, bag restrictions and capacity.

The initial town service shell supports talk, potion purchase and free recovery. Phase 8 adds banking/equipment commerce and instructors; later phases add quests/enchants. Shops preview exact costs and placement. Enchant application previews slot replacement, chance, materials and failure policy. Burning is a separate destructive confirmation naming the item and possible recovery outputs; reserve maximum required output space before rolling.

Rebirth previews reset and retained values before confirmation. RP entry previews borrowed character and outcome rules. Unsupported/corrupt-save panels offer only implemented recovery choices and never silently create a new hero.

## 7. Input and accessibility

Map actions through `InputMap` and use `Control` focus/GUI events for widgets. World clicks/taps go through `_unhandled_input`; modal/panel surfaces accept their events. Polling `Input` for held movement bypasses event consumption, so explicitly gate it by active mode, focus and modal context. [Godot input events](https://docs.godotengine.org/en/stable/tutorials/inputs/inputevent.html).

Track pointer ownership through release/cancel: a gesture started on UI stays UI-owned when dragged outside. Disabled buttons and empty panel space must not let touches hit the map. Decorative controls must not block legitimate world input. Cancel gestures and held movement on focus loss, pause, transitions and modal entry.

Define focus neighbors and a visible focus style. Test keyboard-only navigation, activation and return-to-opener behavior; controller support needs its own mapped/runtime check. C/Z/Q/I shortcuts do not fire while editing text. Dice shortcuts 1–5 toggle kept slots only in a valid hand. Do not bind one unlabeled key to roll/reroll/commit based on changing state.

Escape/Android Back closes the top dialog, then feature sheet, then opens Menu. It never automatically spends resources or abandons the run. iOS has explicit on-screen close/back controls. Hover details also work through tap/focus info actions; disabled-action explanations remain reachable. Support reduced motion, text/UI scaling and separate audio levels. Screen-reader support requires explicit design and platform validation; rendered controls alone are not acceptance evidence.

## 8. Godot delivery and verification

Phase 1 builds the UI shell; Phase 5 proves battle controls; Phase 6 proves real save failures/restarts; Phase 7 adds town services; Phases 8–10 add progression views with their rules; Phases 12–14 complete polish and target acceptance.

| Check | Evidence required |
| --- | --- |
| Rule/UI boundary | Same command sequence with different animation/panel timing gives the same battle result/RNG |
| Desktop | Mouse and keyboard full loop, wide/compact resizing, focus and no click-through |
| Touch | Five dice remain usable, tap/drag ownership and multi-pointer rejection, safe areas and readable scaling |
| Persistence | Relaunch into the same hand; failed Retry never resamples or duplicates a purchase/reward |
| Accessibility | Keyboard focus, long text, contrast/cues, reduced motion and tap-accessible descriptions |
| Android/iOS | Godot export, actual installation/input, suspension/relaunch and full-loop outcomes; headless/import checks are insufficient |

No active UI implementation or platform acceptance is claimed by this plan. [Phase 5](../phase5-combat.md) and the [tracker](../project-phases.md) hold unchecked acceptance requirements.
