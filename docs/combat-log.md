# Per-battle combat log

> **Browser reference only.** The implementation/verification claims below describe the imported browser project, not RebirthDungeon.Ktx. Current Kotlin ownership is in [kotlin-architecture.md](kotlin-architecture.md); actual results are in [turn-based verification](evidence/turn-based/verification.md). The Kotlin slice has a bounded active battle log, not a character archive or browser save migration.

Implemented with the existing dependencies: wmkit manages the `combat-log` window;
HeroUI Accordion, Select, ListBox, Chip and ScrollShadow provide its controls; Tailwind
provides layout. Battle commands remain XState/Immer transactions, validated by Zod
before persistence. No new package or keyboard shortcut is introduced.

## Player experience

Open **View combat log** in the battle panel or **Combat Log** in the Adventure menu.
The window starts at 640 × 560 and uses the shared movement, resizing, viewport bounds,
Escape and focus restoration behavior. Browsing works during enemy turns and in a
read-only tab. Opening, selecting and expanding records changes only React state.

The active encounter is selected initially, otherwise the latest completed battle.
Completed battles are listed newest first, with Victory, Defeat or Abandoned labels.
Aren’s memory encounters are identified explicitly. Enemies with the same name receive
encounter-local numbers. Only the selected record renders its action entries.

Entries retain chronological round/turn order. Each turn/operation group has a readable
headline and expandable costs, hit results, criticals, healing, absorption, periodic
changes and effect details. Net resource changes are labeled separately from hit damage.
The compact battle preview uses the same formatter. Turn-start recovery remains separate
from the subsequent action.

New entries follow the reader only while the scroll viewport is at the bottom. Scrolling
up pauses following; subsequent events reveal **New entries · Jump to latest**. A polite
live region announces the latest action without announcing preloaded history or moving
keyboard focus.

## Event and archive contract

`domain/battle/events.ts` captures round and turn metadata before the queue advances.
Optional action fields identify skills/items, costs and readable effect names. Event
sequence is monotonically increasing within the battle. Formatting is a pure projection
in `domain/battle/history.ts`, shared by the full window and compact preview.

Active events live on `Character.battle`. Completed version-1 `BattleRecord` values live
on `Character.combatHistory`, with battle/run identity, encounter, participants, origin,
outcome, final round, events and an incomplete flag. Victory, defeat and abandonment
archive inside the command transaction before cleanup. Battle identity prevents repeated
archiving by reward claims or later cleanup. RP transactions copy only their completed
records into the persistent hero; RP possessions, progression and ordinary quest credit
remain isolated. Rebirth retains the hero’s history.

Keep the latest 20 completed records plus the active battle. Each event stream is limited
to 1,000 events after an operation completes. Trimming removes oldest whole turn/operation
groups and marks the record incomplete. An oversized single group is removed as a whole.
There is no export, search, analytics or manual deletion.

## Saves and verification

Save schema 6 migrates version 5 without discarding available active events. Existing
versions 1–4 still pass through the previous migrations first. Histories start empty,
except a retained terminal battle can be archived from its existing events. Migrated
battle records are marked incomplete; unknown historical actions or metadata are never
invented. Original version-5 data is retained in `legacy-v5`, alongside prior backups.

The existing commit-before-publication pipeline is unchanged. Failed writes do not
publish proposed history; retrying a command archives once. Invalid archive identities,
participants, event ordering and unsupported record shapes fail validation.

Tests: `tests/unit/combat-history.test.ts`, `tests/unit/combat-log-ui.test.tsx` and
`tests/browser/combat-log.spec.ts`, plus existing battle, persistence, quest, inventory,
window and skill journeys. The domain suite retains its existing 90% coverage gates.