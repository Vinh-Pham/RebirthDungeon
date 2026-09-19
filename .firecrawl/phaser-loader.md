[Skip to main content](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#__docusaurus_skipToContent_fallback)

Version: Phaser v4.1.0

On this page

The Loader handles loading all external content such as Images, Sounds, Texture Atlases and data files. You typically interact with it via `this.load` in your Scene. Scenes can have a `preload` method, which is always called before the Scenes `create` method, allowing you to preload assets that the Scene may need.

If you call any `this.load` methods from outside of `Scene.preload` then you need to start the Loader going yourself by calling `Loader.start()`. It's only automatically started during the Scene preload.

The Loader uses a combination of tag loading (eg. Audio elements) and XHR and provides progress and completion events. Files are loaded in parallel by default. The amount of concurrent connections can be controlled in your Game Configuration.

Once the Loader has started loading you are still able to add files to it. These can be injected as a result of a loader event, the type of file being loaded (such as a pack file) or other external events. As long as the Loader hasn't finished simply adding a new file to it, while running, will ensure it's added into the current queue.

Every Scene has its own instance of the Loader and they are bound to the Scene in which they are created. However, assets loaded by the Loader are placed into global game-level caches. For example, loading an XML file will place that file inside `Game.cache.xml`, which is accessible from every Scene in your game, no matter who was responsible for loading it. The same is true of Textures. A texture loaded in one Scene is instantly available to all other Scenes in your game.

The Loader works by using custom File Types. These are stored in the FileTypesManager, which injects them into the Loader when it's instantiated. You can create your own custom file types by extending either the File or MultiFile classes. See those files for more details.

**Constructor**

`new LoaderPlugin(scene)`

**Parameters**

| name | type | optional | description |
| --- | --- | --- | --- |
| scene | [Phaser.Scene](https://docs.phaser.io/api-documentation/class/scene) | No | The Scene which owns this Loader instance. |

* * *

**Scope**: static

**Extends**

> [Phaser.Events.EventEmitter](https://docs.phaser.io/api-documentation/class/events-eventemitter)

> Source: [src/loader/LoaderPlugin.js#L19](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L19)
>
> Since: 3.0.0

## Inherited Methods [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#inherited-methods "Direct link to Inherited Methods")

**From [Phaser.Events.EventEmitter](https://docs.phaser.io/api-documentation/class/events-eventemitter):**

- [addListener](https://docs.phaser.io/api-documentation/class/events-eventemitter#addlistener)
- [emit](https://docs.phaser.io/api-documentation/class/events-eventemitter#emit)
- [eventNames](https://docs.phaser.io/api-documentation/class/events-eventemitter#eventnames)
- [listenerCount](https://docs.phaser.io/api-documentation/class/events-eventemitter#listenercount)
- [listeners](https://docs.phaser.io/api-documentation/class/events-eventemitter#listeners)
- [off](https://docs.phaser.io/api-documentation/class/events-eventemitter#off)
- [on](https://docs.phaser.io/api-documentation/class/events-eventemitter#on)
- [once](https://docs.phaser.io/api-documentation/class/events-eventemitter#once)
- [removeAllListeners](https://docs.phaser.io/api-documentation/class/events-eventemitter#removealllisteners)
- [removeListener](https://docs.phaser.io/api-documentation/class/events-eventemitter#removelistener)

* * *

## Public Methods [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#public-methods "Direct link to Public Methods")

### addFile [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#addfile "Direct link to addFile")

#### <instance> addFile(file) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-addfilefile "Direct link to <instance> addFile(file)")

**Description:**

Adds a file, or array of files, into the load queue.

The file must be an instance of `Phaser.Loader.File`, or a class that extends it. The Loader will check that the key used by the file won't conflict with any other key either in the loader, the inflight queue or the target cache. If allowed it will then add the file into the pending list, ready for the load to start. Or, if the load has already started, ready for the next batch of files to be pulled from the list to the inflight queue.

You should not normally call this method directly, but rather use one of the Loader methods like `image` or `atlas`. However you can call this as long as the file given to it is well formed.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| file | [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) \| Array.< [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) > | No | The file, or array of files, to be added to the load queue. |

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/LoaderPlugin.js#L515](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L515)
>
> Since: 3.0.0

* * *

### addPack [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#addpack "Direct link to addPack")

#### <instance> addPack(pack, \[packKey\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-addpackpack-packkey "Direct link to <instance> addPack(pack, [packKey])")

**Description:**

Takes a well formed, fully parsed pack file object and adds its entries into the load queue. Usually you do not call this method directly, but instead use `Loader.pack` and supply a path to a JSON file that holds the pack data. However, if you've got the data prepared you can pass it to this method.

You can also provide an optional key. If you do then it will only add the entries from that part of the pack into to the load queue. If not specified it will add all entries it finds. For more details about the pack file format see the `LoaderPlugin.pack` method.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| pack | any | No | The Pack File data to be parsed and have each entry in it added to the load queue. |
| packKey | string | Yes | An optional key to use from the pack file data. |

**Returns:** boolean - `true` if any files were added to the queue, otherwise `false`.

> Source: [src/loader/LoaderPlugin.js#L617](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L617)
>
> Since: 3.7.0

* * *

### animation [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#animation "Direct link to animation")

#### <instance> animation(key, \[url\], \[dataKey\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-animationkey-url-datakey-xhrsettings "Direct link to <instance> animation(key, [url], [dataKey], [xhrSettings])")

**Description:**

Adds an Animation JSON Data file, or array of Animation JSON files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.animation('baddieAnims', 'files/BaddieAnims.json');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

The key must be a unique String. It is used to add the file to the global JSON Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the JSON Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the JSON Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.animation({
    key: 'baddieAnims',
    url: 'files/BaddieAnims.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.JSONFileConfig` for more details.

Once the file has finished loading it will automatically be passed to the global Animation Manager's `fromJSON` method. This will parse all of the JSON data and create animation data from it. This process happens at the very end of the Loader, once every other file in the load queue has finished. The reason for this is to allow you to load both animation data and the images it relies upon in the same load call.

Once the animation data has been parsed you will be able to play animations using that data. Please see the Animation Manager `fromJSON` method for more details about the format and playback.

You can also access the raw animation data from its Cache using its key:

```javascript
this.load.animation('baddieAnims', 'files/BaddieAnims.json');
// and later in your game ...
var data = this.cache.json.get('baddieAnims');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Waves` the final key will be `LEVEL1.Waves` and this is what you would use to retrieve the text from the JSON Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "data" and no URL is given then the Loader will set the URL to be "data.json". It will always add `.json` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

You can also optionally provide a `dataKey` to use. This allows you to extract only a part of the JSON and store it in the Cache, rather than the whole file. For example, if your JSON data had a structure like this:

```json
{
    "level1": {
        "baddies": {
            "aliens": {},
            "boss": {}
        }
    },
    "level2": {},
    "level3": {}
}
```

And if you only wanted to create animations from the `boss` data, then you could pass `level1.baddies.boss` as the `dataKey`.

Note: The ability to load this type of file will only be available if the JSON File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.JSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#JSONFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.JSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#JSONFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". |
| dataKey | string | Yes | When the Animation JSON file loads only this property will be stored in the Cache and used to create animation data. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/AnimationJSONFile.js#L77](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/AnimationJSONFile.js#L77)
>
> Since: 3.0.0

* * *

### aseprite [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#aseprite "Direct link to aseprite")

#### <instance> aseprite(key, \[textureURL\], \[atlasURL\], \[textureXhrSettings\], \[atlasXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-asepritekey-textureurl-atlasurl-texturexhrsettings-atlasxhrsettings "Direct link to <instance> aseprite(key, [textureURL], [atlasURL], [textureXhrSettings], [atlasXhrSettings])")

**Description:**

Aseprite is a powerful animated sprite editor and pixel art tool.

You can find more details at [https://www.aseprite.org/](https://www.aseprite.org/)

Adds a JSON based Aseprite Animation, or array of animations, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.aseprite('gladiator', 'images/Gladiator.png', 'images/Gladiator.json');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

To export a compatible JSON file in Aseprite, please do the following:

1. Go to "File - Export Sprite Sheet"

2. On the **Layout** tab:


2a. Set the "Sheet type" to "Packed"

2b. Set the "Constraints" to "None"

2c. Check the "Merge Duplicates" checkbox

3. On the **Sprite** tab:

3a. Set "Layers" to "Visible layers"

3b. Set "Frames" to "All frames", unless you only wish to export a sub-set of tags

4. On the **Borders** tab:

4a. Check the "Trim Sprite" and "Trim Cells" options

4b. Ensure "Border Padding", "Spacing" and "Inner Padding" are all > 0 (1 is usually enough)

5. On the **Output** tab:

5a. Check "Output File", give your image a name and make sure you choose "png files" as the file type

5b. Check "JSON Data" and give your json file a name

5c. The JSON Data type can be either a Hash or Array, Phaser doesn't mind.

5d. Make sure "Tags" is checked in the Meta options

5e. In the "Item Filename" input box, make sure it says just "{frame}" and nothing more.

6. Click export

This was tested with Aseprite 1.2.25.

This will export a png and json file which you can load using the Aseprite Loader.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.aseprite({
    key: 'gladiator',
    textureURL: 'images/Gladiator.png',
    atlasURL: 'images/Gladiator.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.AsepriteFileConfig` for more details.

Instead of passing a URL for the JSON data you can also pass in a well formed JSON object instead.

Once loaded, you can call this method from within a Scene with the 'atlas' key:

```javascript
this.anims.createFromAseprite('paladin');
```

Any animations defined in the JSON will now be available to use in Phaser and you play them via their Tag name. For example, if you have an animation called 'War Cry' on your Aseprite timeline, you can play it in Phaser using that Tag name:

```javascript
this.add.sprite(400, 300).play('War Cry');
```

When calling this method you can optionally provide an array of tag names, and only those animations will be created. For example:

```javascript
this.anims.createFromAseprite('paladin', [ 'step', 'War Cry', 'Magnum Break' ]);
```

This will only create the 3 animations defined. Note that the tag names are case-sensitive.

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Aseprite File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.AsepriteFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AsepriteFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.AsepriteFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AsepriteFileConfig) > | No |
| textureURL | string \| Array.<string> | Yes | The absolute or relative URL to load the texture image file from. If undefined or `null` it will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". |
| atlasURL | object \| string | Yes | The absolute or relative URL to load the texture atlas json data file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". Or, a well formed JSON object. |
| textureXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas image file. Used in replacement of the Loaders default XHR Settings. |
| atlasXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas json file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/AsepriteFile.js#L114](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/AsepriteFile.js#L114)
>
> Since: 3.50.0

* * *

### atlas [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#atlas "Direct link to atlas")

#### <instance> atlas(key, \[textureURL\], \[atlasURL\], \[textureXhrSettings\], \[atlasXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-atlaskey-textureurl-atlasurl-texturexhrsettings-atlasxhrsettings "Direct link to <instance> atlas(key, [textureURL], [atlasURL], [textureXhrSettings], [atlasXhrSettings])")

**Description:**

Adds a JSON based Texture Atlas, or array of atlases, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.atlas('mainmenu', 'images/MainMenu.png', 'images/MainMenu.json');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

Phaser expects the atlas data to be provided in a JSON file, using either the JSON Hash or JSON Array format.

These files are created by software such as:

- [Texture Packer](https://www.codeandweb.com/texturepacker/tutorials/how-to-create-sprite-sheets-for-phaser3?source=photonstorm)

- [Shoebox](https://renderhjs.net/shoebox/)

- [Gamma Texture Packer](https://gammafp.com/tool/atlas-packer/)

- [Adobe Flash / Animate](https://www.adobe.com/uk/products/animate.html)

- [Free Texture Packer](http://free-tex-packer.com/)

- [Leshy SpriteSheet Tool](https://www.leshylabs.com/apps/sstool/)


If you are using Texture Packer and have enabled multi-atlas support, then please use the Phaser Multi Atlas loader instead of this one.

Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.atlas({
    key: 'mainmenu',
    textureURL: 'images/MainMenu.png',
    atlasURL: 'images/MainMenu.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.AtlasJSONFileConfig` for more details.

Instead of passing a URL for the atlas JSON data you can also pass in a well formed JSON object instead.

Once the atlas has finished loading you can use frames from it as textures for a Game Object by referencing its key:

```javascript
this.load.atlas('mainmenu', 'images/MainMenu.png', 'images/MainMenu.json');
// and later in your game ...
this.add.image(x, y, 'mainmenu', 'background');
```

To get a list of all available frames within an atlas please consult your Texture Atlas software.

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Phaser also supports the automatic loading of associated normal maps. If you have a normal map to go with this image, then you can specify it by providing an array as the `url` where the second element is the normal map:

```javascript
this.load.atlas('mainmenu', [ 'images/MainMenu.png', 'images/MainMenu-n.png' ], 'images/MainMenu.json');
```

Or, if you are using a config object use the `normalMap` property:

```javascript
this.load.atlas({
    key: 'mainmenu',
    textureURL: 'images/MainMenu.png',
    normalMap: 'images/MainMenu-n.png',
    atlasURL: 'images/MainMenu.json'
});
```

The normal map file is subject to the same conditions as the image file with regard to the path, baseURL, CORS and XHR Settings. Normal maps are a WebGL only feature.

Note: The ability to load this type of file will only be available if the Atlas JSON File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.AtlasJSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AtlasJSONFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.AtlasJSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AtlasJSONFileConfig) > | No |
| textureURL | string \| Array.<string> | Yes | The absolute or relative URL to load the texture image file from. If undefined or `null` it will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". |
| atlasURL | object \| string | Yes | The absolute or relative URL to load the texture atlas json data file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". Or, a well formed JSON object. |
| textureXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas image file. Used in replacement of the Loaders default XHR Settings. |
| atlasXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas json file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/AtlasJSONFile.js#L109](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/AtlasJSONFile.js#L109)
>
> Since: 3.0.0

* * *

### atlasPCT [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#atlaspct "Direct link to atlasPCT")

#### <instance> atlasPCT(key, \[atlasURL\], \[path\], \[baseURL\], \[atlasXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-atlaspctkey-atlasurl-path-baseurl-atlasxhrsettings "Direct link to <instance> atlasPCT(key, [atlasURL], [path], [baseURL], [atlasXhrSettings])")

**Description:**

Adds a Phaser Compact Texture Atlas, or array of them, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.atlasPCT('level1', 'images/Level1.pct');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

Phaser expects the atlas data to be provided in the Phaser Compact Texture format (PCT). This is a compact line-oriented text format that is typically 90-95% smaller than equivalent JSON atlas descriptors while remaining trivially parsable at runtime. A single `.pct` file can describe one or multiple atlas pages (texture images). See the Phaser Compact Texture Atlas Format Specification for a full description of the format.

The way it works internally is that you provide a URL to the PCT data file. Phaser loads this file, decodes it, extracts which texture files it needs to load from its page records, and queues each referenced image. When all images have loaded, the atlas is assembled as a single multi-source Texture in the Texture Manager, and the decoded PCT data is stored in the Atlas Cache under the same key.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.atlasPCT({
    key: 'level1',
    atlasURL: 'images/Level1.pct'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.PCTAtlasFileConfig` for more details.

Once the atlas has finished loading you can use frames from it as textures for a Game Object by referencing its key:

```javascript
this.load.atlasPCT('level1', 'images/Level1.pct');
// and later in your game ...
this.add.image(x, y, 'level1', 'background');
```

The decoded PCT data (including page, folder and frame metadata) is also available from the Atlas Cache:

```javascript
var data = this.cache.atlas.get('level1');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.pct". It will always add `.pct` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the PCT Atlas File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.PCTAtlasFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#PCTAtlasFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.PCTAtlasFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#PCTAtlasFileConfig) > | No |
| atlasURL | string | Yes | The absolute or relative URL to load the PCT data file from. If undefined or `null` it will be set to `<key>.pct`, i.e. if `key` was "alien" then the URL will be "alien.pct". |
| path | string | Yes | Optional path to use when loading the textures defined in the PCT data. |
| baseURL | string | Yes | Optional Base URL to use when loading the textures defined in the PCT data. |
| atlasXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the PCT data file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/PCTAtlasFile.js#L251](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/PCTAtlasFile.js#L251)
>
> Since: 4.0.0

* * *

### atlasXML [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#atlasxml "Direct link to atlasXML")

#### <instance> atlasXML(key, \[textureURL\], \[atlasURL\], \[textureXhrSettings\], \[atlasXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-atlasxmlkey-textureurl-atlasurl-texturexhrsettings-atlasxhrsettings "Direct link to <instance> atlasXML(key, [textureURL], [atlasURL], [textureXhrSettings], [atlasXhrSettings])")

**Description:**

Adds an XML based Texture Atlas, or array of atlases, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.atlasXML('mainmenu', 'images/MainMenu.png', 'images/MainMenu.xml');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

Phaser expects the atlas data to be provided in an XML file format. These files are created by software such as Shoebox and Adobe Flash / Animate.

Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.atlasXML({
    key: 'mainmenu',
    textureURL: 'images/MainMenu.png',
    atlasURL: 'images/MainMenu.xml'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.AtlasXMLFileConfig` for more details.

Once the atlas has finished loading you can use frames from it as textures for a Game Object by referencing its key:

```javascript
this.load.atlasXML('mainmenu', 'images/MainMenu.png', 'images/MainMenu.xml');
// and later in your game ...
this.add.image(x, y, 'mainmenu', 'background');
```

To get a list of all available frames within an atlas please consult your Texture Atlas software.

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Phaser also supports the automatic loading of associated normal maps. If you have a normal map to go with this image, then you can specify it by providing an array as the `url` where the second element is the normal map:

```javascript
this.load.atlasXML('mainmenu', [ 'images/MainMenu.png', 'images/MainMenu-n.png' ], 'images/MainMenu.xml');
```

Or, if you are using a config object use the `normalMap` property:

```javascript
this.load.atlasXML({
    key: 'mainmenu',
    textureURL: 'images/MainMenu.png',
    normalMap: 'images/MainMenu-n.png',
    atlasURL: 'images/MainMenu.xml'
});
```

The normal map file is subject to the same conditions as the image file with regard to the path, baseURL, CORS and XHR Settings. Normal maps are a WebGL only feature.

Note: The ability to load this type of file will only be available if the Atlas XML File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.AtlasXMLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AtlasXMLFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.AtlasXMLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AtlasXMLFileConfig) > | No |
| textureURL | string \| Array.<string> | Yes | The absolute or relative URL to load the texture image file from. If undefined or `null` it will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". |
| atlasURL | string | Yes | The absolute or relative URL to load the texture atlas xml data file from. If undefined or `null` it will be set to `<key>.xml`, i.e. if `key` was "alien" then the URL will be "alien.xml". |
| textureXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas image file. Used in replacement of the Loaders default XHR Settings. |
| atlasXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas xml file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/AtlasXMLFile.js#L111](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/AtlasXMLFile.js#L111)
>
> Since: 3.7.0

* * *

### audio [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#audio "Direct link to audio")

#### <instance> audio(key, \[urls\], \[config\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-audiokey-urls-config-xhrsettings "Direct link to <instance> audio(key, [urls], [config], [xhrSettings])")

**Description:**

Adds an Audio or HTML5Audio file, or array of audio files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.audio('title', [ 'music/Title.ogg', 'music/Title.mp3', 'music/Title.m4a' ]);
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Audio Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Audio Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Audio Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.audio({
    key: 'title',
    url: [ 'music/Title.ogg', 'music/Title.mp3', 'music/Title.m4a' ]
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.AudioFileConfig` for more details.

The URLs can be relative or absolute. If the URLs are relative the `Loader.baseURL` and `Loader.path` values will be prepended to them.

Due to different browsers supporting different audio file types you should usually provide your audio files in a variety of formats. ogg, mp3 and m4a are the most common. If you provide an array of URLs then the Loader will determine which _one_ file to load based on browser support.

If audio has been disabled in your game, either via the game config, or lack of support from the device, then no audio will be loaded.

Note: The ability to load this type of file will only be available if the Audio File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.AudioFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AudioFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.AudioFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AudioFileConfig) > | No |
| urls | string \| Array.<string> | [Phaser.Types.Loader.FileTypes.AudioFileURLConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AudioFileURLConfig) | Array.< [Phaser.Types.Loader.FileTypes.AudioFileURLConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AudioFileURLConfig) > |
| config | any | Yes | An object containing an `instances` property for HTML5Audio. Defaults to 1. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/AudioFile.js#L221](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/AudioFile.js#L221)
>
> Since: 3.0.0

* * *

### audioSprite [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#audiosprite "Direct link to audioSprite")

#### <instance> audioSprite(key, jsonURL, \[audioURL\], \[audioConfig\], \[audioXhrSettings\], \[jsonXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-audiospritekey-jsonurl-audiourl-audioconfig-audioxhrsettings-jsonxhrsettings "Direct link to <instance> audioSprite(key, jsonURL, [audioURL], [audioConfig], [audioXhrSettings], [jsonXhrSettings])")

**Description:**

Adds a JSON based Audio Sprite, or array of audio sprites, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.audioSprite('kyobi', 'kyobi.json', [\
        'kyobi.ogg',\
        'kyobi.mp3',\
        'kyobi.m4a'\
    ]);
}
```

Audio Sprites are a combination of audio files and a JSON configuration. The JSON follows the format of that created by [https://github.com/tonistiigi/audiosprite](https://github.com/tonistiigi/audiosprite)

If the JSON file includes a 'resource' object then you can let Phaser parse it and load the audio files automatically based on its content. To do this exclude the audio URLs from the load:

```javascript
function preload ()
{
    this.load.audioSprite('kyobi', 'kyobi.json');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

The key must be a unique String. It is used to add the file to the global Audio Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Audio Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Audio Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.audioSprite({
    key: 'kyobi',
    jsonURL: 'audio/Kyobi.json',
    audioURL: [\
        'audio/Kyobi.ogg',\
        'audio/Kyobi.mp3',\
        'audio/Kyobi.m4a'\
    ]
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.AudioSpriteFileConfig` for more details.

Instead of passing a URL for the audio JSON data you can also pass in a well formed JSON object instead.

Once the audio has finished loading you can use it create an Audio Sprite by referencing its key:

```javascript
this.load.audioSprite('kyobi', 'kyobi.json');
// and later in your game ...
var music = this.sound.addAudioSprite('kyobi');
music.play('title');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this file's key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the audio sprite from the Audio Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

Due to different browsers supporting different audio file types you should usually provide your audio files in a variety of formats. ogg, mp3 and m4a are the most common. If you provide an array of URLs then the Loader will determine which _one_ file to load based on browser support.

If audio has been disabled in your game, either via the game config, or lack of support from the device, then no audio will be loaded.

Note: The ability to load this type of file will only be available if the Audio Sprite File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.AudioSpriteFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AudioSpriteFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.AudioSpriteFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#AudioSpriteFileConfig) > | No |
| jsonURL | string | No | The absolute or relative URL to load the json file from. Or a well formed JSON object to use instead. |
| audioURL | string \| Array.<string> | Yes | The absolute or relative URL to load the audio file from. If empty it will be obtained by parsing the JSON file. |
| audioConfig | any | Yes | The audio configuration options. |
| audioXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the audio file. Used in replacement of the Loaders default XHR Settings. |
| jsonXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the json file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/AudioSpriteFile.js#L143](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/AudioSpriteFile.js#L143)
>
> Since: 3.0.0

* * *

### binary [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#binary "Direct link to binary")

#### <instance> binary(key, \[url\], \[dataType\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-binarykey-url-datatype-xhrsettings "Direct link to <instance> binary(key, [url], [dataType], [xhrSettings])")

**Description:**

Adds a Binary file, or array of Binary files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.binary('doom', 'files/Doom.wad');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Binary Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Binary Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Binary Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.binary({
    key: 'doom',
    url: 'files/Doom.wad',
    dataType: Uint8Array
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.BinaryFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.binary('doom', 'files/Doom.wad');
// and later in your game ...
var data = this.cache.binary.get('doom');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Data` the final key will be `LEVEL1.Data` and this is what you would use to retrieve the text from the Binary Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "doom" and no URL is given then the Loader will set the URL to be "doom.bin". It will always add `.bin` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Binary File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.BinaryFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#BinaryFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.BinaryFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#BinaryFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.bin`, i.e. if `key` was "alien" then the URL will be "alien.bin". |
| dataType | any | Yes | Optional type to cast the binary file to once loaded. For example, `Uint8Array`. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/BinaryFile.js#L96](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/BinaryFile.js#L96)
>
> Since: 3.0.0

* * *

### bitmapFont [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#bitmapfont "Direct link to bitmapFont")

#### <instance> bitmapFont(key, \[textureURL\], \[fontDataURL\], \[textureXhrSettings\], \[fontDataXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-bitmapfontkey-textureurl-fontdataurl-texturexhrsettings-fontdataxhrsettings "Direct link to <instance> bitmapFont(key, [textureURL], [fontDataURL], [textureXhrSettings], [fontDataXhrSettings])")

**Description:**

Adds an XML based Bitmap Font, or array of fonts, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.bitmapFont('goldenFont', 'images/GoldFont.png', 'images/GoldFont.xml');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

Phaser expects the font data to be provided in an XML file format. These files are created by software such as the [Angelcode Bitmap Font Generator](http://www.angelcode.com/products/bmfont/), [Littera](http://kvazars.com/littera/) or [Glyph Designer](https://71squared.com/glyphdesigner)

Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.bitmapFont({
    key: 'goldenFont',
    textureURL: 'images/GoldFont.png',
    fontDataURL: 'images/GoldFont.xml'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.BitmapFontFileConfig` for more details.

Once the bitmap font has finished loading you can use the key of it when creating a Bitmap Text Game Object:

```javascript
this.load.bitmapFont('goldenFont', 'images/GoldFont.png', 'images/GoldFont.xml');
// and later in your game ...
this.add.bitmapText(x, y, 'goldenFont', 'Hello World');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use when creating a Bitmap Text object.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Phaser also supports the automatic loading of associated normal maps. If you have a normal map to go with this image, then you can specify it by providing an array as the `url` where the second element is the normal map:

```javascript
this.load.bitmapFont('goldenFont', [ 'images/GoldFont.png', 'images/GoldFont-n.png' ], 'images/GoldFont.xml');
```

Or, if you are using a config object use the `normalMap` property:

```javascript
this.load.bitmapFont({
    key: 'goldenFont',
    textureURL: 'images/GoldFont.png',
    normalMap: 'images/GoldFont-n.png',
    fontDataURL: 'images/GoldFont.xml'
});
```

The normal map file is subject to the same conditions as the image file with regard to the path, baseURL, CORs and XHR Settings. Normal maps are a WebGL only feature.

Note: The ability to load this type of file will only be available if the Bitmap Font File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.BitmapFontFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#BitmapFontFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.BitmapFontFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#BitmapFontFileConfig) > | No |
| textureURL | string \| Array.<string> | Yes | The absolute or relative URL to load the font image file from. If undefined or `null` it will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". |
| fontDataURL | string | Yes | The absolute or relative URL to load the font xml data file from. If undefined or `null` it will be set to `<key>.xml`, i.e. if `key` was "alien" then the URL will be "alien.xml". |
| textureXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the font image file. Used in replacement of the Loaders default XHR Settings. |
| fontDataXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the font data xml file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/BitmapFontFile.js#L113](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/BitmapFontFile.js#L113)
>
> Since: 3.0.0

* * *

### css [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#css "Direct link to css")

#### <instance> css(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-csskey-url-xhrsettings "Direct link to <instance> css(key, [url], [xhrSettings])")

**Description:**

Adds a CSS file, or array of CSS files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.css('headers', 'styles/headers.css');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String and not already in-use by another file in the Loader.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.css({
    key: 'headers',
    url: 'styles/headers.css'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.CSSFileConfig` for more details.

Once the file has finished loading it will automatically be converted into a style DOM element via `document.createElement('style')`. It will have its `defer` property set to false and then the resulting element will be appended to `document.head`. The CSS styles are then applied to the current document.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.css". It will always add `.css` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the CSS File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.CSSFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#CSSFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.CSSFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#CSSFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.css`, i.e. if `key` was "alien" then the URL will be "alien.css". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/CSSFile.js#L93](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/CSSFile.js#L93)
>
> Since: 3.17.0

* * *

### fileProcessComplete [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#fileprocesscomplete "Direct link to fileProcessComplete")

#### <instance> fileProcessComplete(file) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-fileprocesscompletefile "Direct link to <instance> fileProcessComplete(file)")

**Description:**

An internal method that is called automatically by the File when it has finished processing.

If the process was successful, and the File isn't part of a MultiFile, its `addToCache` method is called.

It is then removed from the queue. If there are no more files to load `loadComplete` is called.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| file | [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) | No | The file that has finished processing. |

> Source: [src/loader/LoaderPlugin.js#L1068](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L1068)
>
> Since: 3.7.0

* * *

### flagForRemoval [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#flagforremoval "Direct link to flagForRemoval")

#### <instance> flagForRemoval(file) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-flagforremovalfile "Direct link to <instance> flagForRemoval(file)")

**Description:**

Adds a File into the pending-deletion queue.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| file | [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) | No | The File to be queued for deletion when the Loader completes. |

> Source: [src/loader/LoaderPlugin.js#L1162](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L1162)
>
> Since: 3.7.0

* * *

### font [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#font "Direct link to font")

#### <instance> font(key, \[url\], \[format\], \[descriptors\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-fontkey-url-format-descriptors-xhrsettings "Direct link to <instance> font(key, [url], [format], [descriptors], [xhrSettings])")

**Description:**

Adds a Font file, or array of Font files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.font('Nokia', 'assets/nokia.ttf', 'truetype');
}
```

If the font file is open type, you can specify the format:

```javascript
function preload ()
{
    this.load.font('Nokia', 'assets/nokia.otf', 'opentype');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String and not already in-use by another file in the Loader.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.font({
    key: 'Nokia',
    url: 'assets/nokia.ttf',
    format: 'truetype',
    descriptors: { style: 'normal', weight: '400' }
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.FontFileConfig` for more details.

See the MDN documentation at [https://developer.mozilla.org/en-US/docs/Web/API/FontFace/FontFace#descriptors](https://developer.mozilla.org/en-US/docs/Web/API/FontFace/FontFace#descriptors) for details about the descriptors.

When this file is handled by the Loader, it will create a new Font Face DOM element for it and add it to the document.

You should use the same key given for the font in your Text objects, such as:

```javascript
this.add.text(x, y, 'Hello World', { fontFamily: 'Nokia', fontSize: 48 });
```

See [https://developer.mozilla.org/en-US/docs/Web/API/FontFace](https://developer.mozilla.org/en-US/docs/Web/API/FontFace) for more details.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.ttf". It will always add `.ttf` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Font File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.FontFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#FontFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.FontFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#FontFileConfig) > | No |  |
| url | string | Yes |  | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.ttf`, i.e. if `key` was "alien" then the URL will be "alien.ttf". |
| format | string | Yes | "'truetype'" | The font type. Should be a string, like 'truetype' or 'opentype'. |
| descriptors | object | Yes |  | An optional object containing font descriptors for the Font Face. See [https://developer.mozilla.org/en-US/docs/Web/API/FontFace/FontFace#descriptors](https://developer.mozilla.org/en-US/docs/Web/API/FontFace/FontFace#descriptors) for more details. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes |  | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/FontFile.js#L135](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/FontFile.js#L135)
>
> Since: 3.87.0

* * *

### glsl [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#glsl "Direct link to glsl")

#### <instance> glsl(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-glslkey-url-xhrsettings "Direct link to <instance> glsl(key, [url], [xhrSettings])")

**Description:**

Adds a GLSL file, or array of GLSL files, to the current load queue. In Phaser 3 GLSL files are just plain Text files containing source code.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.glsl('plasma', 'shaders/Plasma.glsl');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Shader Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Shader Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Shader Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.glsl({
    key: 'plasma',
    url: 'shaders/Plasma.glsl'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.GLSLFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.glsl('plasma', 'shaders/Plasma.glsl');
// and later in your game ...
var data = this.cache.shader.get('plasma');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this file's key. For example, if the prefix was `FX.` and the key was `Plasma` the final key will be `FX.Plasma` and this is what you would use to retrieve the text from the Shader Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "plasma" and no URL is given then the Loader will set the URL to be "plasma.glsl". It will always add `.glsl` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the GLSL File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.GLSLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#GLSLFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.GLSLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#GLSLFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.glsl`, i.e. if `key` was "alien" then the URL will be "alien.glsl". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/GLSLFile.js#L105](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/GLSLFile.js#L105)
>
> Since: 3.0.0

* * *

### html [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#html "Direct link to html")

#### <instance> html(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-htmlkey-url-xhrsettings "Direct link to <instance> html(key, [url], [xhrSettings])")

**Description:**

Adds an HTML file, or array of HTML files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.html('story', 'files/LoginForm.html');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global HTML Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the HTML Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the HTML Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.html({
    key: 'login',
    url: 'files/LoginForm.html'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.HTMLFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.html('login', 'files/LoginForm.html');
// and later in your game ...
var data = this.cache.html.get('login');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Story` the final key will be `LEVEL1.Story` and this is what you would use to retrieve the html from the HTML Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "story" and no URL is given then the Loader will set the URL to be "story.html". It will always add `.html` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the HTML File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.HTMLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#HTMLFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.HTMLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#HTMLFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.html`, i.e. if `key` was "alien" then the URL will be "alien.html". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/HTMLFile.js#L89](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/HTMLFile.js#L89)
>
> Since: 3.12.0

* * *

### htmlTexture [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#htmltexture "Direct link to htmlTexture")

#### <instance> htmlTexture(key, \[url\], \[width\], \[height\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-htmltexturekey-url-width-height-xhrsettings "Direct link to <instance> htmlTexture(key, [url], [width], [height], [xhrSettings])")

**Description:**

Adds an HTML File, or array of HTML Files, to the current load queue. When the files are loaded they will be rendered to textures and stored in the Texture Manager.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.htmlTexture('instructions', 'content/intro.html', 256, 512);
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.htmlTexture({
    key: 'instructions',
    url: 'content/intro.html',
    width: 256,
    height: 512
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.HTMLTextureFileConfig` for more details.

Once the file has finished loading you can use it as a texture for a Game Object by referencing its key:

```javascript
this.load.htmlTexture('instructions', 'content/intro.html', 256, 512);
// and later in your game ...
this.add.image(x, y, 'instructions');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.html". It will always add `.html` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

The width and height are the size of the texture to which the HTML will be rendered. It's not possible to determine these automatically, so you will need to provide them, either as arguments or in the file config object. When the HTML file has loaded a new SVG element is created with a size and viewbox set to the width and height given. The SVG file has a body tag added to it, with the HTML file contents included. It then calls `window.Blob` on the SVG, and if successful is added to the Texture Manager, otherwise it fails processing. The overall quality of the rendered HTML depends on your browser, and some of them may not even support the svg / blob process used. Be aware that there are limitations on what HTML can be inside an SVG. You can find out more details in this [Mozilla MDN entry](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas).

Note: The ability to load this type of file will only be available if the HTMLTextureFile File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.HTMLTextureFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#HTMLTextureFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.HTMLTextureFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#HTMLTextureFileConfig) > | No |  |
| url | string | Yes |  | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.html`, i.e. if `key` was "alien" then the URL will be "alien.html". |
| width | number | Yes | 512 | The width of the texture the HTML will be rendered to. |
| height | number | Yes | 512 | The height of the texture the HTML will be rendered to. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes |  | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/HTMLTextureFile.js#L158](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/HTMLTextureFile.js#L158)
>
> Since: 3.12.0

* * *

### image [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#image "Direct link to image")

#### <instance> image(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-imagekey-url-xhrsettings "Direct link to <instance> image(key, [url], [xhrSettings])")

**Description:**

Adds an Image, or array of Images, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.image('logo', 'images/phaserLogo.png');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle. If you try to load an animated gif only the first frame will be rendered. Browsers do not natively support playback of animated gifs to Canvas elements.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.image({
    key: 'logo',
    url: 'images/AtariLogo.png'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.ImageFileConfig` for more details.

Once the file has finished loading you can use it as a texture for a Game Object by referencing its key:

```javascript
this.load.image('logo', 'images/AtariLogo.png');
// and later in your game ...
this.add.image(x, y, 'logo');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Phaser also supports the automatic loading of associated normal maps. If you have a normal map to go with this image, then you can specify it by providing an array as the `url` where the second element is the normal map:

```javascript
this.load.image('logo', [ 'images/AtariLogo.png', 'images/AtariLogo-n.png' ]);
```

Or, if you are using a config object use the `normalMap` property:

```javascript
this.load.image({
    key: 'logo',
    url: 'images/AtariLogo.png',
    normalMap: 'images/AtariLogo-n.png'
});
```

The normal map file is subject to the same conditions as the image file with regard to the path, baseURL, CORS and XHR Settings. Normal maps are a WebGL only feature.

In Phaser 3.60 a new property was added that allows you to control how images are loaded. By default, images are loaded via XHR as Blobs. However, you can set `loader.imageLoadType: "HTMLImageElement"` in the Game Configuration and instead, the Loader will load all images via the Image tag instead.

Note: The ability to load this type of file will only be available if the Image File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.ImageFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#ImageFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.ImageFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#ImageFileConfig) > | No |
| url | string \| Array.<string> | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/ImageFile.js#L241](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/ImageFile.js#L241)
>
> Since: 3.0.0

* * *

### isLoading [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#isloading "Direct link to isLoading")

#### <instance> isLoading() [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-isloading "Direct link to <instance> isLoading()")

**Description:**

Is the Loader actively loading, or processing loaded files?

**Returns:** boolean - `true` if the Loader is busy loading or processing, otherwise `false`.

> Source: [src/loader/LoaderPlugin.js#L873](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L873)
>
> Since: 3.0.0

* * *

### isReady [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#isready "Direct link to isReady")

#### <instance> isReady() [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-isready "Direct link to <instance> isReady()")

**Description:**

Is the Loader ready to start a new load?

**Returns:** boolean - `true` if the Loader is ready to start a new load, otherwise `false`.

> Source: [src/loader/LoaderPlugin.js#L886](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L886)
>
> Since: 3.0.0

* * *

### json [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#json "Direct link to json")

#### <instance> json(key, \[url\], \[dataKey\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-jsonkey-url-datakey-xhrsettings "Direct link to <instance> json(key, [url], [dataKey], [xhrSettings])")

**Description:**

Adds a JSON file, or array of JSON files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.json('wavedata', 'files/AlienWaveData.json');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global JSON Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the JSON Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the JSON Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.json({
    key: 'wavedata',
    url: 'files/AlienWaveData.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.JSONFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.json('wavedata', 'files/AlienWaveData.json');
// and later in your game ...
var data = this.cache.json.get('wavedata');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Waves` the final key will be `LEVEL1.Waves` and this is what you would use to retrieve the text from the JSON Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "data" and no URL is given then the Loader will set the URL to be "data.json". It will always add `.json` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

You can also optionally provide a `dataKey` to use. This allows you to extract only a part of the JSON and store it in the Cache, rather than the whole file. For example, if your JSON data had a structure like this:

```json
{
    "level1": {
        "baddies": {
            "aliens": {},
            "boss": {}
        }
    },
    "level2": {},
    "level3": {}
}
```

And you only wanted to store the `boss` data in the Cache, then you could pass `level1.baddies.boss` as the `dataKey`.

Note: The ability to load this type of file will only be available if the JSON File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.JSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#JSONFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.JSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#JSONFileConfig) > | No |
| url | object \| string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". Or, can be a fully formed JSON Object. |
| dataKey | string | Yes | When the JSON file loads only this property will be stored in the Cache. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/JSONFile.js#L135](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/JSONFile.js#L135)
>
> Since: 3.0.0

* * *

### keyExists [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#keyexists "Direct link to keyExists")

#### <instance> keyExists(file) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-keyexistsfile "Direct link to <instance> keyExists(file)")

**Description:**

Checks the key and type of the given file to see if it will conflict with anything already in a Cache, the Texture Manager, or the list or inflight queues.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| file | [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) | No | The file to check the key of. |

**Returns:** boolean - `true` if adding this file will cause a cache or queue conflict, otherwise `false`.

> Source: [src/loader/LoaderPlugin.js#L560](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L560)
>
> Since: 3.7.0

* * *

### loadComplete [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#loadcomplete "Direct link to loadComplete")

#### <instance> loadComplete() [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-loadcomplete "Direct link to <instance> loadComplete()")

**Description:**

Called at the end when the load queue is exhausted and all files have either loaded or errored. By this point every loaded file will now be in its associated cache and ready for use.

Also clears down the Sets, puts progress to 1 and clears the deletion queue.

**Fires:** [Phaser.Loader.Events#event:COMPLETE](https://docs.phaser.io/api-documentation/event/loader-events#COMPLETE), [Phaser.Loader.Events#event:POST\_PROCESS](https://docs.phaser.io/api-documentation/event/loader-events#POST_PROCESS)

> Source: [src/loader/LoaderPlugin.js#L1126](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L1126)
>
> Since: 3.7.0

* * *

### multiatlas [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#multiatlas "Direct link to multiatlas")

#### <instance> multiatlas(key, \[atlasURL\], \[path\], \[baseURL\], \[atlasXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-multiatlaskey-atlasurl-path-baseurl-atlasxhrsettings "Direct link to <instance> multiatlas(key, [atlasURL], [path], [baseURL], [atlasXhrSettings])")

**Description:**

Adds a Multi Texture Atlas, or array of multi atlases, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.multiatlas('level1', 'images/Level1.json');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

Phaser expects the atlas data to be provided in a JSON file as exported from the application Texture Packer, version 4.6.3 or above, where you have made sure to use the Phaser 3 Export option.

The way it works internally is that you provide a URL to the JSON file. Phaser then loads this JSON, parses it and extracts which texture files it also needs to load to complete the process. If the JSON also defines normal maps, Phaser will load those as well.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.multiatlas({
    key: 'level1',
    atlasURL: 'images/Level1.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.MultiAtlasFileConfig` for more details.

Instead of passing a URL for the atlas JSON data you can also pass in a well formed JSON object instead.

Once the atlas has finished loading you can use frames from it as textures for a Game Object by referencing its key:

```javascript
this.load.multiatlas('level1', 'images/Level1.json');
// and later in your game ...
this.add.image(x, y, 'level1', 'background');
```

To get a list of all available frames within an atlas please consult your Texture Atlas software.

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.json". It will always add `.json` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Multi Atlas File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.MultiAtlasFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#MultiAtlasFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.MultiAtlasFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#MultiAtlasFileConfig) > | No |
| atlasURL | string | Yes | The absolute or relative URL to load the texture atlas json data file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". |
| path | string | Yes | Optional path to use when loading the textures defined in the atlas data. |
| baseURL | string | Yes | Optional Base URL to use when loading the textures defined in the atlas data. |
| atlasXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas json file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/MultiAtlasFile.js#L220](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/MultiAtlasFile.js#L220)
>
> Since: 3.7.0

* * *

### nextFile [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#nextfile "Direct link to nextFile")

#### <instance> nextFile(file, success) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-nextfilefile-success "Direct link to <instance> nextFile(file, success)")

**Description:**

An internal method called automatically by the XHRLoader belonging to a File.

This method will remove the given file from the inflight Set and update the load progress. If the file was successful its `onProcess` method is called, otherwise it is added to the delete queue.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| file | [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) | No | The File that just finished loading, or errored during load. |
| success | boolean | No | `true` if the file loaded successfully, otherwise `false`. |

**Fires:** [Phaser.Loader.Events#event:FILE\_LOAD](https://docs.phaser.io/api-documentation/event/loader-events#FILE_LOAD), [Phaser.Loader.Events#event:FILE\_LOAD\_ERROR](https://docs.phaser.io/api-documentation/event/loader-events#FILE_LOAD_ERROR)

> Source: [src/loader/LoaderPlugin.js#L1020](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L1020)
>
> Since: 3.0.0

* * *

### pack [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#pack "Direct link to pack")

#### <instance> pack(key, \[url\], \[dataKey\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-packkey-url-datakey-xhrsettings "Direct link to <instance> pack(key, [url], [dataKey], [xhrSettings])")

**Description:**

Adds a JSON File Pack, or array of packs, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.pack('level1', 'data/Level1Files.json');
}
```

A File Pack is a JSON file (or object) that contains details about other files that should be added into the Loader. Here is a small example:

```json
{
   "test1": {
       "files": [\
           {\
               "type": "image",\
               "key": "taikodrummaster",\
               "url": "assets/pics/taikodrummaster.jpg"\
           },\
           {\
               "type": "image",\
               "key": "sukasuka-chtholly",\
               "url": "assets/pics/sukasuka-chtholly.png"\
           }\
       ]
   },
   "meta": {
       "generated": "1401380327373",
       "app": "Phaser 3 Asset Packer",
       "url": "[https://phaser.io](https://phaser.io)",
       "version": "1.0",
       "copyright": "Photon Storm Ltd. 2018"
   }
}
```

The pack can be split into sections. In the example above you'll see a section called `test1`. You can tell the `load.pack` method to parse only a particular section of a pack. The pack is stored in the JSON Cache, so you can pass it to the Loader to process additional sections as needed in your game, or you can just load them all at once without specifying anything.

The pack file can contain an entry for any type of file that Phaser can load. The object structures exactly match that of the file type configs, and all properties available within the file type configs can be used in the pack file too. An entry's `type` is the name of the Loader method that will load it, e.g., 'image'.

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

The key must be a unique String. It is used to add the file to the global JSON Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the JSON Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the JSON Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.pack({
    key: 'level1',
    url: 'data/Level1Files.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.PackFileConfig` for more details.

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Waves` the final key will be `LEVEL1.Waves` and this is what you would use to retrieve the text from the JSON Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "data" and no URL is given then the Loader will set the URL to be "data.json". It will always add `.json` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

You can also optionally provide a `dataKey` to use. This allows you to extract only a part of the JSON and store it in the Cache, rather than the whole file. For example, if your JSON data had a structure like this:

```json
{
    "level1": {
        "baddies": {
            "aliens": {},
            "boss": {}
        }
    },
    "level2": {},
    "level3": {}
}
```

And you only wanted to store the `boss` data in the Cache, then you could pass `level1.baddies.boss` as the `dataKey`.

Note: The ability to load this type of file will only be available if the Pack File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.PackFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#PackFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.PackFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#PackFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". |
| dataKey | string | Yes | When the JSON file loads only this property will be stored in the Cache. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/PackFile.js#L85](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/PackFile.js#L85)
>
> Since: 3.7.0

* * *

### plugin [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#plugin "Direct link to plugin")

#### <instance> plugin(key, \[url\], \[start\], \[mapping\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-pluginkey-url-start-mapping-xhrsettings "Direct link to <instance> plugin(key, [url], [start], [mapping], [xhrSettings])")

**Description:**

Adds a Plugin Script file, or array of plugin files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.plugin('modplayer', 'plugins/ModPlayer.js');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String and not already in-use by another file in the Loader.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.plugin({
    key: 'modplayer',
    url: 'plugins/ModPlayer.js'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.PluginFileConfig` for more details.

Once the file has finished loading it will automatically be converted into a script element via `document.createElement('script')`. It will have its language set to JavaScript, `defer` set to false and then the resulting element will be appended to `document.head`. Any code then in the script will be executed. It will then be passed to the Phaser PluginCache.register method.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.js". It will always add `.js` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Plugin File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.PluginFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#PluginFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.PluginFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#PluginFileConfig) > | No |
| url | string \| function | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.js`, i.e. if `key` was "alien" then the URL will be "alien.js". Or, a plugin function. |
| start | boolean | Yes | Automatically start the plugin after loading? |
| mapping | string | Yes | If this plugin is to be injected into the Scene, this is the property key used. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/PluginFile.js#L137](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/PluginFile.js#L137)
>
> Since: 3.0.0

* * *

### removePack [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#removepack "Direct link to removePack")

#### <instance> removePack(packKey, \[dataKey\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-removepackpackkey-datakey "Direct link to <instance> removePack(packKey, [dataKey])")

**Description:**

Remove the resources listed in an Asset Pack.

This removes Animations from the Animation Manager, Textures from the Texture Manager, and all other assets from their respective caches. It doesn't remove the Pack itself from the JSON cache, if it exists there. If the Pack includes another Pack, its resources will be removed too.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| packKey | string \| object | No | The key of an Asset Pack in the JSON cache, or a Pack File data. |
| dataKey | string | Yes | A key in the Pack data, if you want to process only a section of it. |

> Source: [src/loader/LoaderPlugin.js#L699](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L699)
>
> Since: 3.85.0

* * *

### reset [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#reset "Direct link to reset")

#### <instance> reset() [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-reset "Direct link to <instance> reset()")

**Description:**

Resets the Loader.

This will clear all lists and reset the base URL, path and prefix.

Warning: If the Loader is currently downloading files, or has files in its queue, they will be aborted.

> Source: [src/loader/LoaderPlugin.js#L1227](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L1227)
>
> Since: 3.0.0

* * *

### save [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#save "Direct link to save")

#### <instance> save(data, \[filename\], \[filetype\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-savedata-filename-filetype "Direct link to <instance> save(data, [filename], [filetype])")

**Description:**

Causes the browser to save the given data as a file to its default Downloads folder.

Creates a DOM level anchor link, assigns it as being a `download` anchor, sets the href to be an ObjectURL based on the given data, and then invokes a click event.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| data | \* | No |  | The data to be saved. Will be passed through URL.createObjectURL. |
| filename | string | Yes | "file.json" | The filename to save the file as. |
| filetype | string | Yes | "application/json" | The file type to use when saving the file. Defaults to JSON. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- This Loader plugin.

> Source: [src/loader/LoaderPlugin.js#L1193](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L1193)
>
> Since: 3.0.0

* * *

### saveJSON [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#savejson "Direct link to saveJSON")

#### <instance> saveJSON(data, \[filename\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-savejsondata-filename "Direct link to <instance> saveJSON(data, [filename])")

**Description:**

Converts the given JavaScript object into JSON and triggers a browser download so you can save it locally.

The data must be a plain JavaScript object that can be serialized via `JSON.stringify`. Do not pass a pre-stringified JSON string.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| data | \* | No |  | The JSON data, ready parsed. |
| filename | string | Yes | "file.json" | The name to save the JSON file as. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- This Loader plugin.

> Source: [src/loader/LoaderPlugin.js#L1175](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L1175)
>
> Since: 3.0.0

* * *

### sceneFile [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#scenefile "Direct link to sceneFile")

#### <instance> sceneFile(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-scenefilekey-url-xhrsettings "Direct link to <instance> sceneFile(key, [url], [xhrSettings])")

**Description:**

Adds an external Scene file, or array of Scene files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.sceneFile('Level1', 'src/Level1.js');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Scene Manager upon a successful load.

For a Scene File it's vitally important that the key matches the class name in the JavaScript file.

For example here is the source file:

```javascript
class ExternalScene extends Phaser.Scene {

    constructor ()
    {
        super('myScene');
    }

}
```

Because the class is called `ExternalScene` that is the exact same key you must use when loading it:

```javascript
function preload ()
{
    this.load.sceneFile('ExternalScene', 'src/yourScene.js');
}
```

The key that is used within the Scene Manager can either be set to the same, or you can override it in the Scene constructor, as we've done in the example above, where the Scene key was changed to `myScene`.

The key should be unique both in terms of files being loaded and Scenes already present in the Scene Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Scene Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.sceneFile({
    key: 'Level1',
    url: 'src/Level1.js'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.SceneFileConfig` for more details.

Once the file has finished loading it will be added to the Scene Manager.

```javascript
this.load.sceneFile('Level1', 'src/Level1.js');
// and later in your game ...
this.scene.start('Level1');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `WORLD1.` and the key was `Story` the final key will be `WORLD1.Story` and this is what you would use to retrieve the text from the Scene Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "story" and no URL is given then the Loader will set the URL to be "story.js". It will always add `.js` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Scene File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.SceneFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#SceneFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.SceneFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#SceneFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.js`, i.e. if `key` was "alien" then the URL will be "alien.js". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/SceneFile.js#L109](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/SceneFile.js#L109)
>
> Since: 3.16.0

* * *

### scenePlugin [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#sceneplugin "Direct link to scenePlugin")

#### <instance> scenePlugin(key, \[url\], \[systemKey\], \[sceneKey\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-scenepluginkey-url-systemkey-scenekey-xhrsettings "Direct link to <instance> scenePlugin(key, [url], [systemKey], [sceneKey], [xhrSettings])")

**Description:**

Adds a Scene Plugin Script file, or array of plugin files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.scenePlugin('ModPlayer', 'plugins/ModPlayer.js', 'modPlayer', 'mods');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String and not already in-use by another file in the Loader.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.scenePlugin({
    key: 'modplayer',
    url: 'plugins/ModPlayer.js'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.ScenePluginFileConfig` for more details.

Once the file has finished loading it will automatically be converted into a script element via `document.createElement('script')`. It will have its language set to JavaScript, `defer` set to false and then the resulting element will be appended to `document.head`. Any code then in the script will be executed. The plugin class is then retrieved from the global `window` object using the file key and installed into the Scene via the Plugin Manager using `installScenePlugin`.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.js". It will always add `.js` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Script File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.ScenePluginFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#ScenePluginFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.ScenePluginFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#ScenePluginFileConfig) > | No |
| url | string \| function | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.js`, i.e. if `key` was "alien" then the URL will be "alien.js". Or, set to a plugin function. |
| systemKey | string | Yes | If this plugin is to be added to Scene.Systems, this is the property key for it. |
| sceneKey | string | Yes | If this plugin is to be added to the Scene, this is the property key for it. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/ScenePluginFile.js#L129](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/ScenePluginFile.js#L129)
>
> Since: 3.8.0

* * *

### script [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#script "Direct link to script")

#### <instance> script(key, \[url\], \[type\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-scriptkey-url-type-xhrsettings "Direct link to <instance> script(key, [url], [type], [xhrSettings])")

**Description:**

Adds a Script file, or array of Script files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.script('aliens', 'lib/aliens.js');
}
```

If the script file contains a module, then you should specify that using the 'type' parameter:

```javascript
function preload ()
{
    this.load.script('aliens', 'lib/aliens.js', 'module');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String and not already in-use by another file in the Loader.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.script({
    key: 'aliens',
    url: 'lib/aliens.js',
    type: 'script' // or 'module'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.ScriptFileConfig` for more details.

Once the file has finished loading it will automatically be converted into a script element via `document.createElement('script')`. It will have its language set to JavaScript, `defer` set to false and then the resulting element will be appended to `document.head`. Any code then in the script will be executed.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.js". It will always add `.js` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Script File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.ScriptFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#ScriptFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.ScriptFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#ScriptFileConfig) > | No |  |
| url | string | Yes |  | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.js`, i.e. if `key` was "alien" then the URL will be "alien.js". |
| type | string | Yes | "'script'" | The script type. Should be either 'script' for classic JavaScript, or 'module' if the file contains an exported module. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes |  | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/ScriptFile.js#L100](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/ScriptFile.js#L100)
>
> Since: 3.0.0

* * *

### scripts [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#scripts "Direct link to scripts")

#### <instance> scripts(key, \[url\], \[extension\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-scriptskey-url-extension-xhrsettings "Direct link to <instance> scripts(key, [url], [extension], [xhrSettings])")

**Description:**

Adds an array of Script files to the current load queue.

The difference between this and the `ScriptFile` file type is that you give an array of scripts to this method, and the scripts are then processed _exactly_ in that order. This allows you to load a bunch of scripts that may have dependencies on each other without worrying about the async nature of traditional script loading.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.scripts('PostProcess', [\
        'libs/shaders/CopyShader.js',\
        'libs/postprocessing/EffectComposer.js',\
        'libs/postprocessing/RenderPass.js',\
        'libs/postprocessing/MaskPass.js',\
        'libs/postprocessing/ShaderPass.js',\
        'libs/postprocessing/AfterimagePass.js'\
   ]);
}
```

In the code above the script files will all be loaded in parallel but only processed (i.e. invoked) in the exact order given in the array.

The files are **not** loaded right away. They are added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the files are queued it means you cannot use the files immediately after calling this method, but must wait for the files to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String and not already in-use by another file in the Loader.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.scripts({
    key: 'PostProcess',
    url: [\
        'libs/shaders/CopyShader.js',\
        'libs/postprocessing/EffectComposer.js',\
        'libs/postprocessing/RenderPass.js',\
        'libs/postprocessing/MaskPass.js',\
        'libs/postprocessing/ShaderPass.js',\
        'libs/postprocessing/AfterimagePass.js'\
       ]
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.MultiScriptFileConfig` for more details.

Once all the files have finished loading they will automatically be converted into a script element via `document.createElement('script')`. They will have their language set to JavaScript, `defer` set to false and then the resulting element will be appended to `document.head`. Any code then in the script will be executed. This is done in the exact order the files are specified in the url array.

The URLs can be relative or absolute. If the URLs are relative the `Loader.baseURL` and `Loader.path` values will be prepended to them.

Note: The ability to load this type of file will only be available if the MultiScript File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.MultiScriptFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#MultiScriptFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.MultiScriptFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#MultiScriptFileConfig) > | No |  |
| url | Array.<string> | Yes |  | An array of absolute or relative URLs to load the script files from. They are processed in the order given in the array. |
| extension | string | Yes | "'js'" | The default file extension to use if no url is provided. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes |  | Extra XHR Settings specifically for these files. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/MultiScriptFile.js#L113](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/MultiScriptFile.js#L113)
>
> Since: 3.17.0

* * *

### setBaseURL [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#setbaseurl "Direct link to setBaseURL")

#### <instance> setBaseURL(\[url\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-setbaseurlurl "Direct link to <instance> setBaseURL([url])")

**Description:**

If you want to append a URL before the path of any asset you can set this here.

Useful if allowing the asset base url to be configured outside of the game code.

Once a base URL is set it will affect every file loaded by the Loader from that point on. It does _not_ change any file _already_ being loaded. To reset it, call this method with no arguments.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| url | string | Yes | The URL to use. Leave empty to reset. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- This Loader object.

> Source: [src/loader/LoaderPlugin.js#L398](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L398)
>
> Since: 3.0.0

* * *

### setCORS [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#setcors "Direct link to setCORS")

#### <instance> setCORS(\[crossOrigin\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-setcorscrossorigin "Direct link to <instance> setCORS([crossOrigin])")

**Description:**

Sets the Cross Origin Resource Sharing value used when loading files.

Files can override this value on a per-file basis by specifying an alternative `crossOrigin` value in their file config.

Once CORs is set it will then affect every file loaded by the Loader from that point on, as long as they don't have their own CORs setting. To reset it, call this method with no arguments.

For more details about CORs see [https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| crossOrigin | string | Yes | The value to use for the `crossOrigin` property in the load request. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- This Loader object.

> Source: [src/loader/LoaderPlugin.js#L491](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L491)
>
> Since: 3.0.0

* * *

### setPath [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#setpath "Direct link to setPath")

#### <instance> setPath(\[path\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-setpathpath "Direct link to <instance> setPath([path])")

**Description:**

The value of `path`, if set, is placed before any _relative_ file path given. For example:

```javascript
this.load.setPath("images/sprites/");
this.load.image("ball", "ball.png");
this.load.image("tree", "level1/oaktree.png");
this.load.image("boom", "[http://server.com/explode.png](http://server.com/explode.png)");
```

Would load the `ball` file from `images/sprites/ball.png` and the tree from `images/sprites/level1/oaktree.png` but the file `boom` would load from the URL given as it's an absolute URL.

Please note that the path is added before the filename but _after_ the baseURL (if set.)

Once a path is set it will then affect every file added to the Loader from that point on. It does _not_ change any file _already_ in the load queue. To reset it, call this method with no arguments.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| path | string | Yes | The path to use. Leave empty to reset. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- This Loader object.

> Source: [src/loader/LoaderPlugin.js#L427](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L427)
>
> Since: 3.0.0

* * *

### setPrefix [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#setprefix "Direct link to setPrefix")

#### <instance> setPrefix(\[prefix\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-setprefixprefix "Direct link to <instance> setPrefix([prefix])")

**Description:**

An optional prefix that is automatically prepended to the start of every file key.

If prefix was `MENU.` and you load an image with the key 'Background' the resulting key would be `MENU.Background`.

Once a prefix is set it will then affect every file added to the Loader from that point on. It does _not_ change any file _already_ in the load queue. To reset it, call this method with no arguments.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| prefix | string | Yes | The prefix to use. Leave empty to reset. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- This Loader object.

> Source: [src/loader/LoaderPlugin.js#L467](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L467)
>
> Since: 3.7.0

* * *

### spritesheet [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#spritesheet "Direct link to spritesheet")

#### <instance> spritesheet(key, \[url\], \[frameConfig\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-spritesheetkey-url-frameconfig-xhrsettings "Direct link to <instance> spritesheet(key, [url], [frameConfig], [xhrSettings])")

**Description:**

Adds a Sprite Sheet Image, or array of Sprite Sheet Images, to the current load queue.

The term 'Sprite Sheet' in Phaser means a fixed-size sheet. Where every frame in the sheet is the exact same size, and you reference those frames using numbers, not frame names. This is not the same thing as a Texture Atlas, where the frames are packed in a way where they take up the least amount of space, and are referenced by their names, not numbers. Some articles and software use the term 'Sprite Sheet' to mean Texture Atlas, so please be aware of what sort of file you're actually trying to load.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.spritesheet('bot', 'images/robot.png', { frameWidth: 32, frameHeight: 38 });
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle. If you try to load an animated gif only the first frame will be rendered. Browsers do not natively support playback of animated gifs to Canvas elements.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.spritesheet({
    key: 'bot',
    url: 'images/robot.png',
    frameConfig: {
        frameWidth: 32,
        frameHeight: 38,
        startFrame: 0,
        endFrame: 8
    }
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.SpriteSheetFileConfig` for more details.

Once the file has finished loading you can use it as a texture for a Game Object by referencing its key:

```javascript
this.load.spritesheet('bot', 'images/robot.png', { frameWidth: 32, frameHeight: 38 });
// and later in your game ...
this.add.image(x, y, 'bot', 0);
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `PLAYER.` and the key was `Running` the final key will be `PLAYER.Running` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Phaser also supports the automatic loading of associated normal maps. If you have a normal map to go with this image, then you can specify it by providing an array as the `url` where the second element is the normal map:

```javascript
this.load.spritesheet('logo', [ 'images/AtariLogo.png', 'images/AtariLogo-n.png' ], { frameWidth: 256, frameHeight: 80 });
```

Or, if you are using a config object use the `normalMap` property:

```javascript
this.load.spritesheet({
    key: 'logo',
    url: 'images/AtariLogo.png',
    normalMap: 'images/AtariLogo-n.png',
    frameConfig: {
        frameWidth: 256,
        frameHeight: 80
    }
});
```

The normal map file is subject to the same conditions as the image file with regard to the path, baseURL, CORS and XHR Settings. Normal maps are a WebGL only feature.

Note: The ability to load this type of file will only be available if the Sprite Sheet File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.SpriteSheetFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#SpriteSheetFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.SpriteSheetFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#SpriteSheetFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". |
| frameConfig | [Phaser.Types.Loader.FileTypes.ImageFrameConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#ImageFrameConfig) | Yes | The frame configuration object. At a minimum it should have a `frameWidth` property. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/SpriteSheetFile.js#L87](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/SpriteSheetFile.js#L87)
>
> Since: 3.0.0

* * *

### start [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#start "Direct link to start")

#### <instance> start() [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-start "Direct link to <instance> start()")

**Description:**

Starts the Loader running. This will reset the progress and totals and then emit a `start` event. If there is nothing in the queue the Loader will immediately complete, otherwise it will start loading the first batch of files.

The Loader is started automatically if the queue is populated within your Scenes `preload` method.

However, outside of this, you need to call this method to start it.

If the Loader is already running this method will simply return.

**Fires:** [Phaser.Loader.Events#event:START](https://docs.phaser.io/api-documentation/event/loader-events#START)

> Source: [src/loader/LoaderPlugin.js#L899](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L899)
>
> Since: 3.0.0

* * *

### svg [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#svg "Direct link to svg")

#### <instance> svg(key, \[url\], \[svgConfig\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-svgkey-url-svgconfig-xhrsettings "Direct link to <instance> svg(key, [url], [svgConfig], [xhrSettings])")

**Description:**

Adds an SVG File, or array of SVG Files, to the current load queue. When the files are loaded they will be rendered to bitmap textures and stored in the Texture Manager.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.svg('morty', 'images/Morty.svg');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.svg({
    key: 'morty',
    url: 'images/Morty.svg'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.SVGFileConfig` for more details.

Once the file has finished loading you can use it as a texture for a Game Object by referencing its key:

```javascript
this.load.svg('morty', 'images/Morty.svg');
// and later in your game ...
this.add.image(x, y, 'morty');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.svg". It will always add `.svg` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

You can optionally pass an SVG Resize Configuration object when you load an SVG file. By default the SVG will be rendered to a texture at the same size defined in the SVG file attributes. However, this isn't always desirable. You may wish to resize the SVG (either down or up) to improve texture clarity, or reduce texture memory consumption. You can either specify an exact width and height to resize the SVG to:

```javascript
function preload ()
{
    this.load.svg('morty', 'images/Morty.svg', { width: 300, height: 600 });
}
```

Or when using a configuration object:

```javascript
this.load.svg({
    key: 'morty',
    url: 'images/Morty.svg',
    svgConfig: {
        width: 300,
        height: 600
    }
});
```

Alternatively, you can just provide a scale factor instead:

```javascript
function preload ()
{
    this.load.svg('morty', 'images/Morty.svg', { scale: 2.5 });
}
```

Or when using a configuration object:

```javascript
this.load.svg({
    key: 'morty',
    url: 'images/Morty.svg',
    svgConfig: {
        scale: 2.5
    }
});
```

If scale, width and height values are all given, the scale has priority and the width and height values are ignored.

Note: The ability to load this type of file will only be available if the SVG File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.SVGFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#SVGFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.SVGFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#SVGFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.svg`, i.e. if `key` was "alien" then the URL will be "alien.svg". |
| svgConfig | [Phaser.Types.Loader.FileTypes.SVGSizeConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#SVGSizeConfig) | Yes | The svg size configuration object. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/SVGFile.js#L202](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/SVGFile.js#L202)
>
> Since: 3.0.0

* * *

### text [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#text "Direct link to text")

#### <instance> text(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-textkey-url-xhrsettings "Direct link to <instance> text(key, [url], [xhrSettings])")

**Description:**

Adds a Text file, or array of Text files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.text('story', 'files/IntroStory.txt');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Text Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Text Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Text Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.text({
    key: 'story',
    url: 'files/IntroStory.txt'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.TextFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.text('story', 'files/IntroStory.txt');
// and later in your game ...
var data = this.cache.text.get('story');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Story` the final key will be `LEVEL1.Story` and this is what you would use to retrieve the text from the Text Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "story" and no URL is given then the Loader will set the URL to be "story.txt". It will always add `.txt` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Text File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.TextFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TextFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.TextFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TextFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.txt`, i.e. if `key` was "alien" then the URL will be "alien.txt". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/TextFile.js#L95](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/TextFile.js#L95)
>
> Since: 3.0.0

* * *

### texture [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#texture "Direct link to texture")

#### <instance> texture(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-texturekey-url-xhrsettings "Direct link to <instance> texture(key, [url], [xhrSettings])")

**Description:**

Adds a Compressed Texture file to the current load queue. This feature is WebGL only.

This method takes a key and a configuration object, which lists the different formats and files associated with them.

The texture format object should be ordered in GPU priority order, with IMG as the last entry.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
preload ()
{
    this.load.texture('yourPic', {
        ASTC: { type: 'PVR', textureURL: 'pic-astc-4x4.pvr' },
        PVRTC: { type: 'PVR', textureURL: 'pic-pvrtc-4bpp-rgba.pvr' },
        S3TC: { type: 'PVR', textureURL: 'pic-dxt5.pvr' },
        IMG: { textureURL: 'pic.png' }
    });
```

If you wish to load a texture atlas, provide the `atlasURL` property:

```javascript
preload ()
{
    const path = 'assets/compressed';

    this.load.texture('yourAtlas', {
        'ASTC': { type: 'PVR', textureURL: `${path}/textures-astc-4x4.pvr`, atlasURL: `${path}/textures.json` },
        'PVRTC': { type: 'PVR', textureURL: `${path}/textures-pvrtc-4bpp-rgba.pvr`, atlasURL: `${path}/textures-pvrtc-4bpp-rgba.json` },
        'S3TC': { type: 'PVR', textureURL: `${path}/textures-dxt5.pvr`, atlasURL: `${path}/textures-dxt5.json` },
        'IMG': { textureURL: `${path}/textures.png`, atlasURL: `${path}/textures.json` }
    });
}
```

If you wish to load a Multi Atlas, as exported from Texture Packer Pro, use the `multiAtlasURL` property instead:

```javascript
preload ()
{
    const path = 'assets/compressed';

    this.load.texture('yourAtlas', {
        'ASTC': { type: 'PVR', multiAtlasURL: `${path}/textures.json`, multiPath: `${path}` },
        'PVRTC': { type: 'PVR', multiAtlasURL: `${path}/textures-pvrtc-4bpp-rgba.json`, multiPath: `${path}` },
        'S3TC': { type: 'PVR', multiAtlasURL: `${path}/textures-dxt5.json`, multiPath: `${path}` },
        'IMG': { multiAtlasURL: `${path}/textures.json`, multiPath: `${path}` }
    });
}
```

When loading a Multi Atlas you do not need to specify the `textureURL` property as it will be read from the JSON file.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.texture({
    key: 'yourPic',
    url: {
        ASTC: { type: 'PVR', textureURL: 'pic-astc-4x4.pvr' },
        PVRTC: { type: 'PVR', textureURL: 'pic-pvrtc-4bpp-rgba.pvr' },
        S3TC: { type: 'PVR', textureURL: 'pic-dxt5.pvr' },
        IMG: { textureURL: 'pic.png' }
   }
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.CompressedTextureFileConfig` for more details.

The number of formats you provide to this function is up to you, but you should ensure you cover the primary platforms where appropriate.

The 'IMG' entry is a fallback to a JPG or PNG, should the browser be unable to load any of the other formats presented to this function. You should really always include this, although it is optional.

Phaser supports loading both the PVR and KTX container formats. Within those, it can parse the following texture compression formats:

ETC ETC1 ATC ASTC BPTC RGTC PVRTC S3TC S3TCSRGB

For more information about the benefits of compressed textures please see the following articles:

Texture Compression in 2020 ( [https://aras-p.info/blog/2020/12/08/Texture-Compression-in-2020/](https://aras-p.info/blog/2020/12/08/Texture-Compression-in-2020/)) Compressed GPU Texture Formats ( [https://themaister.net/blog/2020/08/12/compressed-gpu-texture-formats-a-review-and-compute-shader-decoders-part-1/](https://themaister.net/blog/2020/08/12/compressed-gpu-texture-formats-a-review-and-compute-shader-decoders-part-1/))

To create compressed texture files use a 3rd party application such as:

Texture Packer ( [https://www.codeandweb.com/texturepacker/tutorials/how-to-create-sprite-sheets-for-phaser3?utm\_source=ad&utm\_medium=banner&utm\_campaign=phaser-2018-10-16](https://www.codeandweb.com/texturepacker/tutorials/how-to-create-sprite-sheets-for-phaser3?utm_source=ad&utm_medium=banner&utm_campaign=phaser-2018-10-16)) PVRTexTool ( [https://developer.imaginationtech.com/pvrtextool/](https://developer.imaginationtech.com/pvrtextool/)) \- available for Windows, macOS and Linux. ASTC Encoder ( [https://github.com/ARM-software/astc-encoder](https://github.com/ARM-software/astc-encoder))

Compressed textures will appear darker than normal textures. This is because the Web uses sRGB colorspace, but compressed textures are sampled as linear colorspace. You must adjust your textures to be lighter before compression. See [https://imagemagick.org/Usage/color\_basics/#srgb](https://imagemagick.org/Usage/color_basics/#srgb) for more details. You can do this with ImageMagick ( [https://imagemagick.org/index.php](https://imagemagick.org/index.php)) using the following command:

`magick input.png -set colorspace RGB -colorspace sRGB output.png`

You must ensure that compressed textures meet the following standards for use in WebGL and Phaser:

- PVRTC must have a power-of-two width and height.

- MIPMaps, if present, must have a power-of-two width and height.

- S3TC, S3TCSRGB, RGTC, and BPTC must have width and height divisible by 4.

- ASTC must have a Channel Type of Unsigned Normalized Bytes (UNorm). In fact, all compressed textures should be UNorm, but ASTC presents many other options.


If in doubt, a power-of-two resolution is always a safe bet.

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this file's key. For example, if the prefix was `LEVEL1.` and the key was `Data` the final key will be `LEVEL1.Data` and this is what you would use to retrieve the text from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

Unlike other file loaders in Phaser, the URLs must include the file extension.

Note: The ability to load this type of file will only be available if the Compressed Texture File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.CompressedTextureFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#CompressedTextureFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.CompressedTextureFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#CompressedTextureFileConfig) > | No |
| url | [Phaser.Types.Loader.FileTypes.CompressedTextureFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#CompressedTextureFileConfig) | Yes | The compressed texture configuration object. Not required if passing a config object as the `key` parameter. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/CompressedTextureFile.js#L357](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/CompressedTextureFile.js#L357)
>
> Since: 3.60.0

* * *

### tilemapCSV [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#tilemapcsv "Direct link to tilemapCSV")

#### <instance> tilemapCSV(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-tilemapcsvkey-url-xhrsettings "Direct link to <instance> tilemapCSV(key, [url], [xhrSettings])")

**Description:**

Adds a CSV Tilemap file, or array of CSV files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.tilemapCSV('level1', 'maps/Level1.csv');
}
```

Tilemap CSV data can be created in a text editor, or a 3rd party app that exports as CSV.

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Tilemap Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Tilemap Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Tilemap Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.tilemapCSV({
    key: 'level1',
    url: 'maps/Level1.csv'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.TilemapCSVFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.tilemapCSV('level1', 'maps/Level1.csv');
// and later in your game ...
var map = this.make.tilemap({ key: 'level1' });
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Story` the final key will be `LEVEL1.Story` and this is what you would use to retrieve the text from the Tilemap Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "level" and no URL is given then the Loader will set the URL to be "level.csv". It will always add `.csv` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Tilemap CSV File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.TilemapCSVFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TilemapCSVFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.TilemapCSVFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TilemapCSVFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.csv`, i.e. if `key` was "alien" then the URL will be "alien.csv". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/TilemapCSVFile.js#L104](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/TilemapCSVFile.js#L104)
>
> Since: 3.0.0

* * *

### tilemapImpact [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#tilemapimpact "Direct link to tilemapImpact")

#### <instance> tilemapImpact(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-tilemapimpactkey-url-xhrsettings "Direct link to <instance> tilemapImpact(key, [url], [xhrSettings])")

**Description:**

Adds an Impact.js Tilemap file, or array of map files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.tilemapImpact('level1', 'maps/Level1.json');
}
```

Impact Tilemap data is created by the Impact.js Map Editor called Weltmeister.

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Tilemap Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Tilemap Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Tilemap Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.tilemapImpact({
    key: 'level1',
    url: 'maps/Level1.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.TilemapImpactFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.tilemapImpact('level1', 'maps/Level1.json');
// and later in your game ...
var map = this.make.tilemap({ key: 'level1' });
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Story` the final key will be `LEVEL1.Story` and this is what you would use to retrieve the text from the Tilemap Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "level" and no URL is given then the Loader will set the URL to be "level.json". It will always add `.json` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Tilemap Impact File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.TilemapImpactFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TilemapImpactFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.TilemapImpactFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TilemapImpactFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/TilemapImpactFile.js#L61](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/TilemapImpactFile.js#L61)
>
> Since: 3.7.0

* * *

### tilemapTiledJSON [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#tilemaptiledjson "Direct link to tilemapTiledJSON")

#### <instance> tilemapTiledJSON(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-tilemaptiledjsonkey-url-xhrsettings "Direct link to <instance> tilemapTiledJSON(key, [url], [xhrSettings])")

**Description:**

Adds a Tiled JSON Tilemap file, or array of map files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.tilemapTiledJSON('level1', 'maps/Level1.json');
}
```

The Tilemap data is created using the Tiled Map Editor and selecting JSON as the export format.

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Tilemap Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Tilemap Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Tilemap Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.tilemapTiledJSON({
    key: 'level1',
    url: 'maps/Level1.json'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.TilemapJSONFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.tilemapTiledJSON('level1', 'maps/Level1.json');
// and later in your game ...
var map = this.make.tilemap({ key: 'level1' });
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Story` the final key will be `LEVEL1.Story` and this is what you would use to retrieve the map from the Tilemap Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "level" and no URL is given then the Loader will set the URL to be "level.json". It will always add `.json` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the Tilemap JSON File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.TilemapJSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TilemapJSONFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.TilemapJSONFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#TilemapJSONFileConfig) > | No |
| url | object \| string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.json`, i.e. if `key` was "alien" then the URL will be "alien.json". Or, a well formed JSON object. |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/TilemapJSONFile.js#L61](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/TilemapJSONFile.js#L61)
>
> Since: 3.0.0

* * *

### unityAtlas [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#unityatlas "Direct link to unityAtlas")

#### <instance> unityAtlas(key, \[textureURL\], \[atlasURL\], \[textureXhrSettings\], \[atlasXhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-unityatlaskey-textureurl-atlasurl-texturexhrsettings-atlasxhrsettings "Direct link to <instance> unityAtlas(key, [textureURL], [atlasURL], [textureXhrSettings], [atlasXhrSettings])")

**Description:**

Adds a Unity YAML based Texture Atlas, or array of atlases, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.unityAtlas('mainmenu', 'images/MainMenu.png', 'images/MainMenu.meta');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

If you call this from outside of `preload` then you are responsible for starting the Loader afterwards and monitoring its events to know when it's safe to use the asset. Please see the Phaser.Loader.LoaderPlugin class for more details.

Phaser expects the atlas data to be provided in a YAML formatted text file as exported from Unity.

Phaser can load all common image types: png, jpg, gif and any other format the browser can natively handle.

The key must be a unique String. It is used to add the file to the global Texture Manager upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Texture Manager. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Texture Manager first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.unityAtlas({
    key: 'mainmenu',
    textureURL: 'images/MainMenu.png',
    atlasURL: 'images/MainMenu.meta'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.UnityAtlasFileConfig` for more details.

Once the atlas has finished loading you can use frames from it as textures for a Game Object by referencing its key:

```javascript
this.load.unityAtlas('mainmenu', 'images/MainMenu.png', 'images/MainMenu.meta');
// and later in your game ...
this.add.image(x, y, 'mainmenu', 'background');
```

To get a list of all available frames within an atlas please consult your Texture Atlas software.

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `MENU.` and the key was `Background` the final key will be `MENU.Background` and this is what you would use to retrieve the image from the Texture Manager.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "alien" and no URL is given then the Loader will set the URL to be "alien.png". It will always add `.png` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Phaser also supports the automatic loading of associated normal maps. If you have a normal map to go with this image, then you can specify it by providing an array as the `url` where the second element is the normal map:

```javascript
this.load.unityAtlas('mainmenu', [ 'images/MainMenu.png', 'images/MainMenu-n.png' ], 'images/MainMenu.meta');
```

Or, if you are using a config object use the `normalMap` property:

```javascript
this.load.unityAtlas({
    key: 'mainmenu',
    textureURL: 'images/MainMenu.png',
    normalMap: 'images/MainMenu-n.png',
    atlasURL: 'images/MainMenu.meta'
});
```

The normal map file is subject to the same conditions as the image file with regard to the path, baseURL, CORs and XHR Settings. Normal maps are a WebGL only feature.

Note: The ability to load this type of file will only be available if the Unity Atlas File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.UnityAtlasFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#UnityAtlasFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.UnityAtlasFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#UnityAtlasFileConfig) > | No |
| textureURL | string \| Array.<string> | Yes | The absolute or relative URL to load the texture image file from. If undefined or `null` it will be set to `<key>.png`, i.e. if `key` was "alien" then the URL will be "alien.png". |
| atlasURL | string | Yes | The absolute or relative URL to load the texture atlas data file from. If undefined or `null` it will be set to `<key>.txt`, i.e. if `key` was "alien" then the URL will be "alien.txt". |
| textureXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas image file. Used in replacement of the Loaders default XHR Settings. |
| atlasXhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object for the atlas data file. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/UnityAtlasFile.js#L107](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/UnityAtlasFile.js#L107)
>
> Since: 3.0.0

* * *

### update [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#update "Direct link to update")

#### <instance> update() [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-update "Direct link to <instance> update()")

**Description:**

Called automatically once per game step while the Loader is in the LOADING state. Checks whether there is capacity in the inflight queue and, if so, calls `checkLoadQueue` to move more files from the pending list into active loading.

> Source: [src/loader/LoaderPlugin.js#L964](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L964)
>
> Since: 3.10.0

* * *

### updateProgress [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#updateprogress "Direct link to updateProgress")

#### <instance> updateProgress() [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-updateprogress "Direct link to <instance> updateProgress()")

**Description:**

Called automatically during the load process. It updates the `progress` value and then emits a progress event, which you can use to display a loading bar in your game.

**Fires:** [Phaser.Loader.Events#event:PROGRESS](https://docs.phaser.io/api-documentation/event/loader-events#PROGRESS)

> Source: [src/loader/LoaderPlugin.js#L948](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L948)
>
> Since: 3.0.0

* * *

### video [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#video "Direct link to video")

#### <instance> video(key, \[urls\], \[noAudio\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-videokey-urls-noaudio "Direct link to <instance> video(key, [urls], [noAudio])")

**Description:**

Adds a Video file, or array of video files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.video('intro', [ 'video/level1.mp4', 'video/level1.webm', 'video/level1.mov' ]);
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global Video Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the Video Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the Video Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.video({
    key: 'intro',
    url: [ 'video/level1.mp4', 'video/level1.webm', 'video/level1.mov' ],
    noAudio: true
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.VideoFileConfig` for more details.

The URLs can be relative or absolute. If the URLs are relative the `Loader.baseURL` and `Loader.path` values will be prepended to them.

Due to different browsers supporting different video file types you should usually provide your video files in a variety of formats. mp4, mov and webm are the most common. If you provide an array of URLs then the Loader will determine which _one_ file to load based on browser support, starting with the first in the array and progressing to the end.

Unlike most asset-types, videos do not _need_ to be preloaded. You can create a Video Game Object and then call its `loadURL` method, to load a video at run-time, rather than in advance.

Note: The ability to load this type of file will only be available if the Video File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.VideoFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#VideoFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.VideoFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#VideoFileConfig) > | No |  |
| urls | string \| Array.<string> | [Phaser.Types.Loader.FileTypes.VideoFileURLConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#VideoFileURLConfig) | Array.< [Phaser.Types.Loader.FileTypes.VideoFileURLConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#VideoFileURLConfig) > | Yes |
| noAudio | boolean | Yes | false | Does the video have an audio track? If not you can enable auto-playing on it. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/VideoFile.js#L117](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/VideoFile.js#L117)
>
> Since: 3.20.0

* * *

### xml [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#xml "Direct link to xml")

#### <instance> xml(key, \[url\], \[xhrSettings\]) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#instance-xmlkey-url-xhrsettings "Direct link to <instance> xml(key, [url], [xhrSettings])")

**Description:**

Adds an XML file, or array of XML files, to the current load queue.

You can call this method from within your Scene's `preload`, along with any other files you wish to load:

```javascript
function preload ()
{
    this.load.xml('wavedata', 'files/AlienWaveData.xml');
}
```

The file is **not** loaded right away. It is added to a queue ready to be loaded either when the loader starts, or if it's already running, when the next free load slot becomes available. This happens automatically if you are calling this from within the Scene's `preload` method, or a related callback. Because the file is queued it means you cannot use the file immediately after calling this method, but must wait for the file to complete. The typical flow for a Phaser Scene is that you load assets in the Scene's `preload` method and then when the Scene's `create` method is called you are guaranteed that all of those assets are ready for use and have been loaded.

The key must be a unique String. It is used to add the file to the global XML Cache upon a successful load. The key should be unique both in terms of files being loaded and files already present in the XML Cache. Loading a file using a key that is already taken will result in a warning. If you wish to replace an existing file then remove it from the XML Cache first, before loading a new one.

Instead of passing arguments you can pass a configuration object, such as:

```javascript
this.load.xml({
    key: 'wavedata',
    url: 'files/AlienWaveData.xml'
});
```

See the documentation for `Phaser.Types.Loader.FileTypes.XMLFileConfig` for more details.

Once the file has finished loading you can access it from its Cache using its key:

```javascript
this.load.xml('wavedata', 'files/AlienWaveData.xml');
// and later in your game ...
var data = this.cache.xml.get('wavedata');
```

If you have specified a prefix in the loader, via `Loader.setPrefix` then this value will be prepended to this files key. For example, if the prefix was `LEVEL1.` and the key was `Waves` the final key will be `LEVEL1.Waves` and this is what you would use to retrieve the text from the XML Cache.

The URL can be relative or absolute. If the URL is relative the `Loader.baseURL` and `Loader.path` values will be prepended to it.

If the URL isn't specified the Loader will take the key and create a filename from that. For example if the key is "data" and no URL is given then the Loader will set the URL to be "data.xml". It will always add `.xml` as the extension, although this can be overridden if using an object instead of method arguments. If you do not desire this action then provide a URL.

Note: The ability to load this type of file will only be available if the XML File type has been built into Phaser. It is available in the default build but can be excluded from custom builds.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Types.Loader.FileTypes.XMLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#XMLFileConfig) | Array.< [Phaser.Types.Loader.FileTypes.XMLFileConfig](https://docs.phaser.io/api-documentation/typedef/types-loader-filetypes#XMLFileConfig) > | No |
| url | string | Yes | The absolute or relative URL to load this file from. If undefined or `null` it will be set to `<key>.xml`, i.e. if `key` was "alien" then the URL will be "alien.xml". |
| xhrSettings | [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader#XHRSettingsObject) | Yes | An XHR Settings configuration object. Used in replacement of the Loaders default XHR Settings. |

**Returns:** [Phaser.Loader.LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin) \- The Loader instance.

**Fires:** [Phaser.Loader.Events#event:ADD](https://docs.phaser.io/api-documentation/event/loader-events#ADD)

> Source: [src/loader/filetypes/XMLFile.js#L96](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/filetypes/XMLFile.js#L96)
>
> Since: 3.0.0

* * *

## Public Members [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#public-members "Direct link to Public Members")

### baseURL [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#baseurl "Direct link to baseURL")

#### baseURL: string [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#baseurl-string "Direct link to baseURL: string")

**Description:**

If you want to append a URL before the path of any asset you can set this here.

Useful if allowing the asset base url to be configured outside of the game code.

If you set this property directly then it _must_ end with a "/". Alternatively, call `setBaseURL()` and it'll do it for you.

> Source: [src/loader/LoaderPlugin.js#L153](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L153)
>
> Since: 3.0.0

* * *

### cacheManager [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#cachemanager "Direct link to cacheManager")

#### cacheManager: [Phaser.Cache.CacheManager](https://docs.phaser.io/api-documentation/class/cache-cachemanager) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#cachemanager-phasercachecachemanager "Direct link to cachemanager-phasercachecachemanager")

**Description:**

A reference to the global Cache Manager.

> Source: [src/loader/LoaderPlugin.js#L84](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L84)
>
> Since: 3.7.0

* * *

### crossOrigin [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#crossorigin "Direct link to crossOrigin")

#### crossOrigin: string [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#crossorigin-string "Direct link to crossOrigin: string")

**Description:**

The crossOrigin value applied to loaded images. Very often this needs to be set to 'anonymous'.

> Source: [src/loader/LoaderPlugin.js#L202](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L202)
>
> Since: 3.0.0

* * *

### imageLoadType [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#imageloadtype "Direct link to imageLoadType")

#### imageLoadType: string [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#imageloadtype-string "Direct link to imageLoadType: string")

**Description:**

Optional load type for image files. `XHR` is the default. Set to `HTMLImageElement` to load images using the Image tag instead.

> Source: [src/loader/LoaderPlugin.js#L211](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L211)
>
> Since: 3.60.0

* * *

### inflight [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#inflight "Direct link to inflight")

#### inflight: Set.< [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) > [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#inflight-setphaserloaderfile "Direct link to inflight-setphaserloaderfile")

**Description:**

Files are stored in this Set while they're in the process of being loaded.

Upon a successful load they are moved to the `queue` Set.

By the end of the load process this Set will be empty.

> Source: [src/loader/LoaderPlugin.js#L269](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L269)
>
> Since: 3.0.0

* * *

### list [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#list "Direct link to list")

#### list: Set.< [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) > [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#list-setphaserloaderfile "Direct link to list-setphaserloaderfile")

**Description:**

Files are placed in this Set when they're added to the Loader via `addFile`.

They are moved to the `inflight` Set when they start loading, and assuming a successful load, to the `queue` Set for further processing.

By the end of the load process this Set will be empty.

> Source: [src/loader/LoaderPlugin.js#L255](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L255)
>
> Since: 3.0.0

* * *

### localSchemes [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#localschemes "Direct link to localSchemes")

#### localSchemes: Array.<string> [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#localschemes-arraystring "Direct link to localSchemes: Array.<string>")

**Description:**

An array of all schemes that the Loader considers as being 'local'.

This is populated by the `Phaser.Core.Config#loaderLocalScheme` game configuration setting and defaults to `[ 'file://', 'capacitor://' ]`. Additional local schemes can be added to this array as needed.

> Source: [src/loader/LoaderPlugin.js#L220](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L220)
>
> Since: 3.60.0

* * *

### maxParallelDownloads [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#maxparalleldownloads "Direct link to maxParallelDownloads")

#### maxParallelDownloads: number [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#maxparalleldownloads-number "Direct link to maxParallelDownloads: number")

**Description:**

The number of concurrent / parallel resources to try and fetch at once.

Old browsers limit 6 requests per domain; modern ones, especially those with HTTP/2 don't limit it at all.

The default is 32 but you can change this in your Game Config, or by changing this property before the Loader starts.

> Source: [src/loader/LoaderPlugin.js#L173](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L173)
>
> Since: 3.0.0

* * *

### maxRetries [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#maxretries "Direct link to maxRetries")

#### maxRetries: number [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#maxretries-number "Direct link to maxRetries: number")

**Description:**

The number of times to retry loading a single file before it fails.

This property is read by the `File` object when it is created and set to the internal property of the same name. It's not used by the Loader itself.

You can set this value via the Game Config, or you can adjust this property at any point after the Loader has started. However, it will not apply to files that have already been added to the Loader, only those added after this value is changed.

> Source: [src/loader/LoaderPlugin.js#L349](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L349)
>
> Since: 3.85.0

* * *

### path [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#path "Direct link to path")

#### path: string [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#path-string "Direct link to path: string")

**Description:**

The value of `path`, if set, is placed before any _relative_ file path given. For example:

```javascript
this.load.path = "images/sprites/";
this.load.image("ball", "ball.png");
this.load.image("tree", "level1/oaktree.png");
this.load.image("boom", "[http://server.com/explode.png](http://server.com/explode.png)");
```

Would load the `ball` file from `images/sprites/ball.png` and the tree from `images/sprites/level1/oaktree.png` but the file `boom` would load from the URL given as it's an absolute URL.

Please note that the path is added before the filename but _after_ the baseURL (if set.)

If you set this property directly then it _must_ end with a "/". Alternatively, call `setPath()` and it'll do it for you.

> Source: [src/loader/LoaderPlugin.js#L128](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L128)
>
> Since: 3.0.0

* * *

### prefix [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#prefix "Direct link to prefix")

#### prefix: string [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#prefix-string "Direct link to prefix: string")

**Description:**

An optional prefix that is automatically prepended to the start of every file key. If prefix was `MENU.` and you load an image with the key 'Background' the resulting key would be `MENU.Background`. You can set this directly, or call `Loader.setPrefix()`. It will then affect every file added to the Loader from that point on. It does _not_ change any file already in the load queue.

> Source: [src/loader/LoaderPlugin.js#L115](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L115)
>
> Since: 3.7.0

* * *

### progress [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#progress "Direct link to progress")

#### progress: number [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#progress-number "Direct link to progress: number")

**Description:**

The progress of the current load queue, as a float value between 0 and 1. This is updated automatically as files complete loading. Note that it is possible for this value to go down again if you add content to the current load queue during a load.

> Source: [src/loader/LoaderPlugin.js#L243](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L243)
>
> Since: 3.0.0

* * *

### queue [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#queue "Direct link to queue")

#### queue: Set.< [Phaser.Loader.File](https://docs.phaser.io/api-documentation/class/loader-file) > [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#queue-setphaserloaderfile "Direct link to queue-setphaserloaderfile")

**Description:**

Files are stored in this Set while they're being processed.

If the process is successful they are moved to their final destination, which could be a Cache or the Texture Manager.

At the end of the load process this Set will be empty.

> Source: [src/loader/LoaderPlugin.js#L282](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L282)
>
> Since: 3.0.0

* * *

### scene [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#scene "Direct link to scene")

#### scene: [Phaser.Scene](https://docs.phaser.io/api-documentation/class/scene) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#scene-phaserscene "Direct link to scene-phaserscene")

**Description:**

The Scene which owns this Loader instance.

> Source: [src/loader/LoaderPlugin.js#L66](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L66)
>
> Since: 3.0.0

* * *

### sceneManager [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#scenemanager "Direct link to sceneManager")

#### sceneManager: [Phaser.Scenes.SceneManager](https://docs.phaser.io/api-documentation/class/scenes-scenemanager) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#scenemanager-phaserscenesscenemanager "Direct link to scenemanager-phaserscenesscenemanager")

**Description:**

A reference to the global Scene Manager.

**Access:** protected

> Source: [src/loader/LoaderPlugin.js#L102](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L102)
>
> Since: 3.16.0

* * *

### state [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#state "Direct link to state")

#### state: number [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#state-number "Direct link to state: number")

**Description:**

The current state of the Loader.

> Source: [src/loader/LoaderPlugin.js#L329](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L329)
>
> Since: 3.0.0

* * *

### systems [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#systems "Direct link to systems")

#### systems: [Phaser.Scenes.Systems](https://docs.phaser.io/api-documentation/class/scenes-systems) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#systems-phaserscenessystems "Direct link to systems-phaserscenessystems")

**Description:**

A reference to the Scene Systems.

> Source: [src/loader/LoaderPlugin.js#L75](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L75)
>
> Since: 3.0.0

* * *

### textureManager [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#texturemanager "Direct link to textureManager")

#### textureManager: [Phaser.Textures.TextureManager](https://docs.phaser.io/api-documentation/class/textures-texturemanager) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#texturemanager-phasertexturestexturemanager "Direct link to texturemanager-phasertexturestexturemanager")

**Description:**

A reference to the global Texture Manager.

> Source: [src/loader/LoaderPlugin.js#L93](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L93)
>
> Since: 3.7.0

* * *

### totalComplete [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#totalcomplete "Direct link to totalComplete")

#### totalComplete: number [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#totalcomplete-number "Direct link to totalComplete: number")

**Description:**

The total number of files that successfully loaded during the most recent load. This value is reset when you call `Loader.start`.

> Source: [src/loader/LoaderPlugin.js#L318](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L318)
>
> Since: 3.7.0

* * *

### totalFailed [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#totalfailed "Direct link to totalFailed")

#### totalFailed: number [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#totalfailed-number "Direct link to totalFailed: number")

**Description:**

The total number of files that failed to load during the most recent load. This value is reset when you call `Loader.start`.

> Source: [src/loader/LoaderPlugin.js#L307](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L307)
>
> Since: 3.7.0

* * *

### totalToLoad [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#totaltoload "Direct link to totalToLoad")

#### totalToLoad: number [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#totaltoload-number "Direct link to totalToLoad: number")

**Description:**

The total number of files to load. It may not always be accurate because you may add to the Loader during the process of loading, especially if you load a Pack File. Therefore this value can change, but in most cases remains static.

> Source: [src/loader/LoaderPlugin.js#L232](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L232)
>
> Since: 3.0.0

* * *

### xhr [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#xhr "Direct link to xhr")

#### xhr: [Phaser.Types.Loader.XHRSettingsObject](https://docs.phaser.io/api-documentation/typedef/types-loader\#XHRSettingsObject) [​](https://docs.phaser.io/api-documentation/class/loader-loaderplugin\#xhr-phasertypesloaderxhrsettingsobject "Direct link to xhr-phasertypesloaderxhrsettingsobject")

**Description:**

XHR-specific global settings (can be overridden on a per-file basis)

> Source: [src/loader/LoaderPlugin.js#L186](https://github.com/phaserjs/phaser/blob/v4.1.0/src/loader/LoaderPlugin.js#L186)
>
> Since: 3.0.0

* * *

````

- [Inherited Methods](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#inherited-methods)
- [Public Methods](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#public-methods)
  - [addFile](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#addfile)
  - [addPack](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#addpack)
  - [animation](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#animation)
  - [aseprite](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#aseprite)
  - [atlas](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#atlas)
  - [atlasPCT](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#atlaspct)
  - [atlasXML](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#atlasxml)
  - [audio](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#audio)
  - [audioSprite](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#audiosprite)
  - [binary](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#binary)
  - [bitmapFont](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#bitmapfont)
  - [css](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#css)
  - [fileProcessComplete](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#fileprocesscomplete)
  - [flagForRemoval](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#flagforremoval)
  - [font](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#font)
  - [glsl](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#glsl)
  - [html](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#html)
  - [htmlTexture](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#htmltexture)
  - [image](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#image)
  - [isLoading](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#isloading)
  - [isReady](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#isready)
  - [json](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#json)
  - [keyExists](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#keyexists)
  - [loadComplete](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#loadcomplete)
  - [multiatlas](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#multiatlas)
  - [nextFile](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#nextfile)
  - [pack](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#pack)
  - [plugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#plugin)
  - [removePack](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#removepack)
  - [reset](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#reset)
  - [save](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#save)
  - [saveJSON](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#savejson)
  - [sceneFile](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#scenefile)
  - [scenePlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#sceneplugin)
  - [script](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#script)
  - [scripts](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#scripts)
  - [setBaseURL](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#setbaseurl)
  - [setCORS](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#setcors)
  - [setPath](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#setpath)
  - [setPrefix](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#setprefix)
  - [spritesheet](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#spritesheet)
  - [start](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#start)
  - [svg](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#svg)
  - [text](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#text)
  - [texture](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#texture)
  - [tilemapCSV](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#tilemapcsv)
  - [tilemapImpact](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#tilemapimpact)
  - [tilemapTiledJSON](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#tilemaptiledjson)
  - [unityAtlas](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#unityatlas)
  - [update](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#update)
  - [updateProgress](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#updateprogress)
  - [video](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#video)
  - [xml](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#xml)
- [Public Members](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#public-members)
  - [baseURL](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#baseurl)
  - [cacheManager](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#cachemanager)
  - [crossOrigin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#crossorigin)
  - [imageLoadType](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#imageloadtype)
  - [inflight](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#inflight)
  - [list](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#list)
  - [localSchemes](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#localschemes)
  - [maxParallelDownloads](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#maxparalleldownloads)
  - [maxRetries](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#maxretries)
  - [path](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#path)
  - [prefix](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#prefix)
  - [progress](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#progress)
  - [queue](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#queue)
  - [scene](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#scene)
  - [sceneManager](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#scenemanager)
  - [state](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#state)
  - [systems](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#systems)
  - [textureManager](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#texturemanager)
  - [totalComplete](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#totalcomplete)
  - [totalFailed](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#totalfailed)
  - [totalToLoad](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#totaltoload)
  - [xhr](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#xhr)