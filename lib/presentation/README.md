# presentation/

Flutter widgets and screens: home, dungeon selection, characters, inventory,
gacha, shop, settings, and the Flutter overlays around the Flame canvas.

Rules:

- Reads immutable state from `application` controllers and dispatches
  intents; contains no game rules.
- Combat dice, ability buttons, and health UI are Flutter overlays over the
  Flame view.
