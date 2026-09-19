[Skip to main content](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#__docusaurus_skipToContent_fallback)

Version: Phaser v4.1.0

On this page

The Web Audio API implementation of the Phaser Sound Manager.

This is the default Sound Manager used in Phaser when the browser supports the Web Audio API. It creates and manages an `AudioContext`, routes all sounds through a master gain node chain for global mute and volume control, and handles the browser autoplay policy by unlocking audio on the first user interaction.

Use this manager to add, play, and control sounds in your game. It is accessed via `this.sound` from within a Scene. If the browser does not support the Web Audio API, Phaser will fall back to the `HTML5AudioSoundManager` instead.

Not all browsers can play all audio formats.

There is a good guide to what's supported: [Cross-browser audio basics: Audio codec support](https://developer.mozilla.org/en-US/Apps/Fundamentals/Audio_and_video_delivery/Cross-browser_audio_basics#Audio_Codec_Support).

**Constructor**

`new WebAudioSoundManager(game)`

**Parameters**

| name | type | optional | description |
| --- | --- | --- | --- |
| game | [Phaser.Game](https://docs.phaser.io/api-documentation/class/game) | No | Reference to the current game instance. |

* * *

**Scope**: static

**Extends**

> [Phaser.Sound.BaseSoundManager](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager)

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L16](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L16)
>
> Since: 3.0.0

## Inherited Members [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#inherited-members "Direct link to Inherited Members")

**From [Phaser.Sound.BaseSoundManager](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager):**

- [detune](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#detune)
- [game](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#game)
- [gameLostFocus](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#gamelostfocus)
- [jsonCache](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#jsoncache)
- [listenerPosition](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#listenerposition)
- [locked](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#locked)
- [pauseOnBlur](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#pauseonblur)
- [rate](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#rate)

* * *

## Public Members [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#public-members "Direct link to Public Members")

### context [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#context "Direct link to context")

#### context: AudioContext [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#context-audiocontext "Direct link to context: AudioContext")

**Description:**

The AudioContext being used for playback.

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L49](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L49)
>
> Since: 3.0.0

* * *

### destination [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#destination "Direct link to destination")

#### destination: AudioNode [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#destination-audionode "Direct link to destination: AudioNode")

**Description:**

Destination node for connecting individual sounds to.

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L80](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L80)
>
> Since: 3.0.0

* * *

### masterMuteNode [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#mastermutenode "Direct link to masterMuteNode")

#### masterMuteNode: GainNode [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#mastermutenode-gainnode "Direct link to masterMuteNode: GainNode")

**Description:**

Gain node responsible for controlling global muting.

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L58](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L58)
>
> Since: 3.0.0

* * *

### masterVolumeNode [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#mastervolumenode "Direct link to masterVolumeNode")

#### masterVolumeNode: GainNode [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#mastervolumenode-gainnode "Direct link to masterVolumeNode: GainNode")

**Description:**

Gain node responsible for controlling global volume.

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L67](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L67)
>
> Since: 3.0.0

* * *

### mute [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#mute "Direct link to mute")

#### mute: boolean [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#mute-boolean "Direct link to mute: boolean")

**Overrides:** Phaser.Sound.BaseSoundManager#mute

**Fires:** [Phaser.Sound.Events#event:GLOBAL\_MUTE](https://docs.phaser.io/api-documentation/event/sound-events#GLOBAL_MUTE)

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L537](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L537)
>
> Since: 3.0.0

* * *

### volume [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#volume "Direct link to volume")

#### volume: number [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#volume-number "Direct link to volume: number")

**Overrides:** Phaser.Sound.BaseSoundManager#volume

**Fires:** [Phaser.Sound.Events#event:GLOBAL\_VOLUME](https://docs.phaser.io/api-documentation/event/sound-events#GLOBAL_VOLUME)

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L577](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L577)
>
> Since: 3.0.0

* * *

## Inherited Methods [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#inherited-methods "Direct link to Inherited Methods")

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

**From [Phaser.Sound.BaseSoundManager](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager):**

- [addAudioSprite](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#addaudiosprite)
- [get](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#get)
- [getAll](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#getall)
- [getAllPlaying](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#getallplaying)
- [isPlaying](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#isplaying)
- [pauseAll](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#pauseall)
- [play](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#play)
- [playAudioSprite](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#playaudiosprite)
- [remove](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#remove)
- [removeAll](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#removeall)
- [removeByKey](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#removebykey)
- [resumeAll](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#resumeall)
- [setDetune](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#setdetune)
- [setRate](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#setrate)
- [stopAll](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#stopall)
- [stopByKey](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager#stopbykey)

* * *

## Public Methods [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#public-methods "Direct link to Public Methods")

### add [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#add "Direct link to add")

#### <instance> add(key, \[config\]) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-addkey-config "Direct link to <instance> add(key, [config])")

**Description:**

Adds a new sound into the sound manager.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| key | string | No | Asset key for the sound. |
| config | [Phaser.Types.Sound.SoundConfig](https://docs.phaser.io/api-documentation/typedef/types-sound#SoundConfig) | Yes | An optional config object containing default sound settings. |

**Overrides:** Phaser.Sound.BaseSoundManager#add

**Returns:** [Phaser.Sound.WebAudioSound](https://docs.phaser.io/api-documentation/class/sound-webaudiosound) \- The new sound instance.

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L214](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L214)
>
> Since: 3.0.0

* * *

### createAudioContext [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#createaudiocontext "Direct link to createAudioContext")

#### <instance> createAudioContext(game) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-createaudiocontextgame "Direct link to <instance> createAudioContext(game)")

**Description:**

Method responsible for instantiating and returning AudioContext instance. If an instance of an AudioContext class was provided through the game config, that instance will be returned instead. This can come in handy if you are reloading a Phaser game on a page that never properly refreshes (such as in an SPA project) and you want to reuse already instantiated AudioContext.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| game | [Phaser.Game](https://docs.phaser.io/api-documentation/class/game) | No | Reference to the current game instance. |

**Returns:** AudioContext - The AudioContext instance to be used for playback.

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L135](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L135)
>
> Since: 3.0.0

* * *

### decodeAudio [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#decodeaudio "Direct link to decodeAudio")

#### <instance> decodeAudio(\[audioKey\], \[audioData\]) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-decodeaudioaudiokey-audiodata "Direct link to <instance> decodeAudio([audioKey], [audioData])")

**Description:**

Decode audio data into a format ready for playback via Web Audio.

The audio data can be a base64 encoded string, an audio media-type data uri, or an ArrayBuffer instance.

The `audioKey` is the key that will be used to save the decoded audio to the audio cache.

Instead of passing a single entry you can instead pass an array of `Phaser.Types.Sound.DecodeAudioConfig` objects as the first and only argument.

Decoding is an async process, so be sure to listen for the events to know when decoding has completed.

Once the audio has decoded it can be added to the Sound Manager or played via its key.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| audioKey | Array.< [Phaser.Types.Sound.DecodeAudioConfig](https://docs.phaser.io/api-documentation/typedef/types-sound#DecodeAudioConfig) \> \| string | Yes | The string-based key to be used to reference the decoded audio in the audio cache, or an array of audio config objects. |
| audioData | ArrayBuffer \| string | Yes | The audio data, either a base64 encoded string, an audio media-type data uri, or an ArrayBuffer instance. |

**Fires:** [Phaser.Sound.Events#event:DECODED](https://docs.phaser.io/api-documentation/event/sound-events#DECODED), [Phaser.Sound.Events#event:DECODED\_ALL](https://docs.phaser.io/api-documentation/event/sound-events#DECODED_ALL)

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L234](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L234)
>
> Since: 3.18.0

* * *

### destroy [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#destroy "Direct link to destroy")

#### <instance> destroy() [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-destroy "Direct link to <instance> destroy()")

**Description:**

Calls Phaser.Sound.BaseSoundManager#destroy method and cleans up all Web Audio API related resources.

**Overrides:** Phaser.Sound.BaseSoundManager#destroy

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L485](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L485)
>
> Since: 3.0.0

* * *

### onBlur [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#onblur "Direct link to onBlur")

#### <instance> onBlur() [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-onblur "Direct link to <instance> onBlur()")

**Description:**

Method used internally for pausing sound manager if Phaser.Sound.WebAudioSoundManager#pauseOnBlur is set to true.

**Access:** protected

**Overrides:** Phaser.Sound.BaseSoundManager#onBlur

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L391](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L391)
>
> Since: 3.0.0

* * *

### onFocus [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#onfocus "Direct link to onFocus")

#### <instance> onFocus() [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-onfocus "Direct link to <instance> onFocus()")

**Description:**

Method used internally for resuming sound manager if Phaser.Sound.WebAudioSoundManager#pauseOnBlur is set to true.

**Access:** protected

**Overrides:** Phaser.Sound.BaseSoundManager#onFocus

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L407](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L407)
>
> Since: 3.0.0

* * *

### setAudioContext [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#setaudiocontext "Direct link to setAudioContext")

#### <instance> setAudioContext(context) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-setaudiocontextcontext "Direct link to <instance> setAudioContext(context)")

**Description:**

This method takes a new AudioContext reference and then sets this Sound Manager to use that context for all playback.

As part of this call it also disconnects the master mute and volume nodes and then re-creates them on the new given context.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| context | AudioContext | No | Reference to an already created AudioContext instance. |

**Returns:** [Phaser.Sound.WebAudioSoundManager](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager) \- The WebAudioSoundManager instance.

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L170](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L170)
>
> Since: 3.21.0

* * *

### setListenerPosition [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#setlistenerposition "Direct link to setListenerPosition")

#### <instance> setListenerPosition(\[x\], \[y\]) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-setlistenerpositionx-y "Direct link to <instance> setListenerPosition([x], [y])")

**Description:**

Sets the X and Y position of the Spatial Audio listener on this Web Audio context.

If you call this method with no parameters it will default to the center-point of the game canvas. Depending on the type of game you're making, you may need to call this method constantly to reset the listener position as the camera scrolls.

Calling this method does nothing on HTML5Audio.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| x | number | Yes | The x position of the Spatial Audio listener. |
| y | number | Yes | The y position of the Spatial Audio listener. |

**Overrides:** Phaser.Sound.BaseSoundManager#setListenerPosition

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L315](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L315)
>
> Since: 3.60.0

* * *

### setMute [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#setmute "Direct link to setMute")

#### <instance> setMute(value) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-setmutevalue "Direct link to <instance> setMute(value)")

**Description:**

Sets the muted state of this Sound Manager.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| value | boolean | No | `true` to mute all sounds, `false` to unmute them. |

**Returns:** [Phaser.Sound.WebAudioSoundManager](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager) \- This Sound Manager.

**Fires:** [Phaser.Sound.Events#event:GLOBAL\_MUTE](https://docs.phaser.io/api-documentation/event/sound-events#GLOBAL_MUTE)

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L519](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L519)
>
> Since: 3.3.0

* * *

### setVolume [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#setvolume "Direct link to setVolume")

#### <instance> setVolume(value) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-setvolumevalue "Direct link to <instance> setVolume(value)")

**Description:**

Sets the volume of this Sound Manager.

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| value | number | No | The global volume of this Sound Manager. |

**Returns:** [Phaser.Sound.WebAudioSoundManager](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager) \- This Sound Manager.

**Fires:** [Phaser.Sound.Events#event:GLOBAL\_VOLUME](https://docs.phaser.io/api-documentation/event/sound-events#GLOBAL_VOLUME)

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L559](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L559)
>
> Since: 3.3.0

* * *

### unlock [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#unlock "Direct link to unlock")

#### <instance> unlock() [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-unlock "Direct link to <instance> unlock()")

**Description:**

Unlocks Web Audio API on the initial input event.

Read more about how this issue is handled here in [this article](https://medium.com/@pgoloskokovic/unlocking-web-audio-the-smarter-way-8858218c0e09).

**Overrides:** Phaser.Sound.BaseSoundManager#unlock

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L340](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L340)
>
> Since: 3.0.0

* * *

### update [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#update "Direct link to update")

#### <instance> update(time, delta) [​](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager\#instance-updatetime-delta "Direct link to <instance> update(time, delta)")

**Description:**

Update method called on every game step.

Removes destroyed sounds and updates every active sound in the game.

**Access:** protected

**Parameters:**

| name | type | optional | description |
| --- | --- | --- | --- |
| time | number | No | The current timestamp as generated by the Request Animation Frame or SetTimeout. |
| delta | number | No | The delta time elapsed since the last frame. |

**Overrides:** Phaser.Sound.BaseSoundManager#update

**Fires:** [Phaser.Sound.Events#event:UNLOCKED](https://docs.phaser.io/api-documentation/event/sound-events#UNLOCKED)

> Source: [src/sound/webaudio/WebAudioSoundManager.js#L425](https://github.com/phaserjs/phaser/blob/v4.1.0/src/sound/webaudio/WebAudioSoundManager.js#L425)
>
> Since: 3.0.0

* * *

````

- [Inherited Members](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#inherited-members)
- [Public Members](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#public-members)
  - [context](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#context)
  - [destination](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#destination)
  - [masterMuteNode](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#mastermutenode)
  - [masterVolumeNode](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#mastervolumenode)
  - [mute](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#mute)
  - [volume](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#volume)
- [Inherited Methods](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#inherited-methods)
- [Public Methods](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#public-methods)
  - [add](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#add)
  - [createAudioContext](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#createaudiocontext)
  - [decodeAudio](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#decodeaudio)
  - [destroy](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#destroy)
  - [onBlur](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#onblur)
  - [onFocus](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#onfocus)
  - [setAudioContext](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#setaudiocontext)
  - [setListenerPosition](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#setlistenerposition)
  - [setMute](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#setmute)
  - [setVolume](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#setvolume)
  - [unlock](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#unlock)
  - [update](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager#update)