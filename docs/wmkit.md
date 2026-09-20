# Defold panels and window behavior

**First-slice modal policy implemented; later window behavior remains planned.** This filename is retained for existing links; wmkit is historical browser research, not a project dependency. Implement panels in Defold GUI with [Druid](references/defold/druid.md), with screen/popup lifetime and focus handled by [Monarch](references/defold/monarch.md). Follow [UI](gameplay/user-interface.md) and the [game plan](game-plan.md).

## First playable loop

Provide a reusable GUI panel shell: title, body, close control, optional footer, scrolling and visible focus. Inventory, onboarding journal, services, dialogue, settings and confirmations use it. Rich Character/Skills/detail panels follow their milestones. Unavailable features show explicit states.

Open services and modal workflows stop player movement and pause the world. Clear held keys/routes, consume pointer input over all GUI bounds, and gate root-owned simulation while a proxy is paused. Return Druid's input-consumption result and coordinate its focus with Monarch. Confirmations take Escape priority, then owned choices/popups, then the active panel. Restore focus to the opener when possible.

Register sibling screens/popups under bootstrap, not children within proxy-owned world screens. Scene/character changes close transient panels after the saved transition. Opening, filtering, scrolling and selecting change only presentation; commands own purchases, claims and other durable effects. Closing a panel cannot cancel a committed action or roll back spent resources.

Fit controls at 1280×720 and 1024×768 with HUD reservation and scale changes. Use original GUI/atlas/font assets. No DOM, CSS layout, browser hotkey package or web dialog component is required.

## Later window milestone

Only after the initial loop is verified, consider independent draggable/resizable panels for Character, Skills, skill details, Quests, inventory, menu, settings, services and combat archives. Implement shared geometry/stacking in a project-owned GUI controller; Druid and Monarch do not imply a full desktop window manager.

Preserve useful behavior from the earlier design: opening an existing panel focuses it; keep one service panel and one detail per parent; close details with their parent; preserve tab/scroll and session-only geometry; clamp frames and close controls after resize; discard open-panel state when switching characters. Geometry never enters gameplay saves.

A later nonblocking policy may allow uncovered-world play, but requires explicit GUI focus, blocking-overlay and drag/resize ownership. Suppress movement while typing or manipulating a frame, prevent click-through on drag release, and provide keyboard alternatives for moving/resizing. This is not the first-slice input policy.

Verify duplicate-open behavior, stacking, focus restoration, Escape priority, geometry bounds, lifecycle cleanup and real-input interaction. Add these tests to [verification](verification.md) when the window milestone is scheduled.
