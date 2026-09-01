# application/

Riverpod controllers and providers that orchestrate domain engines and
repositories on behalf of the UI.

Rules:

- Depends on `domain` and on repository interfaces; never on Flame widgets.
- Keeps long-lived game state; transient visual state stays inside Flame
  (and in local widget state).
- One focused controller per area — no single global provider owns
  unrelated state.

Contents (Phase 5):

- `providers/shared_providers.dart` — SharedPreferences (composition-time
  override) and the validated `GameContent` (loaded via the data layer's
  `ContentRepository`).
- `account/` — guest session; real auth providers arrive in Phase 12.
- `run/` — owns the active `DungeonRunState`, builds the run/combat
  engines per run (channel-seeded RNGs), dispatches run commands, and
  exposes the latest domain events for presentation.
- `combat/` — a façade + read-only projection over the run's active
  combat (combat state lives inside the run, so there is no second owner).
- `settings/` — UI preferences persisted to SharedPreferences.
- `inventory/`, `progression/`, `gacha/`, `shop/` — typed placeholders
  until their domains arrive (Phases 8–12); gacha already lists banners
  from content.
