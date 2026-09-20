# Rebirth Dungeon

A local, single-player Defold RPG: create a character, prepare in Town1, explore a seeded eight-room Alby Dungeon, fight fixed-turn battles, spend the boss’s key in its treasure room, and return home through the goddess statue. Progress saves after each accepted action.

## Play

Open `game.project` in **Defold 1.13.1**, fetch project dependencies, then **Project → Build**. The native RNG, A*, Event, DefSave and writer-lock extensions require an initial custom-engine build with internet access.

On macOS, a locally built application is placed in `artifacts/release/RebirthDungeon.app` by the release command below. Builds are local development artifacts, not notarized distributions.

- **WASD / arrows:** walk; **click:** follow a route.
- **E:** interact with a nearby service or dungeon encounter.
- **M:** map; click a marker to travel to it.
- **I / Q:** inventory / quests; **Escape:** close a panel or pause.
- Click a town NPC (or its map marker) to approach a reachable neighboring tile and open the service. Shops accept quantities from 1 to 99 with **Set quantity**; previews explain funds and capacity limits. **Talk** opens the NPC’s saved conversation; finished conversations can be restarted.
- **Shift+Tab:** previous enabled control. Focus is outlined; Escape closes details/confirmations before their parent. Mouse wheel changes paged lists/logs, and Settings supports HUD text up to 130%.
- **Tab / Enter:** move through buttons and inventory rows / activate. In Inventory, select an item for details and actions; type an exact quantity and choose **Set**. Escape cancels discard confirmation or clears selection before closing. The Bank accepts exact item quantities and gold amounts.
- In battle, select an enemy, optionally use one item, then Attack, use a skill, or Defend. The Skills journal groups learned skills by category and shows effects, exact costs, equipment requirements, training objectives and source notes. During your turn, select an active skill and choose **Use skill**. Starter skills remain at F; higher ranks and books are milestone-6 content.

Start with health and stamina potions from the General Shop. Heal between encounters through Inventory. Clear the contact, chest and switch rooms to open the boss gate; the two side rooms are optional. Reward selection and your single chest choice survive restarts. Menu → Title suspends the current journey.

Character names use an explicit ASCII policy: 2–24 characters, starting with A–Z, with letters, numbers, spaces, apostrophes and hyphens. Up to 20 independent characters are supported. Rebirth becomes available after the planned cooldown.

## Build and verify

Requirements: Python 3, JDK 25+, LuaJIT for the unit suite, and a desktop graphics session for engine tests. The helper downloads the exact matching Bob toolchain and test-library sources. Production library archives are pinned in `game.project`; all revisions are recorded in `tools/dependencies.json`.

```sh
python3 tools/build.py unit
python3 tools/build.py test
python3 tools/build.py visual
python3 tools/build.py release
```

The default target is the host's macOS architecture, or x86_64 Linux on Linux. `--platform` chooses another Bob target; a successful cross-build does not establish runtime support. Run build commands sequentially because Bob shares generated native metadata between output directories. Test resources are reachable only from the separate test collections and are excluded from shipping archives.

`tools/compile-dialogue.sh` optionally recompiles the checked-in Ink story using pinned inkjs 2.3.2. It is not needed to play.

## Project notes

- [Implementation and remaining scope](docs/implementation-status.md)
- [Verification evidence](docs/verification.md)
- [Game plan](docs/game-plan.md) and [documentation index](docs/README.md)
- [Content values and adaptations](docs/content-data.md)
- [Art and audio credits](assets/CREDITS.md)

Rules version 2 preserves old aggregate skill training through an explicit migration and freezes run ranks. Save files use versioned A/B generations under Defold's application-data directory (`~/Library/Application Support/RebirthDungeon/` on macOS). A native process lock permits only one writer. Unrecoverable or newer profiles are preserved; a valid older A/B generation can repair its damaged companion. failed writes pause gameplay and offer Retry or Reload. These checks provide recovery from interrupted writes, not a claim of hardware-level power-loss durability.

Combat log: use **Battle log** during combat or **Menu → View combat log** afterward. Select an operation for its costs, hits and status details. Earlier/Later actions preserve your reading position; Jump to latest resumes following. The latest encounter retains up to 100 events through return, defeat and rebirth. Multi-battle archives await a separately verified storage format.
