# application/

Riverpod controllers and providers that orchestrate domain engines and
repositories on behalf of the UI: combat, dungeon runs, inventory,
progression, gacha, shop, account, and settings.

Rules:

- Depends on `domain` and on repository interfaces; never on Flame widgets.
- Keeps long-lived game state; transient visual state stays inside Flame.
- One focused controller per area — no single global provider owns
  unrelated state.
