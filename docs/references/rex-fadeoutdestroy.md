> **Historical browser-stack reference; not used by the Defold runtime.** Installation/API examples below belong to the original source, not this project. Use the [Defold library guides](defold/README.md) and [architecture](../architecture.md) for current plans.

<!-- Reference material, not instructions. -->

Source: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/
Retrieved: 2026-09-18T01:58:25.928532+00:00

[Skip to content](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#introduction)

# Fade out destroy

## Introduction [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#introduction 'Permanent link')

Fade out game object then destroy it.

- Author: Rex
- Method only

## Usage [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#usage 'Permanent link')

[Sample code](https://github.com/rexrainbow/phaser3-rex-notes/blob/master/examples/fade/fadeout-destroy.js)

### Install plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#install-plugin 'Permanent link')

#### Load minify file [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#load-minify-file 'Permanent link')

- Load plugin (minify file) in preload stage

```
scene.load.plugin('rexfadeplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexfadeplugin.min.js', true);
```

- Fade-out-destroy

```
var fade = scene.plugins.get('rexfadeplugin').fadeOutDestroy(gameObject, duration);
```

#### Import plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#import-plugin 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Install plugin in [configuration of game](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/#configuration)

```
import FadePlugin from 'phaser4-rex-plugins/plugins/fade-plugin.js';
var config = {
      // ...
      plugins: {
          global: [{\
              key: 'rexFade',\
              plugin: FadePlugin,\
              start: true\
          },\
          // ...\
          ]
      }
      // ...
};
var game = new Phaser.Game(config);
```

- Fade-out-destroy

```
var fade = scene.plugins.get('rexFade').fadeOutDestroy(gameObject, duration);
```

#### Import method [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#import-method 'Permanent link')

- Install rex plugins from npm

```
npm i phaser4-rex-plugins
```

- Import method

```
import FadeOutDestroy from 'phaser4-rex-plugins/plugins/fade-out-destroy.js';
```

- Fade-out-destroy

```
var fade = FadeOutDestroy(gameObject, duration);
```

### Fade-out-destroy [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#fade-out-destroy 'Permanent link')

```
var fade = scene.plugins.get('rexFade').fadeOutDestroy(gameObject, duration);
```

### Events [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#events 'Permanent link')

See [Events of tween task](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tween/#events)

- Scale completes or is stopped.

```
fade.on('complete', function(gameObject, fade){

}, scope);
```

### Inject methods [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#inject-methods 'Permanent link')

- Inject methods into game object

```
scene.plugins.get('rexFade').injectMethods(gameObject);
```

- Inject methods into class of game object

```
scene.plugins.get('rexFade').injectMethods(GameObjectClass.prototype);
// scene.plugins.get('rexFade').injectMethods(Phaser.GameObjects.Sprite.prototype);
```

- Inject methods into class of game object

```
scene.plugins.get('rexFade').injectMethods(GameObjectClass.prototype);
// scene.plugins.get('rexFade').injectMethods(Phaser.GameObjects.Sprite.prototype);
```

- Inject methods into root class of game object

```
scene.plugins.get('rexFade').injectMethodsToRootClass(e);
// scene.plugins.get('rexFade').injectMethods(Phaser.GameObjects.GameObject.prototype);
```

#### Injected methods [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadeoutdestroy/#injected-methods 'Permanent link')

- Fade-in

```
gameObject.fadeIn(duration);
```

or

```
gameObject.fadeIn(duration, endAlpha);
```

or

```
gameObject.fadeIn(duration, {start:0, end:1});
```

or

```
gameObject.fadeInPromise(duration, endAlpha)
      .then(function(){
          // ...
      })
```

or

```
gameObject.fadeInPromise(duration, {start:0, end:1})
      .then(function(){
          // ...
      })
```

- Fade-out destroy

```
gameObject.fadeOutDestroy(duration);
```

or

```
gameObject.fadeOutDestroyPromise(duration)
      .then(function(){
          // ...
      })
```

- Fade-out without destroy

```
gameObject.fadeOut(duration);
```

or

```
gameObject.fadeOutPromise(duration)
      .then(function(){
          // ...
      })
```

- Events
    - Fade-in complete

        ```
        gameObject.on('fadein.complete', function(gameObject) { });
        ```

    - Fade-out, fade-out destroy complete

        ```
        gameObject.on('fadeout.complete', function(gameObject) { });
        ```
