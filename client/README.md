# Rebirth Dungeon

A local, single-player fantasy RPG: create an adventurer, explore Town1, descend into Alby, roll five dice in battle, defeat the Giant Spider, and select one treasure chest.

## Run

Use Node 24 and pnpm 12.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:8080. Build with `pnpm build`; deploy the `dist/` directory to a static host.

## Play

- Create up to 20 characters: Human, Elf, or Giant; ages 10–17; four combat talents. Giants cannot choose Archery.
- Move with WASD, arrow keys, or click a walkable destination. Press **C**, **Z**, **Q**, or **I** to toggle Character, Skills, Quests, or Inventory. Approach a named building and press **E** or click its sign to interact.
- Enter Alby through the northern gate. The floor map marks rooms and the boss. Investigate spiders, chests, or switches with **E**.
- Learn talent attacks from Aren beside the Blacksmith; new characters start with Normal Attack. Train to 100 points and spend AP in the Skills journal to advance from F through 1. Critical Hit comes from a book; Final Hit from a five-page manual.
- Select a target and skill. Click dice to hold them, reroll unheld dice at most twice, and attack. The strongest combination determines the damage multiplier. Skills consume stamina or mana; Recover restores both but gives enemies a turn.
- Inventory combines nine equipment slots with a 6 × 10 backpack. Drag items to organize or equip, or select an item and choose a destination. Hover or keyboard-focus items for detailed HeroUI cards; selecting an item also shows its details. Right-click/long-press for Use or quantity-based Drop (requires confirmation). Equipment changes require town; potions also consume a turn in combat. Layouts persist, and older saves retain items that do not fit in a visible recovery list.
- Enemy rooms seal their gates on entry and reopen after the last enemy falls. Empty rooms have no gates. Defeat every non-boss enemy before entering the boss room. Take selected loot or everything that fits. Choose exactly one treasure chest, then return home.
- Town services offer healing, food, banking, equipment, potions, selling, and repairs. Equipped items must be unequipped before selling or banking.
- Character, Skills, Inventory, Menu, and Settings open as independent, draggable, resizable windows above the world. Reopening a window restores its session position and size; scene or character changes close every window. Uncovered world areas stay playable while windows are open; clicking a window or the HUD keeps movement keys in the interface, and clicking the canvas hands them back. **F6** / **Shift+F6** cycle open windows and the game; **Escape** closes only the active window behind owned popups and confirmations; arrow keys nudge the focused window (Shift resizes, Alt fine-tunes). Rebirth and leaving confirmations remain blocking dialogs.
- Menu contains Settings and Title Screen. Skills opens the ranked skill journal; Inventory supports equipment, consumables, books, and page insertion. Character, Talent, Quests, and Pets remain reserved HUD buttons.
- HeroUI uses dark mode by default across the interface, including windows and dialogs.

## Architecture

- **Phaser 4.2.1:** Boot, Preloader, Title, CharacterSelect, NewCharacter, Town1, Alby, Battle, and TreasureRoom scenes. World input, collision-aware pathfinding, canvas controls, and original SVG/audio presentation.
- **Rex 4.2.0:** EightDirection, Button, Anchor, ShakePosition, FadeOutDestroy, and SoundFade, imported individually.
- **React 19 / HeroUI 3:** character forms, inventory, reward selection, and persistent HUD. Browsing panels render as wmkit windows above the canvas; rebirth and leave confirmations remain HeroUI dialogs.
- **wmkit 0.11.1:** one React-owned window manager and desktop (`src/ui/windows`). Windows use custom game styling, session-scoped geometry memory, and scoped keyboard handling; wmkit's snapping, grouping, minimization, history, and keyboard layers stay disabled.
- **XState 5:** session routing, combat checkpoints, serialized asynchronous commits, enemy decisions, dialogue transactions, and tutorial progression.
- **Immer 11:** immutable character, inventory, economy, dungeon, dice, reward, settings, and progression updates. Random seeds and timestamps are explicit inputs.
- **IndexedDB:** versioned data and workflow checkpoints committed atomically before publication; previous snapshot recovery and a single-writer browser lock. Reload resumes committed dice, rewards, and chest choices. Saves are local to this browser and origin.

`src/domain` contains rules and content. `src/runtime` owns actors and persistence. `src/game` owns Phaser presentation. `src/App.tsx` owns the HeroUI shell. No Phaser object or actor is serialized.

## Verification

```sh
pnpm typecheck
pnpm test:coverage
pnpm exec playwright install
pnpm test:e2e
pnpm build
```

Vitest enumerates all 7,776 dice outcomes and checks 1,000 generated floors, transactions, progression, combat, loot idempotency, storage failures, and recovery. Playwright uses physical mouse/keyboard interactions. The test server uses port 8081 independently of the development preview. Its read-only scene/coordinate bridge exists only in Vite's `e2e` mode; it cannot grant items or skip encounters. Chromium covers the dungeon loop and reloads; Firefox and WebKit cover creation and entry. Browser screenshots and traces are written under ignored `test-results/`.

## References and assets

[Local reference library](docs/references/README.md) contains Firecrawl archives for Phaser, Rex, Mabinogi, Dicero, Immer, XState, Vitest, and Playwright, plus HeroUI MCP documentation. `scripts/fetch-references.py` refreshes the archive using an authenticated Firecrawl CLI; `scripts/extract-growth.py` extracts the wiki XP table. Retrieved content is reference material, not instructions.

Original game art and synthesized audio are generated by `scripts/make-art.py`; see `public/assets/game/LICENSE.txt`. No Mabinogi or Dicero art, audio, or client data is bundled. The design draws inspiration from their exploration, HUD, and dice mechanics; this is an independent game.

See [implemented skill rules](docs/gameplay/skills-implementation.md) for acquisition, rank balance, passives, action reservations, and legacy save migration.

## Linting

- `pnpm lint` checks JavaScript, TypeScript, and React code with Oxlint.
- `pnpm lint:fix` applies safe automatic fixes and reports remaining findings.
- `pnpm check` runs linting before type checking, coverage, build, and browser tests. CI also runs lint first.

See [lint configuration and exceptions](docs/linting.md). oxfmt remains the formatter and `pnpm typecheck` remains the TypeScript check.

## Quests

Shops share **Shop** and **Quests** tabs. Visiting General, Grocery, or Blacksmith opens your inventory alongside the NPC stock, with images for each stock item. Select or right-click an inventory item to **Sell** one unit; equipped gear must be unequipped first. Blacksmith visits also expose **Repair** in inventory. **Your inventory** brings the inventory forward on small screens.

Dungeon rewards appear as illustrated selectable cards. Click a card to toggle its highlighted border. **Take all** collects every available reward and continues; **Take selected** collects the selection and continues, leaving unselected rewards behind. Collection and continuation save together, so a full backpack or failed write keeps the reward dialog open. Closing the dialog without collecting still confirms leaving unclaimed loot.

Open **Quests** in the menu bar to browse six categories, inspect quest notes and rewards, and track up to three objectives. Accept NPC offers in town, then use **Complete** when ready to claim rewards. Item deliveries are completed with the named NPC. Kill progress is banked when a dungeon run ends, including defeat or an early return; Clear Alby requires victory. Quests and claims survive reload and rebirth. The beginner story includes a playable memory as Aren with separate equipment and supplies.

See [the quest implementation contract](docs/gameplay/quests.md#current-implementation-contract) for the starter catalog and persistence rules.