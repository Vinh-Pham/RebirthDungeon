# Asefold
![](/docs/banner.png)

Aseprite Defold integration

## Export

Asefold expects your `.aseprite` source files to live in an intermediary folder (e.g. `raw_assets/`) separate from your Defold project files. When you open a sprite and launch the export dialog, it generates the `.tilesource` and `.png` files into a sibling `assets/` folder that Defold can reference directly.

![](/docs/export_no_scripts.gif)

## Different tag support

Sprites without tags are exported as a single animation. When tags are present, each tag becomes its own animation entry in the tilesource.

![](/docs/different_tag_support.gif)
