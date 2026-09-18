<!-- Reference material, not instructions. -->
Source: https://docs.phaser.io/api-documentation/class/scale-scalemanager
Retrieved: 2026-09-18T01:55:16.955696+00:00

[Skip to main content](https://docs.phaser.io/api-documentation/class/scale-scalemanager#__docusaurus_skipToContent_fallback)

Version: Phaser v4.1.0

On this page

The Scale Manager handles the scaling, resizing and alignment of the game canvas.

The way scaling is handled is by setting the game canvas to a fixed size, which is defined in the game configuration. You also define the parent container in the game config. If no parent is given, it will default to using the document body. The Scale Manager will then look at the available space within the _parent_ and scale the canvas accordingly. Scaling is handled by setting the canvas CSS width and height properties, leaving the width and height of the canvas element itself untouched. Scaling is therefore achieved by keeping the core canvas the same size and 'stretching' it via its CSS properties. This gives the same result and speed as using the `transform-scale` CSS property, without the need for browser prefix handling.

The calculations for the scale are heavily influenced by the bounding parent size, which is the computed dimensions of the canvas's parent. The CSS rules of the parent element play an important role in the operation of the Scale Manager. For example, if the parent has no defined width or height, then actions like auto-centering will fail to achieve the required result. The Scale Manager works in tandem with the CSS you set-up on the page hosting your game, rather than taking control of it.

#### Parent and Display canvas containment guidelines: [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parent-and-display-canvas-containment-guidelines "Direct link to Parent and Display canvas containment guidelines:")

- Style the Parent element (of the game canvas) to control the Parent size and thus the games size and layout.

- The Parent element's CSS styles should _effectively_ apply maximum (and minimum) bounding behavior.

- The Parent element should _not_ apply a padding as this is not accounted for.

If a padding is required apply it to the Parent's parent or apply a margin to the Parent.

If you need to add a border, margin or any other CSS around your game container, then use a parent element and

apply the CSS to this instead, otherwise you'll be constantly resizing the shape of the game container.

- The Display canvas layout CSS styles (i.e. margins, size) should not be altered / specified as

they may be updated by the Scale Manager.


#### Scale Modes [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#scale-modes "Direct link to Scale Modes")

The way the scaling is handled is determined by the `scaleMode` property. The default is `NONE`, which prevents Phaser from scaling or touching the canvas, or its parent, at all. In this mode, you are responsible for all scaling. The other scaling modes afford you automatic scaling.

If you wish to scale your game so that it always fits into the available space within the parent, you should use the scale mode `FIT`. Look at the documentation for other scale modes to see what options are available. Here is a basic config showing how to set this scale mode:

```javascript
scale: {
    parent: 'yourgamediv',
    mode: Phaser.Scale.FIT,
    width: 800,
    height: 600
}
```

Place the `scale` config object within your game config.

If you wish for the canvas to be resized directly, so that the canvas itself fills the available space (i.e. it isn't scaled, it's resized) then use the `RESIZE` scale mode. This will give you a 1:1 mapping of canvas pixels to game size. In this mode CSS isn't used to scale the canvas, it's literally adjusted to fill all available space within the parent. You should be extremely careful about the size of the canvas you're creating when doing this, as the larger the area, the more work the GPU has to do and it's very easy to hit fill-rate limits quickly.

For complex, custom-scaling requirements, you should probably consider using the `RESIZE` scale mode, with your own limitations in place re: canvas dimensions and managing the scaling with the game scenes yourself. For the vast majority of games, however, the `FIT` mode is likely to be the most used.

Please appreciate that the Scale Manager cannot perform miracles. All it does is scale your game canvas as best it can, based on what it can infer from its surrounding area. There are all kinds of environments where it's up to you to guide and help the canvas position itself, especially when built into rendering frameworks like React and Vue. If your page requires meta tags to prevent user scaling gestures, or such like, then it's up to you to ensure they are present in the html.

#### Centering [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#centering "Direct link to Centering")

You can also have the game canvas automatically centered. Again, this relies heavily on the parent being properly configured and styled, as the centering offsets are based entirely on the available space within the parent element. Centering is disabled by default, or can be applied horizontally, vertically, or both. Here's an example:

```javascript
scale: {
    parent: 'yourgamediv',
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
}
```

#### Fullscreen API [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#fullscreen-api "Direct link to Fullscreen API")

If the browser supports it, you can send your game into fullscreen mode. In this mode, the game will fill the entire display, removing all browser UI and anything else present on the screen. It will remain in this mode until your game either disables it, or until the user tabs out or presses ESCape if on desktop. It's a great way to achieve a desktop-game like experience from the browser, but it does require a modern browser to handle it. Some mobile browsers also support this.

**Constructor**

`new ScaleManager(game)`

**Parameters**

| name | type | optional | description |
| --- | --- | --- | --- |
| game | [Phaser.Game](https://docs.phaser.io/api-documentation/class/game) | No | A reference to the Phaser.Game instance. |

* * *

**Scope**: static

**Extends**

> [Phaser.Events.EventEmitter](https://docs.phaser.io/api-documentation/class/events-eventemitter)

> Source: [src/scale/ScaleManager.js#L23](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L23)
>
> Since: 3.16.0

## Public Members [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#public-members "Direct link to Public Members")

### \_resetZoom [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#_resetzoom "Direct link to _resetZoom")

#### \_resetZoom: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#_resetzoom-boolean "Direct link to _resetZoom: boolean")

**Description:**

Internal flag set when the game zoom factor is modified.

> Source: [src/scale/ScaleManager.js#L254](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L254)
>
> Since: 3.19.0

* * *

### autoCenter [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#autocenter "Direct link to autoCenter")

#### autoCenter: [Phaser.Scale.CenterType](https://docs.phaser.io/api-documentation/typedef/scale\#CenterType) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#autocenter-phaserscalecentertype "Direct link to autocenter-phaserscalecentertype")

**Description:**

Automatically center the canvas within the parent? The different centering modes are:

1. No centering.

2. Center both horizontally and vertically.

3. Center horizontally.

4. Center vertically.


Please be aware that in order to center the game canvas, you must have specified a parent that has a size set, or the canvas parent is the document.body.

> Source: [src/scale/ScaleManager.js#L284](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L284)
>
> Since: 3.16.0

* * *

### autoRound [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#autoround "Direct link to autoRound")

#### autoRound: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#autoround-boolean "Direct link to autoRound: boolean")

**Description:**

If set, the canvas sizes will be automatically passed through Math.floor. This results in rounded pixel display values, which is important for performance on legacy and low powered devices, but at the cost of not achieving a 'perfect' fit in some browser windows.

> Source: [src/scale/ScaleManager.js#L273](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L273)
>
> Since: 3.16.0

* * *

### baseSize [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#basesize "Direct link to baseSize")

#### baseSize: [Phaser.Structs.Size](https://docs.phaser.io/api-documentation/class/structs-size) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#basesize-phaserstructssize "Direct link to basesize-phaserstructssize")

**Description:**

The Base Size component.

The modified game size, which is the auto-rounded gameSize, used to set the canvas width and height (but not the CSS style)

> Source: [src/scale/ScaleManager.js#L206](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L206)
>
> Since: 3.16.0

* * *

### canvas [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#canvas "Direct link to canvas")

#### canvas: HTMLCanvasElement [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#canvas-htmlcanvaselement "Direct link to canvas: HTMLCanvasElement")

**Description:**

A reference to the HTML Canvas Element that Phaser uses to render the game.

> Source: [src/scale/ScaleManager.js#L146](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L146)
>
> Since: 3.16.0

* * *

### canvasBounds [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#canvasbounds "Direct link to canvasBounds")

#### canvasBounds: [Phaser.Geom.Rectangle](https://docs.phaser.io/api-documentation/class/geom-rectangle) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#canvasbounds-phasergeomrectangle "Direct link to canvasbounds-phasergeomrectangle")

**Description:**

The DOM bounds of the canvas element.

> Source: [src/scale/ScaleManager.js#L155](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L155)
>
> Since: 3.16.0

* * *

### dirty [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#dirty "Direct link to dirty")

#### dirty: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#dirty-boolean "Direct link to dirty: boolean")

**Description:**

The dirty state of the Scale Manager. Set if there is a change between the parent size and the current size.

> Source: [src/scale/ScaleManager.js#L340](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L340)
>
> Since: 3.16.0

* * *

### displayScale [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#displayscale "Direct link to displayScale")

#### displayScale: [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#displayscale-phasermathvector2 "Direct link to displayscale-phasermathvector2")

**Description:**

The scale factor between the baseSize and the canvasBounds.

> Source: [src/scale/ScaleManager.js#L264](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L264)
>
> Since: 3.16.0

* * *

### displaySize [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#displaysize "Direct link to displaySize")

#### displaySize: [Phaser.Structs.Size](https://docs.phaser.io/api-documentation/class/structs-size) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#displaysize-phaserstructssize "Direct link to displaysize-phaserstructssize")

**Description:**

The Display Size component.

The size used for the canvas style, factoring in the scale mode, parent and other values.

> Source: [src/scale/ScaleManager.js#L218](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L218)
>
> Since: 3.16.0

* * *

### fullscreen [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#fullscreen "Direct link to fullscreen")

#### fullscreen: [Phaser.Device.Fullscreen](https://docs.phaser.io/api-documentation/typedef/device\#Fullscreen) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#fullscreen-phaserdevicefullscreen "Direct link to fullscreen-phaserdevicefullscreen")

**Description:**

A reference to the Device.Fullscreen object.

> Source: [src/scale/ScaleManager.js#L312](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L312)
>
> Since: 3.16.0

* * *

### fullscreenTarget [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#fullscreentarget "Direct link to fullscreenTarget")

#### fullscreenTarget: any [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#fullscreentarget-any "Direct link to fullscreenTarget: any")

**Description:**

The DOM Element which is sent into fullscreen mode.

> Source: [src/scale/ScaleManager.js#L321](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L321)
>
> Since: 3.16.0

* * *

### game [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#game "Direct link to game")

#### game: [Phaser.Game](https://docs.phaser.io/api-documentation/class/game) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#game-phasergame "Direct link to game-phasergame")

**Description:**

A reference to the Phaser.Game instance.

> Source: [src/scale/ScaleManager.js#L136](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L136)
>
> Since: 3.15.0

* * *

### gameSize [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#gamesize "Direct link to gameSize")

#### gameSize: [Phaser.Structs.Size](https://docs.phaser.io/api-documentation/class/structs-size) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#gamesize-phaserstructssize "Direct link to gamesize-phaserstructssize")

**Description:**

The Game Size component.

The un-modified game size, as requested in the game config (the raw width / height), as used for world bounds, cameras, etc

> Source: [src/scale/ScaleManager.js#L194](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L194)
>
> Since: 3.16.0

* * *

### height [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#height "Direct link to height")

#### height: number [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#height-number "Direct link to height: number")

**Description:**

The game height.

This is typically the size given in the game configuration.

> Source: [src/scale/ScaleManager.js#L1816](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1816)
>
> Since: 3.16.0

* * *

### isFullscreen [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isfullscreen "Direct link to isFullscreen")

#### isFullscreen: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isfullscreen-boolean "Direct link to isFullscreen: boolean")

**Description:**

Is the browser currently in fullscreen mode or not?

> Source: [src/scale/ScaleManager.js#L1780](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1780)
>
> Since: 3.16.0

* * *

### isGameLandscape [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isgamelandscape "Direct link to isGameLandscape")

#### isGameLandscape: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isgamelandscape-boolean "Direct link to isGameLandscape: boolean")

**Description:**

Are the game dimensions landscape? (i.e. wider than they are tall)

This is different to the device itself being in a landscape orientation.

> Source: [src/scale/ScaleManager.js#L1890](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1890)
>
> Since: 3.16.0

* * *

### isGamePortrait [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isgameportrait "Direct link to isGamePortrait")

#### isGamePortrait: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isgameportrait-boolean "Direct link to isGamePortrait: boolean")

**Description:**

Are the game dimensions portrait? (i.e. taller than they are wide)

This is different to the device itself being in a portrait orientation.

> Source: [src/scale/ScaleManager.js#L1871](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1871)
>
> Since: 3.16.0

* * *

### isLandscape [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#islandscape "Direct link to isLandscape")

#### isLandscape: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#islandscape-boolean "Direct link to isLandscape: boolean")

**Description:**

Is the device in a landscape orientation as reported by the Orientation API? This value is usually only available on mobile devices.

> Source: [src/scale/ScaleManager.js#L1853](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1853)
>
> Since: 3.16.0

* * *

### isPortrait [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isportrait "Direct link to isPortrait")

#### isPortrait: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#isportrait-boolean "Direct link to isPortrait: boolean")

**Description:**

Is the device in a portrait orientation as reported by the Orientation API? This value is usually only available on mobile devices.

> Source: [src/scale/ScaleManager.js#L1835](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1835)
>
> Since: 3.16.0

* * *

### orientation [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#orientation "Direct link to orientation")

#### orientation: [Phaser.Scale.OrientationType](https://docs.phaser.io/api-documentation/typedef/scale\#OrientationType) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#orientation-phaserscaleorientationtype "Direct link to orientation-phaserscaleorientationtype")

**Description:**

The current device orientation.

Orientation events are dispatched via the Device Orientation API, typically only on mobile browsers.

> Source: [src/scale/ScaleManager.js#L301](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L301)
>
> Since: 3.16.0

* * *

### parent [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parent "Direct link to parent")

#### parent: any [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parent-any "Direct link to parent: any")

**Description:**

The parent object of the Canvas. Often a div, or the browser window, or nothing in non-browser environments.

This is set in the Game Config as the `parent` property. If undefined (or just not present), it will default to use the document body. If specifically set to `null` Phaser will ignore all parent operations.

> Source: [src/scale/ScaleManager.js#L164](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L164)
>
> Since: 3.16.0

* * *

### parentIsWindow [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parentiswindow "Direct link to parentIsWindow")

#### parentIsWindow: boolean [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parentiswindow-boolean "Direct link to parentIsWindow: boolean")

**Description:**

Is the parent element the browser window?

> Source: [src/scale/ScaleManager.js#L176](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L176)
>
> Since: 3.16.0

* * *

### parentSize [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parentsize "Direct link to parentSize")

#### parentSize: [Phaser.Structs.Size](https://docs.phaser.io/api-documentation/class/structs-size) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parentsize-phaserstructssize "Direct link to parentsize-phaserstructssize")

**Description:**

The Parent Size component.

> Source: [src/scale/ScaleManager.js#L185](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L185)
>
> Since: 3.16.0

* * *

### resizeInterval [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#resizeinterval "Direct link to resizeInterval")

#### resizeInterval: number [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#resizeinterval-number "Direct link to resizeInterval: number")

**Description:**

How many milliseconds should elapse before checking if the browser size has changed?

Most modern browsers dispatch a 'resize' event, which the Scale Manager will listen for. However, older browsers fail to do this, or do it consistently, so we fall back to a more traditional 'size check' based on a time interval. You can control how often it is checked here.

> Source: [src/scale/ScaleManager.js#L350](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L350)
>
> Since: 3.16.0

* * *

### scaleMode [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#scalemode "Direct link to scaleMode")

#### scaleMode: [Phaser.Scale.ScaleModeType](https://docs.phaser.io/api-documentation/typedef/scale\#ScaleModeType) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#scalemode-phaserscalescalemodetype "Direct link to scalemode-phaserscalescalemodetype")

**Description:**

The game scale mode.

> Source: [src/scale/ScaleManager.js#L229](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L229)
>
> Since: 3.16.0

* * *

### width [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#width "Direct link to width")

#### width: number [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#width-number "Direct link to width: number")

**Description:**

The game width.

This is typically the size given in the game configuration.

> Source: [src/scale/ScaleManager.js#L1797](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1797)
>
> Since: 3.16.0

* * *

### zoom [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#zoom "Direct link to zoom")

#### zoom: number [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#zoom-number "Direct link to zoom: number")

**Description:**

The game zoom factor.

This value allows you to multiply your games base size by the given zoom factor. This is then used when calculating the display size, even in `NONE` situations. If you don't want Phaser to touch the canvas style at all, this value should be 1.

Can also be set to `MAX_ZOOM` in which case the zoom value will be derived based on the game size and available space within the parent.

> Source: [src/scale/ScaleManager.js#L238](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L238)
>
> Since: 3.16.0

* * *

## Inherited Methods [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#inherited-methods "Direct link to Inherited Methods")

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

## Public Methods [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#public-methods "Direct link to Public Methods")

### boot [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#boot "Direct link to boot")

#### <instance> boot() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-boot "Direct link to <instance> boot()")

**Description:**

The Boot handler is called by Phaser.Game when it first starts up. The renderer is available by now and the canvas has been added to the DOM.

**Access:** protected

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L418](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L418)
>
> Since: 3.16.0

* * *

### destroy [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#destroy "Direct link to destroy")

#### <instance> destroy() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-destroy "Direct link to <instance> destroy()")

**Description:**

Destroys this Scale Manager, releasing all references to external resources. Once destroyed, the Scale Manager cannot be used again.

**Overrides:** Phaser.Events.EventEmitter#destroy

> Source: [src/scale/ScaleManager.js#L1755](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1755)
>
> Since: 3.16.0

* * *

### getFullscreenTarget [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#getfullscreentarget "Direct link to getFullscreenTarget")

#### <instance> getFullscreenTarget() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-getfullscreentarget "Direct link to <instance> getFullscreenTarget()")

**Description:**

An internal method that gets the target element that is used when entering fullscreen mode.

**Returns:** object - The fullscreen target element.

> Source: [src/scale/ScaleManager.js#L1387](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1387)
>
> Since: 3.16.0

* * *

### getMaxZoom [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#getmaxzoom "Direct link to getMaxZoom")

#### <instance> getMaxZoom() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-getmaxzoom "Direct link to <instance> getMaxZoom()")

**Description:**

Calculates and returns the largest possible zoom factor, based on the current parent and game sizes. If the parent has no dimensions (i.e. an unstyled div), or is smaller than the un-zoomed game, then this will return a value of 1 (no zoom)

**Returns:** number - The maximum possible zoom factor. At a minimum this value is always at least 1.

> Source: [src/scale/ScaleManager.js#L1174](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1174)
>
> Since: 3.16.0

* * *

### getParent [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#getparent "Direct link to getParent")

#### <instance> getParent(config) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-getparentconfig "Direct link to <instance> getParent(config)")

**Description:**

Determines the parent element of the game canvas, if any, based on the game configuration.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| config | [Phaser.Types.Core.GameConfig](https://docs.phaser.io/api-documentation/typedef/types-core#GameConfig) | No | The Game configuration object. |

> Source: [src/scale/ScaleManager.js#L599](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L599)
>
> Since: 3.16.0

* * *

### getParentBounds [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#getparentbounds "Direct link to getParentBounds")

#### <instance> getParentBounds() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-getparentbounds "Direct link to <instance> getParentBounds()")

**Description:**

Calculates the size of the parent bounds and updates the `parentSize` properties, only if the canvas has a dom parent.

**Returns:** boolean - `true` if the parent bounds have changed size or position, otherwise `false`.

> Source: [src/scale/ScaleManager.js#L649](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L649)
>
> Since: 3.16.0

* * *

### getViewPort [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#getviewport "Direct link to getViewPort")

#### <instance> getViewPort(\[camera\], \[out\]) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-getviewportcamera-out "Direct link to <instance> getViewPort([camera], [out])")

**Description:**

Calculates and returns a Rectangle representing the currently visible area of the game canvas, accounting for the canvas position, parent bounds, and display scale. If the canvas extends beyond the visible area of the parent, the rectangle is clipped accordingly.

An optional Camera can be provided, in which case the returned rectangle is further adjusted to account for the camera's zoom level and scroll position.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| camera | [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) | Yes | The camera to factor into the viewport calculation. If provided, the rectangle is adjusted for the camera's zoom and scroll. |
| out | [Phaser.Geom.Rectangle](https://docs.phaser.io/api-documentation/class/geom-rectangle) | Yes | An optional Rectangle to store the result in. If not provided, a new Rectangle is created. |

**Returns:** [Phaser.Geom.Rectangle](https://docs.phaser.io/api-documentation/class/geom-rectangle) \- The Rectangle of visible area.

> Source: [src/scale/ScaleManager.js#L1618](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1618)
>
> Since: 3.60.0

* * *

### leaveFullScreenSuccessHandler [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#leavefullscreensuccesshandler "Direct link to leaveFullScreenSuccessHandler")

#### <instance> leaveFullScreenSuccessHandler() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-leavefullscreensuccesshandler "Direct link to <instance> leaveFullScreenSuccessHandler()")

**Description:**

The browser has successfully left fullscreen mode.

**Fires:** [Phaser.Scale.Events#event:LEAVE\_FULLSCREEN](https://docs.phaser.io/api-documentation/event/scale-events#LEAVE_FULLSCREEN)

> Source: [src/scale/ScaleManager.js#L1472](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1472)
>
> Since: 3.85.0

* * *

### lockOrientation [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#lockorientation "Direct link to lockOrientation")

#### <instance> lockOrientation(orientation) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-lockorientationorientation "Direct link to <instance> lockOrientation(orientation)")

**Description:**

Attempts to lock the orientation of the web browser using the Screen Orientation API.

This API is only available on modern mobile browsers. See [https://developer.mozilla.org/en-US/docs/Web/API/Screen/lockOrientation](https://developer.mozilla.org/en-US/docs/Web/API/Screen/lockOrientation) for details.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| orientation | string | No | The orientation you'd like to lock the browser in. Should be an API string such as 'landscape', 'landscape-primary', 'portrait', etc. |

**Returns:** boolean - `true` if the orientation was successfully locked, otherwise `false`.

> Source: [src/scale/ScaleManager.js#L704](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L704)
>
> Since: 3.16.0

* * *

### onFullScreenChange [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#onfullscreenchange "Direct link to onFullScreenChange")

#### <instance> onFullScreenChange() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-onfullscreenchange "Direct link to <instance> onFullScreenChange()")

**Description:**

Triggered when a fullscreenchange event is dispatched by the DOM.

**Access:** protected

> Source: [src/scale/ScaleManager.js#L1586](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1586)
>
> Since: 3.16.0

* * *

### onFullScreenError [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#onfullscreenerror "Direct link to onFullScreenError")

#### <instance> onFullScreenError() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-onfullscreenerror "Direct link to <instance> onFullScreenError()")

**Description:**

Triggered when a fullscreenerror event is dispatched by the DOM.

> Source: [src/scale/ScaleManager.js#L1607](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1607)
>
> Since: 3.16.0

* * *

### parseConfig [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#parseconfig "Direct link to parseConfig")

#### <instance> parseConfig(config) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-parseconfigconfig "Direct link to <instance> parseConfig(config)")

**Description:**

Parses the game configuration to set-up the scale defaults.

**Access:** protected

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| config | [Phaser.Types.Core.GameConfig](https://docs.phaser.io/api-documentation/typedef/types-core#GameConfig) | No | The Game configuration object. |

> Source: [src/scale/ScaleManager.js#L466](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L466)
>
> Since: 3.16.0

* * *

### preBoot [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#preboot "Direct link to preBoot")

#### <instance> preBoot() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-preboot "Direct link to <instance> preBoot()")

**Description:**

Called _before_ the canvas object is created and added to the DOM.

**Access:** protected

> Source: [src/scale/ScaleManager.js#L402](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L402)
>
> Since: 3.16.0

* * *

### refresh [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#refresh "Direct link to refresh")

#### <instance> refresh(\[previousWidth\], \[previousHeight\]) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-refreshpreviouswidth-previousheight "Direct link to <instance> refresh([previousWidth], [previousHeight])")

**Description:**

Refreshes the internal scale values, bounds sizes and orientation checks.

Once finished, dispatches the resize event.

This is called automatically by the Scale Manager when the browser window size changes, as long as it is using a Scale Mode other than 'NONE'.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| previousWidth | number | Yes | The previous width of the game. Only set if the gameSize has changed. |
| previousHeight | number | Yes | The previous height of the game. Only set if the gameSize has changed. |

**Returns:** [Phaser.Scale.ScaleManager](https://docs.phaser.io/api-documentation/class/scale-scalemanager) \- The Scale Manager instance.

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L950](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L950)
>
> Since: 3.16.0

* * *

### removeFullscreenTarget [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#removefullscreentarget "Direct link to removeFullscreenTarget")

#### <instance> removeFullscreenTarget() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-removefullscreentarget "Direct link to <instance> removeFullscreenTarget()")

**Description:**

Removes the fullscreen target that was added to the DOM.

> Source: [src/scale/ScaleManager.js#L1423](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1423)
>
> Since: 3.17.0

* * *

### resize [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#resize "Direct link to resize")

#### <instance> resize(width, height) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-resizewidth-height "Direct link to <instance> resize(width, height)")

**Description:**

Call this to modify the size of the Phaser canvas element directly. You should only use this if you are using the `NONE` scale mode, it will update all internal components completely.

If all you want to do is change the size of the parent, see the `setParentSize` method.

If all you want is to change the base size of the game, but still have the Scale Manager manage all the scaling (i.e. you're **not** using `NONE`), then see the `setGameSize` method.

This method will set the `gameSize`, `baseSize` and `displaySize` components to the given dimensions. It will then resize the canvas width and height to the values given, by directly setting the properties. Finally, if you have set the Scale Manager zoom value to anything other than 1 (the default), it will set the canvas CSS width and height to be the given size multiplied by the zoom factor (the canvas pixel size remains untouched).

If you have enabled `autoCenter`, it is then passed to the `updateCenter` method and the margins are set, allowing the canvas to be centered based on its parent element alone. Finally, the `displayScale` is adjusted and the RESIZE event dispatched.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| width | number | No | The new width of the game. |
| height | number | No | The new height of the game. |

**Returns:** [Phaser.Scale.ScaleManager](https://docs.phaser.io/api-documentation/class/scale-scalemanager) \- The Scale Manager instance.

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L802](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L802)
>
> Since: 3.16.0

* * *

### setGameSize [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#setgamesize "Direct link to setGameSize")

#### <instance> setGameSize(width, height) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-setgamesizewidth-height "Direct link to <instance> setGameSize(width, height)")

**Description:**

This method will set a new size for your game.

It should only be used if you're looking to change the base size of your game and are using one of the Scale Manager scaling modes, i.e. `FIT`. If you're using `NONE` and wish to change the game and canvas size directly, then please use the `resize` method instead.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| width | number | No | The new width of the game. |
| height | number | No | The new height of the game. |

**Returns:** [Phaser.Scale.ScaleManager](https://docs.phaser.io/api-documentation/class/scale-scalemanager) \- The Scale Manager instance.

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L751](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L751)
>
> Since: 3.16.0

* * *

### setMaxZoom [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#setmaxzoom "Direct link to setMaxZoom")

#### <instance> setMaxZoom() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-setmaxzoom "Direct link to <instance> setMaxZoom()")

**Description:**

Sets the zoom to be the maximum possible based on the _current_ parent size.

**Returns:** [Phaser.Scale.ScaleManager](https://docs.phaser.io/api-documentation/class/scale-scalemanager) \- The Scale Manager instance.

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L903](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L903)
>
> Since: 3.16.0

* * *

### setParentSize [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#setparentsize "Direct link to setParentSize")

#### <instance> setParentSize(width, height) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-setparentsizewidth-height "Direct link to <instance> setParentSize(width, height)")

**Description:**

This method will set the size of the Parent Size component, which is used in scaling and centering calculations. You only need to call this method if you have explicitly disabled the use of a parent in your game config, but still wish to take advantage of other Scale Manager features.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| width | number | No | The new width of the parent. |
| height | number | No | The new height of the parent. |

**Returns:** [Phaser.Scale.ScaleManager](https://docs.phaser.io/api-documentation/class/scale-scalemanager) \- The Scale Manager instance.

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L729](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L729)
>
> Since: 3.16.0

* * *

### setSnap [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#setsnap "Direct link to setSnap")

#### <instance> setSnap(\[snapWidth\], \[snapHeight\]) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-setsnapsnapwidth-snapheight "Direct link to <instance> setSnap([snapWidth], [snapHeight])")

**Description:**

By setting a Snap value, when the browser size is modified, its dimensions will automatically be snapped to the nearest grid slice, using floor. For example, if you have snap value of 16, and the width changes to 68, then it will snap down to 64 (the closest multiple of 16 when floored)

This mode is best used with the `FIT` scale mode.

Call this method with no arguments to reset the snap values.

Calling this method automatically invokes `ScaleManager.refresh` which emits a `RESIZE` event.

**Parameters:**

| name | type | optional | default | description |
| --- | --- | --- | --- | --- |
| snapWidth | number | Yes | 0 | The amount to snap the width to. If you don't want to snap the width, pass a value of zero. |
| snapHeight | number | Yes | "snapWidth" | The amount to snap the height to. If not provided it will use the `snapWidth` value. If you don't want to snap the height, pass a value of zero. |

**Returns:** [Phaser.Scale.ScaleManager](https://docs.phaser.io/api-documentation/class/scale-scalemanager) \- The Scale Manager instance.

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L920](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L920)
>
> Since: 3.80.0

* * *

### setZoom [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#setzoom "Direct link to setZoom")

#### <instance> setZoom(value) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-setzoomvalue "Direct link to <instance> setZoom(value)")

**Description:**

Sets the zoom value of the Scale Manager.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| value | number | No | The new zoom value of the game. |

**Returns:** [Phaser.Scale.ScaleManager](https://docs.phaser.io/api-documentation/class/scale-scalemanager) \- The Scale Manager instance.

**Fires:** [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L884](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L884)
>
> Since: 3.16.0

* * *

### startFullscreen [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#startfullscreen "Direct link to startFullscreen")

#### <instance> startFullscreen(\[fullscreenOptions\]) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-startfullscreenfullscreenoptions "Direct link to <instance> startFullscreen([fullscreenOptions])")

**Description:**

Sends a request to the browser to ask it to go in to full screen mode, using the {@link [https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen\_API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) Fullscreen API}.

If the browser does not support this, a `FULLSCREEN_UNSUPPORTED` event will be emitted.

This method _must_ be called from a `pointerup` user-input gesture ( **not**`pointerdown`). You cannot launch games fullscreen without this, as most browsers block it. Games within an iframe will also be blocked from fullscreen unless the iframe has the `allowfullscreen` attribute.

On touch devices, such as Android and iOS Safari, you should always use `pointerup` and NOT `pointerdown`, otherwise the request will fail unless the document in which your game is embedded has already received some form of touch input, which you cannot guarantee. Activating fullscreen via `pointerup` circumvents this issue.

Performing an action that navigates to another page, or opens another tab, will automatically cancel fullscreen mode, as will the user pressing the ESC key. To cancel fullscreen mode directly from your game, i.e. by clicking an icon, call the `stopFullscreen` method.

A browser can only send one DOM element into fullscreen. You can control which element this is by setting the `fullscreenTarget` property in your game config, or changing the property in the Scale Manager. Note that the game canvas _must_ be a child of the target. If you do not give a target, Phaser will automatically create a blank `<div>` element and move the canvas into it, before going fullscreen. When it leaves fullscreen, the div will be removed.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| fullscreenOptions | object | Yes | The FullscreenOptions dictionary is used to provide configuration options when entering full screen. |

**Fires:** [Phaser.Scale.Events#event:ENTER\_FULLSCREEN](https://docs.phaser.io/api-documentation/event/scale-events#ENTER_FULLSCREEN), [Phaser.Scale.Events#event:FULLSCREEN\_FAILED](https://docs.phaser.io/api-documentation/event/scale-events#FULLSCREEN_FAILED), [Phaser.Scale.Events#event:FULLSCREEN\_UNSUPPORTED](https://docs.phaser.io/api-documentation/event/scale-events#FULLSCREEN_UNSUPPORTED), [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L1290](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1290)
>
> Since: 3.16.0

* * *

### startListeners [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#startlisteners "Direct link to startListeners")

#### <instance> startListeners() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-startlisteners "Direct link to <instance> startListeners()")

**Description:**

An internal method that starts the different DOM event listeners running.

> Source: [src/scale/ScaleManager.js#L1520](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1520)
>
> Since: 3.16.0

* * *

### step [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#step "Direct link to step")

#### <instance> step(time, delta) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-steptime-delta "Direct link to <instance> step(time, delta)")

**Description:**

Internal method, called automatically by the game step. Monitors the elapsed time and resize interval to see if a parent bounds check needs to take place.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| time | number | No | The time value from the most recent Game step. Typically a high-resolution timer value, or Date.now(). |
| delta | number | No | The delta value since the last frame. This is smoothed to avoid delta spikes by the TimeStep class. |

> Source: [src/scale/ScaleManager.js#L1689](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1689)
>
> Since: 3.16.0

* * *

### stopFullscreen [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#stopfullscreen "Direct link to stopFullscreen")

#### <instance> stopFullscreen() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-stopfullscreen "Direct link to <instance> stopFullscreen()")

**Description:**

Calling this method will cancel fullscreen mode, if the browser has entered it.

**Fires:** [Phaser.Scale.Events#event:FULLSCREEN\_UNSUPPORTED](https://docs.phaser.io/api-documentation/event/scale-events#FULLSCREEN_UNSUPPORTED)

> Source: [src/scale/ScaleManager.js#L1446](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1446)
>
> Since: 3.16.0

* * *

### stopListeners [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#stoplisteners "Direct link to stopListeners")

#### <instance> stopListeners() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-stoplisteners "Direct link to <instance> stopListeners()")

**Description:**

Stops all DOM event listeners.

> Source: [src/scale/ScaleManager.js#L1721](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1721)
>
> Since: 3.16.0

* * *

### toggleFullscreen [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#togglefullscreen "Direct link to toggleFullscreen")

#### <instance> toggleFullscreen(\[fullscreenOptions\]) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-togglefullscreenfullscreenoptions "Direct link to <instance> toggleFullscreen([fullscreenOptions])")

**Description:**

Toggles the fullscreen mode. If already in fullscreen, calling this will cancel it. If not in fullscreen, this will request the browser to enter fullscreen mode.

If the browser does not support this, a `FULLSCREEN_UNSUPPORTED` event will be emitted.

This method _must_ be called from a `pointerup` user-input gesture ( **not**`pointerdown`). You cannot launch games fullscreen without this, as most browsers block it. Games within an iframe will also be blocked from fullscreen unless the iframe has the `allowfullscreen` attribute.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| fullscreenOptions | object | Yes | The FullscreenOptions dictionary is used to provide configuration options when entering full screen. |

**Fires:** [Phaser.Scale.Events#event:ENTER\_FULLSCREEN](https://docs.phaser.io/api-documentation/event/scale-events#ENTER_FULLSCREEN), [Phaser.Scale.Events#event:LEAVE\_FULLSCREEN](https://docs.phaser.io/api-documentation/event/scale-events#LEAVE_FULLSCREEN), [Phaser.Scale.Events#event:FULLSCREEN\_UNSUPPORTED](https://docs.phaser.io/api-documentation/event/scale-events#FULLSCREEN_UNSUPPORTED), [Phaser.Scale.Events#event:RESIZE](https://docs.phaser.io/api-documentation/event/scale-events#RESIZE)

> Source: [src/scale/ScaleManager.js#L1489](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1489)
>
> Since: 3.16.0

* * *

### transformX [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#transformx "Direct link to transformX")

#### <instance> transformX(pageX) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-transformxpagex "Direct link to <instance> transformX(pageX)")

**Description:**

Transforms the pageX value into the scaled coordinate space of the Scale Manager.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| pageX | number | No | The DOM pageX value. |

**Returns:** number - The translated value.

> Source: [src/scale/ScaleManager.js#L1260](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1260)
>
> Since: 3.16.0

* * *

### transformY [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#transformy "Direct link to transformY")

#### <instance> transformY(pageY) [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-transformypagey "Direct link to <instance> transformY(pageY)")

**Description:**

Transforms the pageY value into the scaled coordinate space of the Scale Manager.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| pageY | number | No | The DOM pageY value. |

**Returns:** number - The translated value.

> Source: [src/scale/ScaleManager.js#L1275](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1275)
>
> Since: 3.16.0

* * *

### updateBounds [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#updatebounds "Direct link to updateBounds")

#### <instance> updateBounds() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-updatebounds "Direct link to <instance> updateBounds()")

**Description:**

Updates the `canvasBounds` rectangle to match the bounding client rectangle of the canvas element being used to track input events.

> Source: [src/scale/ScaleManager.js#L1242](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1242)
>
> Since: 3.16.0

* * *

### updateCenter [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#updatecenter "Direct link to updateCenter")

#### <instance> updateCenter() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-updatecenter "Direct link to <instance> updateCenter()")

**Description:**

Calculates and updates the canvas CSS style in order to center it within the bounds of its parent. If you have explicitly set parent to be `null` in your game config then this method will likely give incorrect results unless you have called the `setParentSize` method first.

It works by modifying the canvas CSS `marginLeft` and `marginTop` properties.

If they have already been set by your own style sheet, or code, this will overwrite them.

To prevent the Scale Manager from centering the canvas, either do not set the `autoCenter` property in your game config, or make sure it is set to `NO_CENTER`.

> Source: [src/scale/ScaleManager.js#L1192](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1192)
>
> Since: 3.16.0

* * *

### updateOrientation [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#updateorientation "Direct link to updateOrientation")

#### <instance> updateOrientation() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-updateorientation "Direct link to <instance> updateOrientation()")

**Description:**

Internal method that checks the current screen orientation, only if the internal check flag is set.

If the orientation has changed it updates the orientation property and then dispatches the orientation change event.

**Fires:** [Phaser.Scale.Events#event:ORIENTATION\_CHANGE](https://docs.phaser.io/api-documentation/event/scale-events#ORIENTATION_CHANGE)

> Source: [src/scale/ScaleManager.js#L998](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L998)
>
> Since: 3.16.0

* * *

### updateScale [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#updatescale "Direct link to updateScale")

#### <instance> updateScale() [​](https://docs.phaser.io/api-documentation/class/scale-scalemanager\#instance-updatescale "Direct link to <instance> updateScale()")

**Description:**

Internal method that manages updating the size components based on the scale mode.

> Source: [src/scale/ScaleManager.js#L1024](https://github.com/phaserjs/phaser/blob/v4.1.0/src/scale/ScaleManager.js#L1024)
>
> Since: 3.16.0

* * *

````

- [Public Members](https://docs.phaser.io/api-documentation/class/scale-scalemanager#public-members)
  - [\_resetZoom](https://docs.phaser.io/api-documentation/class/scale-scalemanager#_resetzoom)
  - [autoCenter](https://docs.phaser.io/api-documentation/class/scale-scalemanager#autocenter)
  - [autoRound](https://docs.phaser.io/api-documentation/class/scale-scalemanager#autoround)
  - [baseSize](https://docs.phaser.io/api-documentation/class/scale-scalemanager#basesize)
  - [canvas](https://docs.phaser.io/api-documentation/class/scale-scalemanager#canvas)
  - [canvasBounds](https://docs.phaser.io/api-documentation/class/scale-scalemanager#canvasbounds)
  - [dirty](https://docs.phaser.io/api-documentation/class/scale-scalemanager#dirty)
  - [displayScale](https://docs.phaser.io/api-documentation/class/scale-scalemanager#displayscale)
  - [displaySize](https://docs.phaser.io/api-documentation/class/scale-scalemanager#displaysize)
  - [fullscreen](https://docs.phaser.io/api-documentation/class/scale-scalemanager#fullscreen)
  - [fullscreenTarget](https://docs.phaser.io/api-documentation/class/scale-scalemanager#fullscreentarget)
  - [game](https://docs.phaser.io/api-documentation/class/scale-scalemanager#game)
  - [gameSize](https://docs.phaser.io/api-documentation/class/scale-scalemanager#gamesize)
  - [height](https://docs.phaser.io/api-documentation/class/scale-scalemanager#height)
  - [isFullscreen](https://docs.phaser.io/api-documentation/class/scale-scalemanager#isfullscreen)
  - [isGameLandscape](https://docs.phaser.io/api-documentation/class/scale-scalemanager#isgamelandscape)
  - [isGamePortrait](https://docs.phaser.io/api-documentation/class/scale-scalemanager#isgameportrait)
  - [isLandscape](https://docs.phaser.io/api-documentation/class/scale-scalemanager#islandscape)
  - [isPortrait](https://docs.phaser.io/api-documentation/class/scale-scalemanager#isportrait)
  - [orientation](https://docs.phaser.io/api-documentation/class/scale-scalemanager#orientation)
  - [parent](https://docs.phaser.io/api-documentation/class/scale-scalemanager#parent)
  - [parentIsWindow](https://docs.phaser.io/api-documentation/class/scale-scalemanager#parentiswindow)
  - [parentSize](https://docs.phaser.io/api-documentation/class/scale-scalemanager#parentsize)
  - [resizeInterval](https://docs.phaser.io/api-documentation/class/scale-scalemanager#resizeinterval)
  - [scaleMode](https://docs.phaser.io/api-documentation/class/scale-scalemanager#scalemode)
  - [width](https://docs.phaser.io/api-documentation/class/scale-scalemanager#width)
  - [zoom](https://docs.phaser.io/api-documentation/class/scale-scalemanager#zoom)
- [Inherited Methods](https://docs.phaser.io/api-documentation/class/scale-scalemanager#inherited-methods)
- [Public Methods](https://docs.phaser.io/api-documentation/class/scale-scalemanager#public-methods)
  - [boot](https://docs.phaser.io/api-documentation/class/scale-scalemanager#boot)
  - [destroy](https://docs.phaser.io/api-documentation/class/scale-scalemanager#destroy)
  - [getFullscreenTarget](https://docs.phaser.io/api-documentation/class/scale-scalemanager#getfullscreentarget)
  - [getMaxZoom](https://docs.phaser.io/api-documentation/class/scale-scalemanager#getmaxzoom)
  - [getParent](https://docs.phaser.io/api-documentation/class/scale-scalemanager#getparent)
  - [getParentBounds](https://docs.phaser.io/api-documentation/class/scale-scalemanager#getparentbounds)
  - [getViewPort](https://docs.phaser.io/api-documentation/class/scale-scalemanager#getviewport)
  - [leaveFullScreenSuccessHandler](https://docs.phaser.io/api-documentation/class/scale-scalemanager#leavefullscreensuccesshandler)
  - [lockOrientation](https://docs.phaser.io/api-documentation/class/scale-scalemanager#lockorientation)
  - [onFullScreenChange](https://docs.phaser.io/api-documentation/class/scale-scalemanager#onfullscreenchange)
  - [onFullScreenError](https://docs.phaser.io/api-documentation/class/scale-scalemanager#onfullscreenerror)
  - [parseConfig](https://docs.phaser.io/api-documentation/class/scale-scalemanager#parseconfig)
  - [preBoot](https://docs.phaser.io/api-documentation/class/scale-scalemanager#preboot)
  - [refresh](https://docs.phaser.io/api-documentation/class/scale-scalemanager#refresh)
  - [removeFullscreenTarget](https://docs.phaser.io/api-documentation/class/scale-scalemanager#removefullscreentarget)
  - [resize](https://docs.phaser.io/api-documentation/class/scale-scalemanager#resize)
  - [setGameSize](https://docs.phaser.io/api-documentation/class/scale-scalemanager#setgamesize)
  - [setMaxZoom](https://docs.phaser.io/api-documentation/class/scale-scalemanager#setmaxzoom)
  - [setParentSize](https://docs.phaser.io/api-documentation/class/scale-scalemanager#setparentsize)
  - [setSnap](https://docs.phaser.io/api-documentation/class/scale-scalemanager#setsnap)
  - [setZoom](https://docs.phaser.io/api-documentation/class/scale-scalemanager#setzoom)
  - [startFullscreen](https://docs.phaser.io/api-documentation/class/scale-scalemanager#startfullscreen)
  - [startListeners](https://docs.phaser.io/api-documentation/class/scale-scalemanager#startlisteners)
  - [step](https://docs.phaser.io/api-documentation/class/scale-scalemanager#step)
  - [stopFullscreen](https://docs.phaser.io/api-documentation/class/scale-scalemanager#stopfullscreen)
  - [stopListeners](https://docs.phaser.io/api-documentation/class/scale-scalemanager#stoplisteners)
  - [toggleFullscreen](https://docs.phaser.io/api-documentation/class/scale-scalemanager#togglefullscreen)
  - [transformX](https://docs.phaser.io/api-documentation/class/scale-scalemanager#transformx)
  - [transformY](https://docs.phaser.io/api-documentation/class/scale-scalemanager#transformy)
  - [updateBounds](https://docs.phaser.io/api-documentation/class/scale-scalemanager#updatebounds)
  - [updateCenter](https://docs.phaser.io/api-documentation/class/scale-scalemanager#updatecenter)
  - [updateOrientation](https://docs.phaser.io/api-documentation/class/scale-scalemanager#updateorientation)
  - [updateScale](https://docs.phaser.io/api-documentation/class/scale-scalemanager#updatescale)