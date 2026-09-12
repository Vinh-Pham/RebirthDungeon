# Penpot title screen — 2026-09-12

Source: the connected Penpot `Title Screen` board, 1280 × 720. Exact asset IDs and
geometry are recorded in [asset provenance](../../../assets/art/title_screen/provenance.md).

Implementation: [title scene](../../../scenes/menus/title_screen.tscn),
[presentation adapter](../../../scripts/presentation/title_screen.gd), and the
existing Main / State Charts navigation. A native focused Button emits the copied
session ID and revision. Old views detach before removal. The startup title now
precedes storage inspection; Start Game reaches the existing Continue/recovery
flow for existing saves or Haven for an empty profile. It never replaces a save.
The project's existing development-build gameplay gate is retained.

macOS, Godot `4.7.2.stable.official.ed1daf0bf`, Compatibility. Beckett MCP supplied
script validation, scene launch, real keyboard/mouse input, screenshots, semantic
UI snapshots and layout/focus audits. Penpot MCP supplied the board and exports.
No gameplay rules or content versions changed.

Rendered checks:

- Enter on the initially focused Start Game button reaches Haven.
- Real mouse click reaches Haven; Menu in the in-memory playtest returns to one
  title view with focus restored. Playtests disabled persistence before activation
  to avoid modifying the user's profile.
- A 960 × 540 title Control was rendered inside the desktop viewport (not a mobile
  device or an OS window-resize acceptance test). The Start button remains 225 × 51;
  Beckett's 44-pixel touch/focus audit reports no issues. [Capture](compact.png).
- Wide desktop composition remains centered with wall coverage and no shell/debug
  chrome. [Capture](desktop.png).
- Baseline fixtures exercise actual SubViewport resizing at 1280 × 720, 960 × 540,
  and 1560 × 720. Save/restart fixtures enter through the new title before resuming.

Full verification passed: `python3 tools/verify.py --godot /Applications/Godot.app/Contents/MacOS/Godot` — exact version, import, positive fixtures, intentional-negative fixture, headless launch, and all five resource-pack exclusion checks. Logs: `build/verification/` (ignored). The negative fixture reports the expected layout failures, with no script/parse error.

Beckett also verified simulated controller A activation into Haven and return to title. Fresh runtime game logs report zero errors.
No executable export, mobile device, or screen-reader acceptance is claimed.
