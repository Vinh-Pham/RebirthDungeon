# Ownership and save boundaries

A user action reaches the session actor as a typed domain command and operation ID. Phase guards reject out-of-order actions. An Immer producer computes one immutable save snapshot, including the next screen and phase. IndexedDB writes it atomically. Only a successful write publishes the snapshot to React and Phaser. A failed write leaves the prior state visible and reports the error.

This prevents spending currency without receiving an item, awarding battle rewards twice, repeating a turn after reload, or opening two treasure chests. A bounded operation-ID ledger protects retries; reward claim IDs and the persisted chest choice provide permanent reward protection.

Phaser rebuilds scene presentation from committed data and owns transient movement, targets, hit effects, and control bounds. Movement checkpoints are periodic, rather than per frame. React local state contains only form input and presentation choices. XState enemy actors produce damage decisions; dialogue and tutorial actors describe behavior. Domain snapshots remain plain serializable data.

The current storage schema is version 1. Unsupported versions fail explicitly. A malformed current snapshot falls back to the previous validated snapshot. A second tab is read-only while another tab holds the writer lock.

## Reference decisions

- The Mabinogi Level page's current Character Growth section takes precedence over older race/age overview text. Base/talent bonuses and XP thresholds are transcribed into domain data.
- Weekly aging uses Saturday noon in America/Los_Angeles, including DST, and processes missed boundaries once.
- Dicero informs five-dice combat presentation. Damage multipliers, shared reroll rounds, costs, and loot are the explicit Rebirth Dungeon design, not claimed as a verbatim Dicero ruleset.
- The Rex documentation URL retains the historical `phaser3-rex-notes` name; the installed package and integration target Phaser 4.
