[Skip to content](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/#introduction)

# Volume fading

## Introduction [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#introduction "Permanent link")

Fade-in/fade-out volume of sound.

- Author: Rex
- Method only

## Usage [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#usage "Permanent link")

[Sample code](https://github.com/rexrainbow/phaser3-rex-notes/blob/master/examples/sound-fade)

### Install plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#install-plugin "Permanent link")

#### Load minify file [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#load-minify-file "Permanent link")

- Load plugin (minify file) in preload stage



```
scene.load.plugin('rexsoundfadeplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexsoundfadeplugin.min.js', true);
```

- Sound fade-in/fade-out



```
var sound = scene.plugins.get('rexsoundfadeplugin').fadeIn(sound, duration);
var sound = scene.plugins.get('rexsoundfadeplugin').fadeOut(sound, duration);
```


#### Import plugin [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#import-plugin "Permanent link")

- Install rex plugins from npm



```
npm i phaser4-rex-plugins
```

- Install plugin in [configuration of game](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/#configuration)


```
import SoundFadePlugin from 'phaser4-rex-plugins/plugins/soundfade-plugin.js';
var config = {
      // ...
      plugins: {
          global: [{\
              key: 'rexSoundFade',\
              plugin: SoundFadePlugin,\
              start: true\
          },\
          // ...\
          ]
      }
      // ...
};
var game = new Phaser.Game(config);
```

- Sound fade-in/fade-out



```
var sound = scene.plugins.get('rexSoundFade').fadeIn(sound, duration);
var sound = scene.plugins.get('rexSoundFade').fadeOut(sound, duration);
```


#### Import method [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#import-method "Permanent link")

- Install rex plugins from npm



```
npm i phaser4-rex-plugins
```

- Import method



```
import SoundFade from 'phaser4-rex-plugins/plugins/soundfade.js';
```

- Sound fade-in/fade-out



```
var sound = SoundFade.fadeIn(sound, duration);
var sound = SoundFade.fadeOut(sound, duration);
```


### Fade in [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#fade-in "Permanent link")

- Play and fade in voluem.



```
var sound = scene.plugins.get('rexSoundFade').fadeIn(sound, duration);
// var sound = scene.plugins.get('rexSoundFade').fadeIn(sound, duration, endVolume, startVolume);
```


  - `sound` : Sound instance, or a key of audio cache.

### Fade out [¶](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fadevolume/\#fade-out "Permanent link")

- Fade out volume then destroy it



```
scene.plugins.get('rexSoundFade').fadeOut(sound, duration);
```


  - `sound` : Sound instance.
- Fade out volume then stop it



```
scene.plugins.get('rexSoundFade').fadeOut(sound, duration, false);
```


  - `sound` : Sound instance.