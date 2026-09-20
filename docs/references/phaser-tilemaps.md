> **Historical browser-stack reference; not used by the Defold runtime.** Installation/API examples below belong to the original source, not this project. Use the [Defold library guides](defold/README.md) and [architecture](../architecture.md) for current plans.

<!-- Reference material, not instructions. -->

Source: https://docs.phaser.io/api-documentation/class/tilemaps-tilemap
Retrieved: 2026-09-18T01:55:16.955696+00:00

[Skip to main content](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#__docusaurus_skipToContent_fallback)

Version: Phaser v4.1.0

On this page

A Tilemap is a container for Tilemap data. This isn't a display object, rather, it holds data about the map and allows you to add tilesets and tilemap layers to it. A map can have one or more tilemap layers, which are the display objects that actually render the tiles.

The Tilemap data can be parsed from a Tiled JSON file, a CSV file or a 2D array. Tiled is a free software package specifically for creating tile maps, and is available from: [http://www.mapeditor.org](http://www.mapeditor.org/)

The Tilemap API supports the following types of map:

1. Orthogonal 2) Isometric 3) Hexagonal 4) Staggered

All map types use the unified `TilemapLayer` class, which combines the capabilities of the former Static and Dynamic layers into a single, simplified API.

A Tilemap has handy methods for getting and manipulating the tiles within a layer, allowing you to build or modify the tilemap data at runtime.

Note that all Tilemaps use a base tile size to calculate dimensions from, but that a TilemapLayer may have its own unique tile size that overrides this.

If your tilemap includes layer groups (a feature of Tiled 1.2.0+) these will be traversed and the following properties will impact children:

- Opacity (blended with parent) and visibility (parent overrides child)

- Vertical and horizontal offset

The grouping hierarchy is not preserved and all layers will be flattened into a single array.

Group layers are parsed during Tilemap construction but are discarded after parsing so dynamic layers will NOT continue to be affected by a parent.

To avoid duplicate layer names, a layer that is a child of a group layer will have its parent group name prepended with a '/'. For example, consider a group called 'ParentGroup' with a child called 'Layer 1'. In the Tilemap object, 'Layer 1' will have the name 'ParentGroup/Layer 1'.

The Phaser Tiled Parser does **not** support the 'Collection of Images' feature for a Tileset. You must ensure all of your tiles are contained in a single tileset image file (per layer) and have this 'embedded' in the exported Tiled JSON map data.

**Constructor**

`new Tilemap(scene, mapData)`

**Parameters**

| name    | type                                                                                       | optional | description                                 |
| ------- | ------------------------------------------------------------------------------------------ | -------- | ------------------------------------------- |
| scene   | [Phaser.Scene](https://docs.phaser.io/api-documentation/class/scene)                       | No       | The Scene to which this Tilemap belongs.    |
| mapData | [Phaser.Tilemaps.MapData](https://docs.phaser.io/api-documentation/class/tilemaps-mapdata) | No       | A MapData instance containing Tilemap data. |

---

**Scope**: static

> Source: [src/tilemaps/Tilemap.js#L47](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L47)
>
> Since: 3.0.0

## Public Members [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#public-members 'Direct link to Public Members')

### currentLayerIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#currentlayerindex 'Direct link to currentLayerIndex')

#### currentLayerIndex: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#currentlayerindex-number 'Direct link to currentLayerIndex: number')

**Description:**

The index of the currently selected LayerData object.

> Source: [src/tilemaps/Tilemap.js#L282](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L282)
>
> Since: 3.0.0

---

### format [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#format 'Direct link to format')

#### format: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#format-number 'Direct link to format: number')

**Description:**

The format of the map data.

> Source: [src/tilemaps/Tilemap.js#L179](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L179)
>
> Since: 3.0.0

---

### height [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#height 'Direct link to height')

#### height: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#height-number 'Direct link to height: number')

**Description:**

The height of the map (in tiles).

> Source: [src/tilemaps/Tilemap.js#L143](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L143)
>
> Since: 3.0.0

---

### heightInPixels [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#heightinpixels 'Direct link to heightInPixels')

#### heightInPixels: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#heightinpixels-number 'Direct link to heightInPixels: number')

**Description:**

The height of the map in pixels based on height \* tileHeight.

> Source: [src/tilemaps/Tilemap.js#L218](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L218)
>
> Since: 3.0.0

---

### hexSideLength [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#hexsidelength 'Direct link to hexSideLength')

#### hexSideLength: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#hexsidelength-number 'Direct link to hexSideLength: number')

**Description:**

The length of the horizontal sides of the hexagon. Only used for hexagonal orientation Tilemaps.

> Source: [src/tilemaps/Tilemap.js#L291](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L291)
>
> Since: 3.50.0

---

### imageCollections [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#imagecollections 'Direct link to imageCollections')

#### imageCollections: Array.< [Phaser.Tilemaps.ImageCollection](https://docs.phaser.io/api-documentation/class/tilemaps-imagecollection) > [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#imagecollections-arrayphasertilemapsimagecollection 'Direct link to imagecollections-arrayphasertilemapsimagecollection')

**Description:**

A collection of Images, as parsed from Tiled map data.

> Source: [src/tilemaps/Tilemap.js#L227](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L227)
>
> Since: 3.0.0

---

### images [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#images 'Direct link to images')

#### images: array [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#images-array 'Direct link to images: array')

**Description:**

An array of Tiled Image Layers.

> Source: [src/tilemaps/Tilemap.js#L236](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L236)
>
> Since: 3.0.0

---

### layer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#layer 'Direct link to layer')

#### layer: [Phaser.Tilemaps.LayerData](https://docs.phaser.io/api-documentation/class/tilemaps-layerdata) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#layer-phasertilemapslayerdata 'Direct link to layer-phasertilemapslayerdata')

**Description:**

The LayerData object that is currently selected in the map. You can set this property using any type supported by setLayer.

> Source: [src/tilemaps/Tilemap.js#L1607](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1607)
>
> Since: 3.0.0

---

### layers [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#layers 'Direct link to layers')

#### layers: Array.< [Phaser.Tilemaps.LayerData](https://docs.phaser.io/api-documentation/class/tilemaps-layerdata) > [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#layers-arrayphasertilemapslayerdata 'Direct link to layers-arrayphasertilemapslayerdata')

**Description:**

An array of Tilemap layer data.

> Source: [src/tilemaps/Tilemap.js#L245](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L245)
>
> Since: 3.0.0

---

### objects [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#objects 'Direct link to objects')

#### objects: Array.< [Phaser.Tilemaps.ObjectLayer](https://docs.phaser.io/api-documentation/class/tilemaps-objectlayer) > [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#objects-arrayphasertilemapsobjectlayer 'Direct link to objects-arrayphasertilemapsobjectlayer')

**Description:**

An array of ObjectLayer instances parsed from Tiled object layers.

> Source: [src/tilemaps/Tilemap.js#L273](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L273)
>
> Since: 3.0.0

---

### orientation [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#orientation 'Direct link to orientation')

#### orientation: string [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#orientation-string 'Direct link to orientation: string')

**Description:**

The orientation of the map data (as specified in Tiled), usually 'orthogonal'.

> Source: [src/tilemaps/Tilemap.js#L152](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L152)
>
> Since: 3.0.0

---

### properties [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#properties 'Direct link to properties')

#### properties: object, Array.<object> [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#properties-object-arrayobject 'Direct link to properties: object, Array.<object>')

**Description:**

Map specific properties as specified in Tiled.

Depending on the version of Tiled and the JSON export used, this will be either an object or an array of objects. For Tiled 1.2.0+ maps, it will be an array.

> Source: [src/tilemaps/Tilemap.js#L197](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L197)
>
> Since: 3.0.0

---

### renderOrder [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#renderorder 'Direct link to renderOrder')

#### renderOrder: string [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#renderorder-string 'Direct link to renderOrder: string')

**Description:**

The render (draw) order of the map data (as specified in Tiled), usually 'right-down'.

The draw orders are:

right-down left-down right-up left-up

This can be changed via the `setRenderOrder` method.

> Source: [src/tilemaps/Tilemap.js#L161](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L161)
>
> Since: 3.12.0

---

### scene [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#scene 'Direct link to scene')

#### scene: [Phaser.Scene](https://docs.phaser.io/api-documentation/class/scene) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#scene-phaserscene 'Direct link to scene-phaserscene')

> Source: [src/tilemaps/Tilemap.js#L107](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L107)
>
> Since: 3.0.0

---

### tileHeight [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tileheight 'Direct link to tileHeight')

#### tileHeight: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tileheight-number 'Direct link to tileHeight: number')

**Description:**

The base height of a tile in pixels. Note that individual layers may have a different tile height.

> Source: [src/tilemaps/Tilemap.js#L124](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L124)
>
> Since: 3.0.0

---

### tiles [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiles 'Direct link to tiles')

#### tiles: array [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiles-array 'Direct link to tiles: array')

**Description:**

Master list of tiles -> x, y, index in tileset.

> Source: [src/tilemaps/Tilemap.js#L254](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L254)
>
> Since: 3.60.0

---

### tilesets [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tilesets 'Direct link to tilesets')

#### tilesets: Array.< [Phaser.Tilemaps.Tileset](https://docs.phaser.io/api-documentation/class/tilemaps-tileset) > [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tilesets-arrayphasertilemapstileset 'Direct link to tilesets-arrayphasertilemapstileset')

**Description:**

An array of Tilesets used in the map.

> Source: [src/tilemaps/Tilemap.js#L264](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L264)
>
> Since: 3.0.0

---

### tileWidth [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tilewidth 'Direct link to tileWidth')

#### tileWidth: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tilewidth-number 'Direct link to tileWidth: number')

**Description:**

The base width of a tile in pixels. Note that individual layers may have a different tile width.

> Source: [src/tilemaps/Tilemap.js#L114](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L114)
>
> Since: 3.0.0

---

### version [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#version 'Direct link to version')

#### version: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#version-number 'Direct link to version: number')

**Description:**

The version of the map data (as specified in Tiled, usually 1).

> Source: [src/tilemaps/Tilemap.js#L188](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L188)
>
> Since: 3.0.0

---

### width [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#width 'Direct link to width')

#### width: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#width-number 'Direct link to width: number')

**Description:**

The width of the map (in tiles).

> Source: [src/tilemaps/Tilemap.js#L134](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L134)
>
> Since: 3.0.0

---

### widthInPixels [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#widthinpixels 'Direct link to widthInPixels')

#### widthInPixels: number [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#widthinpixels-number 'Direct link to widthInPixels: number')

**Description:**

The width of the map in pixels based on width \* tileWidth.

> Source: [src/tilemaps/Tilemap.js#L209](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L209)
>
> Since: 3.0.0

---

## Public Methods [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#public-methods 'Direct link to Public Methods')

### addTilesetImage [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#addtilesetimage 'Direct link to addTilesetImage')

#### <instance> addTilesetImage(tilesetName, \[key\], \[tileWidth\], \[tileHeight\], \[tileMargin\], \[tileSpacing\], \[gid\], \[tileOffset\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-addtilesetimagetilesetname-key-tilewidth-tileheight-tilemargin-tilespacing-gid-tileoffset 'Direct link to <instance> addTilesetImage(tilesetName, [key], [tileWidth], [tileHeight], [tileMargin], [tileSpacing], [gid], [tileOffset])')

**Description:**

Adds an image to the map to be used as a tileset. A single map may use multiple tilesets. Note that the tileset name can be found in the JSON file exported from Tiled, or in the Tiled editor.

**Parameters:**

| name        | type   | optional | default        | description                                                                                                                                                               |
| ----------- | ------ | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tilesetName | string | No       |                | The name of the tileset as specified in the map data.                                                                                                                     |
| key         | string | Yes      |                | The key of the Phaser.Cache image used for this tileset. If `undefined` or `null` it will look for an image with a key matching the tilesetName parameter.                |
| tileWidth   | number | Yes      |                | The width of the tile (in pixels) in the Tileset Image. If not given it will default to the map's tileWidth value, or the tileWidth specified in the Tiled JSON file.     |
| tileHeight  | number | Yes      |                | The height of the tiles (in pixels) in the Tileset Image. If not given it will default to the map's tileHeight value, or the tileHeight specified in the Tiled JSON file. |
| tileMargin  | number | Yes      |                | The margin around the tiles in the sheet (in pixels). If not specified, it will default to 0 or the value specified in the Tiled JSON file.                               |
| tileSpacing | number | Yes      |                | The spacing between each the tile in the sheet (in pixels). If not specified, it will default to 0 or the value specified in the Tiled JSON file.                         |
| gid         | number | Yes      | 0              | If adding multiple tilesets to a blank map, specify the starting GID this set will use here.                                                                              |
| tileOffset  | object | Yes      | "{x: 0, y: 0}" | Tile texture drawing offset. If not specified, it will default to {0, 0}                                                                                                  |

**Returns:** [Phaser.Tilemaps.Tileset](https://docs.phaser.io/api-documentation/class/tilemaps-tileset) \- Returns the Tileset object that was created or updated, or null if it failed.

> Source: [src/tilemaps/Tilemap.js#L369](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L369)
>
> Since: 3.0.0

---

### calculateFacesAt [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#calculatefacesat 'Direct link to calculateFacesAt')

#### <instance> calculateFacesAt(tileX, tileY, \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-calculatefacesattilex-tiley-layer 'Direct link to <instance> calculateFacesAt(tileX, tileY, [layer])')

**Description:**

Calculates interesting faces at the given tile coordinates of the specified layer. Interesting faces are used internally for optimizing collisions against tiles. This method is mostly used internally to optimize recalculating faces when only one tile has been changed.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name  | type             | optional                                                                                             | description                             |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| tileX | number           | No                                                                                                   | The x coordinate, in tiles, not pixels. |
| tileY | number           | No                                                                                                   | The y coordinate, in tiles, not pixels. |
| layer | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                     |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1753](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1753)
>
> Since: 3.0.0

---

### calculateFacesWithin [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#calculatefaceswithin 'Direct link to calculateFacesWithin')

#### <instance> calculateFacesWithin(\[tileX\], \[tileY\], \[width\], \[height\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-calculatefaceswithintilex-tiley-width-height-layer 'Direct link to <instance> calculateFacesWithin([tileX], [tileY], [width], [height], [layer])')

**Description:**

Calculates interesting faces within the rectangular area specified (in tile coordinates) of the layer. Interesting faces are used internally for optimizing collisions against tiles. This method is mostly used internally.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type             | optional                                                                                             | description                                                                      |
| ------ | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| tileX  | number           | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY  | number           | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width  | number           | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                     |
| height | number           | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                     |
| layer  | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                              |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1780](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1780)
>
> Since: 3.0.0

---

### copy [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#copy 'Direct link to copy')

#### <instance> copy(srcTileX, srcTileY, width, height, destTileX, destTileY, \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-copysrctilex-srctiley-width-height-desttilex-desttiley-recalculatefaces-layer 'Direct link to <instance> copy(srcTileX, srcTileY, width, height, destTileX, destTileY, [recalculateFaces], [layer])')

**Description:**

Copies the tiles in the source rectangular area to a new destination (all specified in tile coordinates) within the layer. This copies all tile properties & recalculates collision information in the destination region.

If no layer specified, the map's current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | default | description                                                      |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| srcTileX         | number           | No                                                                                                   |         | The x coordinate of the area to copy from, in tiles, not pixels. |
| srcTileY         | number           | No                                                                                                   |         | The y coordinate of the area to copy from, in tiles, not pixels. |
| width            | number           | No                                                                                                   |         | The width of the area to copy, in tiles, not pixels.             |
| height           | number           | No                                                                                                   |         | The height of the area to copy, in tiles, not pixels.            |
| destTileX        | number           | No                                                                                                   |         | The x coordinate of the area to copy to, in tiles, not pixels.   |
| destTileY        | number           | No                                                                                                   |         | The y coordinate of the area to copy to, in tiles, not pixels.   |
| recalculateFaces | boolean          | Yes                                                                                                  | true    | `true` if the faces data should be recalculated.                 |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes     |                                                                  |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L458](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L458)
>
> Since: 3.0.0

---

### createBlankLayer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createblanklayer 'Direct link to createBlankLayer')

#### <instance> createBlankLayer(name, tileset, \[x\], \[y\], \[width\], \[height\], \[tileWidth\], \[tileHeight\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-createblanklayername-tileset-x-y-width-height-tilewidth-tileheight 'Direct link to <instance> createBlankLayer(name, tileset, [x], [y], [width], [height], [tileWidth], [tileHeight])')

**Description:**

Creates a new and empty Tilemap Layer. The currently selected layer in the map is set to this new layer.

Prior to v3.50.0 this method was called `createBlankDynamicLayer`.

**Parameters:**

| name       | type                     | optional                                                                                   | default                                                                                              | description                                                                                                         |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| name       | string                   | No                                                                                         |                                                                                                      | The name of this layer. Must be unique within the map.                                                              |
| tileset    | string \| Array.<string> | [Phaser.Tilemaps.Tileset](https://docs.phaser.io/api-documentation/class/tilemaps-tileset) | Array.< [Phaser.Tilemaps.Tileset](https://docs.phaser.io/api-documentation/class/tilemaps-tileset) > | No                                                                                                                  |
| x          | number                   | Yes                                                                                        | 0                                                                                                    | The world x position where the top left of this layer will be placed.                                               |
| y          | number                   | Yes                                                                                        | 0                                                                                                    | The world y position where the top left of this layer will be placed.                                               |
| width      | number                   | Yes                                                                                        |                                                                                                      | The width of the layer in tiles. If not specified, it will default to the map's width.                              |
| height     | number                   | Yes                                                                                        |                                                                                                      | The height of the layer in tiles. If not specified, it will default to the map's height.                            |
| tileWidth  | number                   | Yes                                                                                        |                                                                                                      | The width of the tiles the layer uses for calculations. If not specified, it will default to the map's tileWidth.   |
| tileHeight | number                   | Yes                                                                                        |                                                                                                      | The height of the tiles the layer uses for calculations. If not specified, it will default to the map's tileHeight. |

**Returns:** [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) \- Returns the new layer that was created, or `null` if it failed.

> Source: [src/tilemaps/Tilemap.js#L500](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L500)
>
> Since: 3.0.0

---

### createFromObjects [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createfromobjects 'Direct link to createFromObjects')

#### <instance> createFromObjects(objectLayerName, config, \[useTileset\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-createfromobjectsobjectlayername-config-usetileset 'Direct link to <instance> createFromObjects(objectLayerName, config, [useTileset])')

**Description:**

This method will iterate through all of the objects defined in a Tiled Object Layer and then convert the matching results into Phaser Game Objects (by default, Sprites)

Objects are matched on one of 4 criteria: The Object ID, the Object GID, the Object Name, or the Object Type.

Within Tiled, Object IDs are unique per Object. Object GIDs, however, are shared by all objects using the same image. Finally, Object Names and Types are strings and the same name can be used on multiple Objects in Tiled, they do not have to be unique; Names are specific to Objects while Types can be inherited from Object GIDs using the same image.

You set the configuration parameter accordingly, based on which type of criteria you wish to match against. For example, to convert all items on an Object Layer with a `gid` of 26:

```javascript
createFromObjects(layerName, {
    gid: 26,
});
```

Or, to convert objects with the name 'bonus':

```javascript
createFromObjects(layerName, {
    name: 'bonus',
});
```

Or, to convert an object with a specific id:

```javascript
createFromObjects(layerName, {
    id: 9,
});
```

You should only specify either `id`, `gid`, `name`, `type`, or none of them. Do not add more than one criteria to your config. If you do not specify any criteria, then _all_ objects in the Object Layer will be converted.

By default this method will convert Objects into [Phaser.GameObjects.Sprite](https://docs.phaser.io/api-documentation/class/Phaser.GameObjects.Sprite) instances, but you can override this by providing your own class type:

```javascript
createFromObjects(layerName, {
    gid: 26,
    classType: Coin,
});
```

This will convert all Objects with a gid of 26 into your custom `Coin` class. You can pass any class type here, but it _must_ extend [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/Phaser.GameObjects.GameObject) as its base class. Your class will always be passed 1 parameter: `scene`, which is a reference to either the Scene specified in the config object or, if not given, the Scene to which this Tilemap belongs. The class must have [setPosition](https://docs.phaser.io/api-documentation/namespace/gameobjects-components-transform#setPosition) and [setTexture](https://docs.phaser.io/api-documentation/namespace/gameobjects-components-texture#setTexture) methods.

This method will set the following Tiled Object properties on the new Game Object:

- `flippedHorizontal` as `flipX`

- `flippedVertical` as `flipY`

- `height` as `displayHeight`

- `name`

- `rotation`

- `visible`

- `width` as `displayWidth`

- `x`, adjusted for origin

- `y`, adjusted for origin

Additionally, this method will set Tiled Object custom properties

- on the Game Object, if it has the same property name and a value that isn't `undefined`; or

- on the Game Object's [data](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject#data) otherwise.

For example, a Tiled Object with custom properties `{ alpha: 0.5, gold: 1 }` will be created as a Game Object with an `alpha` value of 0.5 and a `data.values.gold` value of 1.

When `useTileset` is `true` (the default), Tile Objects will inherit the texture and any tile properties from the tileset, and the local tile ID will be used as the texture frame. For the frame selection to work you need to load the tileset texture as a spritesheet so its frame names match the local tile IDs.

For instance, a tileset tile

```text
{ id: 3, type: 'treadmill', speed: 4 }
```

with gid 19 and an object

```text
{ id: 7, gid: 19, speed: 5, rotation: 90 }
```

will be interpreted as

```text
{ id: 7, gid: 19, speed: 5, rotation: 90, type: 'treadmill', texture: '[the tileset texture]', frame: 3 }
```

You can suppress this behavior by setting the boolean `ignoreTileset` for each `config` that should ignore object gid tilesets.

You can set a `container` property in the config. If given, the new Game Object will be added to the Container or Layer instance instead of the Scene.

You can set named texture-`key` and texture-`frame` properties, which will be set on the new Game Object.

Finally, you can provide an array of config objects, to convert multiple types of object in a single call:

```javascript
createFromObjects(layerName, [\
  {\
    gid: 26,\
    classType: Coin\
  },\
  {\
    id: 9,\
    classType: BossMonster\
  },\
  {\
    name: 'lava',\
    classType: LavaTile\
  },\
  {\
    type: 'endzone',\
    classType: Phaser.GameObjects.Zone\
  }\
]);
```

The signature of this method changed significantly in v3.60.0. Prior to this, it did not take config objects.

**Parameters:**

| name            | type                                                                                                                                                                                                                                                                                                           | optional | default | description                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------- |
| objectLayerName | string                                                                                                                                                                                                                                                                                                         | No       |         | The name of the Tiled object layer to create the Game Objects from.                           |
| config          | [Phaser.Types.Tilemaps.CreateFromObjectLayerConfig](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#CreateFromObjectLayerConfig) \| Array.< [Phaser.Types.Tilemaps.CreateFromObjectLayerConfig](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#CreateFromObjectLayerConfig) > | No       |         | A CreateFromObjects configuration object, or an array of them.                                |
| useTileset      | boolean                                                                                                                                                                                                                                                                                                        | Yes      | true    | True if objects that set gids should also search the underlying tile for properties and data. |

**Returns:** Array.< [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) \> \- An array containing the Game Objects that were created. Empty if invalid object layer, or no matching id/gid/name was found.

> Source: [src/tilemaps/Tilemap.js#L661](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L661)
>
> Since: 3.0.0

---

### createFromTiles [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createfromtiles 'Direct link to createFromTiles')

#### <instance> createFromTiles(indexes, replacements, \[spriteConfig\], \[scene\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-createfromtilesindexes-replacements-spriteconfig-scene-camera-layer 'Direct link to <instance> createFromTiles(indexes, replacements, [spriteConfig], [scene], [camera], [layer])')

**Description:**

Creates a Sprite for every tile matching the given tile indexes in the layer. You can optionally specify if each tile will be replaced with a new tile after the Sprite has been created. Set this value to -1 if you want to just remove the tile after conversion.

This is useful if you want to lay down special tiles in a level that are converted to Sprites, but want to replace the tile itself with a floor tile or similar once converted.

The following features were added in Phaser v3.80:

By default, Phaser Sprites have their origin set to 0.5 x 0.5. If you don't specify a new origin in the spriteConfig, then it will adjust the sprite positions by half the tile size, to position them accurately on the map.

When the Sprite is created it will copy the following properties from the tile:

'rotation', 'flipX', 'flipY', 'alpha', 'visible' and 'tint'.

The spriteConfig also has a special property called `useSpriteSheet`. If this is set to `true` and you have loaded the tileset as a sprite sheet (not an image), then it will set the Sprite key and frame to match the sprite texture and tile index.

**Parameters:**

| name         | type                                                                                                                                   | optional                                                                                             | description                                                                                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| indexes      | number \| array                                                                                                                        | No                                                                                                   | The tile index, or array of indexes, to create Sprites from.                                                                                                                                           |
| replacements | number \| array                                                                                                                        | No                                                                                                   | The tile index, or array of indexes, to change a converted tile to. Set to `null` to leave the tiles unchanged. If an array is given, it is assumed to be a one-to-one mapping with the indexes array. |
| spriteConfig | [Phaser.Types.GameObjects.Sprite.SpriteConfig](https://docs.phaser.io/api-documentation/typedef/types-gameobjects-sprite#SpriteConfig) | Yes                                                                                                  | The config object to pass into the Sprite creator (i.e. scene.make.sprite).                                                                                                                            |
| scene        | [Phaser.Scene](https://docs.phaser.io/api-documentation/class/scene)                                                                   | Yes                                                                                                  | The Scene to create the Sprites within.                                                                                                                                                                |
| camera       | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera)                                 | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values.                                                                                                                               |
| layer        | string \| number                                                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                                                                                                                    |

**Returns:** Array.< [Phaser.GameObjects.Sprite](https://docs.phaser.io/api-documentation/class/gameobjects-sprite) \> \- Returns an array of Sprites, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L950](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L950)
>
> Since: 3.0.0

---

### createLayer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createlayer 'Direct link to createLayer')

#### <instance> createLayer(layerID, tileset, \[x\], \[y\], \[gpu\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-createlayerlayerid-tileset-x-y-gpu 'Direct link to <instance> createLayer(layerID, tileset, [x], [y], [gpu])')

**Description:**

Creates a new Tilemap Layer that renders the LayerData associated with the given `layerID`. The currently selected layer in the map is set to this new layer.

The `layerID` is important. If you've created your map in Tiled then you can get this by looking in Tiled and looking at the layer name. Or you can open the JSON file it exports and look at the layers\[\].name value. Either way it must match.

Prior to v3.50.0 this method was called `createDynamicLayer`.

**Parameters:**

| name    | type                     | optional                                                                                   | default                                                                                              | description                                                                                                                                                                                   |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| layerID | number \| string         | No                                                                                         |                                                                                                      | The layer array index value, or if a string is given, the layer name from Tiled.                                                                                                              |
| tileset | string \| Array.<string> | [Phaser.Tilemaps.Tileset](https://docs.phaser.io/api-documentation/class/tilemaps-tileset) | Array.< [Phaser.Tilemaps.Tileset](https://docs.phaser.io/api-documentation/class/tilemaps-tileset) > | No                                                                                                                                                                                            |
| x       | number                   | Yes                                                                                        | 0                                                                                                    | The x position to place the layer in the world. If not specified, it will default to the layer offset from Tiled or 0.                                                                        |
| y       | number                   | Yes                                                                                        | 0                                                                                                    | The y position to place the layer in the world. If not specified, it will default to the layer offset from Tiled or 0.                                                                        |
| gpu     | boolean                  | Yes                                                                                        | false                                                                                                | Create a TilemapGPULayer instead of a TilemapLayer. This option is WebGL-only. A TilemapGPULayer is less flexible, but can be much faster. It only works properly with orthographic tilemaps. |

**Returns:** [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer), [Phaser.Tilemaps.TilemapGPULayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemapgpulayer) \- Returns the new layer that was created, or null if it failed.

> Source: [src/tilemaps/Tilemap.js#L573](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L573)
>
> Since: 3.0.0

---

### destroy [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#destroy 'Direct link to destroy')

#### <instance> destroy() [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-destroy 'Direct link to <instance> destroy()')

**Description:**

Removes all layer data from this Tilemap and nulls the scene reference. This will destroy any TilemapLayers that have been created.

> Source: [src/tilemaps/Tilemap.js#L2731](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2731)
>
> Since: 3.0.0

---

### destroyLayer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#destroylayer 'Direct link to destroyLayer')

#### <instance> destroyLayer(\[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-destroylayerlayer 'Direct link to <instance> destroyLayer([layer])')

**Description:**

Destroys the given TilemapLayer and removes it from this Tilemap.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name  | type             | optional                                                                                             | description |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| layer | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes         |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1850](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1850)
>
> Since: 3.17.0

---

### fill [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#fill 'Direct link to fill')

#### <instance> fill(index, \[tileX\], \[tileY\], \[width\], \[height\], \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-fillindex-tilex-tiley-width-height-recalculatefaces-layer 'Direct link to <instance> fill(index, [tileX], [tileY], [width], [height], [recalculateFaces], [layer])')

**Description:**

Sets the tiles in the given rectangular area (in tile coordinates) of the layer with the specified index. Tiles will be set to collide if the given index is a colliding index. Collision information in the region will be recalculated.

If no layer specified, the map's current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | default | description                                                                      |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| index            | number           | No                                                                                                   |         | The tile index to fill the area with.                                            |
| tileX            | number           | Yes                                                                                                  |         | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY            | number           | Yes                                                                                                  |         | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width            | number           | Yes                                                                                                  |         | How many tiles wide from the `tileX` index the area will be.                     |
| height           | number           | Yes                                                                                                  |         | How many tiles tall from the `tileY` index the area will be.                     |
| recalculateFaces | boolean          | Yes                                                                                                  | true    | `true` if the faces data should be recalculated.                                 |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes     |                                                                                  |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L995](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L995)
>
> Since: 3.0.0

---

### filterObjects [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#filterobjects 'Direct link to filterObjects')

#### <instance> filterObjects(objectLayer, callback, \[context\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-filterobjectsobjectlayer-callback-context 'Direct link to <instance> filterObjects(objectLayer, callback, [context])')

**Description:**

For each object in the given object layer, run the given filter callback function. Any objects that pass the filter test (i.e. where the callback returns true) will be returned in a new array. Similar to Array.prototype.Filter in vanilla JS.

**Parameters:**

| name        | type                                                                                                         | optional | description                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| objectLayer | [Phaser.Tilemaps.ObjectLayer](https://docs.phaser.io/api-documentation/class/tilemaps-objectlayer) \| string | No       | The name of an object layer (from Tiled) or an ObjectLayer instance.                                         |
| callback    | TilemapFilterCallback                                                                                        | No       | The callback. Each object in the given area will be passed to this callback as the first and only parameter. |
| context     | object                                                                                                       | Yes      | The context under which the callback should be run.                                                          |

**Returns:** Array.< [Phaser.Types.Tilemaps.TiledObject](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#TiledObject) \> \- An array of object that match the search, or null if the objectLayer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1028](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1028)
>
> Since: 3.0.0

---

### filterTiles [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#filtertiles 'Direct link to filterTiles')

#### <instance> filterTiles(callback, \[context\], \[tileX\], \[tileY\], \[width\], \[height\], \[filteringOptions\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-filtertilescallback-context-tilex-tiley-width-height-filteringoptions-layer 'Direct link to <instance> filterTiles(callback, [context], [tileX], [tileY], [width], [height], [filteringOptions], [layer])')

**Description:**

For each tile in the given rectangular area (in tile coordinates) of the layer, run the given filter callback function. Any tiles that pass the filter test (i.e. where the callback returns true) will be returned as a new array. Similar to Array.prototype.Filter in vanilla JS. If no layer specified, the map's current layer is used.

**Parameters:**

| name             | type                                                                                                                       | optional                                                                                             | description                                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| callback         | function                                                                                                                   | No                                                                                                   | The callback. Each tile in the given area will be passed to this callback as the first and only parameter. The callback should return true for tiles that pass the filter. |
| context          | object                                                                                                                     | Yes                                                                                                  | The context under which the callback should be run.                                                                                                                        |
| tileX            | number                                                                                                                     | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area to filter.                                                                                 |
| tileY            | number                                                                                                                     | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area to filter.                                                                                  |
| width            | number                                                                                                                     | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                                                                                                               |
| height           | number                                                                                                                     | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                                                                                                               |
| filteringOptions | [Phaser.Types.Tilemaps.FilteringOptions](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#FilteringOptions) | Yes                                                                                                  | Optional filters to apply when getting the tiles.                                                                                                                          |
| layer            | string \| number                                                                                                           | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                                                                                        |

**Returns:** Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \> \- Returns an array of Tiles, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1060](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1060)
>
> Since: 3.0.0

---

### findByIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#findbyindex 'Direct link to findByIndex')

#### <instance> findByIndex(index, \[skip\], \[reverse\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-findbyindexindex-skip-reverse-layer 'Direct link to <instance> findByIndex(index, [skip], [reverse], [layer])')

**Description:**

Searches the entire map layer for the first tile matching the given index, then returns that Tile object. If no match is found, it returns null. The search starts from the top-left tile and continues horizontally until it hits the end of the row, then it drops down to the next column. If the reverse boolean is true, it scans starting from the bottom-right corner traveling up to the top-left. If no layer specified, the map's current layer is used.

**Parameters:**

| name    | type             | optional                                                                                             | default | description                                                                                                    |
| ------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| index   | number           | No                                                                                                   |         | The tile index value to search for.                                                                            |
| skip    | number           | Yes                                                                                                  | 0       | The number of times to skip a matching tile before returning.                                                  |
| reverse | boolean          | Yes                                                                                                  | false   | If true it will scan the layer in reverse, starting at the bottom-right. Otherwise it scans from the top-left. |
| layer   | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes     |                                                                                                                |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns a Tile, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1091](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1091)
>
> Since: 3.0.0

---

### findObject [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#findobject 'Direct link to findObject')

#### <instance> findObject(objectLayer, callback, \[context\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-findobjectobjectlayer-callback-context 'Direct link to <instance> findObject(objectLayer, callback, [context])')

**Description:**

Find the first object in the given object layer that satisfies the provided testing function. I.e. finds the first object for which `callback` returns true. Similar to Array.prototype.find in vanilla JS.

**Parameters:**

| name        | type                                                                                                         | optional | description                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| objectLayer | [Phaser.Tilemaps.ObjectLayer](https://docs.phaser.io/api-documentation/class/tilemaps-objectlayer) \| string | No       | The name of an object layer (from Tiled) or an ObjectLayer instance.                                         |
| callback    | TilemapFindCallback                                                                                          | No       | The callback. Each object in the given area will be passed to this callback as the first and only parameter. |
| context     | object                                                                                                       | Yes      | The context under which the callback should be run.                                                          |

**Returns:** [Phaser.Types.Tilemaps.TiledObject](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#TiledObject) \- An object that matches the search, or null if no object found.

> Source: [src/tilemaps/Tilemap.js#L1118](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1118)
>
> Since: 3.0.0

---

### findTile [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#findtile 'Direct link to findTile')

#### <instance> findTile(callback, \[context\], \[tileX\], \[tileY\], \[width\], \[height\], \[filteringOptions\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-findtilecallback-context-tilex-tiley-width-height-filteringoptions-layer 'Direct link to <instance> findTile(callback, [context], [tileX], [tileY], [width], [height], [filteringOptions], [layer])')

**Description:**

Find the first tile in the given rectangular area (in tile coordinates) of the layer that satisfies the provided testing function. I.e. finds the first tile for which `callback` returns true. Similar to Array.prototype.find in vanilla JS. If no layer specified, the map's current layer is used.

**Parameters:**

| name             | type                                                                                                                       | optional                                                                                             | description                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| callback         | FindTileCallback                                                                                                           | No                                                                                                   | The callback. Each tile in the given area will be passed to this callback as the first and only parameter. |
| context          | object                                                                                                                     | Yes                                                                                                  | The context under which the callback should be run.                                                        |
| tileX            | number                                                                                                                     | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area to search.                 |
| tileY            | number                                                                                                                     | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area to search.                  |
| width            | number                                                                                                                     | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                                               |
| height           | number                                                                                                                     | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                                               |
| filteringOptions | [Phaser.Types.Tilemaps.FilteringOptions](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#FilteringOptions) | Yes                                                                                                  | Optional filters to apply when getting the tiles.                                                          |
| layer            | string \| number                                                                                                           | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                        |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns a Tile, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1150](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1150)
>
> Since: 3.0.0

---

### forEachTile [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#foreachtile 'Direct link to forEachTile')

#### <instance> forEachTile(callback, \[context\], \[tileX\], \[tileY\], \[width\], \[height\], \[filteringOptions\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-foreachtilecallback-context-tilex-tiley-width-height-filteringoptions-layer 'Direct link to <instance> forEachTile(callback, [context], [tileX], [tileY], [width], [height], [filteringOptions], [layer])')

**Description:**

For each tile in the given rectangular area (in tile coordinates) of the layer, run the given callback. Similar to Array.prototype.forEach in vanilla JS.

If no layer specified, the map's current layer is used.

**Parameters:**

| name             | type                                                                                                                       | optional                                                                                             | description                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| callback         | EachTileCallback                                                                                                           | No                                                                                                   | The callback. Each tile in the given area will be passed to this callback as the first and only parameter. |
| context          | object                                                                                                                     | Yes                                                                                                  | The context under which the callback should be run.                                                        |
| tileX            | number                                                                                                                     | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area to search.                 |
| tileY            | number                                                                                                                     | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area to search.                  |
| width            | number                                                                                                                     | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                                               |
| height           | number                                                                                                                     | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                                               |
| filteringOptions | [Phaser.Types.Tilemaps.FilteringOptions](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#FilteringOptions) | Yes                                                                                                  | Optional filters to apply when getting the tiles.                                                          |
| layer            | string \| number                                                                                                           | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                        |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1179](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1179)
>
> Since: 3.0.0

---

### getImageIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getimageindex 'Direct link to getImageIndex')

#### <instance> getImageIndex(name) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getimageindexname 'Direct link to <instance> getImageIndex(name)')

**Description:**

Gets the image layer index based on its name.

**Parameters:**

| name | type   | optional | description                   |
| ---- | ------ | -------- | ----------------------------- |
| name | string | No       | The name of the image to get. |

**Returns:** number - The index of the image in this tilemap, or null if not found.

> Source: [src/tilemaps/Tilemap.js#L1210](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1210)
>
> Since: 3.0.0

---

### getImageLayerNames [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getimagelayernames 'Direct link to getImageLayerNames')

#### <instance> getImageLayerNames() [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getimagelayernames 'Direct link to <instance> getImageLayerNames()')

**Description:**

Return a list of all valid imagelayer names loaded in this Tilemap.

**Returns:** Array.<string> - Array of valid imagelayer names / IDs loaded into this Tilemap.

> Source: [src/tilemaps/Tilemap.js#L1225](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1225)
>
> Since: 3.21.0

---

### getIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getindex 'Direct link to getIndex')

#### <instance> getIndex(location, name) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getindexlocation-name 'Direct link to <instance> getIndex(location, name)')

**Description:**

Internally used. Returns the index of the object in one of the Tilemaps arrays whose name property matches the given `name`.

**Parameters:**

| name     | type   | optional | description                           |
| -------- | ------ | -------- | ------------------------------------- |
| location | array  | No       | The Tilemap array to search.          |
| name     | string | No       | The name of the array element to get. |

**Returns:** number - The index of the element in the array, or null if not found.

> Source: [src/tilemaps/Tilemap.js#L1246](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1246)
>
> Since: 3.0.0

---

### getLayer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getlayer 'Direct link to getLayer')

#### <instance> getLayer(\[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getlayerlayer 'Direct link to <instance> getLayer([layer])')

**Description:**

Gets the LayerData from `this.layers` that is associated with the given `layer`, or null if the layer is invalid.

**Parameters:**

| name  | type             | optional                                                                                             | description |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| layer | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes         |

**Returns:** [Phaser.Tilemaps.LayerData](https://docs.phaser.io/api-documentation/class/tilemaps-layerdata) \- The corresponding `LayerData` within `this.layers`, or null.

> Source: [src/tilemaps/Tilemap.js#L1271](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1271)
>
> Since: 3.0.0

---

### getLayerIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getlayerindex 'Direct link to getLayerIndex')

#### <instance> getLayerIndex(\[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getlayerindexlayer 'Direct link to <instance> getLayerIndex([layer])')

**Description:**

Gets the LayerData index of the given `layer` within this.layers, or null if an invalid `layer` is given.

**Parameters:**

| name  | type             | optional                                                                                             | description |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| layer | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes         |

**Returns:** number - The LayerData index within this.layers.

> Source: [src/tilemaps/Tilemap.js#L1326](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1326)
>
> Since: 3.0.0

---

### getLayerIndexByName [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getlayerindexbyname 'Direct link to getLayerIndexByName')

#### <instance> getLayerIndexByName(name) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getlayerindexbynamename 'Direct link to <instance> getLayerIndexByName(name)')

**Description:**

Gets the index of the LayerData within this.layers that has the given `name`, or null if an invalid `name` is given.

**Parameters:**

| name | type   | optional | description                   |
| ---- | ------ | -------- | ----------------------------- |
| name | string | No       | The name of the layer to get. |

**Returns:** number - The LayerData index within this.layers.

> Source: [src/tilemaps/Tilemap.js#L1361](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1361)
>
> Since: 3.0.0

---

### getObjectLayer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getobjectlayer 'Direct link to getObjectLayer')

#### <instance> getObjectLayer(\[name\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getobjectlayername 'Direct link to <instance> getObjectLayer([name])')

**Description:**

Gets the ObjectLayer from `this.objects` that has the given `name`, or null if no ObjectLayer is found with that name.

**Parameters:**

| name | type   | optional | description                              |
| ---- | ------ | -------- | ---------------------------------------- |
| name | string | Yes      | The name of the object layer from Tiled. |

**Returns:** [Phaser.Tilemaps.ObjectLayer](https://docs.phaser.io/api-documentation/class/tilemaps-objectlayer) \- The corresponding `ObjectLayer` within `this.objects`, or null.

> Source: [src/tilemaps/Tilemap.js#L1288](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1288)
>
> Since: 3.0.0

---

### getObjectLayerNames [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getobjectlayernames 'Direct link to getObjectLayerNames')

#### <instance> getObjectLayerNames() [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-getobjectlayernames 'Direct link to <instance> getObjectLayerNames()')

**Description:**

Return a list of all valid objectgroup names loaded in this Tilemap.

**Returns:** Array.<string> - Array of valid objectgroup names / IDs loaded into this Tilemap.

> Source: [src/tilemaps/Tilemap.js#L1305](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1305)
>
> Since: 3.21.0

---

### getTileAt [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileat 'Direct link to getTileAt')

#### <instance> getTileAt(tileX, tileY, \[nonNull\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettileattilex-tiley-nonnull-layer 'Direct link to <instance> getTileAt(tileX, tileY, [nonNull], [layer])')

**Description:**

Gets a tile at the given tile coordinates from the given layer.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name    | type             | optional                                                                                             | default | description                                                                |
| ------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| tileX   | number           | No                                                                                                   |         | X position to get the tile from (given in tile units, not pixels).         |
| tileY   | number           | No                                                                                                   |         | Y position to get the tile from (given in tile units, not pixels).         |
| nonNull | boolean          | Yes                                                                                                  | false   | For empty tiles, return a Tile object with an index of -1 instead of null. |
| layer   | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes     |                                                                            |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns a Tile, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1377](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1377)
>
> Since: 3.0.0

---

### getTileAtWorldXY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileatworldxy 'Direct link to getTileAtWorldXY')

#### <instance> getTileAtWorldXY(worldX, worldY, \[nonNull\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettileatworldxyworldx-worldy-nonnull-camera-layer 'Direct link to <instance> getTileAtWorldXY(worldX, worldY, [nonNull], [camera], [layer])')

**Description:**

Gets a tile at the given world coordinates from the given layer.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name    | type                                                                                                   | optional                                                                                             | default | description                                                                |
| ------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| worldX  | number                                                                                                 | No                                                                                                   |         | X position to get the tile from (given in pixels)                          |
| worldY  | number                                                                                                 | No                                                                                                   |         | Y position to get the tile from (given in pixels)                          |
| nonNull | boolean                                                                                                | Yes                                                                                                  | false   | For empty tiles, return a Tile object with an index of -1 instead of null. |
| camera  | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  |         | The Camera to use when calculating the tile index from the world values.   |
| layer   | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes     |                                                                            |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns a Tile, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1401](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1401)
>
> Since: 3.0.0

---

### getTileCorners [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettilecorners 'Direct link to getTileCorners')

#### <instance> getTileCorners(tileX, tileY, \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettilecornerstilex-tiley-camera-layer 'Direct link to <instance> getTileCorners(tileX, tileY, [camera], [layer])')

**Description:**

Returns an array of Vector2s where each entry corresponds to the corner of the requested tile.

The `tileX` and `tileY` parameters are in tile coordinates, not world coordinates.

The corner coordinates are in world space, having factored in TilemapLayer scale, position and the camera, if given.

The size of the array will vary based on the orientation of the map. For example an orthographic map will return an array of 4 vectors, where-as a hexagonal map will, of course, return an array of 6 corner vectors.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type                                                                                                   | optional                                                                                             | description                                                              |
| ------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| tileX  | number                                                                                                 | No                                                                                                   | The x coordinate, in tiles, not pixels.                                  |
| tileY  | number                                                                                                 | No                                                                                                   | The y coordinate, in tiles, not pixels.                                  |
| camera | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values. |
| layer  | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                      |

**Returns:** Array.< [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) \> \- Returns an array of Vector2s, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2572](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2572)
>
> Since: 3.60.0

---

### getTileLayerNames [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettilelayernames 'Direct link to getTileLayerNames')

#### <instance> getTileLayerNames() [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettilelayernames 'Direct link to <instance> getTileLayerNames()')

**Description:**

Return a list of all valid tilelayer names loaded in this Tilemap.

**Returns:** Array.<string> - Array of valid tilelayer names / IDs loaded into this Tilemap.

> Source: [src/tilemaps/Tilemap.js#L1426](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1426)
>
> Since: 3.21.0

---

### getTileset [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileset 'Direct link to getTileset')

#### <instance> getTileset(name) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettilesetname 'Direct link to <instance> getTileset(name)')

**Description:**

Gets the Tileset that has the given `name`, or null if an invalid `name` is given.

**Parameters:**

| name | type   | optional | description                     |
| ---- | ------ | -------- | ------------------------------- |
| name | string | No       | The name of the Tileset to get. |

**Returns:** [Phaser.Tilemaps.Tileset](https://docs.phaser.io/api-documentation/class/tilemaps-tileset) \- The Tileset, or `null` if no matching named tileset was found.

> Source: [src/tilemaps/Tilemap.js#L1525](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1525)
>
> Since: 3.14.0

---

### getTilesetIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettilesetindex 'Direct link to getTilesetIndex')

#### <instance> getTilesetIndex(name) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettilesetindexname 'Direct link to <instance> getTilesetIndex(name)')

**Description:**

Gets the index of the Tileset within this.tilesets that has the given `name`, or null if an invalid `name` is given.

**Parameters:**

| name | type   | optional | description                     |
| ---- | ------ | -------- | ------------------------------- |
| name | string | No       | The name of the Tileset to get. |

**Returns:** number - The Tileset index within this.tilesets.

> Source: [src/tilemaps/Tilemap.js#L1542](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1542)
>
> Since: 3.0.0

---

### getTilesWithin [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileswithin 'Direct link to getTilesWithin')

#### <instance> getTilesWithin(\[tileX\], \[tileY\], \[width\], \[height\], \[filteringOptions\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettileswithintilex-tiley-width-height-filteringoptions-layer 'Direct link to <instance> getTilesWithin([tileX], [tileY], [width], [height], [filteringOptions], [layer])')

**Description:**

Gets the tiles in the given rectangular area (in tile coordinates) of the layer.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type                                                                                                                       | optional                                                                                             | description                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| tileX            | number                                                                                                                     | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY            | number                                                                                                                     | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width            | number                                                                                                                     | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                     |
| height           | number                                                                                                                     | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                     |
| filteringOptions | [Phaser.Types.Tilemaps.FilteringOptions](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#FilteringOptions) | Yes                                                                                                  | Optional filters to apply when getting the tiles.                                |
| layer            | string \| number                                                                                                           | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                              |

**Returns:** Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \> \- Returns an array of Tiles, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1447](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1447)
>
> Since: 3.0.0

---

### getTilesWithinShape [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileswithinshape 'Direct link to getTilesWithinShape')

#### <instance> getTilesWithinShape(shape, \[filteringOptions\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettileswithinshapeshape-filteringoptions-camera-layer 'Direct link to <instance> getTilesWithinShape(shape, [filteringOptions], [camera], [layer])')

**Description:**

Gets the tiles that overlap with the given shape in the given layer. The shape must be a Circle, Line, Rectangle or Triangle. The shape should be in world coordinates.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type                                                                                                                                                             | optional                                                                                             | description                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| shape            | [Phaser.Geom.Circle](https://docs.phaser.io/api-documentation/class/geom-circle) \| [Phaser.Geom.Line](https://docs.phaser.io/api-documentation/class/geom-line) | [Phaser.Geom.Rectangle](https://docs.phaser.io/api-documentation/class/geom-rectangle)               | [Phaser.Geom.Triangle](https://docs.phaser.io/api-documentation/class/geom-triangle) |
| filteringOptions | [Phaser.Types.Tilemaps.FilteringOptions](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#FilteringOptions)                                       | Yes                                                                                                  | Optional filters to apply when getting the tiles.                                    |
| camera           | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera)                                                           | Yes                                                                                                  | The Camera to use when factoring in which tiles to return.                           |
| layer            | string \| number                                                                                                                                                 | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                  |

**Returns:** Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \> \- Returns an array of Tiles, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1473](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1473)
>
> Since: 3.0.0

---

### getTilesWithinWorldXY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileswithinworldxy 'Direct link to getTilesWithinWorldXY')

#### <instance> getTilesWithinWorldXY(worldX, worldY, width, height, \[filteringOptions\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-gettileswithinworldxyworldx-worldy-width-height-filteringoptions-camera-layer 'Direct link to <instance> getTilesWithinWorldXY(worldX, worldY, width, height, [filteringOptions], [camera], [layer])')

**Description:**

Gets the tiles in the given rectangular area (in world coordinates) of the layer.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type                                                                                                                       | optional                                                                                             | description                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| worldX           | number                                                                                                                     | No                                                                                                   | The world x coordinate for the top-left of the area.       |
| worldY           | number                                                                                                                     | No                                                                                                   | The world y coordinate for the top-left of the area.       |
| width            | number                                                                                                                     | No                                                                                                   | The width of the area.                                     |
| height           | number                                                                                                                     | No                                                                                                   | The height of the area.                                    |
| filteringOptions | [Phaser.Types.Tilemaps.FilteringOptions](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#FilteringOptions) | Yes                                                                                                  | Optional filters to apply when getting the tiles.          |
| camera           | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera)                     | Yes                                                                                                  | The Camera to use when factoring in which tiles to return. |
| layer            | string \| number                                                                                                           | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                        |

**Returns:** Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \> \- Returns an array of Tiles, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1498](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1498)
>
> Since: 3.0.0

---

### hasTileAt [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#hastileat 'Direct link to hasTileAt')

#### <instance> hasTileAt(tileX, tileY, \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-hastileattilex-tiley-layer 'Direct link to <instance> hasTileAt(tileX, tileY, [layer])')

**Description:**

Checks if there is a tile at the given location (in tile coordinates) in the given layer. Returns false if there is no tile or if the tile at that location has an index of -1.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name  | type             | optional                                                                                             | description                             |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| tileX | number           | No                                                                                                   | The x coordinate, in tiles, not pixels. |
| tileY | number           | No                                                                                                   | The y coordinate, in tiles, not pixels. |
| layer | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                     |

**Returns:** boolean - Returns a boolean, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1558](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1558)
>
> Since: 3.0.0

---

### hasTileAtWorldXY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#hastileatworldxy 'Direct link to hasTileAtWorldXY')

#### <instance> hasTileAtWorldXY(worldX, worldY, \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-hastileatworldxyworldx-worldy-camera-layer 'Direct link to <instance> hasTileAtWorldXY(worldX, worldY, [camera], [layer])')

**Description:**

Checks if there is a tile at the given location (in world coordinates) in the given layer. Returns false if there is no tile or if the tile at that location has an index of -1.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type                                                                                                   | optional                                                                                             | description                                                |
| ------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| worldX | number                                                                                                 | No                                                                                                   | The x coordinate, in pixels.                               |
| worldY | number                                                                                                 | No                                                                                                   | The y coordinate, in pixels.                               |
| camera | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when factoring in which tiles to return. |
| layer  | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                        |

**Returns:** boolean - Returns a boolean, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1582](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1582)
>
> Since: 3.0.0

---

### putTileAt [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#puttileat 'Direct link to putTileAt')

#### <instance> putTileAt(tile, tileX, tileY, \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-puttileattile-tilex-tiley-recalculatefaces-layer 'Direct link to <instance> putTileAt(tile, tileX, tileY, [recalculateFaces], [layer])')

**Description:**

Puts a tile at the given tile coordinates in the specified layer. You can pass in either an index or a Tile object. If you pass in a Tile, all attributes will be copied over to the specified location. If you pass in an index, only the index at the specified location will be changed. Collision information will be recalculated at the specified location.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type                                                                                           | optional                                                                                             | description                                      |
| ---------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| tile             | number \| [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) | No                                                                                                   | The index of this tile to set or a Tile object.  |
| tileX            | number                                                                                         | No                                                                                                   | The x coordinate, in tiles, not pixels.          |
| tileY            | number                                                                                         | No                                                                                                   | The y coordinate, in tiles, not pixels.          |
| recalculateFaces | boolean                                                                                        | Yes                                                                                                  | `true` if the faces data should be recalculated. |
| layer            | string \| number                                                                               | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                              |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns a Tile, or null if the layer given was invalid or the coordinates were out of bounds.

> Source: [src/tilemaps/Tilemap.js#L1627](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1627)
>
> Since: 3.0.0

---

### putTileAtWorldXY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#puttileatworldxy 'Direct link to putTileAtWorldXY')

#### <instance> putTileAtWorldXY(tile, worldX, worldY, \[recalculateFaces\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-puttileatworldxytile-worldx-worldy-recalculatefaces-camera-layer 'Direct link to <instance> putTileAtWorldXY(tile, worldX, worldY, [recalculateFaces], [camera], [layer])')

**Description:**

Puts a tile at the given world coordinates (pixels) in the specified layer. You can pass in either an index or a Tile object. If you pass in a Tile, all attributes will be copied over to the specified location. If you pass in an index, only the index at the specified location will be changed. Collision information will be recalculated at the specified location.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type                                                                                                   | optional                                                                                             | description                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| tile             | number \| [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile)         | No                                                                                                   | The index of this tile to set or a Tile object.                          |
| worldX           | number                                                                                                 | No                                                                                                   | The x coordinate, in pixels.                                             |
| worldY           | number                                                                                                 | No                                                                                                   | The y coordinate, in pixels.                                             |
| recalculateFaces | boolean                                                                                                | Yes                                                                                                  | `true` if the faces data should be recalculated.                         |
| camera           | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values. |
| layer            | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                      |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns a Tile, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1657](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1657)
>
> Since: 3.0.0

---

### putTilesAt [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#puttilesat 'Direct link to putTilesAt')

#### <instance> putTilesAt(tile, tileX, tileY, \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-puttilesattile-tilex-tiley-recalculatefaces-layer 'Direct link to <instance> putTilesAt(tile, tileX, tileY, [recalculateFaces], [layer])')

**Description:**

Puts an array of tiles or a 2D array of tiles at the given tile coordinates in the specified layer. The array can be composed of either tile indexes or Tile objects. If you pass in a Tile, all attributes will be copied over to the specified location. If you pass in an index, only the index at the specified location will be changed. Collision information will be recalculated within the region tiles were changed.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type                                     | optional                                                                                             | description                                                                                            |
| ---------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| tile             | Array.<number> \| Array.<Array.<number>> | Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) >       | Array.<Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) >> |
| tileX            | number                                   | No                                                                                                   | The x coordinate, in tiles, not pixels.                                                                |
| tileY            | number                                   | No                                                                                                   | The y coordinate, in tiles, not pixels.                                                                |
| recalculateFaces | boolean                                  | Yes                                                                                                  | `true` if the faces data should be recalculated.                                                       |
| layer            | string \| number                         | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                    |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1688](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1688)
>
> Since: 3.0.0

---

### randomize [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#randomize 'Direct link to randomize')

#### <instance> randomize(\[tileX\], \[tileY\], \[width\], \[height\], \[indexes\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-randomizetilex-tiley-width-height-indexes-layer 'Direct link to <instance> randomize([tileX], [tileY], [width], [height], [indexes], [layer])')

**Description:**

Randomizes the indexes of a rectangular region of tiles (in tile coordinates) within the specified layer. Each tile will receive a new index. If an array of indexes is passed in, then those will be used for randomly assigning new tile indexes. If an array is not provided, the indexes found within the region (excluding -1) will be used for randomly assigning new tile indexes. This method only modifies tile indexes and does not change collision information.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name    | type             | optional                                                                                             | description                                                                      |
| ------- | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| tileX   | number           | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY   | number           | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width   | number           | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                     |
| height  | number           | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                     |
| indexes | Array.<number>   | Yes                                                                                                  | An array of indexes to randomly draw from during randomization.                  |
| layer   | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                              |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1721](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1721)
>
> Since: 3.0.0

---

### removeAllLayers [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removealllayers 'Direct link to removeAllLayers')

#### <instance> removeAllLayers() [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-removealllayers 'Direct link to <instance> removeAllLayers()')

**Description:**

Removes all Tilemap Layers from this Tilemap and calls `destroy` on each of them.

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- This Tilemap object.

> Source: [src/tilemaps/Tilemap.js#L1887](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1887)
>
> Since: 3.0.0

---

### removeLayer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removelayer 'Direct link to removeLayer')

#### <instance> removeLayer(\[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-removelayerlayer 'Direct link to <instance> removeLayer([layer])')

**Description:**

Removes the given TilemapLayer from this Tilemap without destroying it.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name  | type             | optional                                                                                             | description |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| layer | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes         |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Returns this, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1809](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1809)
>
> Since: 3.17.0

---

### removeTile [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removetile 'Direct link to removeTile')

#### <instance> removeTile(tiles, \[replaceIndex\], \[recalculateFaces\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-removetiletiles-replaceindex-recalculatefaces 'Direct link to <instance> removeTile(tiles, [replaceIndex], [recalculateFaces])')

**Description:**

Removes the given Tile, or an array of Tiles, from the layer to which they belong, and optionally recalculates the collision information.

**Parameters:**

| name             | type                                                                                                                                                                                   | optional | default | description                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| tiles            | [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \| Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) > | No       |         | The Tile to remove, or an array of Tiles.                                                                                     |
| replaceIndex     | number                                                                                                                                                                                 | Yes      | -1      | After removing the Tile, insert a brand new Tile into its location with the given index. Leave as -1 to just remove the tile. |
| recalculateFaces | boolean                                                                                                                                                                                | Yes      | true    | `true` if the faces data should be recalculated.                                                                              |

**Returns:** Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \> \- Returns an array of Tiles that were removed.

> Source: [src/tilemaps/Tilemap.js#L1914](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1914)
>
> Since: 3.17.0

---

### removeTileAt [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removetileat 'Direct link to removeTileAt')

#### <instance> removeTileAt(tileX, tileY, \[replaceWithNull\], \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-removetileattilex-tiley-replacewithnull-recalculatefaces-layer 'Direct link to <instance> removeTileAt(tileX, tileY, [replaceWithNull], [recalculateFaces], [layer])')

**Description:**

Removes the tile at the given tile coordinates in the specified layer and updates the layers collision information.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | description                                                                                                                    |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| tileX            | number           | No                                                                                                   | The x coordinate, in tiles, not pixels.                                                                                        |
| tileY            | number           | No                                                                                                   | The y coordinate, in tiles, not pixels.                                                                                        |
| replaceWithNull  | boolean          | Yes                                                                                                  | If `true` (the default), this will replace the tile at the specified location with null instead of a Tile with an index of -1. |
| recalculateFaces | boolean          | Yes                                                                                                  | If `true` (the default), the faces data will be recalculated.                                                                  |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                                            |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns the Tile that was removed, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1954](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1954)
>
> Since: 3.0.0

---

### removeTileAtWorldXY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removetileatworldxy 'Direct link to removeTileAtWorldXY')

#### <instance> removeTileAtWorldXY(worldX, worldY, \[replaceWithNull\], \[recalculateFaces\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-removetileatworldxyworldx-worldy-replacewithnull-recalculatefaces-camera-layer 'Direct link to <instance> removeTileAtWorldXY(worldX, worldY, [replaceWithNull], [recalculateFaces], [camera], [layer])')

**Description:**

Removes the tile at the given world coordinates in the specified layer and updates the layers collision information.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type                                                                                                   | optional                                                                                             | description                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| worldX           | number                                                                                                 | No                                                                                                   | The x coordinate, in pixels.                                                                                                   |
| worldY           | number                                                                                                 | No                                                                                                   | The y coordinate, in pixels.                                                                                                   |
| replaceWithNull  | boolean                                                                                                | Yes                                                                                                  | If `true` (the default), this will replace the tile at the specified location with null instead of a Tile with an index of -1. |
| recalculateFaces | boolean                                                                                                | Yes                                                                                                  | If `true` (the default), the faces data will be recalculated.                                                                  |
| camera           | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values.                                                       |
| layer            | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                                            |

**Returns:** [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) \- Returns a Tile, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L1982](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L1982)
>
> Since: 3.0.0

---

### renderDebug [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#renderdebug 'Direct link to renderDebug')

#### <instance> renderDebug(graphics, \[styleConfig\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-renderdebuggraphics-styleconfig-layer 'Direct link to <instance> renderDebug(graphics, [styleConfig], [layer])')

**Description:**

Draws a debug representation of the layer to the given Graphics object. This is helpful when you want to get a quick idea of which of your tiles are colliding and which have interesting faces. The tiles are drawn starting at (0, 0) in the Graphics, allowing you to place the debug representation wherever you want on the screen.

If no layer is specified, the maps current layer is used.

**Note:** This method currently only works with orthogonal tilemap layers.

**Parameters:**

| name        | type                                                                                                             | optional                                                                                             | description                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| graphics    | [Phaser.GameObjects.Graphics](https://docs.phaser.io/api-documentation/class/gameobjects-graphics)               | No                                                                                                   | The target Graphics object to draw upon.                      |
| styleConfig | [Phaser.Types.Tilemaps.StyleConfig](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#StyleConfig) | Yes                                                                                                  | An object specifying the colors to use for the debug drawing. |
| layer       | string \| number                                                                                                 | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                           |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2011](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2011)
>
> Since: 3.0.0

---

### renderDebugFull [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#renderdebugfull 'Direct link to renderDebugFull')

#### <instance> renderDebugFull(graphics, \[styleConfig\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-renderdebugfullgraphics-styleconfig 'Direct link to <instance> renderDebugFull(graphics, [styleConfig])')

**Description:**

Draws a debug representation of all layers within this Tilemap to the given Graphics object.

This is helpful when you want to get a quick idea of which of your tiles are colliding and which have interesting faces. The tiles are drawn starting at (0, 0) in the Graphics, allowing you to place the debug representation wherever you want on the screen.

**Parameters:**

| name        | type                                                                                                             | optional | description                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| graphics    | [Phaser.GameObjects.Graphics](https://docs.phaser.io/api-documentation/class/gameobjects-graphics)               | No       | The target Graphics object to draw upon.                      |
| styleConfig | [Phaser.Types.Tilemaps.StyleConfig](https://docs.phaser.io/api-documentation/typedef/types-tilemaps#StyleConfig) | Yes      | An object specifying the colors to use for the debug drawing. |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- This Tilemap instance.

> Source: [src/tilemaps/Tilemap.js#L2044](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2044)
>
> Since: 3.17.0

---

### replaceByIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#replacebyindex 'Direct link to replaceByIndex')

#### <instance> replaceByIndex(findIndex, newIndex, \[tileX\], \[tileY\], \[width\], \[height\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-replacebyindexfindindex-newindex-tilex-tiley-width-height-layer 'Direct link to <instance> replaceByIndex(findIndex, newIndex, [tileX], [tileY], [width], [height], [layer])')

**Description:**

Scans the given rectangular area (given in tile coordinates) for tiles with an index matching `findIndex` and updates their index to match `newIndex`. This only modifies the index and does not change collision information.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name      | type             | optional                                                                                             | description                                                                      |
| --------- | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| findIndex | number           | No                                                                                                   | The index of the tile to search for.                                             |
| newIndex  | number           | No                                                                                                   | The index of the tile to replace it with.                                        |
| tileX     | number           | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY     | number           | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width     | number           | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                     |
| height    | number           | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                     |
| layer     | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                              |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2071](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2071)
>
> Since: 3.0.0

---

### setBaseTileSize [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setbasetilesize 'Direct link to setBaseTileSize')

#### <instance> setBaseTileSize(tileWidth, tileHeight) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setbasetilesizetilewidth-tileheight 'Direct link to <instance> setBaseTileSize(tileWidth, tileHeight)')

**Description:**

Sets the base tile size for the map. Note: this does not necessarily match the tileWidth and tileHeight for all layers. This also updates the base size on all tiles across all layers.

**Parameters:**

| name       | type   | optional | description                                            |
| ---------- | ------ | -------- | ------------------------------------------------------ |
| tileWidth  | number | No       | The width of the tiles the map uses for calculations.  |
| tileHeight | number | No       | The height of the tiles the map uses for calculations. |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- This Tilemap object.

> Source: [src/tilemaps/Tilemap.js#L2347](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2347)
>
> Since: 3.0.0

---

### setCollision [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollision 'Direct link to setCollision')

#### <instance> setCollision(indexes, \[collides\], \[recalculateFaces\], \[layer\], \[updateLayer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setcollisionindexes-collides-recalculatefaces-layer-updatelayer 'Direct link to <instance> setCollision(indexes, [collides], [recalculateFaces], [layer], [updateLayer])')

**Description:**

Sets collision on the given tile or tiles within a layer by index. You can pass in either a single numeric index or an array of indexes: \[2, 3, 15, 20\]. The `collides` parameter controls if collision will be enabled (true) or disabled (false).

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | default | description                                                                                                                   |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| indexes          | number \| array  | No                                                                                                   |         | Either a single tile index, or an array of tile indexes.                                                                      |
| collides         | boolean          | Yes                                                                                                  |         | If true it will enable collision. If false it will clear collision.                                                           |
| recalculateFaces | boolean          | Yes                                                                                                  |         | Whether or not to recalculate the tile faces after the update.                                                                |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes     |                                                                                                                               |
| updateLayer      | boolean          | Yes                                                                                                  | true    | If true, updates the current tiles on the layer. Set to false if no tiles have been placed for significant performance boost. |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2102](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2102)
>
> Since: 3.0.0

---

### setCollisionBetween [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionbetween 'Direct link to setCollisionBetween')

#### <instance> setCollisionBetween(start, stop, \[collides\], \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setcollisionbetweenstart-stop-collides-recalculatefaces-layer 'Direct link to <instance> setCollisionBetween(start, stop, [collides], [recalculateFaces], [layer])')

**Description:**

Sets collision on a range of tiles in a layer whose index is between the specified `start` and `stop` (inclusive). Calling this with a start value of 10 and a stop value of 14 would set collision for tiles 10, 11, 12, 13 and 14. The `collides` parameter controls if collision will be enabled (true) or disabled (false).

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | description                                                         |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| start            | number           | No                                                                                                   | The first index of the tile to be set for collision.                |
| stop             | number           | No                                                                                                   | The last index of the tile to be set for collision.                 |
| collides         | boolean          | Yes                                                                                                  | If true it will enable collision. If false it will clear collision. |
| recalculateFaces | boolean          | Yes                                                                                                  | Whether or not to recalculate the tile faces after the update.      |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                 |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2135](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2135)
>
> Since: 3.0.0

---

### setCollisionByExclusion [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionbyexclusion 'Direct link to setCollisionByExclusion')

#### <instance> setCollisionByExclusion(indexes, \[collides\], \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setcollisionbyexclusionindexes-collides-recalculatefaces-layer 'Direct link to <instance> setCollisionByExclusion(indexes, [collides], [recalculateFaces], [layer])')

**Description:**

Sets collision on all tiles in the given layer, except for tiles that have an index specified in the given array. The `collides` parameter controls if collision will be enabled (true) or disabled (false). Tile indexes not currently in the layer are not affected.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | description                                                         |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| indexes          | Array.<number>   | No                                                                                                   | An array of the tile indexes to not be counted for collision.       |
| collides         | boolean          | Yes                                                                                                  | If true it will enable collision. If false it will clear collision. |
| recalculateFaces | boolean          | Yes                                                                                                  | Whether or not to recalculate the tile faces after the update.      |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                 |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2203](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2203)
>
> Since: 3.0.0

---

### setCollisionByProperty [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionbyproperty 'Direct link to setCollisionByProperty')

#### <instance> setCollisionByProperty(properties, \[collides\], \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setcollisionbypropertyproperties-collides-recalculatefaces-layer 'Direct link to <instance> setCollisionByProperty(properties, [collides], [recalculateFaces], [layer])')

**Description:**

Sets collision on the tiles within a layer by checking tile properties. If a tile has a property that matches the given properties object, its collision flag will be set. The `collides` parameter controls if collision will be enabled (true) or disabled (false). Passing in `{ collides: true }` would update the collision flag on any tiles with a "collides" property that has a value of true. Any tile that doesn't have "collides" set to true will be ignored. You can also use an array of values, e.g. `{ types: ["stone", "lava", "sand" ] }`. If a tile has a "types" property that matches any of those values, its collision flag will be updated.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | description                                                                     |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| properties       | object           | No                                                                                                   | An object with tile properties and corresponding values that should be checked. |
| collides         | boolean          | Yes                                                                                                  | If true it will enable collision. If false it will clear collision.             |
| recalculateFaces | boolean          | Yes                                                                                                  | Whether or not to recalculate the tile faces after the update.                  |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                             |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2168](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2168)
>
> Since: 3.0.0

---

### setCollisionFromCollisionGroup [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionfromcollisiongroup 'Direct link to setCollisionFromCollisionGroup')

#### <instance> setCollisionFromCollisionGroup(\[collides\], \[recalculateFaces\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setcollisionfromcollisiongroupcollides-recalculatefaces-layer 'Direct link to <instance> setCollisionFromCollisionGroup([collides], [recalculateFaces], [layer])')

**Description:**

Sets collision on the tiles within a layer by checking each tiles collision group data (typically defined in Tiled within the tileset collision editor). If any objects are found within a tiles collision group, the tiles colliding information will be set. The `collides` parameter controls if collision will be enabled (true) or disabled (false).

If no layer is specified, the maps current layer is used.

**Parameters:**

| name             | type             | optional                                                                                             | description                                                         |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| collides         | boolean          | Yes                                                                                                  | If true it will enable collision. If false it will clear collision. |
| recalculateFaces | boolean          | Yes                                                                                                  | Whether or not to recalculate the tile faces after the update.      |
| layer            | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                 |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2234](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2234)
>
> Since: 3.0.0

---

### setLayer [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setlayer 'Direct link to setLayer')

#### <instance> setLayer(\[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setlayerlayer 'Direct link to <instance> setLayer([layer])')

**Description:**

Sets the current layer to the LayerData associated with `layer`.

**Parameters:**

| name  | type             | optional                                                                                             | description |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| layer | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes         |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- This Tilemap object.

> Source: [src/tilemaps/Tilemap.js#L2325](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2325)
>
> Since: 3.0.0

---

### setLayerTileSize [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setlayertilesize 'Direct link to setLayerTileSize')

#### <instance> setLayerTileSize(tileWidth, tileHeight, \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setlayertilesizetilewidth-tileheight-layer 'Direct link to <instance> setLayerTileSize(tileWidth, tileHeight, [layer])')

**Description:**

Sets the tile size for a specific `layer`. Note: this does not necessarily match the maps tileWidth and tileHeight for all layers. This will set the tile size for the layer and any tiles the layer has.

**Parameters:**

| name       | type             | optional                                                                                             | description                                       |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| tileWidth  | number           | No                                                                                                   | The width of the tiles (in pixels) in the layer.  |
| tileHeight | number           | No                                                                                                   | The height of the tiles (in pixels) in the layer. |
| layer      | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                               |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- This Tilemap object.

> Source: [src/tilemaps/Tilemap.js#L2393](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2393)
>
> Since: 3.0.0

---

### setRenderOrder [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setrenderorder 'Direct link to setRenderOrder')

#### <instance> setRenderOrder(renderOrder) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-setrenderorderrenderorder 'Direct link to <instance> setRenderOrder(renderOrder)')

**Description:**

Sets the rendering (draw) order of the tiles in this map.

The default is 'right-down', meaning it will order the tiles starting from the top-left, drawing to the right and then moving down to the next row.

The draw orders are:

0 = right-down 1 = left-down 2 = right-up 3 = left-up

Setting the render order does not change the tiles or how they are stored in the layer, it purely impacts the order in which they are rendered.

You can provide either an integer (0 to 3), or the string version of the order.

Calling this method _after_ creating Tilemap Layers will **not** automatically update them to use the new render order. If you call this method after creating layers, use their own `setRenderOrder` methods to change them as needed.

**Parameters:**

| name        | type             | optional | description                                                                                                                        |
| ----------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| renderOrder | number \| string | No       | The render (draw) order value. Either an integer between 0 and 3, or a string: 'right-down', 'left-down', 'right-up' or 'left-up'. |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- This Tilemap object.

> Source: [src/tilemaps/Tilemap.js#L323](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L323)
>
> Since: 3.12.0

---

### setTileIndexCallback [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#settileindexcallback 'Direct link to setTileIndexCallback')

#### <instance> setTileIndexCallback(indexes, callback, callbackContext, \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-settileindexcallbackindexes-callback-callbackcontext-layer 'Direct link to <instance> setTileIndexCallback(indexes, callback, callbackContext, [layer])')

**Description:**

Sets a global collision callback for the given tile index within the layer. This will affect all tiles on this layer that have the same index. If a callback is already set for the tile index it will be replaced. Set the callback to null to remove it. If you want to set a callback for a tile at a specific location on the map then see `setTileLocationCallback`.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name            | type                     | optional                                                                                             | description                                                                                                                  |
| --------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| indexes         | number \| Array.<number> | No                                                                                                   | Either a single tile index, or an array of tile indexes to have a collision callback set for. All values should be integers. |
| callback        | function                 | No                                                                                                   | The callback that will be invoked when the tile is collided with.                                                            |
| callbackContext | object                   | No                                                                                                   | The context under which the callback is called.                                                                              |
| layer           | string \| number         | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                                          |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2265](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2265)
>
> Since: 3.0.0

---

### setTileLocationCallback [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#settilelocationcallback 'Direct link to setTileLocationCallback')

#### <instance> setTileLocationCallback(tileX, tileY, width, height, callback, \[callbackContext\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-settilelocationcallbacktilex-tiley-width-height-callback-callbackcontext-layer 'Direct link to <instance> setTileLocationCallback(tileX, tileY, width, height, callback, [callbackContext], [layer])')

**Description:**

Sets a collision callback for the given rectangular area (in tile coordinates) within the layer. If a callback is already set for the tile index it will be replaced. Set the callback to null to remove it.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name            | type             | optional                                                                                             | description                                                                      |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| tileX           | number           | No                                                                                                   | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY           | number           | No                                                                                                   | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width           | number           | No                                                                                                   | How many tiles wide from the `tileX` index the area will be.                     |
| height          | number           | No                                                                                                   | How many tiles tall from the `tileY` index the area will be.                     |
| callback        | function         | No                                                                                                   | The callback that will be invoked when the tile is collided with.                |
| callbackContext | object           | Yes                                                                                                  | The context under which the callback is called.                                  |
| layer           | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                              |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2294](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2294)
>
> Since: 3.0.0

---

### shuffle [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#shuffle 'Direct link to shuffle')

#### <instance> shuffle(\[tileX\], \[tileY\], \[width\], \[height\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-shuffletilex-tiley-width-height-layer 'Direct link to <instance> shuffle([tileX], [tileY], [width], [height], [layer])')

**Description:**

Shuffles the tiles in a rectangular region (specified in tile coordinates) within the given layer. It will only randomize the tiles in that area, so if they're all the same nothing will appear to have changed! This method only modifies tile indexes and does not change collision information.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type             | optional                                                                                             | description                                                                      |
| ------ | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| tileX  | number           | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY  | number           | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width  | number           | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                     |
| height | number           | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                     |
| layer  | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                              |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2436](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2436)
>
> Since: 3.0.0

---

### swapByIndex [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#swapbyindex 'Direct link to swapByIndex')

#### <instance> swapByIndex(tileA, tileB, \[tileX\], \[tileY\], \[width\], \[height\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-swapbyindextilea-tileb-tilex-tiley-width-height-layer 'Direct link to <instance> swapByIndex(tileA, tileB, [tileX], [tileY], [width], [height], [layer])')

**Description:**

Scans the given rectangular area (given in tile coordinates) for tiles with an index matching `indexA` and swaps then with `indexB`. This only modifies the index and does not change collision information.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type             | optional                                                                                             | description                                                                      |
| ------ | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| tileA  | number           | No                                                                                                   | First tile index.                                                                |
| tileB  | number           | No                                                                                                   | Second tile index.                                                               |
| tileX  | number           | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area. |
| tileY  | number           | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area.  |
| width  | number           | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                     |
| height | number           | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                     |
| layer  | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                              |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2466](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2466)
>
> Since: 3.0.0

---

### tileToWorldX [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiletoworldx 'Direct link to tileToWorldX')

#### <instance> tileToWorldX(tileX, \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-tiletoworldxtilex-camera-layer 'Direct link to <instance> tileToWorldX(tileX, [camera], [layer])')

**Description:**

Converts from tile X coordinates (tile units) to world X coordinates (pixels), factoring in the layers position, scale and scroll.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type                                                                                                   | optional                                                                                             | description                                                              |
| ------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| tileX  | number                                                                                                 | No                                                                                                   | The x coordinate, in tiles, not pixels.                                  |
| camera | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values. |
| layer  | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                      |

**Returns:** number - Returns a number, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2497](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2497)
>
> Since: 3.0.0

---

### tileToWorldXY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiletoworldxy 'Direct link to tileToWorldXY')

#### <instance> tileToWorldXY(tileX, tileY, \[vec2\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-tiletoworldxytilex-tiley-vec2-camera-layer 'Direct link to <instance> tileToWorldXY(tileX, tileY, [vec2], [camera], [layer])')

**Description:**

Converts from tile XY coordinates (tile units) to world XY coordinates (pixels), factoring in the layers position, scale and scroll. This will return a new Vector2 object or update the given `point` object.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type                                                                                                   | optional                                                                                             | description                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| tileX  | number                                                                                                 | No                                                                                                   | The x coordinate, in tiles, not pixels.                                       |
| tileY  | number                                                                                                 | No                                                                                                   | The y coordinate, in tiles, not pixels.                                       |
| vec2   | [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2)                     | Yes                                                                                                  | A Vector2 to store the coordinates in. If not given a new Vector2 is created. |
| camera | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values.      |
| layer  | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                           |

**Returns:** [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) \- Returns a Vector2, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2545](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2545)
>
> Since: 3.0.0

---

### tileToWorldY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiletoworldy 'Direct link to tileToWorldY')

#### <instance> tileToWorldY(tileY, \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-tiletoworldytiley-camera-layer 'Direct link to <instance> tileToWorldY(tileY, [camera], [layer])')

**Description:**

Converts from tile Y coordinates (tile units) to world Y coordinates (pixels), factoring in the layers position, scale and scroll.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name   | type                                                                                                   | optional                                                                                             | description                                                              |
| ------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| tileY  | number                                                                                                 | No                                                                                                   | The y coordinate, in tiles, not pixels.                                  |
| camera | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values. |
| layer  | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                      |

**Returns:** number - Returns a number, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2521](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2521)
>
> Since: 3.0.0

---

### weightedRandomize [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#weightedrandomize 'Direct link to weightedRandomize')

#### <instance> weightedRandomize(weightedIndexes, \[tileX\], \[tileY\], \[width\], \[height\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-weightedrandomizeweightedindexes-tilex-tiley-width-height-layer 'Direct link to <instance> weightedRandomize(weightedIndexes, [tileX], [tileY], [width], [height], [layer])')

**Description:**

Randomizes the indexes of a rectangular region of tiles (in tile coordinates) within the specified layer. Each tile will receive a new index. New indexes are drawn from the given weightedIndexes array. An example weighted array:

\[ { index: 6, weight: 4 }, // Probability of index 6 is 4 / 8 { index: 7, weight: 2 }, // Probability of index 7 would be 2 / 8 { index: 8, weight: 1.5 }, // Probability of index 8 would be 1.5 / 8 { index: 26, weight: 0.5 } // Probability of index 26 would be 0.5 / 8 \]

The probability of any index being picked is (the indexs weight) / (sum of all weights). This method only modifies tile indexes and does not change collision information.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name            | type             | optional                                                                                             | description                                                                                                                                                                                           |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| weightedIndexes | Array.<object>   | No                                                                                                   | An array of objects to randomly draw from during randomization. They should be in the form: { index: 0, weight: 4 } or { index: \[0, 1\], weight: 4 } if you wish to draw from multiple tile indexes. |
| tileX           | number           | Yes                                                                                                  | The left most tile index (in tile coordinates) to use as the origin of the area.                                                                                                                      |
| tileY           | number           | Yes                                                                                                  | The top most tile index (in tile coordinates) to use as the origin of the area.                                                                                                                       |
| width           | number           | Yes                                                                                                  | How many tiles wide from the `tileX` index the area will be.                                                                                                                                          |
| height          | number           | Yes                                                                                                  | How many tiles tall from the `tileY` index the area will be.                                                                                                                                          |
| layer           | string \| number | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                                                                                                                                                   |

**Returns:** [Phaser.Tilemaps.Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap) \- Return this Tilemap object, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2605](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2605)
>
> Since: 3.0.0

---

### worldToTileX [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#worldtotilex 'Direct link to worldToTileX')

#### <instance> worldToTileX(worldX, \[snapToFloor\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-worldtotilexworldx-snaptofloor-camera-layer 'Direct link to <instance> worldToTileX(worldX, [snapToFloor], [camera], [layer])')

**Description:**

Converts from world X coordinates (pixels) to tile X coordinates (tile units), factoring in the layers position, scale and scroll.

If no layer is specified, the maps current layer is used.

You cannot call this method for Isometric or Hexagonal tilemaps as they require both `worldX` and `worldY` values to determine the correct tile, instead you should use the `worldToTileXY` method.

**Parameters:**

| name        | type                                                                                                   | optional                                                                                             | description                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| worldX      | number                                                                                                 | No                                                                                                   | The x coordinate to be converted, in pixels, not tiles.                  |
| snapToFloor | boolean                                                                                                | Yes                                                                                                  | Whether or not to round the tile coordinate down to the nearest integer. |
| camera      | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values. |
| layer       | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                      |

**Returns:** number - Returns a number, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2645](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2645)
>
> Since: 3.0.0

---

### worldToTileXY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#worldtotilexy 'Direct link to worldToTileXY')

#### <instance> worldToTileXY(worldX, worldY, \[snapToFloor\], \[vec2\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-worldtotilexyworldx-worldy-snaptofloor-vec2-camera-layer 'Direct link to <instance> worldToTileXY(worldX, worldY, [snapToFloor], [vec2], [camera], [layer])')

**Description:**

Converts from world XY coordinates (pixels) to tile XY coordinates (tile units), factoring in the layers position, scale and scroll. This will return a new Vector2 object or update the given `point` object.

If no layer is specified, the maps current layer is used.

**Parameters:**

| name        | type                                                                                                   | optional                                                                                             | description                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| worldX      | number                                                                                                 | No                                                                                                   | The x coordinate to be converted, in pixels, not tiles.                       |
| worldY      | number                                                                                                 | No                                                                                                   | The y coordinate to be converted, in pixels, not tiles.                       |
| snapToFloor | boolean                                                                                                | Yes                                                                                                  | Whether or not to round the tile coordinate down to the nearest integer.      |
| vec2        | [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2)                     | Yes                                                                                                  | A Vector2 to store the coordinates in. If not given a new Vector2 is created. |
| camera      | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values.      |
| layer       | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                           |

**Returns:** [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) \- Returns a Vector2, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2703](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2703)
>
> Since: 3.0.0

---

### worldToTileY [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#worldtotiley 'Direct link to worldToTileY')

#### <instance> worldToTileY(worldY, \[snapToFloor\], \[camera\], \[layer\]) [​](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#instance-worldtotileyworldy-snaptofloor-camera-layer 'Direct link to <instance> worldToTileY(worldY, [snapToFloor], [camera], [layer])')

**Description:**

Converts from world Y coordinates (pixels) to tile Y coordinates (tile units), factoring in the layers position, scale and scroll.

If no layer is specified, the maps current layer is used.

You cannot call this method for Isometric or Hexagonal tilemaps as they require both `worldX` and `worldY` values to determine the correct tile, instead you should use the `worldToTileXY` method.

**Parameters:**

| name        | type                                                                                                   | optional                                                                                             | description                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| worldY      | number                                                                                                 | No                                                                                                   | The y coordinate to be converted, in pixels, not tiles.                  |
| snapToFloor | boolean                                                                                                | Yes                                                                                                  | Whether or not to round the tile coordinate down to the nearest integer. |
| camera      | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes                                                                                                  | The Camera to use when calculating the tile index from the world values. |
| layer       | string \| number                                                                                       | [Phaser.Tilemaps.TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) | Yes                                                                      |

**Returns:** number - Returns a number, or null if the layer given was invalid.

> Source: [src/tilemaps/Tilemap.js#L2674](https://github.com/phaserjs/phaser/blob/v4.1.0/src/tilemaps/Tilemap.js#L2674)
>
> Since: 3.0.0

---

```

- [Public Members](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#public-members)
  - [currentLayerIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#currentlayerindex)
  - [format](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#format)
  - [height](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#height)
  - [heightInPixels](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#heightinpixels)
  - [hexSideLength](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#hexsidelength)
  - [imageCollections](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#imagecollections)
  - [images](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#images)
  - [layer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#layer)
  - [layers](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#layers)
  - [objects](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#objects)
  - [orientation](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#orientation)
  - [properties](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#properties)
  - [renderOrder](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#renderorder)
  - [scene](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#scene)
  - [tileHeight](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tileheight)
  - [tiles](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiles)
  - [tilesets](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tilesets)
  - [tileWidth](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tilewidth)
  - [version](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#version)
  - [width](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#width)
  - [widthInPixels](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#widthinpixels)
- [Public Methods](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#public-methods)
  - [addTilesetImage](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#addtilesetimage)
  - [calculateFacesAt](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#calculatefacesat)
  - [calculateFacesWithin](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#calculatefaceswithin)
  - [copy](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#copy)
  - [createBlankLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createblanklayer)
  - [createFromObjects](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createfromobjects)
  - [createFromTiles](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createfromtiles)
  - [createLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#createlayer)
  - [destroy](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#destroy)
  - [destroyLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#destroylayer)
  - [fill](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#fill)
  - [filterObjects](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#filterobjects)
  - [filterTiles](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#filtertiles)
  - [findByIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#findbyindex)
  - [findObject](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#findobject)
  - [findTile](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#findtile)
  - [forEachTile](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#foreachtile)
  - [getImageIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getimageindex)
  - [getImageLayerNames](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getimagelayernames)
  - [getIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getindex)
  - [getLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getlayer)
  - [getLayerIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getlayerindex)
  - [getLayerIndexByName](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getlayerindexbyname)
  - [getObjectLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getobjectlayer)
  - [getObjectLayerNames](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#getobjectlayernames)
  - [getTileAt](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileat)
  - [getTileAtWorldXY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileatworldxy)
  - [getTileCorners](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettilecorners)
  - [getTileLayerNames](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettilelayernames)
  - [getTileset](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileset)
  - [getTilesetIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettilesetindex)
  - [getTilesWithin](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileswithin)
  - [getTilesWithinShape](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileswithinshape)
  - [getTilesWithinWorldXY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#gettileswithinworldxy)
  - [hasTileAt](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#hastileat)
  - [hasTileAtWorldXY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#hastileatworldxy)
  - [putTileAt](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#puttileat)
  - [putTileAtWorldXY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#puttileatworldxy)
  - [putTilesAt](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#puttilesat)
  - [randomize](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#randomize)
  - [removeAllLayers](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removealllayers)
  - [removeLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removelayer)
  - [removeTile](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removetile)
  - [removeTileAt](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removetileat)
  - [removeTileAtWorldXY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#removetileatworldxy)
  - [renderDebug](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#renderdebug)
  - [renderDebugFull](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#renderdebugfull)
  - [replaceByIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#replacebyindex)
  - [setBaseTileSize](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setbasetilesize)
  - [setCollision](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollision)
  - [setCollisionBetween](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionbetween)
  - [setCollisionByExclusion](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionbyexclusion)
  - [setCollisionByProperty](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionbyproperty)
  - [setCollisionFromCollisionGroup](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionfromcollisiongroup)
  - [setLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setlayer)
  - [setLayerTileSize](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setlayertilesize)
  - [setRenderOrder](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setrenderorder)
  - [setTileIndexCallback](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#settileindexcallback)
  - [setTileLocationCallback](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#settilelocationcallback)
  - [shuffle](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#shuffle)
  - [swapByIndex](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#swapbyindex)
  - [tileToWorldX](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiletoworldx)
  - [tileToWorldXY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiletoworldxy)
  - [tileToWorldY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#tiletoworldy)
  - [weightedRandomize](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#weightedrandomize)
  - [worldToTileX](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#worldtotilex)
  - [worldToTileXY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#worldtotilexy)
  - [worldToTileY](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#worldtotiley)
```
