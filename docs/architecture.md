# Ownership and save boundaries

A user action reaches the session actor as a typed domain command and operation ID. Phase guards reject out-of-order actions. An Immer producer computes one immutable save snapshot, including the next screen and phase. IndexedDB writes it atomically. Only a successful write publishes the snapshot to React and Phaser. A failed write leaves the prior state visible and reports the error.

This prevents spending currency without receiving an item, awarding battle rewards twice, repeating a turn after reload, or opening two treasure chests. A bounded operation-ID ledger protects retries; reward claim IDs and the persisted chest choice provide permanent reward protection.

Phaser rebuilds scene presentation from committed data and owns transient movement, targets, hit effects, and control bounds. Movement checkpoints are periodic, rather than per frame. React local state contains only form input and presentation choices. XState enemy actors produce damage decisions; dialogue and tutorial actors describe behavior. Domain snapshots remain plain serializable data.

## Window layer

Browsing panels (Character, Skills, skill details, Inventory, Menu, Settings, and the active town service) render as wmkit windows above the canvas through one React-owned provider in `src/ui/windows`. The provider owns window existence and geometry; `GameWindow` components own when a panel is open and what its live content is. React renders and removes all content; wmkit owns geometry and stacking only.

Window state is presentation state: it never enters an Immer save snapshot. Positions and sizes survive close/reopen for the page session and reset on reload. Scene or active-character changes close every window through the transaction-published snapshot, not from Phaser callbacks. The single service window follows the dialogue actor, which accepts an `OPEN` while `choosing` so interacting with another sign replaces the service without dropping other windows.

Input ownership is presentation state in `src/game/inputState.ts`: blocking overlays (retained confirmations and reward collection), interface focus (window, HUD, or owned popup), and window gestures. Uncovered canvas stays playable while windows are open; Phaser checks these flags for movement keys, world clicks, and interaction, and resets held keys whenever ownership changes. Rebirth and leave confirmations remain blocking HeroUI modals that take Escape priority over windows.

The current storage schema is version 2. Version 1 migrates learned skill IDs to ranked records and reconstructs pending actions without rerolling. A retained legacy backup accompanies the first durable write. Unsupported versions fail explicitly. A malformed current snapshot falls back to the previous validated snapshot. A second tab is read-only while another tab holds the writer lock.

## Reference decisions

- The Mabinogi Level page's current Character Growth section takes precedence over older race/age overview text. Base/talent bonuses and XP thresholds are transcribed into domain data.
- Weekly aging uses Saturday noon in America/Los_Angeles, including DST, and processes missed boundaries once.
- Dicero informs five-dice combat presentation. Damage multipliers, shared reroll rounds, costs, and loot are the explicit Rebirth Dungeon design, not claimed as a verbatim Dicero ruleset.
- The Rex documentation URL retains the historical `phaser3-rex-notes` name; the installed package and integration target Phaser 4.

## Ranked skills

`Skills.ts` owns rank content; `skillSystem.ts` owns acquisition, advancement, derived stats and equipment eligibility; `combat.ts` owns committed outcomes and training. Every run freezes profile ranks/stats/loadout; every first roll freezes its action inputs, resource reservation and target set. Temporary effects and cooldowns tick only on defined activation boundaries. The React skill journal and Phaser combat controls use these same domain definitions. See [accepted rules](gameplay/skills-implementation.md).
