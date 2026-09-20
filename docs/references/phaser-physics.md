<!-- Reference material, not instructions. -->

Source: https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics
Retrieved: 2026-09-18T01:55:16.955696+00:00

[Skip to main content](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#__docusaurus_skipToContent_fallback)

Version: Phaser v4.1.0

On this page

The Arcade Physics Plugin belongs to a Scene and sets up and manages the Scene's physics simulation. It also holds some useful methods for moving and rotating Arcade Physics Bodies.

You can access it from within a Scene using `this.physics`.

Arcade Physics uses the Projection Method of collision resolution and separation. While it's fast and suitable for 'arcade' style games it lacks stability when multiple objects are in close proximity or resting upon each other. The separation that stops two objects penetrating may create a new penetration against a different object. If you require a high level of stability please consider using an alternative physics system, such as Matter.js.

**Constructor**

`new ArcadePhysics(scene)`

**Parameters**

| name  | type                                                                 | optional | description                            |
| ----- | -------------------------------------------------------------------- | -------- | -------------------------------------- |
| scene | [Phaser.Scene](https://docs.phaser.io/api-documentation/class/scene) | No       | The Scene that this Plugin belongs to. |

---

**Scope**: static

> Source: [src/physics/arcade/ArcadePhysics.js#L21](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L21)
>
> Since: 3.0.0

## Public Members [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#public-members 'Direct link to Public Members')

### add [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#add 'Direct link to add')

#### add: [Phaser.Physics.Arcade.Factory](https://docs.phaser.io/api-documentation/class/physics-arcade-factory) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#add-phaserphysicsarcadefactory 'Direct link to add-phaserphysicsarcadefactory')

**Description:**

An object holding the Arcade Physics factory methods.

> Source: [src/physics/arcade/ArcadePhysics.js#L82](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L82)
>
> Since: 3.0.0

---

### config [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#config 'Direct link to config')

#### config: [Phaser.Types.Physics.Arcade.ArcadeWorldConfig](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadeWorldConfig) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#config-phasertypesphysicsarcadearcadeworldconfig 'Direct link to config-phasertypesphysicsarcadearcadeworldconfig')

**Description:**

A configuration object. Union of the `physics.arcade.*` properties of the GameConfig and SceneConfig objects.

> Source: [src/physics/arcade/ArcadePhysics.js#L64](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L64)
>
> Since: 3.0.0

---

### scene [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#scene 'Direct link to scene')

#### scene: [Phaser.Scene](https://docs.phaser.io/api-documentation/class/scene) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#scene-phaserscene 'Direct link to scene-phaserscene')

**Description:**

The Scene that this Plugin belongs to.

> Source: [src/physics/arcade/ArcadePhysics.js#L46](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L46)
>
> Since: 3.0.0

---

### systems [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#systems 'Direct link to systems')

#### systems: [Phaser.Scenes.Systems](https://docs.phaser.io/api-documentation/class/scenes-systems) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#systems-phaserscenessystems 'Direct link to systems-phaserscenessystems')

**Description:**

The Scene's Systems.

> Source: [src/physics/arcade/ArcadePhysics.js#L55](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L55)
>
> Since: 3.0.0

---

### world [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#world 'Direct link to world')

#### world: [Phaser.Physics.Arcade.World](https://docs.phaser.io/api-documentation/class/physics-arcade-world) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#world-phaserphysicsarcadeworld 'Direct link to world-phaserphysicsarcadeworld')

**Description:**

The physics simulation.

> Source: [src/physics/arcade/ArcadePhysics.js#L73](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L73)
>
> Since: 3.0.0

---

## Public Methods [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#public-methods 'Direct link to Public Methods')

### accelerateTo [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#accelerateto 'Direct link to accelerateTo')

#### <instance> accelerateTo(gameObject, x, y, \[speed\], \[xSpeedMax\], \[ySpeedMax\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-acceleratetogameobject-x-y-speed-xspeedmax-yspeedmax 'Direct link to <instance> accelerateTo(gameObject, x, y, [speed], [xSpeedMax], [ySpeedMax])')

**Description:**

Sets the acceleration.x/y property on the game object so it will move towards the x/y coordinates at the given rate (in pixels per second squared)

You must give a maximum speed value, beyond which the game object won't go any faster.

Note: The game object does not continuously track the target. If the target changes location during transit the game object will not modify its course. Note: The game object doesn't stop moving once it reaches the destination coordinates.

**Parameters:**

| name       | type                                                                                                   | optional | default | description                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------ | -------- | ------- | ---------------------------------------------------------------- |
| gameObject | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) | No       |         | Any Game Object with an Arcade Physics body.                     |
| x          | number                                                                                                 | No       |         | The x coordinate to accelerate towards.                          |
| y          | number                                                                                                 | No       |         | The y coordinate to accelerate towards.                          |
| speed      | number                                                                                                 | Yes      | 60      | The acceleration (change in speed) in pixels per second squared. |
| xSpeedMax  | number                                                                                                 | Yes      | 500     | The maximum x velocity the game object can reach.                |
| ySpeedMax  | number                                                                                                 | Yes      | 500     | The maximum y velocity the game object can reach.                |

**Returns:** number - The angle (in radians) that the object should be visually set to in order to match its new velocity.

> Source: [src/physics/arcade/ArcadePhysics.js#L378](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L378)
>
> Since: 3.0.0

---

### accelerateToObject [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#acceleratetoobject 'Direct link to accelerateToObject')

#### <instance> accelerateToObject(gameObject, destination, \[speed\], \[xSpeedMax\], \[ySpeedMax\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-acceleratetoobjectgameobject-destination-speed-xspeedmax-yspeedmax 'Direct link to <instance> accelerateToObject(gameObject, destination, [speed], [xSpeedMax], [ySpeedMax])')

**Description:**

Sets the acceleration.x/y property on the game object so it will move towards the destination object at the given rate (in pixels per second squared)

You must give a maximum speed value, beyond which the game object won't go any faster.

Note: The game object does not continuously track the target. If the target changes location during transit the game object will not modify its course. Note: The game object doesn't stop moving once it reaches the destination coordinates.

**Parameters:**

| name        | type                                                                                                   | optional | default | description                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------ | -------- | ------- | ---------------------------------------------------------------------------------------- |
| gameObject  | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) | No       |         | Any Game Object with an Arcade Physics body.                                             |
| destination | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) | No       |         | The Game Object to move towards. Can be any object but must have visible x/y properties. |
| speed       | number                                                                                                 | Yes      | 60      | The acceleration (change in speed) in pixels per second squared.                         |
| xSpeedMax   | number                                                                                                 | Yes      | 500     | The maximum x velocity the game object can reach.                                        |
| ySpeedMax   | number                                                                                                 | Yes      | 500     | The maximum y velocity the game object can reach.                                        |

**Returns:** number - The angle (in radians) that the object should be visually set to in order to match its new velocity.

> Source: [src/physics/arcade/ArcadePhysics.js#L414](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L414)
>
> Since: 3.0.0

---

### closest [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#closest 'Direct link to closest')

#### <instance> closest(source, \[targets\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-closestsource-targets 'Direct link to <instance> closest(source, [targets])')

**Description:**

Finds the Body or Game Object closest to a source point or object.

If a `targets` argument is passed, this method finds the closest of those. The targets can be Arcade Physics Game Objects, Dynamic Bodies, or Static Bodies.

If no `targets` argument is passed, this method finds the closest Dynamic Body.

If two or more targets are the exact same distance from the source point, only the first target is returned.

**Tags:**

- generic

**Parameters:**

| name    | type                                                                                                     | optional | description                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| source  | [Phaser.Types.Math.Vector2Like](https://docs.phaser.io/api-documentation/typedef/types-math#Vector2Like) | No       | Any object with public `x` and `y` properties, such as a Game Object or Geometry object. |
| targets | Array.<Target>                                                                                           | Yes      | The targets.                                                                             |

**Returns:** Target, null - The target closest to the given source point.

> Source: [src/physics/arcade/ArcadePhysics.js#L438](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L438)
>
> Since: 3.0.0

---

### collide [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#collide 'Direct link to collide')

#### <instance> collide(object1, \[object2\], \[collideCallback\], \[processCallback\], \[callbackContext\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-collideobject1-object2-collidecallback-processcallback-callbackcontext 'Direct link to <instance> collide(object1, [object2], [collideCallback], [processCallback], [callbackContext])')

**Description:**

Performs a collision check and separation between the two physics enabled objects given, which can be single Game Objects, arrays of Game Objects, Physics Groups, arrays of Physics Groups or normal Groups.

If you don't require separation then use [#overlap](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlap) instead.

If two Groups or arrays are passed, each member of one will be tested against each member of the other.

If **only** one Group is passed (as `object1`), each member of the Group will be collided against the other members.

If **only** one Array is passed, the array is iterated and every element in it is tested against the others.

Two callbacks can be provided. The `collideCallback` is invoked if a collision occurs and the two colliding objects are passed to it.

Arcade Physics uses the Projection Method of collision resolution and separation. While it's fast and suitable for 'arcade' style games it lacks stability when multiple objects are in close proximity or resting upon each other. The separation that stops two objects penetrating may create a new penetration against a different object. If you require a high level of stability please consider using an alternative physics system, such as Matter.js.

**Parameters:**

| name            | type                                                                                                                                             | optional | description                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| object1         | [Phaser.Types.Physics.Arcade.ArcadeColliderType](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadeColliderType)       | No       | The first object or array of objects to check.                                                                                                                                                            |
| object2         | [Phaser.Types.Physics.Arcade.ArcadeColliderType](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadeColliderType)       | Yes      | The second object or array of objects to check, or `undefined`.                                                                                                                                           |
| collideCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that is called if the objects collide.                                                                                                                                      |
| processCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that lets you perform additional checks against the two objects if they collide. If this is set then `collideCallback` will only be called if this callback returns `true`. |
| callbackContext | \*                                                                                                                                               | Yes      | The context in which to run the callbacks.                                                                                                                                                                |

**Returns:** boolean - True if any overlapping Game Objects were separated, otherwise false.

> Source: [src/physics/arcade/ArcadePhysics.js#L249](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L249)
>
> Since: 3.0.0

---

### collideTiles [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#collidetiles 'Direct link to collideTiles')

#### <instance> collideTiles(sprite, tiles, \[collideCallback\], \[processCallback\], \[callbackContext\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-collidetilessprite-tiles-collidecallback-processcallback-callbackcontext 'Direct link to <instance> collideTiles(sprite, tiles, [collideCallback], [processCallback], [callbackContext])')

**Description:**

This advanced method is specifically for testing for collision between a single Sprite and an array of Tile objects.

You should generally use the `collide` method instead, with a Sprite vs. a Tilemap Layer, as that will perform tile filtering and culling for you, as well as handle the interesting face collision automatically.

This method is offered for those who would like to check for collision with specific Tiles in a layer, without having to set any collision attributes on the tiles in question. This allows you to perform quick dynamic collisions on small sets of Tiles. As such, no culling or checks are made to the array of Tiles given to this method, you should filter them before passing them to this method.

Important: Use of this method skips the `interesting faces` system that Tilemap Layers use. This means if you have say a row or column of tiles, and you jump into, or walk over them, it's possible to get stuck on the edges of the tiles as the interesting face calculations are skipped. However, for quick-fire small collision set tests on dynamic maps, this method can prove very useful.

**Parameters:**

| name            | type                                                                                                                                             | optional | description                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sprite          | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject)                                           | No       | The first object to check for collision.                                                                                                                                                                  |
| tiles           | Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) >                                                   | No       | An array of Tiles to check for collision against.                                                                                                                                                         |
| collideCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that is called if the objects collide.                                                                                                                                      |
| processCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that lets you perform additional checks against the two objects if they collide. If this is set then `collideCallback` will only be called if this callback returns `true`. |
| callbackContext | any                                                                                                                                              | Yes      | The context in which to run the callbacks.                                                                                                                                                                |

**Returns:** boolean - True if any objects overlap (with `overlapOnly`); or true if any overlapping objects were separated.

**Fires:** [Phaser.Physics.Arcade.Events#event:TILE\_COLLIDE](https://docs.phaser.io/api-documentation/event/physics-arcade-events#TILE_COLLIDE)

> Source: [src/physics/arcade/ArcadePhysics.js#L291](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L291)
>
> Since: 3.17.0

---

### destroy [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#destroy 'Direct link to destroy')

#### <instance> destroy() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-destroy 'Direct link to <instance> destroy()')

**Description:**

The Scene that owns this plugin is being destroyed. We need to shutdown and then kill off all external references.

> Source: [src/physics/arcade/ArcadePhysics.js#L732](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L732)
>
> Since: 3.0.0

---

### disableUpdate [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#disableupdate 'Direct link to disableUpdate')

#### <instance> disableUpdate() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-disableupdate 'Direct link to <instance> disableUpdate()')

**Description:**

Causes `World.update` to **not** be automatically called each time the Scene emits an `UPDATE` event.

If you wish to run the World update at your own rate, or from your own component, then you should call this method to disable the built-in link, and then call `World.update(time, delta)` accordingly.

Note that `World.postUpdate` is always automatically called when the Scene emits a `POST_UPDATE` event, regardless of this setting.

> Source: [src/physics/arcade/ArcadePhysics.js#L162](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L162)
>
> Since: 3.50.0

---

### enableUpdate [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#enableupdate 'Direct link to enableUpdate')

#### <instance> enableUpdate() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-enableupdate 'Direct link to <instance> enableUpdate()')

**Description:**

Causes `World.update` to be automatically called each time the Scene emits an `UPDATE` event. This is the default setting, so only needs calling if you have specifically disabled it.

> Source: [src/physics/arcade/ArcadePhysics.js#L149](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L149)
>
> Since: 3.50.0

---

### furthest [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#furthest 'Direct link to furthest')

#### <instance> furthest(source, \[targets\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-furthestsource-targets 'Direct link to <instance> furthest(source, [targets])')

**Description:**

Finds the Body or Game Object farthest from a source point or object.

If a `targets` argument is passed, this method finds the farthest of those. The targets can be Arcade Physics Game Objects, Dynamic Bodies, or Static Bodies.

If no `targets` argument is passed, this method finds the farthest Dynamic Body.

If two or more targets are the exact same distance from the source point, only the first target is returned.

**Parameters:**

| name    | type                                                                                                                                                                                                                                  | optional                                                                                                         | description                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| source  | any                                                                                                                                                                                                                                   | No                                                                                                               | Any object with public `x` and `y` properties, such as a Game Object or Geometry object. |
| targets | Array.< [Phaser.Physics.Arcade.Body](https://docs.phaser.io/api-documentation/class/physics-arcade-body) \> \| Array.< [Phaser.Physics.Arcade.StaticBody](https://docs.phaser.io/api-documentation/class/physics-arcade-staticbody) > | Array.< [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) > | Yes                                                                                      |

**Returns:** [Phaser.Physics.Arcade.Body](https://docs.phaser.io/api-documentation/class/physics-arcade-body), [Phaser.Physics.Arcade.StaticBody](https://docs.phaser.io/api-documentation/class/physics-arcade-staticbody), [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) \- The target farthest from the given source point.

> Source: [src/physics/arcade/ArcadePhysics.js#L493](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L493)
>
> Since: 3.0.0

---

### getConfig [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#getconfig 'Direct link to getConfig')

#### <instance> getConfig() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-getconfig 'Direct link to <instance> getConfig()')

**Description:**

Creates the physics configuration for the current Scene.

**Returns:** [Phaser.Types.Physics.Arcade.ArcadeWorldConfig](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadeWorldConfig) \- The physics configuration.

> Source: [src/physics/arcade/ArcadePhysics.js#L181](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L181)
>
> Since: 3.0.0

---

### moveTo [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#moveto 'Direct link to moveTo')

#### <instance> moveTo(gameObject, x, y, \[speed\], \[maxTime\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-movetogameobject-x-y-speed-maxtime 'Direct link to <instance> moveTo(gameObject, x, y, [speed], [maxTime])')

**Description:**

Move the given display object towards the x/y coordinates at a steady velocity. If you specify a maxTime then it will adjust the speed (over-writing what you set) so it arrives at the destination in that number of seconds. Timings are approximate due to the way browser timers work. Allow for a variance of +- 50ms. Note: The display object does not continuously track the target. If the target changes location during transit the display object will not modify its course. Note: The display object doesn't stop moving once it reaches the destination coordinates. Note: Doesn't take into account acceleration, maxVelocity or drag (if you've set drag or acceleration too high this object may not move at all)

**Parameters:**

| name       | type                                                                                                   | optional | default | description                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| gameObject | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) | No       |         | Any Game Object with an Arcade Physics body.                                                                                                |
| x          | number                                                                                                 | No       |         | The x coordinate to move towards.                                                                                                           |
| y          | number                                                                                                 | No       |         | The y coordinate to move towards.                                                                                                           |
| speed      | number                                                                                                 | Yes      | 60      | The speed it will move, in pixels per second (default is 60 pixels/sec)                                                                     |
| maxTime    | number                                                                                                 | Yes      | 0       | Time given in milliseconds (1000 = 1 sec). If set the speed is adjusted so the object will arrive at destination in the given number of ms. |

**Returns:** number - The angle (in radians) that the object should be visually set to in order to match its new velocity.

> Source: [src/physics/arcade/ArcadePhysics.js#L548](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L548)
>
> Since: 3.0.0

---

### moveToObject [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#movetoobject 'Direct link to moveToObject')

#### <instance> moveToObject(gameObject, destination, \[speed\], \[maxTime\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-movetoobjectgameobject-destination-speed-maxtime 'Direct link to <instance> moveToObject(gameObject, destination, [speed], [maxTime])')

**Description:**

Move the given display object towards the destination object at a steady velocity. If you specify a maxTime then it will adjust the speed (overwriting what you set) so it arrives at the destination in that number of seconds. Timings are approximate due to the way browser timers work. Allow for a variance of +- 50ms. Note: The display object does not continuously track the target. If the target changes location during transit the display object will not modify its course. Note: The display object doesn't stop moving once it reaches the destination coordinates. Note: Doesn't take into account acceleration, maxVelocity or drag (if you've set drag or acceleration too high this object may not move at all)

**Parameters:**

| name        | type                                                                                                   | optional | default | description                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| gameObject  | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject) | No       |         | Any Game Object with an Arcade Physics body.                                                                                                |
| destination | object                                                                                                 | No       |         | Any object with public `x` and `y` properties, such as a Game Object or Geometry object.                                                    |
| speed       | number                                                                                                 | Yes      | 60      | The speed it will move, in pixels per second (default is 60 pixels/sec)                                                                     |
| maxTime     | number                                                                                                 | Yes      | 0       | Time given in milliseconds (1000 = 1 sec). If set the speed is adjusted so the object will arrive at destination in the given number of ms. |

**Returns:** number - The angle (in radians) that the object should be visually set to in order to match its new velocity.

> Source: [src/physics/arcade/ArcadePhysics.js#L585](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L585)
>
> Since: 3.0.0

---

### nextCategory [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#nextcategory 'Direct link to nextCategory')

#### <instance> nextCategory() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-nextcategory 'Direct link to <instance> nextCategory()')

**Description:**

Returns the next available collision category.

You can have a maximum of 32 categories.

By default all bodies collide with all other bodies.

Use the `Body.setCollisionCategory()` and `Body.setCollidesWith()` methods to change this.

**Returns:** number - The next collision category.

> Source: [src/physics/arcade/ArcadePhysics.js#L202](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L202)
>
> Since: 3.70.0

---

### overlap [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlap 'Direct link to overlap')

#### <instance> overlap(object1, \[object2\], \[overlapCallback\], \[processCallback\], \[callbackContext\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-overlapobject1-object2-overlapcallback-processcallback-callbackcontext 'Direct link to <instance> overlap(object1, [object2], [overlapCallback], [processCallback], [callbackContext])')

**Description:**

Tests if Game Objects overlap. See [Phaser.Physics.Arcade.World#overlap](https://docs.phaser.io/api-documentation/class/physics-arcade-world#overlap)

**Parameters:**

| name            | type                                                                                                                                             | optional | description                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| object1         | [Phaser.Types.Physics.Arcade.ArcadeColliderType](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadeColliderType)       | No       | The first object or array of objects to check.                                                                                                                                                            |
| object2         | [Phaser.Types.Physics.Arcade.ArcadeColliderType](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadeColliderType)       | Yes      | The second object or array of objects to check, or `undefined`.                                                                                                                                           |
| overlapCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that is called if the objects overlap.                                                                                                                                      |
| processCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that lets you perform additional checks against the two objects if they overlap. If this is set then `overlapCallback` will only be called if this callback returns `true`. |
| callbackContext | \*                                                                                                                                               | Yes      | The context in which to run the callbacks.                                                                                                                                                                |

**Returns:** boolean - True if at least one Game Object overlaps another.

> Source: [src/physics/arcade/ArcadePhysics.js#L224](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L224)
>
> Since: 3.0.0

---

### overlapCirc [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlapcirc 'Direct link to overlapCirc')

#### <instance> overlapCirc(x, y, radius, \[includeDynamic\], \[includeStatic\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-overlapcircx-y-radius-includedynamic-includestatic 'Direct link to <instance> overlapCirc(x, y, radius, [includeDynamic], [includeStatic])')

**Description:**

This method will search the given circular area and return an array of all physics bodies that overlap with it. It can return either Dynamic, Static bodies or a mixture of both.

A body only has to intersect with the search area to be considered, it doesn't have to be fully contained within it.

If Arcade Physics is set to use the RTree (which it is by default) then the search is rather fast, otherwise the search is O(N) for Dynamic Bodies.

**Parameters:**

| name           | type    | optional | default | description                                                  |
| -------------- | ------- | -------- | ------- | ------------------------------------------------------------ |
| x              | number  | No       |         | The x coordinate of the center of the area to search within. |
| y              | number  | No       |         | The y coordinate of the center of the area to search within. |
| radius         | number  | No       |         | The radius of the area to search within.                     |
| includeDynamic | boolean | Yes      | true    | Should the search include Dynamic Bodies?                    |
| includeStatic  | boolean | Yes      | false   | Should the search include Static Bodies?                     |

**Returns:** Array.< [Phaser.Physics.Arcade.Body](https://docs.phaser.io/api-documentation/class/physics-arcade-body) >, Array.< [Phaser.Physics.Arcade.StaticBody](https://docs.phaser.io/api-documentation/class/physics-arcade-staticbody) \> \- An array of bodies that overlap with the given area.

> Source: [src/physics/arcade/ArcadePhysics.js#L677](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L677)
>
> Since: 3.21.0

---

### overlapRect [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlaprect 'Direct link to overlapRect')

#### <instance> overlapRect(x, y, width, height, \[includeDynamic\], \[includeStatic\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-overlaprectx-y-width-height-includedynamic-includestatic 'Direct link to <instance> overlapRect(x, y, width, height, [includeDynamic], [includeStatic])')

**Description:**

This method will search the given rectangular area and return an array of all physics bodies that overlap with it. It can return either Dynamic, Static bodies or a mixture of both.

A body only has to intersect with the search area to be considered, it doesn't have to be fully contained within it.

If Arcade Physics is set to use the RTree (which it is by default) then the search is extremely fast, otherwise the search is O(N) for Dynamic Bodies.

**Parameters:**

| name           | type    | optional | default | description                                             |
| -------------- | ------- | -------- | ------- | ------------------------------------------------------- |
| x              | number  | No       |         | The top-left x coordinate of the area to search within. |
| y              | number  | No       |         | The top-left y coordinate of the area to search within. |
| width          | number  | No       |         | The width of the area to search within.                 |
| height         | number  | No       |         | The height of the area to search within.                |
| includeDynamic | boolean | Yes      | true    | Should the search include Dynamic Bodies?               |
| includeStatic  | boolean | Yes      | false   | Should the search include Static Bodies?                |

**Returns:** Array.< [Phaser.Physics.Arcade.Body](https://docs.phaser.io/api-documentation/class/physics-arcade-body) >, Array.< [Phaser.Physics.Arcade.StaticBody](https://docs.phaser.io/api-documentation/class/physics-arcade-staticbody) \> \- An array of bodies that overlap with the given area.

> Source: [src/physics/arcade/ArcadePhysics.js#L650](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L650)
>
> Since: 3.17.0

---

### overlapTiles [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlaptiles 'Direct link to overlapTiles')

#### <instance> overlapTiles(sprite, tiles, \[overlapCallback\], \[processCallback\], \[callbackContext\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-overlaptilessprite-tiles-overlapcallback-processcallback-callbackcontext 'Direct link to <instance> overlapTiles(sprite, tiles, [overlapCallback], [processCallback], [callbackContext])')

**Description:**

This advanced method is specifically for testing for overlaps between a single Sprite and an array of Tile objects.

You should generally use the `overlap` method instead, with a Sprite vs. a Tilemap Layer, as that will perform tile filtering and culling for you, as well as handle the interesting face collision automatically.

This method is offered for those who would like to check for overlaps with specific Tiles in a layer, without having to set any collision attributes on the tiles in question. This allows you to perform quick dynamic overlap tests on small sets of Tiles. As such, no culling or checks are made to the array of Tiles given to this method, you should filter them before passing them to this method.

**Parameters:**

| name            | type                                                                                                                                             | optional | description                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sprite          | [Phaser.GameObjects.GameObject](https://docs.phaser.io/api-documentation/class/gameobjects-gameobject)                                           | No       | The first object to check for overlap.                                                                                                                                                                    |
| tiles           | Array.< [Phaser.Tilemaps.Tile](https://docs.phaser.io/api-documentation/class/tilemaps-tile) >                                                   | No       | An array of Tiles to check for overlap against.                                                                                                                                                           |
| overlapCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that is called if the objects overlap.                                                                                                                                      |
| processCallback | [Phaser.Types.Physics.Arcade.ArcadePhysicsCallback](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade#ArcadePhysicsCallback) | Yes      | An optional callback function that lets you perform additional checks against the two objects if they overlap. If this is set then `overlapCallback` will only be called if this callback returns `true`. |
| callbackContext | any                                                                                                                                              | Yes      | The context in which to run the callbacks.                                                                                                                                                                |

**Returns:** boolean - True if any objects overlap.

**Fires:** [Phaser.Physics.Arcade.Events#event:TILE\_OVERLAP](https://docs.phaser.io/api-documentation/event/physics-arcade-events#TILE_OVERLAP)

> Source: [src/physics/arcade/ArcadePhysics.js#L324](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L324)
>
> Since: 3.17.0

---

### pause [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#pause 'Direct link to pause')

#### <instance> pause() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-pause 'Direct link to <instance> pause()')

**Description:**

Pauses the simulation.

**Returns:** [Phaser.Physics.Arcade.World](https://docs.phaser.io/api-documentation/class/physics-arcade-world) \- The simulation.

> Source: [src/physics/arcade/ArcadePhysics.js#L352](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L352)
>
> Since: 3.0.0

---

### resume [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#resume 'Direct link to resume')

#### <instance> resume() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-resume 'Direct link to <instance> resume()')

**Description:**

Resumes the simulation (if paused).

**Returns:** [Phaser.Physics.Arcade.World](https://docs.phaser.io/api-documentation/class/physics-arcade-world) \- The simulation.

> Source: [src/physics/arcade/ArcadePhysics.js#L365](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L365)
>
> Since: 3.0.0

---

### shutdown [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#shutdown 'Direct link to shutdown')

#### <instance> shutdown() [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-shutdown 'Direct link to <instance> shutdown()')

**Description:**

The Scene that owns this plugin is shutting down. We need to kill and reset all internal properties as well as stop listening to Scene events.

> Source: [src/physics/arcade/ArcadePhysics.js#L703](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L703)
>
> Since: 3.0.0

---

### velocityFromAngle [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#velocityfromangle 'Direct link to velocityFromAngle')

#### <instance> velocityFromAngle(angle, \[speed\], \[vec2\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-velocityfromangleangle-speed-vec2 'Direct link to <instance> velocityFromAngle(angle, [speed], [vec2])')

**Description:**

Given the angle (in degrees) and speed calculate the velocity and return it as a vector, or set it to the given vector object. One way to use this is: velocityFromAngle(angle, 200, sprite.body.velocity) which will set the values directly to the sprite's velocity and not create a new vector object.

**Parameters:**

| name  | type                                                                               | optional | default | description                                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| angle | number                                                                             | No       |         | The angle in degrees calculated in clockwise positive direction (down = 90 degrees positive, right = 0 degrees positive, up = 90 degrees negative) |
| speed | number                                                                             | Yes      | 60      | The speed it will move, in pixels per second.                                                                                                      |
| vec2  | [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) | Yes      |         | The Vector2 in which the x and y properties will be set to the calculated velocity.                                                                |

**Returns:** [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) \- The Vector2 that stores the velocity.

> Source: [src/physics/arcade/ArcadePhysics.js#L608](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L608)
>
> Since: 3.0.0

---

### velocityFromRotation [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#velocityfromrotation 'Direct link to velocityFromRotation')

#### <instance> velocityFromRotation(rotation, \[speed\], \[vec2\]) [​](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#instance-velocityfromrotationrotation-speed-vec2 'Direct link to <instance> velocityFromRotation(rotation, [speed], [vec2])')

**Description:**

Given the rotation (in radians) and speed calculate the velocity and return it as a vector, or set it to the given vector object. One way to use this is: velocityFromRotation(rotation, 200, sprite.body.velocity) which will set the values directly to the sprite's velocity and not create a new vector object.

**Parameters:**

| name     | type                                                                               | optional | default | description                                                                         |
| -------- | ---------------------------------------------------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| rotation | number                                                                             | No       |         | The angle in radians.                                                               |
| speed    | number                                                                             | Yes      | 60      | The speed it will move, in pixels per second.                                       |
| vec2     | [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) | Yes      |         | The Vector2 in which the x and y properties will be set to the calculated velocity. |

**Returns:** [Phaser.Math.Vector2](https://docs.phaser.io/api-documentation/class/math-vector2) \- The Vector2 that stores the velocity.

> Source: [src/physics/arcade/ArcadePhysics.js#L629](https://github.com/phaserjs/phaser/blob/v4.1.0/src/physics/arcade/ArcadePhysics.js#L629)
>
> Since: 3.0.0

---

```

- [Public Members](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#public-members)
  - [add](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#add)
  - [config](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#config)
  - [scene](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#scene)
  - [systems](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#systems)
  - [world](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#world)
- [Public Methods](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#public-methods)
  - [accelerateTo](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#accelerateto)
  - [accelerateToObject](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#acceleratetoobject)
  - [closest](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#closest)
  - [collide](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#collide)
  - [collideTiles](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#collidetiles)
  - [destroy](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#destroy)
  - [disableUpdate](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#disableupdate)
  - [enableUpdate](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#enableupdate)
  - [furthest](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#furthest)
  - [getConfig](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#getconfig)
  - [moveTo](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#moveto)
  - [moveToObject](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#movetoobject)
  - [nextCategory](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#nextcategory)
  - [overlap](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlap)
  - [overlapCirc](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlapcirc)
  - [overlapRect](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlaprect)
  - [overlapTiles](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#overlaptiles)
  - [pause](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#pause)
  - [resume](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#resume)
  - [shutdown](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#shutdown)
  - [velocityFromAngle](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#velocityfromangle)
  - [velocityFromRotation](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics#velocityfromrotation)
```