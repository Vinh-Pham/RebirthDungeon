# data/

Persistence and platform integrations: the Drift database, DAOs and tables,
repositories, secure storage, and (later) remote API clients.

Rules:

- Implements repository interfaces consumed by `application`.
- Flutter plugins are allowed here; nothing in `domain` depends on this layer.
- The active dungeon run is stored as a versioned snapshot, not normalized
  tables (Phase 8).
- SharedPreferences hold UI preferences only — never currency, inventory,
  pity, or run state.
