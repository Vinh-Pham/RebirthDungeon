# Implementation status

## Web implementation

The Vite application is implemented under `src/`. It includes character
creation and selection, original layered character art, arrival dialogue,
Lantern Rest, Spindle Hollow, connected Threshold rooms, keyboard and pointer
movement, ATB combat, item footprints, equipment, skills/training, quests,
services, Moon Gates and Dexie character saves. HeroUI supplies the interface,
and `@pixi/react`, tilemap and viewport supply the world canvas.

Lantern Rest and Spindle Hollow load from
[towns.ldtk](../assets/maps/towns.ldtk). The importer reads terrain and
service markers, and existing characters pick up town edits on load or
arrival. Water, Grass, Bush, and Dirt Path can be painted in either town and use
original terrain art. See [editing towns in LDtk](web-tooling.md#editing-towns-in-ldtk).

The Threshold has one continuous floor with six compact rooms linked by
straight corridors. Each corridor gate disappears automatically when you
defeat the monsters in the preceding room. Walk through the opening to
continue on the same map. The full floor fits inside the viewport, with
unseen areas hidden and explored areas dimmed by fog of war.

Clear the rooms and collect the Signal Cache in room six to reach Spindle
Hollow. From there, enter the Threshold in room six and walk the cleared
route back to Lantern Rest through the amber door in room one.

Elian at the Lantern Rest school teaches **Windmill** at **Rank F** for free.
Choose **Study Skills**, learn Windmill, and assign it from the Skills window.
At Rank F, the spinning attack hits every living enemy in the current
encounter at 170% base melee damage and costs 2 stamina total.
[Mabinogi World Wiki](https://wiki.mabinogiworld.com/view/Windmill)

The map fills the space between the HUD controls within the viewport. The
square minimap sits above character status on wide screens and beside it on
narrow screens. It tracks the player and respects dungeon fog of war.
Save & Exit is available in Settings.
The Log above the panel buttons shows recent messages. Expand opens a
scrollable window with all retained messages.
Exploration and combat share a bar with ten skill slots (1–0) and four tonic
quick slots (F1–F4). Skill slots start empty. Open Skills and drag an active
skill icon to a slot, or select the icon and then the slot. Combat Mastery
assigns Normal Attack. Move or swap slots by dragging them, and select an
occupied slot in Skills to clear it. Assignments are saved per character.
During combat, the player's ATB gauge appears beneath their sprite. Skill
tooltips show damage and stamina costs, and the bar highlights the queued
skill. Tonic quick slots use the assignments from Inventory. Visible enemies
show their name, intent, HP and ATB on the map and can be selected there.
The Loot dialog shows item stacks with their counts. All stacks start
selected, and players can take selected stacks or take everything.

The inventory shows gold in movable stacks with quantity overlays. Bag cells
are square, and the four tonic assignments share a horizontal row. The
equipment grid shows accessories, headgear, both hands, armor, and shoes.
Pick up gear in the bag to equip it and activate an occupied equipment slot
to return its item to the bag. Equipped gloves have a separate unequip action.

Dialogs use wmkit for title-bar dragging and keyboard movement. Each dialog
remembers its position until the page reloads. See [game windows](wmkit.md).

Original art, fonts and Ink stories are packed for the web build. The game
runs silently, with WAV originals kept in the source assets. ROT modules
provide procedural maps, paths, visibility, lighting,
name generation and speed/action scheduling. Miniplex, Zustand projections
and GSAP presentation are integrated.

The model journey checks automatic gate opening, retained exploration, and
reload during a run. It clears all six rooms, collects the Signal Cache,
reaches Spindle Hollow, and walks the cleared route back to Lantern Rest.
It also covers quest rewards and Moon Gate travel. A separate test wins the
first encounter with new-character stats. See [browser saves](web-saves.md).

The production browser smoke used shortcuts to open character creation and
inventory, played Ilex's arrival, registered the Moon Gate, moved a gold stack
by keyboard and drag, and verified the gate and inventory after reload. The
layout was checked at desktop width and 390 px. Separate Chromium checks
confirmed Escape cancellation and dismissal, punctuation rebinding, multi-cell
drag placement, rejection of overlaps and out-of-bounds drops, and ATB command
replacement.

A production browser check used a seeded character to verify that the
first gate blocked pointer movement and disappeared after keyboard combat.
It checked corridor traversal on the same canvas, fog and position after
reload, and viewport fit at 390 px.

The LDtk browser check created a character, refreshed a stale town save,
walked in Lantern Rest, took a registered Moon Gate to Spindle Hollow and
opened its gate dialog. It verified reload and viewport fit at 390 px.
An isolated browser run with all three new terrain types painted verified
their artwork, movement rules, and reload.
The production map comparison checked every terrain cell in both towns
against the LDtk export. Browser movement crossed an unpainted cell and
stopped at a painted wall.

See [web tooling](web-tooling.md) for the current verification commands.
