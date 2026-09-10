package cloud.vinh.rebirthdungeon.presentation.audio

import cloud.vinh.rebirthdungeon.presentation.animation.CombatFeedback
import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Input
import com.badlogic.gdx.audio.Sound

/** Sound is managed by the application assets; optional vibration uses the backend capability. */
class GdxCombatFeedback(private val sound: Sound) : CombatFeedback {
    var volume = 0.35f
    var haptics = false
    override fun attack() { if (volume > 0f) sound.play(volume) }
    override fun damage() {
        if (haptics && Gdx.input.isPeripheralAvailable(Input.Peripheral.Vibrator)) Gdx.input.vibrate(20)
    }
}
