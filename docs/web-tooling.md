# Web development and verification

Use Node 24 or 26+ and pnpm 12.6.0 from `packageManager`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` packs assets and launches Vite. The root `index.html` loads
`src/main.tsx`. `pnpm assets` copies original art, fonts, licenses,
Ink stories and Dungeon-20 into generated `public/assets/`, then writes the
Pixi atlas and source hash manifest. Edit originals under `assets/` and rerun
the packer. Preserve stable frame IDs.

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

See [static checks](linting.md) for the lint and format commands.

## Editing towns in LDtk

Open [towns.ldtk](../assets/maps/towns.ldtk) and choose Lantern Rest or
Spindle Hollow in World view. Paint the **Terrain** IntGrid with Ground,
Wall, Rough Ground, Interior Floor, Water, Grass, Bush, or Dirt Path. Dirt Path
is walkable. Unpainted cells
inside the town import as walkable ground. Painted walls, water, and bushes
block movement.
The [Aseprite terrain sheet](../assets/art/town_terrain.aseprite) supplies
the artwork for Wall, Water, Grass, Bush, and Dirt Path.
Use **Entities** to move the **PlayerStart** and **Landmark** markers.
`DisplayName` changes the displayed name. Keep the landmark's `ServiceId`
when moving a service such as the school, Moon Gate, or dungeon entrance.

Save both levels inside the project file with **Separate level files**
disabled. The importer uses each level's local grid and its `TownId`.
Save and refresh the game while `pnpm dev` runs. Run `pnpm build` to apply
the edits to a production build.

## Verification

Vitest runs web suites under `tests/web/`. fast-check verifies generated world
and inventory properties. Dexie tests use fake-indexeddb. `pnpm build` runs
asset packing, type checking and Vite production bundling. `pnpm preview`
serves the resulting `dist/` for browser acceptance.

With the preview server running on loopback, run the isolated browser smoke
test from the repository root:

```sh
tools/web/smoke.sh http://127.0.0.1:4173/
```

Use the `agent-browser` skill and an isolated session to inspect the served
game. Exercise creation, arrival, movement, click paths, camera pan/zoom,
combat queue replacement, counter outcomes, inventory, training, services,
quests, gate registration/travel and save/reload. Check keyboard focus,
responsive overlays, console errors and failed asset requests. Save before
reload and verify the same character, progression and gate registrations.
Verify that inventory items can move by drag and keyboard, that blocked
destinations leave the item in place, and that the new position survives reload.
In the Threshold, verify that a closed gate blocks movement until the room
is cleared. Walk through the opening on the same map, resize the viewport,
and reload to check that the opened gate and explored tiles are retained.
Check that a fresh character has ten empty skill slots. Assign Normal Attack
from Combat Mastery, swap slots by dragging, and verify the layout after reload.
In battle, use the numbered keys to queue the assigned skills and check that
the F1–F4 tonic assignments match Inventory.
Drag a dialog by its title bar and move it with the arrow keys while its title
bar has focus. Verify the dialog stays open during movement, remembers its
position after reopening, and stays within the viewport after resizing.
Keep screenshots and build evidence outside committed assets. Close the
browser session and stop launched servers after checking.

The [save guide](web-saves.md) describes character creation and local
persistence. Keep generated build output and local credentials outside
version control.
