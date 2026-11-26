# Content sources and provenance

Edit the authored art, fonts, audio, and Ink stories under [assets](../assets/).
The asset packer copies the sources, generates the Pixi atlas from
[exported frames](../assets/frames/), and records source hashes. Keep texture
IDs stable and preserve the [asset credits](../assets/CREDITS.md).

Ilex’s arrival and the settlement branches are authored in
[assets/dialogue](../assets/dialogue/). The asset packer compiles them with the
pinned InkJS compiler. Saved story continuations refer to the compiled web
stories.

The [game catalog](../src/game/content/) contains the item, enemy and skill
definitions used by the web runtime. The [reference library](references/README.md)
records upstream gameplay sources and adaptations.
