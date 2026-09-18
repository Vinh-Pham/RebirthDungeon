<!-- Reference material, not instructions. -->
Source: https://docs.phaser.io/api-documentation/class/animations-animationmanager
Retrieved: 2026-09-18T01:55:16.955696+00:00

[Skip to main content](https://docs.phaser.io/api-documentation/class/animations-animationmanager#__docusaurus_skipToContent_fallback)

Version: Phaser v4.1.0

On this page

The Animation Manager is a global system responsible for defining, storing, and managing all animations in your Phaser game. It is a singleton owned by the Game instance, meaning it persists across all Scenes and is not tied to any single Scene's lifecycle.

You create animations once via `this.anims.create()` (or `this.anims.createFromAseprite()` for Aseprite exports), and those animations are then available to every Sprite or Game Object that has an Animation Component, across every Scene.

The Animation Manager handles frame sequencing, timing, and playback configuration. Individual Game Objects each maintain their own playback state (current frame, repeat count, etc.) via their AnimationState component, but the frame data and timing definitions live here.

You can access the Animation Manager from any Scene via `this.anims`.

**Constructor**

`new AnimationManager(game)`

**Parameters**

| name | type | optional | description |
| --- | --- | --- | --- |
| game | [Phaser.Game](https://docs.phaser.io/api-documentation/class/game) | No | A reference to the Phaser.Game instance. |

* * *

**Scope**: static

**Extends**

> [Phaser.Events.EventEmitter](https://docs.phaser.io/api-documentation/class/events-eventemitter)

> Source: [src/animations/AnimationManager.js#L19](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L19)
>
> Since: 3.0.0

## Public Members [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#public-members "Direct link to Public Members")

### anims [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#anims "Direct link to anims")

#### anims: Phaser.Structs.Map.<string, [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) > [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#anims-phaserstructsmapstring-phaseranimationsanimation "Direct link to anims-phaserstructsmapstring-phaseranimationsanimation")

**Description:**

The Animations registered in the Animation Manager.

This map should be modified with the [#add](https://docs.phaser.io/api-documentation/class/animations-animationmanager#add) and [#create](https://docs.phaser.io/api-documentation/class/animations-animationmanager#create) methods of the Animation Manager.

**Access:** protected

> Source: [src/animations/AnimationManager.js#L85](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L85)
>
> Since: 3.0.0

* * *

### game [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#game "Direct link to game")

#### game: [Phaser.Game](https://docs.phaser.io/api-documentation/class/game) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#game-phasergame "Direct link to game-phasergame")

**Description:**

A reference to the Phaser.Game instance.

**Access:** protected

> Source: [src/animations/AnimationManager.js#L53](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L53)
>
> Since: 3.0.0

* * *

### globalTimeScale [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#globaltimescale "Direct link to globalTimeScale")

#### globalTimeScale: number [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#globaltimescale-number "Direct link to globalTimeScale: number")

**Description:**

The global time scale of the Animation Manager.

This scales the time delta between two frames, thus influencing the speed of time for the Animation Manager.

> Source: [src/animations/AnimationManager.js#L73](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L73)
>
> Since: 3.0.0

* * *

### mixes [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#mixes "Direct link to mixes")

#### mixes: Phaser.Structs.Map.<string, [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) > [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#mixes-phaserstructsmapstring-phaseranimationsanimation "Direct link to mixes-phaserstructsmapstring-phaseranimationsanimation")

**Description:**

A list of animation mix times.

See the [#setMix](https://docs.phaser.io/api-documentation/class/animations-animationmanager#setMix) method for more details.

> Source: [src/animations/AnimationManager.js#L97](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L97)
>
> Since: 3.50.0

* * *

### name [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#name "Direct link to name")

#### name: string [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#name-string "Direct link to name: string")

**Description:**

The name of this Animation Manager.

> Source: [src/animations/AnimationManager.js#L118](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L118)
>
> Since: 3.0.0

* * *

### paused [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#paused "Direct link to paused")

#### paused: boolean [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#paused-boolean "Direct link to paused: boolean")

**Description:**

Whether the Animation Manager is paused along with all of its Animations.

> Source: [src/animations/AnimationManager.js#L108](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L108)
>
> Since: 3.0.0

* * *

### textureManager [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#texturemanager "Direct link to textureManager")

#### textureManager: [Phaser.Textures.TextureManager](https://docs.phaser.io/api-documentation/class/textures-texturemanager) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#texturemanager-phasertexturestexturemanager "Direct link to texturemanager-phasertexturestexturemanager")

**Description:**

A reference to the Texture Manager.

**Access:** protected

> Source: [src/animations/AnimationManager.js#L63](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L63)
>
> Since: 3.0.0

* * *

## Inherited Methods [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#inherited-methods "Direct link to Inherited Methods")

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
- [shutdown](https://docs.phaser.io/api-documentation/class/events-eventemitter#shutdown)

* * *

## Public Methods [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#public-methods "Direct link to Public Methods")

### add [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#add "Direct link to add")

#### <instance> add(key, animation) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-addkey-animation "Direct link to <instance> add(key, animation)")

**Description:**

Adds an existing Animation to the Animation Manager.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | The key under which the Animation should be added. The Animation will be updated with it. Must be unique. |
| animation | [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | No | The Animation which should be added to the Animation Manager. |

**Returns:** [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \- This Animation Manager.

**Fires:** [Phaser.Animations.Events#event:ADD\_ANIMATION](https://docs.phaser.io/api-documentation/event/animations-events#ADD_ANIMATION)

> Source: [src/animations/AnimationManager.js#L282](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L282)
>
> Since: 3.0.0

* * *

### addMix [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#addmix "Direct link to addMix")

#### <instance> addMix(animA, animB, delay) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-addmixanima-animb-delay "Direct link to <instance> addMix(animA, animB, delay)")

**Description:**

Adds a mix between two animations.

Mixing allows you to specify a unique delay between a pairing of animations.

When playing Animation A on a Game Object, if you then play Animation B, and a mix exists, it will wait for the specified delay to be over before playing Animation B.

This allows you to customise smoothing between different types of animation, such as blending between an idle and a walk state, or a running and a firing state.

Note that mixing is only applied if you use the `Sprite.play` method. If you opt to use `playAfterRepeat` or `playAfterDelay` instead, those will take priority and the mix delay will not be used.

To update an existing mix, just call this method with the new delay.

To remove a mix pairing, see the `removeMix` method.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| animA | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | No | The string-based key, or instance of, Animation A. |
| animB | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | No | The string-based key, or instance of, Animation B. |
| delay | number | No | The delay, in milliseconds, to wait when transitioning from Animation A to B. |

**Returns:** [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \- This Animation Manager.

> Source: [src/animations/AnimationManager.js#L144](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L144)
>
> Since: 3.50.0

* * *

### boot [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#boot "Direct link to boot")

#### <instance> boot() [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-boot "Direct link to <instance> boot()")

**Description:**

Registers event listeners after the Game boots.

> Source: [src/animations/AnimationManager.js#L130](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L130)
>
> Since: 3.0.0

* * *

### create [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#create "Direct link to create")

#### <instance> create(config) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-createconfig "Direct link to <instance> create(config)")

**Description:**

Creates a new Animation and adds it to the Animation Manager.

Animations are global. Once created, you can use them in any Scene in your game. They are not Scene specific.

If an invalid key is given this method will return `false`.

If you pass the key of an animation that already exists in the Animation Manager, that animation will be returned.

A brand new animation is only created if the key is valid and not already in use.

If you wish to re-use an existing key, call `AnimationManager.remove` first, then this method.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| config | [Phaser.Types.Animations.Animation](https://docs.phaser.io/api-documentation/typedef/types-animations#Animation) | No | The configuration settings for the Animation. |

**Returns:** [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation), false - The Animation that was created, or `false` if the key is already in use.

**Fires:** [Phaser.Animations.Events#event:ADD\_ANIMATION](https://docs.phaser.io/api-documentation/event/animations-events#ADD_ANIMATION)

> Source: [src/animations/AnimationManager.js#L498](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L498)
>
> Since: 3.0.0

* * *

### createFromAseprite [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#createfromaseprite "Direct link to createFromAseprite")

#### <instance> createFromAseprite(key, \[tags\], \[target\]) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-createfromasepritekey-tags-target "Direct link to <instance> createFromAseprite(key, [tags], [target])")

**Description:**

Create one, or more animations from a loaded Aseprite JSON file.

Aseprite is a powerful animated sprite editor and pixel art tool.

You can find more details at [https://www.aseprite.org/](https://www.aseprite.org/)

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

This will export a png and json file which you can load using the Aseprite Loader, i.e.:

```javascript
function preload ()
{
    this.load.path = 'assets/animations/aseprite/';
    this.load.aseprite('paladin', 'paladin.png', 'paladin.json');
}
```

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

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | The key of the loaded Aseprite atlas. It must have been loaded prior to calling this method. |
| tags | Array.<string> | Yes | An array of Tag names. If provided, only animations found in this array will be created. |
| target | [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \| [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) | Yes | Create the animations on this target Sprite. If not given, they will be created globally in this Animation Manager. |

**Returns:** Array.< [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) \> \- An array of Animation instances that were successfully created.

> Source: [src/animations/AnimationManager.js#L329](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L329)
>
> Since: 3.50.0

* * *

### destroy [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#destroy "Direct link to destroy")

#### <instance> destroy() [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-destroy "Direct link to <instance> destroy()")

**Description:**

Destroy this Animation Manager and clean up animation definitions and references to other objects. This method should not be called directly. It will be called automatically as a response to a `destroy` event from the Phaser.Game instance.

**Overrides:** Phaser.Events.EventEmitter#destroy

> Source: [src/animations/AnimationManager.js#L1056](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L1056)
>
> Since: 3.0.0

* * *

### exists [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#exists "Direct link to exists")

#### <instance> exists(key) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-existskey "Direct link to <instance> exists(key)")

**Description:**

Checks to see if the given key is already in use within the Animation Manager or not.

Animations are global. Keys created in one scene can be used from any other Scene in your game. They are not Scene specific.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | The key of the Animation to check. |

**Returns:** boolean - `true` if the Animation already exists in the Animation Manager, or `false` if the key is available.

> Source: [src/animations/AnimationManager.js#L312](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L312)
>
> Since: 3.16.0

* * *

### fromJSON [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#fromjson "Direct link to fromJSON")

#### <instance> fromJSON(data, \[clearCurrentAnimations\]) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-fromjsondata-clearcurrentanimations "Direct link to <instance> fromJSON(data, [clearCurrentAnimations])")

**Description:**

Loads this Animation Manager's Animations and settings from a JSON object.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| data | string \| [Phaser.Types.Animations.JSONAnimations](https://docs.phaser.io/api-documentation/typedef/types-animations#JSONAnimations) | [Phaser.Types.Animations.JSONAnimation](https://docs.phaser.io/api-documentation/typedef/types-animations#JSONAnimation) | No |  |
| clearCurrentAnimations | boolean | Yes | false | If set to `true`, the current animations will be removed (`anims.clear()`). If set to `false` (default), the animations in `data` will be added. |

**Returns:** Array.< [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) \> \- An array containing all of the Animation objects that were created as a result of this call.

> Source: [src/animations/AnimationManager.js#L546](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L546)
>
> Since: 3.0.0

* * *

### generateFrameNames [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#generateframenames "Direct link to generateFrameNames")

#### <instance> generateFrameNames(key, \[config\]) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-generateframenameskey-config "Direct link to <instance> generateFrameNames(key, [config])")

**Description:**

Generate an array of [Phaser.Types.Animations.AnimationFrame](https://docs.phaser.io/api-documentation/typedef/types-animations#AnimationFrame) objects from a texture key and configuration object.

Generates objects with string based frame names, as configured by the given [Phaser.Types.Animations.GenerateFrameNames](https://docs.phaser.io/api-documentation/typedef/types-animations#GenerateFrameNames).

It's a helper method, designed to make it easier for you to extract all of the frame names from texture atlases.

If you're working with a sprite sheet, see the `generateFrameNumbers` method instead.

Example:

If you have a texture atlases loaded called `gems` and it contains 6 frames called `ruby_0001`, `ruby_0002`, and so on, then you can call this method using: `this.anims.generateFrameNames('gems', { prefix: 'ruby_', start: 1, end: 6, zeroPad: 4 })`.

The `end` value tells it to select frames 1 through 6, incrementally numbered, all starting with the prefix `ruby_`. The `zeroPad` value tells it how many zeroes pad out the numbers. To create an animation using this method, you can do:

```javascript
this.anims.create({
  key: 'ruby',
  repeat: -1,
  frames: this.anims.generateFrameNames('gems', {
    prefix: 'ruby_',
    end: 6,
    zeroPad: 4
  })
});
```

Please see the animation examples for further details.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | The key for the texture containing the animation frames. |
| config | [Phaser.Types.Animations.GenerateFrameNames](https://docs.phaser.io/api-documentation/typedef/types-animations#GenerateFrameNames) | Yes | The configuration object for the animation frame names. |

**Returns:** Array.< [Phaser.Types.Animations.AnimationFrame](https://docs.phaser.io/api-documentation/typedef/types-animations#AnimationFrame) \> \- The array of [Phaser.Types.Animations.AnimationFrame](https://docs.phaser.io/api-documentation/typedef/types-animations#AnimationFrame) objects.

> Source: [src/animations/AnimationManager.js#L595](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L595)
>
> Since: 3.0.0

* * *

### generateFrameNumbers [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#generateframenumbers "Direct link to generateFrameNumbers")

#### <instance> generateFrameNumbers(key, \[config\]) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-generateframenumberskey-config "Direct link to <instance> generateFrameNumbers(key, [config])")

**Description:**

Generate an array of [Phaser.Types.Animations.AnimationFrame](https://docs.phaser.io/api-documentation/typedef/types-animations#AnimationFrame) objects from a texture key and configuration object.

Generates objects with numbered frame names, as configured by the given [Phaser.Types.Animations.GenerateFrameNumbers](https://docs.phaser.io/api-documentation/typedef/types-animations#GenerateFrameNumbers).

If you're working with a texture atlas, see the `generateFrameNames` method instead.

It's a helper method, designed to make it easier for you to extract frames from sprite sheets.

Example:

If you have a sprite sheet loaded called `explosion` and it contains 12 frames, then you can call this method using:

`this.anims.generateFrameNumbers('explosion', { start: 0, end: 11 })`.

The `end` value of 11 tells it to stop after the 12th frame has been added, because it started at zero.

To create an animation using this method, you can do:

```javascript
this.anims.create({
  key: 'boom',
  frames: this.anims.generateFrameNumbers('explosion', {
    start: 0,
    end: 11
  })
});
```

Note that `start` is optional and you don't need to include it if the animation starts from frame 0.

To specify an animation in reverse, swap the `start` and `end` values.

If the frames are not sequential, you may pass an array of frame numbers instead, for example:

`this.anims.generateFrameNumbers('explosion', { frames: [ 0, 1, 2, 1, 2, 3, 4, 0, 1, 2 ] })`

Please see the animation examples and `GenerateFrameNumbers` config docs for further details.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | The key for the texture containing the animation frames. |
| config | [Phaser.Types.Animations.GenerateFrameNumbers](https://docs.phaser.io/api-documentation/typedef/types-animations#GenerateFrameNumbers) | Yes | The configuration object for the animation frames. |

**Returns:** Array.< [Phaser.Types.Animations.AnimationFrame](https://docs.phaser.io/api-documentation/typedef/types-animations#AnimationFrame) \> \- The array of [Phaser.Types.Animations.AnimationFrame](https://docs.phaser.io/api-documentation/typedef/types-animations#AnimationFrame) objects.

> Source: [src/animations/AnimationManager.js#L695](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L695)
>
> Since: 3.0.0

* * *

### get [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#get "Direct link to get")

#### <instance> get(key) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-getkey "Direct link to <instance> get(key)")

**Description:**

Retrieves an Animation from the Animation Manager by its key.

Returns `undefined` if no Animation with the given key exists.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | The key of the Animation to retrieve. |

**Returns:** [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) \- The Animation.

> Source: [src/animations/AnimationManager.js#L799](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L799)
>
> Since: 3.0.0

* * *

### getAnimsFromTexture [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#getanimsfromtexture "Direct link to getAnimsFromTexture")

#### <instance> getAnimsFromTexture(key) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-getanimsfromtexturekey "Direct link to <instance> getAnimsFromTexture(key)")

**Description:**

Returns an array of all Animation keys that are using the given Texture. Only Animations that have at least one AnimationFrame entry using this texture will be included in the result.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Textures.Texture](https://docs.phaser.io/api-documentation/class/textures-texture) | [Phaser.Textures.Frame](https://docs.phaser.io/api-documentation/class/textures-frame) | No |

**Returns:** Array.<string> - An array of Animation keys that feature the given Texture.

> Source: [src/animations/AnimationManager.js#L816](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L816)
>
> Since: 3.60.0

* * *

### getMix [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#getmix "Direct link to getMix")

#### <instance> getMix(animA, animB) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-getmixanima-animb "Direct link to <instance> getMix(animA, animB)")

**Description:**

Returns the mix delay between two animations.

If no mix has been set up, this method will return zero.

If you wish to create, or update, a new mix, call the `addMix` method. If you wish to remove a mix, call the `removeMix` method.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| animA | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | No | The string-based key, or instance of, Animation A. |
| animB | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | No | The string-based key, or instance of, Animation B. |

**Returns:** number - The mix duration, or zero if no mix exists.

> Source: [src/animations/AnimationManager.js#L247](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L247)
>
> Since: 3.50.0

* * *

### pauseAll [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#pauseall "Direct link to pauseAll")

#### <instance> pauseAll() [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-pauseall "Direct link to <instance> pauseAll()")

**Description:**

Pauses all animations in the Animation Manager by setting the `paused` flag to `true`. This affects all Game Objects that are playing animations globally. Has no effect if the Animation Manager is already paused.

**Returns:** [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \- This Animation Manager.

**Fires:** [Phaser.Animations.Events#event:PAUSE\_ALL](https://docs.phaser.io/api-documentation/event/animations-events#PAUSE_ALL)

> Source: [src/animations/AnimationManager.js#L856](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L856)
>
> Since: 3.0.0

* * *

### play [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#play "Direct link to play")

#### <instance> play(key, children) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-playkey-children "Direct link to <instance> play(key, children)")

**Description:**

Play an animation on the given Game Objects that have an Animation Component.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | [Phaser.Types.Animations.PlayAnimationConfig](https://docs.phaser.io/api-documentation/typedef/types-animations#PlayAnimationConfig) | No |
| children | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) \| Array.< [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) > | No | An array of Game Objects to play the animation on. They must have an Animation Component. |

**Returns:** [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \- This Animation Manager.

> Source: [src/animations/AnimationManager.js#L879](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L879)
>
> Since: 3.0.0

* * *

### remove [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#remove "Direct link to remove")

#### <instance> remove(key) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-removekey "Direct link to <instance> remove(key)")

**Description:**

Removes an Animation from this Animation Manager, based on the given key.

This is a global action. Once an Animation has been removed, no Game Objects can carry on using it.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | The key of the animation to remove. |

**Returns:** [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) \- The Animation instance that was removed from the Animation Manager.

**Fires:** [Phaser.Animations.Events#event:REMOVE\_ANIMATION](https://docs.phaser.io/api-documentation/event/animations-events#REMOVE_ANIMATION)

> Source: [src/animations/AnimationManager.js#L971](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L971)
>
> Since: 3.0.0

* * *

### removeMix [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#removemix "Direct link to removeMix")

#### <instance> removeMix(animA, \[animB\]) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-removemixanima-animb "Direct link to <instance> removeMix(animA, [animB])")

**Description:**

Removes a mix between two animations.

Mixing allows you to specify a unique delay between a pairing of animations.

Calling this method lets you remove those pairings. You can either remove it between `animA` and `animB`, or if you do not provide the `animB` parameter, it will remove all `animA` mixes.

If you wish to update an existing mix instead, call the `addMix` method with the new delay.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| animA | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | No | The string-based key, or instance of, Animation A. |
| animB | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | Yes | The string-based key, or instance of, Animation B. If not given, all mixes for Animation A will be removed. |

**Returns:** [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \- This Animation Manager.

> Source: [src/animations/AnimationManager.js#L197](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L197)
>
> Since: 3.50.0

* * *

### resumeAll [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#resumeall "Direct link to resumeAll")

#### <instance> resumeAll() [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-resumeall "Direct link to <instance> resumeAll()")

**Description:**

Resumes all paused animations in the Animation Manager by setting the `paused` flag to `false`. Has no effect if the Animation Manager is not currently paused.

**Returns:** [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \- This Animation Manager.

**Fires:** [Phaser.Animations.Events#event:RESUME\_ALL](https://docs.phaser.io/api-documentation/event/animations-events#RESUME_ALL)

> Source: [src/animations/AnimationManager.js#L1001](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L1001)
>
> Since: 3.0.0

* * *

### staggerPlay [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#staggerplay "Direct link to staggerPlay")

#### <instance> staggerPlay(key, children, stagger, \[staggerFirst\]) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-staggerplaykey-children-stagger-staggerfirst "Direct link to <instance> staggerPlay(key, children, stagger, [staggerFirst])")

**Description:**

Takes an array of Game Objects that have an Animation Component and then starts the given animation playing on them. The start time of each Game Object is offset, incrementally, by the `stagger` amount.

For example, if you pass an array with 4 children and a stagger time of 1000, the delays will be:

child 1: 1000ms delay child 2: 2000ms delay child 3: 3000ms delay child 4: 4000ms delay

If you set the `staggerFirst` parameter to `false` they would be:

child 1: 0ms delay child 2: 1000ms delay child 3: 2000ms delay child 4: 3000ms delay

You can also set `stagger` to be a negative value. If it was -1000, the above would be:

child 1: 3000ms delay child 2: 2000ms delay child 3: 1000ms delay child 4: 0ms delay

**Tags:**

- generic

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| key | string \| [Phaser.Animations.Animation](https://docs.phaser.io/api-documentation/class/animations-animation) | [Phaser.Types.Animations.PlayAnimationConfig](https://docs.phaser.io/api-documentation/typedef/types-animations#PlayAnimationConfig) | No |  |
| children | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) \| Array.< [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) > | No |  | An array of Game Objects to play the animation on. They must have an Animation Component. |
| stagger | number | No |  | The amount of time, in milliseconds, to offset each play time by. If a negative value is given, it's applied to the children in reverse order. |
| staggerFirst | boolean | Yes | true | Should the first child be staggered as well? |

**Returns:** [Phaser.Animations.AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager) \- This Animation Manager.

> Source: [src/animations/AnimationManager.js#L905](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L905)
>
> Since: 3.0.0

* * *

### toJSON [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#tojson "Direct link to toJSON")

#### <instance> toJSON(\[key\]) [​](https://docs.phaser.io/api-documentation/class/animations-animationmanager\#instance-tojsonkey "Direct link to <instance> toJSON([key])")

**Description:**

Returns the Animation data as JavaScript object based on the given key. Or, if no key is defined, it will return the data of all animations as array of objects.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | Yes | The animation to get the JSONAnimation data from. If not provided, all animations are returned as an array. |

**Returns:** [Phaser.Types.Animations.JSONAnimations](https://docs.phaser.io/api-documentation/typedef/types-animations#JSONAnimations) \- The resulting JSONAnimations formatted object.

> Source: [src/animations/AnimationManager.js#L1023](https://github.com/phaserjs/phaser/blob/v4.1.0/src/animations/AnimationManager.js#L1023)
>
> Since: 3.0.0

* * *

````

- [Public Members](https://docs.phaser.io/api-documentation/class/animations-animationmanager#public-members)
  - [anims](https://docs.phaser.io/api-documentation/class/animations-animationmanager#anims)
  - [game](https://docs.phaser.io/api-documentation/class/animations-animationmanager#game)
  - [globalTimeScale](https://docs.phaser.io/api-documentation/class/animations-animationmanager#globaltimescale)
  - [mixes](https://docs.phaser.io/api-documentation/class/animations-animationmanager#mixes)
  - [name](https://docs.phaser.io/api-documentation/class/animations-animationmanager#name)
  - [paused](https://docs.phaser.io/api-documentation/class/animations-animationmanager#paused)
  - [textureManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager#texturemanager)
- [Inherited Methods](https://docs.phaser.io/api-documentation/class/animations-animationmanager#inherited-methods)
- [Public Methods](https://docs.phaser.io/api-documentation/class/animations-animationmanager#public-methods)
  - [add](https://docs.phaser.io/api-documentation/class/animations-animationmanager#add)
  - [addMix](https://docs.phaser.io/api-documentation/class/animations-animationmanager#addmix)
  - [boot](https://docs.phaser.io/api-documentation/class/animations-animationmanager#boot)
  - [create](https://docs.phaser.io/api-documentation/class/animations-animationmanager#create)
  - [createFromAseprite](https://docs.phaser.io/api-documentation/class/animations-animationmanager#createfromaseprite)
  - [destroy](https://docs.phaser.io/api-documentation/class/animations-animationmanager#destroy)
  - [exists](https://docs.phaser.io/api-documentation/class/animations-animationmanager#exists)
  - [fromJSON](https://docs.phaser.io/api-documentation/class/animations-animationmanager#fromjson)
  - [generateFrameNames](https://docs.phaser.io/api-documentation/class/animations-animationmanager#generateframenames)
  - [generateFrameNumbers](https://docs.phaser.io/api-documentation/class/animations-animationmanager#generateframenumbers)
  - [get](https://docs.phaser.io/api-documentation/class/animations-animationmanager#get)
  - [getAnimsFromTexture](https://docs.phaser.io/api-documentation/class/animations-animationmanager#getanimsfromtexture)
  - [getMix](https://docs.phaser.io/api-documentation/class/animations-animationmanager#getmix)
  - [pauseAll](https://docs.phaser.io/api-documentation/class/animations-animationmanager#pauseall)
  - [play](https://docs.phaser.io/api-documentation/class/animations-animationmanager#play)
  - [remove](https://docs.phaser.io/api-documentation/class/animations-animationmanager#remove)
  - [removeMix](https://docs.phaser.io/api-documentation/class/animations-animationmanager#removemix)
  - [resumeAll](https://docs.phaser.io/api-documentation/class/animations-animationmanager#resumeall)
  - [staggerPlay](https://docs.phaser.io/api-documentation/class/animations-animationmanager#staggerplay)
  - [toJSON](https://docs.phaser.io/api-documentation/class/animations-animationmanager#tojson)