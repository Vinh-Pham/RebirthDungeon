# Ownership and save boundaries

A user action reaches the session actor as a typed domain command and operation ID. Phase guards reject out-of-order actions. An Immer producer computes one immutable save snapshot, including the next screen and phase. IndexedDB writes it atomically. Only a successful write publishes the snapshot to React and Phaser. A failed write leaves the prior state visible and reports the error.

This prevents spending currency without receiving an item, awarding battle rewards twice, repeating a turn after reload, or opening two treasure chests. A bounded operation-ID ledger protects retries; reward claim IDs and the persisted chest choice provide permanent reward protection.

Phaser rebuilds scene presentation from committed data and owns transient movement, targets, hit effects, and control bounds. Movement checkpoints are periodic, rather than per frame. React local state contains only form input and presentation choices. XState enemy actors produce damage decisions; dialogue and tutorial actors describe behavior. Domain snapshots remain plain serializable data.

## Window layer

Browsing panels (Character, Skills, skill details, Quests, quest details, Inventory, Menu, Settings, and the active town service) render as wmkit windows above the canvas through one React-owned provider in `src/ui/windows`. The provider owns window existence and geometry; `GameWindow` components own when a panel is open and what its live content is. React renders and removes all content; wmkit owns geometry and stacking only.

Window state is presentation state: it never enters an Immer save snapshot. Positions and sizes survive close/reopen for the page session and reset on reload. Scene or active-character changes close every window through the transaction-published snapshot, not from Phaser callbacks. The single service window follows the dialogue actor, which accepts an `OPEN` while `choosing` so interacting with another sign replaces the service without dropping other windows.

Input ownership is presentation state in `src/game/inputState.ts`: blocking overlays (retained confirmations and reward collection), interface focus (window, HUD, or owned popup), and window gestures. Uncovered canvas stays playable while windows are open; Phaser checks these flags for movement keys, world clicks, and interaction, and resets held keys whenever ownership changes. Rebirth and leave confirmations remain blocking HeroUI modals that take Escape priority over windows.

The current storage schema is version 4. Version 3 upgrades to persisted backpack anchors, a nine-slot equipment map and migration-only recovery storage, including isolated RP actors. Frozen run sources and pending dice remain intact. Version 2 upgrades to a persistent quest journal and isolated RP session support; migrated active runs receive empty quest snapshots. Town-load reconciliation saves newly received quests before publishing, and respects the writer lock. Version 1 migrates learned skill IDs to ranked records and reconstructs pending actions without rerolling. A retained legacy backup accompanies the first durable write. Unsupported versions fail explicitly. A malformed current snapshot falls back to the previous validated snapshot. A second tab is read-only while another tab holds the writer lock.

## Reference decisions

- The Mabinogi Level page's current Character Growth section takes precedence over older race/age overview text. Base/talent bonuses and XP thresholds are transcribed into domain data.
- Weekly aging uses Saturday noon in America/Los_Angeles, including DST, and processes missed boundaries once.
- Dicero informs five-dice combat presentation. Damage multipliers, shared reroll rounds, costs, and loot are the explicit Rebirth Dungeon design, not claimed as a verbatim Dicero ruleset.
- The Rex documentation URL retains the historical `phaser3-rex-notes` name; the installed package and integration target Phaser 4.

## Ranked skills

`Skills.ts` owns rank content; `skillSystem.ts` owns acquisition, advancement, derived stats and equipment eligibility; `combat.ts` owns committed outcomes and training. Every run freezes profile ranks/stats/loadout; every first roll freezes its action inputs, resource reservation and target set. Temporary effects and cooldowns tick only on defined activation boundaries. The React skill journal and Phaser combat controls use these same domain definitions. See [accepted rules](gameplay/skills-implementation.md).

## Quests and controlled actors

`src/domain/quests` owns the stable catalog, staged progress, prerequisite delivery, readiness, reward previews, claim ledger, and RP template. NPC windows and the journal dispatch commands; neither presentation layer awards progress. Normal runs snapshot eligible stages and save pending evidence. Kill evidence banks on every run ending, while dungeon clears require the successful treasure-room return. Quest rewards and delivery consumption are atomic; item overflow is saved separately from normal encounter rewards.

The runtime exposes the persistent hero separately from the controlled character. During Aren’s memory the latter is a versioned NPC actor inside the hero’s RP session. The reducer applies ordinary simulation commands to an isolated save containing that actor and its own RNG, then saves the resulting NPC snapshot without overwriting the hero. RP death/exit discards the attempt; success advances its parent quest. Combat cannot leak loot, XP, skill training, or ordinary quest credit to the hero.

The six-category HeroUI journal and its detail are owned wmkit windows; three tracked IDs are durable hero preferences, while tab/filter/window geometry remains presentation state. See [quest implementation contract](gameplay/quests.md#current-implementation-contract).

## Inventory ownership

`src/domain/inventory.ts` owns footprint placement, complete transfer simulation, race/slot checks and equipment exchanges. Item records remain unique; backpack anchors and equipment assignments select their location. The React panel uses those same validators for previews and dispatches Move, Equip, Unequip, Use and Drop through the transaction pipeline. Drag previews and selected items are transient. Equipment stats resolve all nine slots once, with existing main/off-hand source identifiers retained for frozen run compatibility. Migration recovery is withdraw-only; quest overflow keeps its separate grant ledger. See the [inventory contract](gameplay/inventory.md).
