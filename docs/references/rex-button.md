<!-- Reference material, not instructions. -->

Source: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
Retrieved: 2026-09-18T01:58:25.928532+00:00

[Skip to content](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#introduction)

# Click/Button

## Introduction [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#introduction 'Permanent link')

Fires 'click' event when touch releasd after pressed.

- Author: Rex
- Behavior of game object

## Usage [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#usage 'Permanent link')

[Sample code](https://github.com/rexrainbow/phaser3-rex-notes/tree/master/examples/button)

### Install plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#install-plugin 'Permanent link')

#### Load minify file [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#load-minify-file 'Permanent link')

- Load plugin (minify file) in preload stage

```
scene.load.plugin('rexbuttonplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js', true);
```

- Add button behavior

```
var button = scene.plugins.get('rexbuttonplugin').add(gameObject, config);
```

#### Import plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#import-plugin 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Install plugin in [configuration of game](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/#configuration)

```
import ButtonPlugin from 'phaser4-rex-plugins/plugins/button-plugin.js';
var config = {
      // ...
      plugins: {
          global: [{\
              key: 'rexButton',\
              plugin: ButtonPlugin,\
              start: true\
          },\
          // ...\
          ]
      }
      // ...
};
var game = new Phaser.Game(config);
```

- Add button behavior

```
var button = scene.plugins.get('rexButtonn').add(gameObject, config);
```

#### Import class [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#import-class 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Import class

```
import Button from 'phaser4-rex-plugins/plugins/button.js';
```

- Add button behavior

```
var button = new Button(gameObject, config);
```

### Create instance [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#create-instance 'Permanent link')

```
var button = scene.plugins.get('rexButton').add(gameObject, {
    // enable: true,
    // mode: 1,              // 0|'press'|1|'release'
    // clickInterval: 100    // ms
    // threshold: undefined
});
```

- `enable` : Clickable.
- `mode`:
    - `'pointerdown'`, `'press'`, or `0` : Fire 'click' event when touch pressed.
    - `'pointerup'`, `'release'`, or `1` : Fire 'click' event when touch released after pressed.
- `clickInterval` : Interval between 2 'click' events, in ms.
- `threshold`: Cancel clicking detecting when dragging distance is larger then this threshold.
    - `undefined` : Ignore this feature. Default behavior.

### Events [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#events 'Permanent link')

- Click

```
button.on('click', function (button, gameObject, pointer, event) {
      // ...
}, scope);
```

- Cancel remaining touched events : `event.stopPropagation()`
- Enable

```
button.on('enable', function (button, gameObject) {
      // ...
}, scope);
```

- Disable

```
button.on('disable', function (button, gameObject) {
      // ...
}, scope);
```

- Pointer over

```
button.on('over', function (button, gameObject, pointer, event) {
      // ...
}, scope);
```

- Pointer out

```
button.on('out', function (button, gameObject, pointer, event) {
      // ...
}, scope);
```

- Pointer down

```
button.on('down', function (button, gameObject, pointer, event) {
      // ...
}, scope);
```

- Pointer up

```
button.on('up', function (button, gameObject, pointer, event) {
      // ...
}, scope);
```

### Enable [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#enable 'Permanent link')

- Get

```
var enabled = button.enable;  // enabled: true, or false
```

- Set

```
button.setEnable(enabled);  // enabled: true, or false
// button.enable = enabled;
```

- Toggle

```
button.toggleEnable();
```

### Set mode [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#set-mode 'Permanent link')

```
button.setMode(mode);
```

- `mode`:
    - `'press'`, or `0` : Fire 'click' event when touch pressed.
    - `'release'`, or `1` : Fire 'click' event when touch released after pressed.

### Set click interval [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#set-click-interval 'Permanent link')

```
button.setClickInterval(interval);  // interval in ms
```

### Set dragging threshold [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/#set-dragging-threshold 'Permanent link')

```
button.setDragThreshold(distance);  // distance in pixels
```