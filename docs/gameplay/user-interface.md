# Defold user interface plan

**First-release implementation updated 2026-09-20.** Use Defold `.gui`/`.gui_script` resources with [Druid](../references/defold/druid.md) controls and [Monarch](../references/defold/monarch.md) navigation. The [game plan](../game-plan.md) owns scope; [panel behavior](../wmkit.md) owns first-slice modal policy and later window proposals.

## Screens and HUD

`Bootstrap → Title → CharacterSelect → NewCharacter/Resume → Town1 → Alby ↔ Battle → TreasureRoom → Town1`

Keep session/save/audio and persistent HUD in bootstrap. Register transient world screens and popups as sibling Monarch screens, using proxies for independent world lifetime/time steps. Do not nest interactive children under proxy-owned screens. Route gameplay transitions after saved checkpoints.

| Screen / surface | Required controls |
| --- | --- |
| Title | Title/Start; neutral HUD values before selection |
| CharacterSelect | Character cards/count, New Character, Play/Resume, Rebirth; limit 20 |
| NewCharacter | Trimmed unique 2–24-character name, race, age 10–17, one of four talents; Giant/Archery restriction |
| Rebirth | Reuse age/talent controls with identity locked, eligibility/cooldown and consequence preview |
| HUD | Identity, current/max HP/MP/SP, level/EXP, gold and navigation |
| Battle | Turn order, target, Attack/Skills/Items/Defend, exact costs/cooldowns/reasons and item allowance |
| Dialogue | Ink paragraphs/choices, service access, journal guidance |
| Rewards | Individual selection, Take Selected/Take All, visible unclaimed offers and capacity feedback |
| TreasureRoom | Walkable chamber beyond the boss, five clickable chests (one key each), key counter and clickable goddess statue for return |
| Settings | Music/effects volumes, reduced motion, HUD scale, controls; Title saves/suspends run |

HUD actions: **Character, Skills, Talent, Quests, Inventory, Pets, Menu**. Hide this navigation bar and its buttons on Title and character selection; retain the neutral status display. Inventory and onboarding journal work in the first slice. Talent/Pets can explicitly show unavailable; full skill/journal/talent systems follow milestones. No button should imply unsupported content exists.

Use dark translucent panels, thin borders, teal icons, magenta HP, blue Mana, yellow Stamina and segmented teal EXP. Preserve fractional SP precision. Original atlases/sprites/fonts/audio are required; reference art/screenshots are not shipping assets.

## Input and layout

Extend bindings for WASD/arrows, E, Escape, pointer buttons/motion, scrolling, text and GUI navigation. Match Druid action IDs or configure mappings explicitly. Optional C/Z/Q/I panel shortcuts require deliberate bindings and must not fire during typing/composition, held repeats or modal interaction.

Forward Druid update/message/input/final callbacks, return consumption, and coordinate its focus with Monarch. Use one world input policy and player movement writer. All GUI bounds, HUD, popups and drag gestures must prevent world click-through. Clear held keys and cancel routes on focus loss, opening blocking panels, scene transition and suspension.

First-slice service panels and modal workflows block world controls and pause world updates, with root-owned simulation explicitly gated. Saved enemy/battle pacing resumes from committed phase after closing an overlay. Menu browsing cannot execute gameplay or grant turn recovery. Later nonblocking draggable windows need separate verified input ownership.

The desktop implementation uses fixed-fit world projection and a fit-adjusted 1280×720 GUI root, preserving aspect ratio with letterboxing. Acceptance sizes are **1280×720 and 1024×768**, high DPI and enlarged HUD. Reserve HUD area, clamp popup bounds, scroll long content and retain reachable close/action controls. Mobile/touch/HTML5 support requires separate scope and checks.

## Panel details

Character shows identity, level/cumulative level/AP, age/talent, resources, effective stats and source/effect explanations. Skills shows learned entries, rank/training and later AP advancement/details; passive/reference-only actions have clear labels. Quests initially shows onboarding progress and explicit claims; later adds categories, tracked goals and overflow. Inventory initially uses 30 slots plus town equipment/service controls, later the footprint design.

Opening/closing/selecting/tabbing changes transient GUI state. Purchases, equipment, claims, skill progression, dialogue choices and settings saves go through their respective adapters. Disabled controls supplement domain validation. Busy writes and stale turns cannot accept actions through shortcuts or another panel.

Use visible keyboard focus, readable labels and disabled reasons, non-color status cues, and keyboard alternatives to dragging. Escape dismisses the highest-priority confirmation or owned popup before its parent and restores useful focus. Native accessibility behavior needs platform verification; browser ARIA assumptions do not establish support.

## Feedback and lifecycle

Render only committed Event batches; use native animations or Tweener for scalar feedback. Retain/cancel handles before node deletion, ignore stale screen/operation IDs and keep hit shake on visual children. Reduced motion sets final visual state and releases pacing without changing outcomes. Audio service owns tracks and multiplies fades by current user volume/mute.

Unsubscribe/finalize on screen close and character switch. GUI nodes/handles and live Monarch stack are transient; save workflow checkpoints/story state instead. Rebuild from committed projections after restart.

## Verification

Use Lester for selectors/eligibility and engine or desktop real-input journeys for Druid/Monarch, focus/text entry, no click-through, repeated transitions, long text, scaled HUD, audio and reduced motion. Capture Title/creation, town/HUD, battle, inventory, dialogue and treasure at both acceptance sizes. See [verification](../verification.md); no browser tests count as Defold acceptance.

## First-release implementation

The persistent HUD and screens consume plain display projections through bounded Defold messages. `game/runtime/ui_presenter.lua` computes effective stats, battle eligibility/costs/cooldowns, rebirth readiness and reward capacity; `game/ui/session.lua` owns only per-controller display data and outbound intents. GUI modules no longer import game logic or read the session singleton. No saved RNG state, operation ledger or hidden chest contents are sent to the GUI. Revision/profile guards protect commands; request tokens prevent older target previews from replacing a newer selection.

The HUD keeps neutral resource/EXP/identity values before selection, then displays current/max pools, fractional SP, identity, gold, AP and segmented EXP. Text supports 100%, 115% and 130%. Character includes effective attributes, resource pools and a source/effect page. Character cards include guarded Rebirth access, while Rebirth locks identity and previews level/growth/age consequences. Battle groups Attack, Skills, Defend and Items with exact action costs, damage estimates, cooldown/turn reasons and the optional-item allowance. Rewards preview Take Selected and Take All independently, keeping overflow offers visible and unclaimed.

All blocking panels and confirmations have sibling Monarch popup lifetimes, in addition to service/conversation popups. The persistent GUI renders them while the proxy and bootstrap simulation pause separately. Settings and abandonment return to their parent Menu; source/detail/discard confirmations take Escape priority. Keyboard focus has a visible outline, skips disabled controls and returns to its opener. Shift+Tab reverses focus, text fields join keyboard navigation, and Tab/Escape leave typing without firing gameplay shortcuts. Mouse wheel changes bounded pages in inventories, journals and logs. Animation handles are cancelled before node deletion, and character changes clear transient selections and focus.

Existing licensed fonts/CC0 placeholder sprites and original placeholder audio remain in use. Draggable nonblocking windows, native screen-reader certification, mobile and HTML5 remain outside this slice.

Rewards interaction update: Spoils of battle starts with every unclaimed reward selected. Toggle individual entries, then use **Take selected**, or use **Take All** regardless of selection. Either action saves collection and leaving the rewards screen together, without a second confirmation or Continue button. Unselected rewards are left behind; selecting none allows leaving all rewards when inventory capacity is exhausted. Capacity/save failures preserve the complete pending offer. Chest rewards return to the same position in the treasure room; ordinary encounters return to the dungeon. The boss grants one key automatically and opens the passage to the treasure room.
