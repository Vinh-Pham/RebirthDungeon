# Ownership and save boundaries

A user action reaches the session actor as a typed domain command and operation ID. Phase guards reject out-of-order actions. An Immer producer computes one immutable save snapshot, including the next screen and phase. IndexedDB writes it atomically. Only a successful write publishes the snapshot to React and Phaser. A failed write leaves the prior state visible and reports the error.

This prevents spending currency without receiving an item, awarding battle rewards twice, repeating a turn after reload, or opening two treasure chests. A bounded operation-ID ledger protects retries; reward claim IDs and the persisted chest choice provide permanent reward protection.

Phaser rebuilds scene presentation from committed data and owns transient movement, targets, hit effects, and control bounds. Movement checkpoints are periodic, rather than per frame. React local state contains only form input and presentation choices. The XState session schedules begin-turn and enemy-turn commands; enemy policies select ordinary actions; dialogue and tutorial actors describe behavior. Domain snapshots remain plain serializable data.

## Window layer

Browsing panels (Character, Skills, skill details, Quests, quest details, Inventory, Menu, Settings, and the active town service) render as wmkit windows above the canvas through one React-owned provider in `src/ui/windows`. The provider owns window existence and geometry; `GameWindow` components own when a panel is open and what its live content is. React renders and removes all content; wmkit owns geometry and stacking only.

Window state is presentation state: it never enters an Immer save snapshot. Positions and sizes survive close/reopen for the page session and reset on reload. Scene or active-character changes close every window through the transaction-published snapshot, not from Phaser callbacks. The single service window follows the dialogue actor, which accepts an `OPEN` while `choosing` so interacting with another sign replaces the service without dropping other windows.

Input ownership is presentation state in `src/game/inputState.ts`: blocking overlays (retained confirmations and reward collection), interface focus (window, HUD, or owned popup), and window gestures. Uncovered canvas stays playable while windows are open; Phaser checks these flags for movement keys, world clicks, and interaction, and resets held keys whenever ownership changes. Rebirth and leave confirmations remain blocking HeroUI modals that take Escape priority over windows.

Window toggles use `react-hotkeys-hook`: C for Character, Z for Skills, Q for Quests and I for Inventory. The hook delegates to the existing window manager, retaining window geometry, close callbacks and focus handling. Typing, composition, held-key repeats, open menus, blocking dialogs and gestures do not toggle windows. WASD and arrow keys remain available for movement.

The current storage schema is version 5. Versions 1–4 migrate through the existing skill, stat, quest, and inventory conversions, then gain fixed turn order, fractional stamina support, starter mastery/defense records, and pure-rand world/RP/battle states. Migration preserves frozen sources and already-spent resources; it discards unfinished dice without charging or granting turn-start recovery. The original save remains in its `legacy-vN` backup. Zod validates supported shapes before domain integrity checks, and invalid current saves fall back to a validated previous snapshot. Migration and town quest reconciliation are saved before publication when this tab holds the writer lock. A second tab stays read-only.

## Reference decisions

- The Mabinogi Level page's current Character Growth section takes precedence over older race/age overview text. Base/talent bonuses and XP thresholds are transcribed into domain data.
- Weekly aging uses Saturday noon in America/Los_Angeles, including DST, and processes missed boundaries once.
- Battles use individual turns with fixed Speed order and one optional item before a main action. These are explicit Rebirth Dungeon adaptations. See [the battle contract](turn-based-plan.md).
- The Rex documentation URL retains the historical `phaser3-rex-notes` name; the installed package and integration target Phaser 4.

## Ranked skills

`Skills.ts` owns rank content; `skillSystem.ts` owns acquisition, advancement, derived stats and eligibility; `combat.ts` owns shared damage and training. `battle/engine.ts` resolves one actor command inside the enclosing save producer. `commands.ts` exposes the complete headless `{ state, events }` transaction, including rewards and RP ownership. Runs freeze profile ranks/stats/loadout; commands validate and pay current costs atomically with no reservations. Cooldowns/statuses advance at owner boundaries. React/HeroUI uses these same selectors for previews and controls; Phaser highlights the selected target and consumes committed event sequences. Battle history is bounded to 100 events; the latest batch also survives terminal battle cleanup in the save envelope.

`rng.ts` wraps pure-rand Xoroshiro128+ using an algorithm/version tag and four signed state words. World and RP streams initialize independent battle streams; initiative ties consume draws once and critical outcomes continue that saved battle stream. Previews and rejected commands consume no randomness. `battle/schemas.ts` supplies strict Zod save schemas plus legacy envelopes; `battle/content.ts` validates executable skills, statuses and consumables without replacing retained data with stripped schema output.

## Quests and controlled actors

`src/domain/quests` owns the stable catalog, staged progress, prerequisite delivery, readiness, reward previews, claim ledger, and RP template. NPC windows and the journal dispatch commands; neither presentation layer awards progress. Normal runs snapshot eligible stages and save pending evidence. Kill evidence banks on every run ending, while dungeon clears require the successful treasure-room return. Quest rewards and delivery consumption are atomic; item overflow is saved separately from normal encounter rewards.

The runtime exposes the persistent hero separately from the controlled character. During Aren’s memory the latter is a versioned NPC actor inside the hero’s RP session. The reducer applies ordinary simulation commands to an isolated save containing that actor and its own RNG, then saves the resulting NPC snapshot without overwriting the hero. RP death/exit discards the attempt; success advances its parent quest. Combat cannot leak loot, XP, skill training, or ordinary quest credit to the hero.

The six-category HeroUI journal and its detail are owned wmkit windows; three tracked IDs are durable hero preferences, while tab/filter/window geometry remains presentation state. See [quest implementation contract](gameplay/quests.md#current-implementation-contract).

## Inventory ownership

`src/domain/inventory.ts` owns footprint placement, complete transfer simulation, race/slot checks and equipment exchanges. Item records remain unique; backpack anchors and equipment assignments select their location. The React panel uses those same validators for previews and dispatches Move, Equip, Unequip, Use and Drop through the transaction pipeline. Drag previews and selected items are transient. Equipment stats resolve all nine slots once, with existing main/off-hand source identifiers retained for frozen run compatibility. Migration recovery is withdraw-only; quest overflow keeps its separate grant ledger. See the [inventory contract](gameplay/inventory.md).