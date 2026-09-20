<!-- Reference material, not instructions. -->

Source: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/
Retrieved: 2026-09-18T01:58:25.928532+00:00

[Skip to content](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#introduction)

# 8 direction

## Introduction [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#introduction 'Permanent link')

Move game object by cursor keys, with a constant speed.

- Author: Rex
- Arcade behavior of game object

## Live demos [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#live-demos 'Permanent link')

- [Virtual-joyStick + Eight-direction](https://codepen.io/rexrainbow/pen/KxWpWa)

## Usage [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#usage 'Permanent link')

[Sample code](https://github.com/rexrainbow/phaser3-rex-notes/tree/master/examples/eightdirection)

### Install plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#install-plugin 'Permanent link')

#### Load minify file [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#load-minify-file 'Permanent link')

- Enable [arcade physics engine](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/arcade-world/) in [configuration of game](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/#configuration)

```
var config = {
      // ...
      physics: {
          default: 'arcade',
          arcade: {
              // debug: true
          }
      }
}
var game = new Phaser.Game(config);
```

- Load plugin (minify file) in preload stage

```
scene.load.plugin('rexeightdirectionplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexeightdirectionplugin.min.js', true);
```

- Add eight-direction behavior

```
var eightDirection = scene.plugins.get('rexeightdirectionplugin').add(gameObject, config);
```

#### Import plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#import-plugin 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Enable [arcade physics engine](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/arcade-world/) and install plugin in [configuration of game](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/#configuration)

```
import EightDirectionPlugin from 'phaser4-rex-plugins/plugins/eightdirection-plugin.js';
var config = {
      physics: {
          default: 'arcade',
          arcade: {
              // debug: true
          }
      },
      // ...
      plugins: {
          global: [{\
              key: 'rexEightDirection',\
              plugin: EightDirectionPlugin,\
              start: true\
          },\
          // ...\
          ]
      }
      // ...
};
var game = new Phaser.Game(config);
```

- Add eight-direction behavior

```
var eightDirection = scene.plugins.get('rexEightDirection').add(gameObject, config);
```

#### Import class [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#import-class 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Enable [arcade physics engine](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/arcade-world/) in [configuration of game](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/#configuration)

```
var config = {
      // ...
      physics: {
          default: 'arcade',
          arcade: {
              // debug: true
          }
      }
}
var game = new Phaser.Game(config);
```

- Import class

```
import EightDirection from 'phaser4-rex-plugins/plugins/eightdirection.js';
```

- Add eight-direction behavior

```
var eightDirection = new EightDirection(gameObject, config);
```

### Create instance [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#create-instance 'Permanent link')

```
var eightDirection = scene.plugins.get('rexEightDirection').add(gameObject, {
    speed: 200,
    // dir: '8dir',     // 0|'up&down'|1|'left&right'|2|'4dir'|3|'8dir'
    // rotateToDirection: false,
    // wrap: false,
    // padding: 0,
    // enable: true,
    // cursorKeys: scene.input.keyboard.createCursorKeys()
});
```

- `speed` : moving speed, pixels in second.
- `dir`:
    - `'up&down'`, or `0` :Aaccept up or down cursor keys only.
    - `'left&right'`, or `1` : Aaccept left or right cursor keys only.
    - `'4dir'`, or `2` : Aaccept up, down, left or right cursor keys.
    - `'8dir'`, or `3` : Aaccept up, up-left, up-right, down, down-left, down-right, left, or right cursor keys.
- `rotateToDirection` : Set true to change angle towards moving direction.
- [Wrap](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/arcade-world/#wrap)
    - `wrap` : Set `true` to enable wrap mode. Default value is `false`.
    - `padding`
- `enable` : set `false` to disable moving.
- `cursorKeys` : CursorKey object, using [keyboard's cursorKeys](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/keyboardevents/#key-object-of-cursorkeys) by default.

### Set speed [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#set-speed 'Permanent link')

```
eightDirection.setSpeed(speed);
// eightDirection.speed = speed;
```

### Set rotate-to-direction [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#set-rotate-to-direction 'Permanent link')

```
eightDirection.setRotateToDirection(rotateToDirection);
```

- `rotateToDirection` : Set true to change angle towards moving direction

### Set direction mode [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#set-direction-mode 'Permanent link')

```
eightDirection.setDirMode(dir);
```

- `dir`:
    - `'up&down'`, or `0` :Aaccept up or down cursor keys only.
    - `'left&right'`, or `1` : Aaccept left or right cursor keys only.
    - `'4dir'`, or `2` : Aaccept up, down, left or right cursor keys.
    - `'8dir'`, or `3` : Aaccept up, up-left, up-right, down, down-left, down-right, left, or right cursor keys.

### Set wrap mode [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/#set-wrap-mode 'Permanent link')

```
ship.setWrapMode(wrap, padding);
```

- `wrap` : Set `true` to enable wrap mode.