# Game dialog windows

Drag the title bar to move a dialog. To move it with the keyboard, Tab to the
title bar and use the arrow keys. Escape or the close control dismisses the
dialog. Escape cancels an inventory pickup before it closes the Inventory
window.

Character, Skills, Journal, Inventory, Moon Gates, Settings, Log, loot,
and character deletion use the same [GameDialog](../src/ui/GameDialog.tsx)
shell. The game presents one modal at a time. HeroUI owns modal focus and
dismissal. The transparent backdrop keeps the map and HUD undimmed while
blocking interaction with the map during a modal dialog.

World interactions use the [WorldDialogue](../src/ui/WorldDialogue.tsx)
overlay, which spans the bottom of the canvas and scrolls longer menus.

The shell attaches the wmkit desktop controller after the HeroUI portal
mounts. wmkit handles pointer movement and clamps the whole frame to the
available viewport. The dialog sizes to its content and scrolls its body
when needed. It remembers its position when reopened during the current
page session. Window coordinates stay outside character saves.

The implementation uses `@surdeddd/wmkit` 0.15.0. See the
[upstream API](https://github.com/Surdeddd/wmkit/blob/main/docs/api.md),
[upstream adapters](https://github.com/Surdeddd/wmkit/blob/main/docs/adapters.md),
and the [historical window design](references/wmkit.md).
