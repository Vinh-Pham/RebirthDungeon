# wmkit window manager reference

Retrieved September 18, 2026 (UTC). Sources: [README](https://github.com/Surdeddd/wmkit/blob/main/README.md), [API reference](https://github.com/Surdeddd/wmkit/blob/main/docs/api.md), [adapters](https://github.com/Surdeddd/wmkit/blob/main/docs/adapters.md), and [theming](https://github.com/Surdeddd/wmkit/blob/main/docs/theming.md), cross-checked against the installed `@surdeddd/wmkit@0.11.1` type definitions.

## What this project uses

- **React adapter** (`@surdeddd/wmkit/react`): `useWindowManager`, `useDesktop`, `useWmState`, `useWmWindow`, and `useWmWindowRef`. One manager per desktop, created once and destroyed with the provider; Strict Mode double-mounting is safe because the binder re-subscribes when refs re-attach.
- **Manager options**: `keepInViewport`, `minVisible: 80`, `cascadeOffset: 32`, and `historyLimit: 0` (window-history undo/redo stays off). `wm.open` cascades when `x`/`y` are omitted and throws on duplicate ids, so `openWindow` always checks `wm.get(id)` first and focuses instead.
- **Disabled subsystems**: desktop `snap`, `grouping`, `magnetism`, and `keyboard` are off; windows open with `minimizable`/`maximizable`/`snappable` flags false. The chrome renders only a `data-wm-close` control.
- **Accessibility**: wmkit binds `aria-labelledby` on each window to its `[data-wm-title]` element and synchronizes that element's text, so a window's accessible name is its visible title. Icons must render beside — never inside — the title element.
- **Theming**: no shipped theme. The game's own CSS reacts to `data-wm-window`, `data-wm-focused`, `data-wm-dragging`, `data-wm-resizing`, and `data-wm-resize` attributes (`[data-wm-content]` scrolls and is a size container; `[hidden]` needs `display: none` restated; transitions are killed while dragging).

## Project adaptations

- One React-owned provider (`src/ui/windows/WindowProvider.tsx`) renders the transparent desktop above the canvas and the scaled HUD boundary; empty desktop space passes pointer input through and windows re-enable pointer events.
- `GameWindow` is declarative: `open` opens/focuses/closes the window, live body and footer render through portals into frame slots, and closing through wmkit notifies the owner and restores focus to the originating control, then the next window, then the canvas.
- Session geometry (positions and sizes) is recorded on close and restored on reopen for the page session only; it never enters character saves.
- wmkit's default keyboard layer is replaced: Escape closes only the active window (behind owned popups and retained confirmations), F6/Shift+F6 cycle windows plus the game, and arrows move the focused frame or titlebar (Shift resizes, Alt uses fine steps).
- Input ownership lives in `src/game/inputState.ts`: `blockingOverlay` (retained confirmations, reward collection), `uiFocus` (focus or pointer inside a window, the HUD, or an owned popup), and `gesture` (window drag/resize). Uncovered canvas stays playable while windows are open.
