<!-- Reference material, not instructions. -->

Source: https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera
Retrieved: 2026-09-18T01:55:16.955696+00:00

[Skip to main content](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#__docusaurus_skipToContent_fallback)

Version: Phaser v4.1.0

On this page

A Camera provides a view into your game world and is the primary way scenes are rendered in Phaser. Every Scene has at least one Camera (the main camera), and you can add additional cameras via the Camera Manager. Cameras can be scrolled, zoomed, rotated, and fitted with special effects such as fade, flash, shake, pan, and zoom transitions.

The Camera is the way in which all games are rendered in Phaser. They provide a view into your game world, and can be positioned, rotated, zoomed and scrolled accordingly.

A Camera consists of two elements: The viewport and the scroll values.

The viewport is the physical position and size of the Camera within your game. Cameras, by default, are created the same size as your game, but their position and size can be set to anything. This means if you wanted to create a camera that was 320x200 in size, positioned in the bottom-right corner of your game, you'd adjust the viewport to do that (using methods like `setViewport` and `setSize`). However, the viewport is limited to being an axis-aligned rectangle, and cannot be rotated. It is more powerful and reliable to use a `RenderTexture` or `DynamicTexture` instead. Point its camera where you want the viewport, set its size, and then draw your game objects to it.

If you wish to change where the Camera is looking in your game, then you scroll it. You can do this via the properties `scrollX` and `scrollY` or the method `setScroll`. Scrolling has no impact on the viewport, and changing the viewport has no impact on the scrolling.

By default a Camera will render all Game Objects it can see. You can change this using the `ignore` method, allowing you to filter Game Objects out on a per-Camera basis.

A Camera also has built-in special effects including Fade, Flash and Camera Shake.

You can apply full-camera filters. Some filters need off-screen data, such as Blur; use `camera.getPaddingWrapper()` to get a proxy for working with cameras with padding applied.

**Constructor**

`new Camera(x, y, width, height)`

**Parameters**

| name   | type   | optional | description                                                                |
| ------ | ------ | -------- | -------------------------------------------------------------------------- |
| x      | number | No       | The x position of the Camera, relative to the top-left of the game canvas. |
| y      | number | No       | The y position of the Camera, relative to the top-left of the game canvas. |
| width  | number | No       | The width of the Camera, in pixels.                                        |
| height | number | No       | The height of the Camera, in pixels.                                       |

---

**Scope**: static

**Extends**

> [Phaser.Cameras.Scene2D.BaseCamera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera)

> Source: [src/cameras/2d/Camera.js#L18](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L18)
>
> Since: 3.0.0

## Inherited Members [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#inherited-members 'Direct link to Inherited Members')

**From [Phaser.Cameras.Scene2D.BaseCamera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera):**

- [alpha](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#alpha)
- [backgroundColor](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#backgroundcolor)
- [cameraManager](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#cameramanager)
- [centerX](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#centerx)
- [centerY](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#centery)
- [dirty](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#dirty)
- [disableCull](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#disablecull)
- [displayHeight](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#displayheight)
- [displayWidth](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#displaywidth)
- [forceComposite](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#forcecomposite)
- [height](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#height)
- [id](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#id)
- [isSceneCamera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#isscenecamera)
- [mask](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#mask)
- [matrixCombined](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#matrixcombined)
- [matrixExternal](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#matrixexternal)
- [midPoint](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#midpoint)
- [name](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#name)
- [originX](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#originx)
- [originY](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#originy)
- [renderList](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#renderlist)
- [renderRoundPixels](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#renderroundpixels)
- [roundPixels](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#roundpixels)
- [scaleManager](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#scalemanager)
- [scene](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#scene)
- [sceneManager](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#scenemanager)
- [scrollX](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#scrollx)
- [scrollY](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#scrolly)
- [transparent](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#transparent)
- [useBounds](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#usebounds)
- [visible](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#visible)
- [width](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#width)
- [worldView](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#worldview)
- [x](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#x)
- [y](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#y)
- [zoom](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#zoom)
- [zoomX](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#zoomx)
- [zoomY](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#zoomy)

---

## Public Members [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#public-members 'Direct link to Public Members')

### deadzone [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#deadzone 'Direct link to deadzone')

#### deadzone: [Phaser.Geom.Rectangle](https://docs.phaser.io/api-documentation/class/geom-rectangle) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#deadzone-phasergeomrectangle 'Direct link to deadzone-phasergeomrectangle')

**Description:**

The Camera dead zone.

The deadzone is only used when the camera is following a target.

It defines a rectangular region within which if the target is present, the camera will not scroll. If the target moves outside of this area, the camera will begin scrolling in order to follow it.

The `lerp` values that you can set for a follower target also apply when using a deadzone.

You can directly set this property to be an instance of a Rectangle. Or, you can use the `setDeadzone` method for a chainable approach.

The rectangle you provide can have its dimensions adjusted dynamically, however, please note that its position is updated every frame, as it is constantly re-centered on the cameras mid point.

Calling `setDeadzone` with no arguments will reset an active deadzone, as will setting this property to `null`.

> Source: [src/cameras/2d/Camera.js#L203](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L203)
>
> Since: 3.11.0

---

### fadeEffect [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadeeffect 'Direct link to fadeEffect')

#### fadeEffect: [Phaser.Cameras.Scene2D.Effects.Fade](https://docs.phaser.io/api-documentation/class/cameras-scene2d-effects-fade) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadeeffect-phasercamerasscene2deffectsfade 'Direct link to fadeeffect-phasercamerasscene2deffectsfade')

**Description:**

The Camera Fade effect handler. To fade this camera see the `Camera.fade` methods.

> Source: [src/cameras/2d/Camera.js#L114](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L114)
>
> Since: 3.5.0

---

### filters [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#filters 'Direct link to filters')

#### filters: [Phaser.Types.GameObjects.FiltersInternalExternal](https://docs.phaser.io/api-documentation/typedef/types-gameobjects#FiltersInternalExternal) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#filters-phasertypesgameobjectsfiltersinternalexternal 'Direct link to filters-phasertypesgameobjectsfiltersinternalexternal')

**Description:**

The filters for this camera. Filters control special effects and masks.

This object contains two lists of filters: `internal` and `external`. See [Phaser.GameObjects.Components.FilterList](https://docs.phaser.io/api-documentation/class/Phaser.GameObjects.Components.FilterList) for more information.

> Source: [src/cameras/2d/Camera.js#L76](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L76)
>
> Since: 4.0.0

---

### flashEffect [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#flasheffect 'Direct link to flashEffect')

#### flashEffect: [Phaser.Cameras.Scene2D.Effects.Flash](https://docs.phaser.io/api-documentation/class/cameras-scene2d-effects-flash) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#flasheffect-phasercamerasscene2deffectsflash 'Direct link to flasheffect-phasercamerasscene2deffectsflash')

**Description:**

The Camera Flash effect handler. To flash this camera see the `Camera.flash` method.

> Source: [src/cameras/2d/Camera.js#L124](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L124)
>
> Since: 3.5.0

---

### followOffset [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#followoffset 'Direct link to followOffset')

#### followOffset: [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#followoffset-phasermathvector2 'Direct link to followoffset-phasermathvector2')

**Description:**

The values stored in this property are subtracted from the Camera targets position, allowing you to offset the camera from the actual target x/y coordinates by this amount. Can also be set via `setFollowOffset` or as part of the `startFollow` call.

> Source: [src/cameras/2d/Camera.js#L192](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L192)
>
> Since: 3.9.0

---

### inputEnabled [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#inputenabled 'Direct link to inputEnabled')

#### inputEnabled: boolean [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#inputenabled-boolean 'Direct link to inputEnabled: boolean')

**Description:**

Does this Camera allow the Game Objects it renders to receive input events?

> Source: [src/cameras/2d/Camera.js#L104](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L104)
>
> Since: 3.0.0

---

### isObjectInversion [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#isobjectinversion 'Direct link to isObjectInversion')

#### isObjectInversion: boolean [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#isobjectinversion-boolean 'Direct link to isObjectInversion: boolean')

**Description:**

Is this Camera for Game Object transform inversion? This is used by the `Filters` component to cancel out the transform of the Game Object when rendering the object for filtering.

> Source: [src/cameras/2d/Camera.js#L92](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L92)
>
> Since: 4.0.0

---

### lerp [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#lerp 'Direct link to lerp')

#### lerp: [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#lerp-phasermathvector2 'Direct link to lerp-phasermathvector2')

**Description:**

The linear interpolation value to use when following a target.

Can also be set via `setLerp` or as part of the `startFollow` call.

The default value of 1 means the camera will instantly snap to the target coordinates. A lower value, such as 0.1 means the camera will more slowly track the target, giving a smooth transition. You can set the horizontal and vertical values independently, and also adjust this value in real-time during your game.

Be sure to keep the value between 0 and 1. A value of zero will disable tracking on that axis.

> Source: [src/cameras/2d/Camera.js#L174](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L174)
>
> Since: 3.9.0

---

### panEffect [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#paneffect 'Direct link to panEffect')

#### panEffect: [Phaser.Cameras.Scene2D.Effects.Pan](https://docs.phaser.io/api-documentation/class/cameras-scene2d-effects-pan) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#paneffect-phasercamerasscene2deffectspan 'Direct link to paneffect-phasercamerasscene2deffectspan')

**Description:**

The Camera Pan effect handler. To pan this camera see the `Camera.pan` method.

> Source: [src/cameras/2d/Camera.js#L144](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L144)
>
> Since: 3.11.0

---

### rotateToEffect [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#rotatetoeffect 'Direct link to rotateToEffect')

#### rotateToEffect: [Phaser.Cameras.Scene2D.Effects.RotateTo](https://docs.phaser.io/api-documentation/class/cameras-scene2d-effects-rotateto) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#rotatetoeffect-phasercamerasscene2deffectsrotateto 'Direct link to rotatetoeffect-phasercamerasscene2deffectsrotateto')

**Description:**

The Camera Rotate To effect handler. To rotate this camera see the `Camera.rotateTo` method.

> Source: [src/cameras/2d/Camera.js#L154](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L154)
>
> Since: 3.23.0

---

### shakeEffect [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#shakeeffect 'Direct link to shakeEffect')

#### shakeEffect: [Phaser.Cameras.Scene2D.Effects.Shake](https://docs.phaser.io/api-documentation/class/cameras-scene2d-effects-shake) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#shakeeffect-phasercamerasscene2deffectsshake 'Direct link to shakeeffect-phasercamerasscene2deffectsshake')

**Description:**

The Camera Shake effect handler. To shake this camera see the `Camera.shake` method.

> Source: [src/cameras/2d/Camera.js#L134](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L134)
>
> Since: 3.5.0

---

### zoomEffect [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#zoomeffect 'Direct link to zoomEffect')

#### zoomEffect: [Phaser.Cameras.Scene2D.Effects.Zoom](https://docs.phaser.io/api-documentation/class/cameras-scene2d-effects-zoom) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#zoomeffect-phasercamerasscene2deffectszoom 'Direct link to zoomeffect-phasercamerasscene2deffectszoom')

**Description:**

The Camera Zoom effect handler. To zoom this camera see the `Camera.zoomTo` method.

> Source: [src/cameras/2d/Camera.js#L164](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L164)
>
> Since: 3.11.0

---

## Inherited Methods [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#inherited-methods 'Direct link to Inherited Methods')

**From [Phaser.Cameras.Scene2D.BaseCamera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera):**

- [addToRenderList](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#addtorenderlist)
- [centerOn](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#centeron)
- [centerOnX](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#centeronx)
- [centerOnY](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#centerony)
- [centerToBounds](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#centertobounds)
- [centerToSize](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#centertosize)
- [clampX](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#clampx)
- [clampY](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#clampy)
- [clearMask](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#clearmask)
- [cull](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#cull)
- [getBounds](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#getbounds)
- [getScroll](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#getscroll)
- [getWorldPoint](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#getworldpoint)
- [ignore](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#ignore)
- [removeBounds](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#removebounds)
- [setAlpha](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setalpha)
- [setAngle](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setangle)
- [setBackgroundColor](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setbackgroundcolor)
- [setBounds](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setbounds)
- [setForceComposite](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setforcecomposite)
- [setIsSceneCamera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setisscenecamera)
- [setMask](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setmask)
- [setName](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setname)
- [setOrigin](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setorigin)
- [setPosition](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setposition)
- [setRotation](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setrotation)
- [setRoundPixels](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setroundpixels)
- [setScene](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setscene)
- [setScroll](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setscroll)
- [setSize](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setsize)
- [setViewport](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setviewport)
- [setVisible](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setvisible)
- [setZoom](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#setzoom)
- [toJSON](https://docs.phaser.io/api-documentation/class/cameras-scene2d-basecamera#tojson)

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

**From [Phaser.GameObjects.Components.AlphaSingle](https://docs.phaser.io/api-documentation/class/gameobjects-components-alphasingle):**

- [clearAlpha](https://docs.phaser.io/api-documentation/class/gameobjects-components-alphasingle#clearalpha)

---

## Public Methods [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#public-methods 'Direct link to Public Methods')

### destroy [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#destroy 'Direct link to destroy')

#### <instance> destroy() [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-destroy 'Direct link to <instance> destroy()')

**Description:**

Destroys this Camera instance. You rarely need to call this directly.

Called by the Camera Manager. If you wish to destroy a Camera please use `CameraManager.remove` as cameras are stored in a pool, ready for recycling later, and calling this directly will prevent that.

**Overrides:** Phaser.Cameras.Scene2D.BaseCamera#destroy

**Fires:** [Phaser.Cameras.Scene2D.Events#event:DESTROY](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#DESTROY)

> Source: [src/cameras/2d/Camera.js#L938](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L938)
>
> Since: 3.0.0

---

### fade [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fade 'Direct link to fade')

#### <instance> fade(\[duration\], \[red\], \[green\], \[blue\], \[force\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-fadeduration-red-green-blue-force-callback-context 'Direct link to <instance> fade([duration], [red], [green], [blue], [force], [callback], [context])')

**Description:**

Fades the Camera from transparent to the given color over the duration specified.

**Parameters:**

| name     | type     | optional | default | description                                                                                                                                                                                                |
| -------- | -------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duration | number   | Yes      | 1000    | The duration of the effect in milliseconds.                                                                                                                                                                |
| red      | number   | Yes      | 0       | The amount to fade the red channel towards. A value between 0 and 255.                                                                                                                                     |
| green    | number   | Yes      | 0       | The amount to fade the green channel towards. A value between 0 and 255.                                                                                                                                   |
| blue     | number   | Yes      | 0       | The amount to fade the blue channel towards. A value between 0 and 255.                                                                                                                                    |
| force    | boolean  | Yes      | false   | Force the effect to start immediately, even if already running.                                                                                                                                            |
| callback | function | Yes      |         | This callback will be invoked every frame for the duration of the effect. It is sent two arguments: A reference to the camera and a progress amount between 0 and 1 indicating how complete the effect is. |
| context  | any      | Yes      |         | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                           |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:FADE\_OUT\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_OUT_START), [Phaser.Cameras.Scene2D.Events#event:FADE\_OUT\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_OUT_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L373](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L373)
>
> Since: 3.0.0

---

### fadeFrom [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadefrom 'Direct link to fadeFrom')

#### <instance> fadeFrom(\[duration\], \[red\], \[green\], \[blue\], \[force\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-fadefromduration-red-green-blue-force-callback-context 'Direct link to <instance> fadeFrom([duration], [red], [green], [blue], [force], [callback], [context])')

**Description:**

Fades the Camera from the given color to transparent over the duration specified.

**Parameters:**

| name     | type     | optional | default | description                                                                                                                                                                                                |
| -------- | -------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duration | number   | Yes      | 1000    | The duration of the effect in milliseconds.                                                                                                                                                                |
| red      | number   | Yes      | 0       | The amount to fade the red channel towards. A value between 0 and 255.                                                                                                                                     |
| green    | number   | Yes      | 0       | The amount to fade the green channel towards. A value between 0 and 255.                                                                                                                                   |
| blue     | number   | Yes      | 0       | The amount to fade the blue channel towards. A value between 0 and 255.                                                                                                                                    |
| force    | boolean  | Yes      | false   | Force the effect to start immediately, even if already running.                                                                                                                                            |
| callback | function | Yes      |         | This callback will be invoked every frame for the duration of the effect. It is sent two arguments: A reference to the camera and a progress amount between 0 and 1 indicating how complete the effect is. |
| context  | any      | Yes      |         | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                           |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:FADE\_IN\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_IN_START), [Phaser.Cameras.Scene2D.Events#event:FADE\_IN\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_IN_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L349](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L349)
>
> Since: 3.5.0

---

### fadeIn [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadein 'Direct link to fadeIn')

#### <instance> fadeIn(\[duration\], \[red\], \[green\], \[blue\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-fadeinduration-red-green-blue-callback-context 'Direct link to <instance> fadeIn([duration], [red], [green], [blue], [callback], [context])')

**Description:**

Fades the Camera in from the given color over the duration specified.

**Parameters:**

| name     | type     | optional | default | description                                                                                                                                                                                                |
| -------- | -------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duration | number   | Yes      | 1000    | The duration of the effect in milliseconds.                                                                                                                                                                |
| red      | number   | Yes      | 0       | The amount to fade the red channel towards. A value between 0 and 255.                                                                                                                                     |
| green    | number   | Yes      | 0       | The amount to fade the green channel towards. A value between 0 and 255.                                                                                                                                   |
| blue     | number   | Yes      | 0       | The amount to fade the blue channel towards. A value between 0 and 255.                                                                                                                                    |
| callback | function | Yes      |         | This callback will be invoked every frame for the duration of the effect. It is sent two arguments: A reference to the camera and a progress amount between 0 and 1 indicating how complete the effect is. |
| context  | any      | Yes      |         | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                           |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:FADE\_IN\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_IN_START), [Phaser.Cameras.Scene2D.Events#event:FADE\_IN\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_IN_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L302](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L302)
>
> Since: 3.3.0

---

### fadeOut [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadeout 'Direct link to fadeOut')

#### <instance> fadeOut(\[duration\], \[red\], \[green\], \[blue\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-fadeoutduration-red-green-blue-callback-context 'Direct link to <instance> fadeOut([duration], [red], [green], [blue], [callback], [context])')

**Description:**

Fades the Camera out to the given color over the duration specified. This is an alias for Camera.fade that forces the fade to start, regardless of existing fades.

**Parameters:**

| name     | type     | optional | default | description                                                                                                                                                                                                |
| -------- | -------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duration | number   | Yes      | 1000    | The duration of the effect in milliseconds.                                                                                                                                                                |
| red      | number   | Yes      | 0       | The amount to fade the red channel towards. A value between 0 and 255.                                                                                                                                     |
| green    | number   | Yes      | 0       | The amount to fade the green channel towards. A value between 0 and 255.                                                                                                                                   |
| blue     | number   | Yes      | 0       | The amount to fade the blue channel towards. A value between 0 and 255.                                                                                                                                    |
| callback | function | Yes      |         | This callback will be invoked every frame for the duration of the effect. It is sent two arguments: A reference to the camera and a progress amount between 0 and 1 indicating how complete the effect is. |
| context  | any      | Yes      |         | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                           |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:FADE\_OUT\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_OUT_START), [Phaser.Cameras.Scene2D.Events#event:FADE\_OUT\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FADE_OUT_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L325](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L325)
>
> Since: 3.3.0

---

### flash [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#flash 'Direct link to flash')

#### <instance> flash(\[duration\], \[red\], \[green\], \[blue\], \[force\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-flashduration-red-green-blue-force-callback-context 'Direct link to <instance> flash([duration], [red], [green], [blue], [force], [callback], [context])')

**Description:**

Flashes the Camera by setting it to the given color immediately and then fading it away again quickly over the duration specified.

**Parameters:**

| name     | type     | optional | default | description                                                                                                                                                                                                |
| -------- | -------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duration | number   | Yes      | 250     | The duration of the effect in milliseconds.                                                                                                                                                                |
| red      | number   | Yes      | 255     | The amount to fade the red channel towards. A value between 0 and 255.                                                                                                                                     |
| green    | number   | Yes      | 255     | The amount to fade the green channel towards. A value between 0 and 255.                                                                                                                                   |
| blue     | number   | Yes      | 255     | The amount to fade the blue channel towards. A value between 0 and 255.                                                                                                                                    |
| force    | boolean  | Yes      | false   | Force the effect to start immediately, even if already running.                                                                                                                                            |
| callback | function | Yes      |         | This callback will be invoked every frame for the duration of the effect. It is sent two arguments: A reference to the camera and a progress amount between 0 and 1 indicating how complete the effect is. |
| context  | any      | Yes      |         | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                           |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:FLASH\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FLASH_START), [Phaser.Cameras.Scene2D.Events#event:FLASH\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#FLASH_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L397](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L397)
>
> Since: 3.0.0

---

### getPaddingWrapper [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#getpaddingwrapper 'Direct link to getPaddingWrapper')

#### <instance> getPaddingWrapper(\[padding\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-getpaddingwrapperpadding 'Direct link to <instance> getPaddingWrapper([padding])')

**Description:**

Return a proxy for managing camera padding.

Camera padding enlarges the camera, adding to each side of the region. This is useful when you need data from just outside the normal camera region, e.g. when using a Blur filter.

Use the proxy in place of the camera. It conceals the complicated parts, so you can carry on using the camera just as before. You can still use the original camera to see the adjusted values.

Padding affects the following properties on the original camera:

- Subtracts from `x`, `y`, `scrollX`, `scrollY`.

- Adds double to `width`, height\`.

Padding increases the rendered region, so it can have a performance cost. If you don't need the extra data at some time, set padding to 0.

You can't use more than one such proxy at a time. If you try, they fight and nobody wins.

**Parameters:**

| name    | type   | optional | default | description            |
| ------- | ------ | -------- | ------- | ---------------------- |
| padding | number | Yes      | 0       | Initial padding value. |

**Returns:** [Phaser.Types.Cameras.Scene2D.CameraPaddingWrapper](https://docs.phaser.io/api-documentation/typedef/types-cameras-scene2d#CameraPaddingWrapper) \- The proxy for the camera.

> Source: [src/cameras/2d/Camera.js#L675](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L675)
>
> Since: 4.0.0

---

### getViewMatrix [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#getviewmatrix 'Direct link to getViewMatrix')

#### <instance> getViewMatrix(\[forceComposite\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-getviewmatrixforcecomposite 'Direct link to <instance> getViewMatrix([forceComposite])')

**Description:**

Returns the view matrix of the camera. This is used internally.

This is `matrix` if the camera is intended to render to a framebuffer, and `matrixCombined` otherwise.

**Tags:**

- webglonly

**Parameters:**

| name           | type    | optional | default | description                                                                                                                                       |
| -------------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| forceComposite | boolean | Yes      | false   | If `true`, the view matrix will always be `matrix`. This is typically used when rendering to a framebuffer, so the external matrix is irrelevant. |

**Returns:** [Phaser.GameObjects.Components.TransformMatrix](https://docs.phaser.io/api-documentation/class/gameobjects-components-transformmatrix) \- The view matrix of the camera.

> Source: [src/cameras/2d/Camera.js#L647](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L647)
>
> Since: 4.0.0

---

### pan [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#pan 'Direct link to pan')

#### <instance> pan(x, y, \[duration\], \[ease\], \[force\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-panx-y-duration-ease-force-callback-context 'Direct link to <instance> pan(x, y, [duration], [ease], [force], [callback], [context])')

**Description:**

This effect will scroll the Camera so that the center of its viewport finishes at the given destination, over the duration and with the ease specified.

**Parameters:**

| name     | type                                                                                                                                       | optional | default    | description                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| x        | number                                                                                                                                     | No       |            | The destination x coordinate to scroll the center of the Camera viewport to.                                                                                                                                                                                                                |
| y        | number                                                                                                                                     | No       |            | The destination y coordinate to scroll the center of the Camera viewport to.                                                                                                                                                                                                                |
| duration | number                                                                                                                                     | Yes      | 1000       | The duration of the effect in milliseconds.                                                                                                                                                                                                                                                 |
| ease     | string \| function                                                                                                                         | Yes      | "'Linear'" | The ease to use for the pan. Can be any of the Phaser Easing constants or a custom function.                                                                                                                                                                                                |
| force    | boolean                                                                                                                                    | Yes      | false      | Force the pan effect to start immediately, even if already running.                                                                                                                                                                                                                         |
| callback | [Phaser.Types.Cameras.Scene2D.CameraPanCallback](https://docs.phaser.io/api-documentation/typedef/types-cameras-scene2d#CameraPanCallback) | Yes      |            | This callback will be invoked every frame for the duration of the effect. It is sent four arguments: A reference to the camera, a progress amount between 0 and 1 indicating how complete the effect is, the current camera scroll x coordinate and the current camera scroll y coordinate. |
| context  | any                                                                                                                                        | Yes      |            | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                                                                                                            |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:PAN\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#PAN_START), [Phaser.Cameras.Scene2D.Events#event:PAN\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#PAN_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L443](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L443)
>
> Since: 3.11.0

---

### preRender [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#prerender 'Direct link to preRender')

#### <instance> preRender() [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-prerender 'Direct link to <instance> preRender()')

**Description:**

Updates camera matrix. Also resets any active effects on this Camera (such as shake, flash and fade) and quickly clears them all.

> Source: [src/cameras/2d/Camera.js#L516](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L516)
>
> Since: 3.0.0

---

### resetFX [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#resetfx 'Direct link to resetFX')

#### <instance> resetFX() [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-resetfx 'Direct link to <instance> resetFX()')

**Description:**

Resets any active FX, such as a fade, flash or shake. Useful to call after a fade in order to remove the fade.

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

> Source: [src/cameras/2d/Camera.js#L895](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L895)
>
> Since: 3.0.0

---

### rotateTo [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#rotateto 'Direct link to rotateTo')

#### <instance> rotateTo(angle, \[shortestPath\], \[duration\], \[ease\], \[force\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-rotatetoangle-shortestpath-duration-ease-force-callback-context 'Direct link to <instance> rotateTo(angle, [shortestPath], [duration], [ease], [force], [callback], [context])')

**Description:**

Rotate the Camera to the given angle over the duration and with the ease specified.

**Parameters:**

| name         | type                                                                                                                                             | optional | default    | description                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| angle        | number                                                                                                                                           | No       |            | The destination angle in radians to rotate the Camera view to.                                                                                                                                                                             |
| shortestPath | boolean                                                                                                                                          | Yes      | false      | If true, take the shortest distance to the destination. This adjusts the destination angle to be within one half turn of the start angle.                                                                                                  |
| duration     | number                                                                                                                                           | Yes      | 1000       | The duration of the effect in milliseconds.                                                                                                                                                                                                |
| ease         | string \| function                                                                                                                               | Yes      | "'Linear'" | The ease to use. Can be any of the Phaser Easing constants or a custom function.                                                                                                                                                           |
| force        | boolean                                                                                                                                          | Yes      | false      | Force the rotation effect to start immediately, even if already running.                                                                                                                                                                   |
| callback     | [Phaser.Types.Cameras.Scene2D.CameraRotateCallback](https://docs.phaser.io/api-documentation/typedef/types-cameras-scene2d#CameraRotateCallback) | Yes      |            | This callback will be invoked every frame for the duration of the effect. It is sent three arguments: A reference to the camera, a progress amount between 0 and 1 indicating how complete the effect is, and the current camera rotation. |
| context      | any                                                                                                                                              | Yes      |            | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                                                           |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

> Source: [src/cameras/2d/Camera.js#L469](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L469)
>
> Since: 3.23.0

---

### setDeadzone [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#setdeadzone 'Direct link to setDeadzone')

#### <instance> setDeadzone(\[width\], \[height\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-setdeadzonewidth-height 'Direct link to <instance> setDeadzone([width], [height])')

**Description:**

Sets the Camera dead zone.

The deadzone is only used when the camera is following a target.

It defines a rectangular region within which if the target is present, the camera will not scroll. If the target moves outside of this area, the camera will begin scrolling in order to follow it.

The deadzone rectangle is re-positioned every frame so that it is centered on the mid-point of the camera. This allows you to use the object for additional game related checks, such as testing if an object is within it or not via a Rectangle.contains call.

The `lerp` values that you can set for a follower target also apply when using a deadzone.

Calling this method with no arguments will reset an active deadzone.

**Parameters:**

| name   | type   | optional | description                                                                              |
| ------ | ------ | -------- | ---------------------------------------------------------------------------------------- |
| width  | number | Yes      | The width of the deadzone rectangle in pixels. If not specified the deadzone is removed. |
| height | number | Yes      | The height of the deadzone rectangle in pixels.                                          |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

> Source: [src/cameras/2d/Camera.js#L240](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L240)
>
> Since: 3.11.0

---

### setFollowOffset [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#setfollowoffset 'Direct link to setFollowOffset')

#### <instance> setFollowOffset(\[x\], \[y\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-setfollowoffsetx-y 'Direct link to <instance> setFollowOffset([x], [y])')

**Description:**

Sets the horizontal and vertical offset of the camera from its follow target. The values are subtracted from the targets position during the Cameras update step.

**Parameters:**

| name | type   | optional | default | description                                                     |
| ---- | ------ | -------- | ------- | --------------------------------------------------------------- |
| x    | number | Yes      | 0       | The horizontal offset from the camera follow target.x position. |
| y    | number | Yes      | 0       | The vertical offset from the camera follow target.y position.   |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

> Source: [src/cameras/2d/Camera.js#L793](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L793)
>
> Since: 3.9.0

---

### setLerp [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#setlerp 'Direct link to setLerp')

#### <instance> setLerp(\[x\], \[y\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-setlerpx-y 'Direct link to <instance> setLerp([x], [y])')

**Description:**

Sets the linear interpolation value to use when following a target.

The default values of 1 means the camera will instantly snap to the target coordinates. A lower value, such as 0.1 means the camera will more slowly track the target, giving a smooth transition. You can set the horizontal and vertical values independently, and also adjust this value in real-time during your game.

Be sure to keep the value between 0 and 1. A value of zero will disable tracking on that axis.

**Parameters:**

| name | type   | optional | default | description                                                                               |
| ---- | ------ | -------- | ------- | ----------------------------------------------------------------------------------------- |
| x    | number | Yes      | 1       | The horizontal linear interpolation value for the follow target. A value between 0 and 1. |
| y    | number | Yes      | 1       | The vertical linear interpolation value for the follow target. A value between 0 and 1.   |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

> Source: [src/cameras/2d/Camera.js#L765](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L765)
>
> Since: 3.9.0

---

### shake [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#shake 'Direct link to shake')

#### <instance> shake(\[duration\], \[intensity\], \[force\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-shakeduration-intensity-force-callback-context 'Direct link to <instance> shake([duration], [intensity], [force], [callback], [context])')

**Description:**

Shakes the Camera by the given intensity over the duration specified.

**Parameters:**

| name      | type                                                                                         | optional | default | description                                                                                                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duration  | number                                                                                       | Yes      | 100     | The duration of the effect in milliseconds.                                                                                                                                                                |
| intensity | number \| [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) | Yes      | 0.05    | The intensity of the shake.                                                                                                                                                                                |
| force     | boolean                                                                                      | Yes      | false   | Force the shake effect to start immediately, even if already running.                                                                                                                                      |
| callback  | function                                                                                     | Yes      |         | This callback will be invoked every frame for the duration of the effect. It is sent two arguments: A reference to the camera and a progress amount between 0 and 1 indicating how complete the effect is. |
| context   | any                                                                                          | Yes      |         | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                           |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:SHAKE\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#SHAKE_START), [Phaser.Cameras.Scene2D.Events#event:SHAKE\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#SHAKE_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L421](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L421)
>
> Since: 3.0.0

---

### startFollow [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#startfollow 'Direct link to startFollow')

#### <instance> startFollow(target, \[roundPixels\], \[lerpX\], \[lerpY\], \[offsetX\], \[offsetY\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-startfollowtarget-roundpixels-lerpx-lerpy-offsetx-offsety 'Direct link to <instance> startFollow(target, [roundPixels], [lerpX], [lerpY], [offsetX], [offsetY])')

**Description:**

Sets the Camera to follow a Game Object.

When enabled the Camera will automatically adjust its scroll position to keep the target Game Object in its center.

You can set the linear interpolation value used in the follow code. Use low lerp values (such as 0.1) to automatically smooth the camera motion.

If you find you're getting a slight "jitter" effect when following an object it's probably to do with sub-pixel rendering of the targets position. This can be rounded by setting the `roundPixels` argument to `true` to force full pixel rounding rendering. Note that this can still be broken if you have specified a non-integer zoom value on the camera. So be sure to keep the camera zoom to integers.

**Parameters:**

| name        | type                                                                                                             | optional | default | description                                                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| target      | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) \| object | No       |         | The target for the Camera to follow.                                                                                                                                                        |
| roundPixels | boolean                                                                                                          | Yes      | false   | Round the camera position to whole integers to avoid sub-pixel rendering?                                                                                                                   |
| lerpX       | number                                                                                                           | Yes      | 1       | A value between 0 and 1. This value specifies the amount of linear interpolation to use when horizontally tracking the target. The closer the value to 1, the faster the camera will track. |
| lerpY       | number                                                                                                           | Yes      | 1       | A value between 0 and 1. This value specifies the amount of linear interpolation to use when vertically tracking the target. The closer the value to 1, the faster the camera will track.   |
| offsetX     | number                                                                                                           | Yes      | 0       | The horizontal offset from the camera follow target.x position.                                                                                                                             |
| offsetY     | number                                                                                                           | Yes      | 0       | The vertical offset from the camera follow target.y position.                                                                                                                               |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

> Source: [src/cameras/2d/Camera.js#L815](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L815)
>
> Since: 3.0.0

---

### stopFollow [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#stopfollow 'Direct link to stopFollow')

#### <instance> stopFollow() [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-stopfollow 'Direct link to <instance> stopFollow()')

**Description:**

Stops a Camera from following a Game Object, if previously set via `Camera.startFollow`.

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

> Source: [src/cameras/2d/Camera.js#L880](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L880)
>
> Since: 3.0.0

---

### update [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#update 'Direct link to update')

#### <instance> update(time, delta) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-updatetime-delta 'Direct link to <instance> update(time, delta)')

**Description:**

Internal method called automatically by the Camera Manager.

**Access:** protected

**Parameters:**

| name  | type   | optional | description                                                                      |
| ----- | ------ | -------- | -------------------------------------------------------------------------------- |
| time  | number | No       | The current timestamp as generated by the Request Animation Frame or SetTimeout. |
| delta | number | No       | The delta time, in ms, elapsed since the last frame.                             |

**Overrides:** Phaser.Cameras.Scene2D.BaseCamera#update

> Source: [src/cameras/2d/Camera.js#L915](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L915)
>
> Since: 3.0.0

---

### zoomTo [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#zoomto 'Direct link to zoomTo')

#### <instance> zoomTo(zoom, \[duration\], \[ease\], \[force\], \[callback\], \[context\]) [​](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#instance-zoomtozoom-duration-ease-force-callback-context 'Direct link to <instance> zoomTo(zoom, [duration], [ease], [force], [callback], [context])')

**Description:**

This effect will zoom the Camera to the given scale, over the duration and with the ease specified.

**Parameters:**

| name     | type                                                                                                                                         | optional | default    | description                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| zoom     | number                                                                                                                                       | No       |            | The target Camera zoom value.                                                                                                                                                                                                                |
| duration | number                                                                                                                                       | Yes      | 1000       | The duration of the effect in milliseconds.                                                                                                                                                                                                  |
| ease     | string \| function                                                                                                                           | Yes      | "'Linear'" | The ease to use for the zoom. Can be any of the Phaser Easing constants or a custom function.                                                                                                                                                |
| force    | boolean                                                                                                                                      | Yes      | false      | Force the zoom effect to start immediately, even if already running.                                                                                                                                                                         |
| callback | [Phaser.Types.Cameras.Scene2D.CameraZoomCallback](https://docs.phaser.io/api-documentation/typedef/types-cameras-scene2d#CameraZoomCallback) | Yes      |            | This callback will be invoked every frame for the duration of the effect. It is sent three arguments: A reference to the camera, a progress amount between 0 and 1 indicating how complete the effect is, and the current camera zoom value. |
| context  | any                                                                                                                                          | Yes      |            | The context in which the callback is invoked. Defaults to the Scene to which the Camera belongs.                                                                                                                                             |

**Returns:** [Phaser.Cameras.Scene2D.Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) \- This Camera instance.

**Fires:** [Phaser.Cameras.Scene2D.Events#event:ZOOM\_START](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#ZOOM_START), [Phaser.Cameras.Scene2D.Events#event:ZOOM\_COMPLETE](https://docs.phaser.io/api-documentation/event/cameras-scene2d-events#ZOOM_COMPLETE)

> Source: [src/cameras/2d/Camera.js#L492](https://github.com/phaserjs/phaser/blob/v4.1.0/src/cameras/2d/Camera.js#L492)
>
> Since: 3.11.0

---

```

- [Inherited Members](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#inherited-members)
- [Public Members](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#public-members)
  - [deadzone](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#deadzone)
  - [fadeEffect](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadeeffect)
  - [filters](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#filters)
  - [flashEffect](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#flasheffect)
  - [followOffset](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#followoffset)
  - [inputEnabled](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#inputenabled)
  - [isObjectInversion](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#isobjectinversion)
  - [lerp](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#lerp)
  - [panEffect](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#paneffect)
  - [rotateToEffect](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#rotatetoeffect)
  - [shakeEffect](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#shakeeffect)
  - [zoomEffect](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#zoomeffect)
- [Inherited Methods](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#inherited-methods)
- [Public Methods](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#public-methods)
  - [destroy](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#destroy)
  - [fade](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fade)
  - [fadeFrom](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadefrom)
  - [fadeIn](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadein)
  - [fadeOut](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#fadeout)
  - [flash](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#flash)
  - [getPaddingWrapper](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#getpaddingwrapper)
  - [getViewMatrix](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#getviewmatrix)
  - [pan](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#pan)
  - [preRender](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#prerender)
  - [resetFX](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#resetfx)
  - [rotateTo](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#rotateto)
  - [setDeadzone](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#setdeadzone)
  - [setFollowOffset](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#setfollowoffset)
  - [setLerp](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#setlerp)
  - [shake](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#shake)
  - [startFollow](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#startfollow)
  - [stopFollow](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#stopfollow)
  - [update](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#update)
  - [zoomTo](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#zoomto)
```