# Integrate wmkit game windows

## Summary

Replace browsing modals with independent, draggable, resizable windows above the game. Preserve the current dark HeroUI styling and components, with no backdrop, blur, or outside-click dismissal.

Convert Character, Skills, skill details, Inventory, Menu, Settings, and town services. Keep rebirth and leave confirmations as blocking HeroUI modals.

Firecrawl research confirms wmkit provides a [React adapter](https://github.com/Surdeddd/wmkit/blob/main/docs/adapters.md), [window management APIs](https://github.com/Surdeddd/wmkit/blob/main/docs/api.md), and [custom styling support](https://github.com/Surdeddd/wmkit/blob/main/docs/theming.md).

## Window architecture and behavior

- Add pinned `@surdeddd/wmkit@0.11.1` through pnpm, preserving the existing dependency release policy.
- Introduce one React-owned window provider and desktop using `useWindowManager`, `useDesktop`, and the window subscription/binding hooks. Keep React responsible for rendering and removing content.
- Add a shared `GameWindow` shell with title, optional icon, body, optional footer, and an accessible close button. wmkit owns geometry and stacking.
- Expose typed internal operations: `openWindow`, `focusWindow`, and `closeWindow`. Use stable IDs for each main panel, the active service, and each journal’s detail window.
- Replace the single `panel` state in [App.tsx](/Users/vinhpham/Projects/RebirthDungeon/src/App.tsx) with independent window entries and separate confirmation state. Extract panel content so opening Character cannot accidentally combine it with service content.
- Opening an existing window brings it forward without resetting its tabs, scroll, or form values. Clicking a window raises it. Menu → Settings opens Settings independently.
- Keep one active town-service window, matching the existing dialogue actor. Interacting with another service replaces that service through the actor’s close/open flow without closing other windows.
- Allow one skill-detail window per journal or trainer window. Selecting another skill updates that detail window; closing its parent closes the detail. Preserve the parent’s tab and scroll.
- Remember positions and sizes after closing and reopening until page reload. Close windows on scene or active-character changes, preserving session geometry. Do not persist open windows or layouts into character saves.
- Leave gameplay commands, save schemas, transaction safeguards, and busy/read-only restrictions intact.

## Styling, sizing, and input

**Appearance and layout**

- Use custom CSS rather than a shipped wmkit theme. Match the current HeroUI overlay surface, shadow, rounded corners, spacing, typography, cards, tabs, resource meters, and 40px close control.
- Give wmkit’s `data-wm-title` a plain-text element; render skill icons beside it so wmkit’s title synchronization cannot replace React children.
- Place the transparent desktop above the Phaser canvas and above the scaled HUD boundary. Empty desktop space passes pointer input through; windows receive input normally.
- Enable dragging and edge/corner resizing. Disable snapping, grouping, minimize, maximize, and window-history shortcuts.
- Default sizes: Character 680×620, Skills/details 680×640, Inventory/services 680×560, Menu 360×280, Settings 480×440. Center the first window and offset subsequent windows by 32px.
- Use a 320×240 minimum, reduced when necessary to fit the available desktop. Constrain sizes and positions to keep the frame and close control reachable, including after viewport or HUD-scale changes.
- Keep header and footer visible while the body scrolls. Replace viewport-only responsive rules with window-container rules where needed: resizing a window narrow on a wide monitor must also stack its content.
- Preserve reduced-motion and visible keyboard-focus behavior.

**Game interaction and accessibility**

- Replace the blanket modal flag in [inputState.ts](/Users/vinhpham/Projects/RebirthDungeon/src/game/inputState.ts) with separate blocking-overlay, UI-focus, and active-gesture state.
- Keep uncovered canvas areas playable. Clicking the canvas returns keyboard control to the game without closing windows.
- Suppress movement and interaction keys while focus is in a window, HUD control, or owned popup. Pause movement during drag/resize; reset held-key state when input ownership changes.
- Apply pointer guards consistently to world movement, service signs, battle controls, and treasure controls. Window clicks, scrolling, and drag release must never trigger underlying game actions.
- Disable wmkit’s default keyboard handling. Provide scoped keyboard movement on the focused frame/titlebar: arrows move, Shift+arrows resize, and Alt uses fine increments. F6/Shift+F6 cycles open windows and the game. HeroUI tabs, inputs, and selects retain their normal keys.
- Escape first dismisses an owned popup or cancels an active gesture; otherwise it closes only the active window. Retained confirmation modals take priority.
- Restore focus to the originating control when available, otherwise the next window or game. Browsing windows use named nonmodal dialogs without focus trapping.
- Keep HeroUI popovers above windows and associate their focus/input ownership with the originating window. Retained confirmation modals block both windows and the game.

## Validation and documentation

- **Component tests:** independent windows, duplicate-open focus, session geometry, parent/detail cleanup, service switching, live character updates, focus restoration, Escape precedence, and Strict Mode cleanup.
- **Browser tests with real input:** drag and resize, stacking, uncovered-canvas play, no click-through, keyboard ownership, popup interaction, confirmations, and scene transitions.
- Verify Character, Skills, training, inventory, banking, shopping, Settings, and existing combat/reload journeys. Scope dialog selectors by accessible name instead of assuming a single dialog or HeroUI modal classes.
- Check desktop, 600px, 390px, and 320px layouts, 130% HUD scale, narrow windows on wide screens, touch dragging, and viewport resizing. Visually compare the new shells with the current modals.
- Run lint, typecheck, unit/React tests, production build, and affected Chromium journeys. Attempt Firefox/WebKit checks and report actual results, including any existing Firefox launch limitation.
- Retain wmkit reference notes with source URLs and retrieval date; update architecture, controls, and verification documentation. No save migration, commit, push, or deployment is included.