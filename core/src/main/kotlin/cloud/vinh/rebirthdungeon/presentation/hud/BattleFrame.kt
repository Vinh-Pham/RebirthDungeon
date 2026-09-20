package cloud.vinh.rebirthdungeon.presentation.hud

import com.badlogic.gdx.graphics.g2d.Batch
import com.badlogic.gdx.scenes.scene2d.utils.BaseDrawable
import com.badlogic.gdx.scenes.scene2d.utils.Drawable

/** Battle-only blue panels; the shared exploration skin remains independently styled. */
internal class BattleFrame(private val pixel: Drawable, private val highlighted: Boolean = false) : BaseDrawable() {
    override fun draw(batch: Batch, x: Float, y: Float, width: Float, height: Float) {
        val old = batch.packedColor
        batch.setColor(0.65f, 0.72f, 0.9f, 1f)
        pixel.draw(batch, x, y, width, height)
        batch.setColor(0.06f, 0.09f, 0.25f, 1f)
        pixel.draw(batch, x + 2, y + 2, (width - 4).coerceAtLeast(0f), (height - 4).coerceAtLeast(0f))
        batch.setColor(if (highlighted) 0.19f else 0.10f, if (highlighted) 0.27f else 0.16f, if (highlighted) 0.56f else 0.39f, 1f)
        pixel.draw(batch, x + 3, y + height / 2, (width - 6).coerceAtLeast(0f), (height / 2 - 3).coerceAtLeast(0f))
        batch.packedColor = old
    }
}
