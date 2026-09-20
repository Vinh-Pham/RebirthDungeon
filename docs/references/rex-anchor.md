<!-- Reference material, not instructions. -->

Source: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/
Retrieved: 2026-09-18T01:58:25.928532+00:00

[Skip to content](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#introduction)

# Anchor

## Introduction [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#introduction 'Permanent link')

Set size and position based on visible window.

Note

Visible window will be changed when scale mode is _ENVELOP_, _WIDTH\_CONTROLS\_HEIGHT_, or _HEIGHT\_CONTROLS\_WIDTH_.

- Author: Rex
- Behavior of game object

## Live demos [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#live-demos 'Permanent link')

- [Anchor](https://codepen.io/rexrainbow/pen/oVxWVB)
- [Resize](https://codepen.io/rexrainbow/pen/ZEyRVov)
- [Camera zoom/scroll](https://codepen.io/rexrainbow/pen/yLKNbRy)

## Usage [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#usage 'Permanent link')

[Sample code](https://github.com/rexrainbow/phaser3-rex-notes/tree/master/examples/anchor)

### Install plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#install-plugin 'Permanent link')

#### Load minify file [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#load-minify-file 'Permanent link')

- Load plugin (minify file) in preload stage

```
scene.load.plugin('rexanchorplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexanchorplugin.min.js', true);
```

- Add anchor behavior

```
var anchor = scene.plugins.get('rexanchorplugin').add(gameObject, config);
```

#### Import plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#import-plugin 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Install plugin in [configuration of game](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/#configuration)

```
import AnchorPlugin from 'phaser4-rex-plugins/plugins/anchor-plugin.js';
var config = {
      // ...
      plugins: {
          global: [{\
              key: 'rexAnchor',\
              plugin: AnchorPlugin,\
              start: true\
          },\
          // ...\
          ]
      }
      // ...
};
var game = new Phaser.Game(config);
```

- Add anchor behavior

```
var anchor = scene.plugins.get('rexAnchor').add(gameObject, config);
```

#### Import class [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#import-class 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Import class

```
import Anchor from 'phaser4-rex-plugins/plugins/anchor.js';
```

- Add anchor behavior

```
var anchor = new Anchor(gameObject, config);
```

### Create instance [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#create-instance 'Permanent link')

```
var anchor = scene.plugins.get('rexAnchor').add(gameObject, {
    // left: '0%+0',
    // right: '0%+0',
    // centerX: '0%+0',
    // x: '0%+0',

    // top: '0%+0',
    // bottom: '0%+0',
    // centerY: '0%+0',
    // y: '0%+0',

    // width: '100%+0',
    // height: '100%+0',
    // aspectRatio: false,

    // onResizeCallback: function(width, height, gameObject, anchor) {},
    // onResizeCallbackScope: undefined,

    // onUpdateViewportCallback: function(viewport, gameObject, anchor) {},
    // onUpdateViewportCallbackScope: undefined,

    // enable: true
});
```

- `left`, `right`, `centerX`, `x`, `top`, `bottom`, `centerY`, `y` : Position based on visible window, which composed of
    - Percentage of visible width/height : `'p%'`, p: `0` ~ `100`.
        - `'left'`(=0%), `'center'`(=50%), `'right'`(=100%)
        - `'top'`(=0%), `'center'`(=50%), `'bottom'`(=100%)
    - Offset : `'+n'`, or `'-n'`.

For example, anchor game object's left bound to viewport's left+10, centerY to viewport's center

```
{
    left: 'left+10',
    centerY: 'center'
}
```

- `width`, `height` : Set size (invoke `onResizeCallback`) based on visible window, which composed of
    - Percentage of visible width/height : `'p%'`, p: `0` ~ `100`.
    - Padding : `'+n'`, or `'-n'`.
- `aspectRatio`:
    - `undefined`, or `false` : Does not keep aspect ratio. Default behavior.
    - `true` : Use the current width and height as the aspect ratio.
    - A number : Use given number as the aspect ratio.
- `onResizeCallback`, `onResizeCallbackScope` : Callback of resizing game object
    - `undefined` : Default resize method.
    - Custom method

        ```
        function(width, height, gameObject, anchor) {
            // gameObject.setSize(width, height);
            // gameObject.setDisplaySize(width, height);
            // ...
        }
        ```

    - `null` or `false` : No callback
- `onUpdateViewportCallback`, `onUpdateViewportCallback` : Callback invoked when viewport changed (anchor)

```
fucntion(viewport, gameObject, anchor) {
      // Can change properties of viewport here
      // var centerX = viewport.centerX,
      //     centerY = viewport.centerY;
      // viewport.width *= 0.8;
      // viewport.height *= 0.9;
      // viewport.centerX = centerX;
      // viewport.centerY = centerY;
}
```

- `viewport`： A [rectangle object](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/geom-rectangle/)
- `enable` :
    - `undefined`, or `true` : Anchor game object under `'resize'` event of [scale manager](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/).
    - `false` : Won't anchor game object automatially.

### Reset config [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#reset-config 'Permanent link')

```
anchor.resetFromJSON({
    // left: '0%+0',
    // right: '0%+0',
    // centerX: '0%+0',
    // x: '0%+0',

    // top: '0%+0',
    // bottom: '0%+0',
    // centerY: '0%+0',
    // y: '0%+0',

    // width: '100%+0',
    // height: '100%+0',

    // onUpdateViewportCallback: function(viewport, gameObject, anchor) {}
    // onUpdateViewportCallbackScope: undefined,
})
```

- `left`, `right`, `centerX`, `x`, `top`, `bottom`, `centerY`, `y` : Position based on visible window, which composed of
    - Percentage of visible width/height : `'p%'`, p: 0~100
        - `'left'`(=0%), `'center'`(=50%), `'right'`(=100%)
        - `'top'`(=0%), `'center'`(=50%), `'bottom'`(=100%)
    - Offset : `'+n'`, or `'-n'`
- `width`, `height` : Set size (invoke `onResizeCallback`) based on visible window, which composed of
    - Percentage of visible width/height : `'p%'`, p: `0` ~ `100`.
    - Padding : `'+n'`, or `'-n'`.
- `onResizeCallback`, `onResizeCallbackScope` : Callback of resizing game object

```
function(width, height, gameObject, anchor) {
      // gameObject.setSize(width, height);
      // gameObject.setDisplaySize(width, height);
      // ...
}
```

### Set OnUpdateViewport callback [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#set-onupdateviewport-callback 'Permanent link')

```
anchor.setUpdateViewportCallback(callback, scope);
```

- `callback` :

```
fucntion(viewport, gameObject, anchor) {
      // Can change properties of viewport here
      // var centerX = viewport.centerX,
      //     centerY = viewport.centerY;
      // viewport.width *= 0.8;
      // viewport.height *= 0.9;
      // viewport.centerX = centerX;
      // viewport.centerY = centerY;
}
```

- `viewport`： A [rectangle object](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/geom-rectangle/)

### Manual anchor [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#manual-anchor 'Permanent link')

```
anchor.anchor();
```

### Auto anchor [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/anchor/#auto-anchor 'Permanent link')

- Anchor game object under `'resize'` event of [scale manager](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/).

```
anchor.autoAnchor();
// anchor.autoAnchor(true);
```

- Disable auto-anchor

```
anchor.autoAnchor(false);
```