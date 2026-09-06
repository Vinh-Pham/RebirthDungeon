package cloud.vinh.rebirthdungeon.presentation.screens

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Input
import com.badlogic.gdx.graphics.Pixmap
import com.badlogic.gdx.graphics.PixmapIO
import com.badlogic.gdx.utils.ScreenUtils
import ktx.assets.disposeSafely
import ktx.log.error
import ktx.log.info

/** Prototype diagnostic: F12 writes the current frame into `screenshots/`
 * in the game's local storage. Purely for verifying rendering during
 * development; never touches gameplay state. Safe to remove with the prototype
 * in Phase 9. */
object Screenshots {

    fun captureIfRequested(tag: String) {
        if (Gdx.input.isKeyJustPressed(Input.Keys.F12))
            capture(tag)
    }

    fun capture(tag: String) {
        try {
            val width = Gdx.graphics.width
            val height = Gdx.graphics.height
            val frame = ScreenUtils.getFrameBufferPixmap(0, 0, width, height)
            // The framebuffer reads bottom-up; flip rows into a top-down image.
            val flipped = Pixmap(width, height, frame.format)
            for (y in 0 until height)
                flipped.drawPixmap(frame, 0, y, width, 1, 0, height - 1 - y, width, 1)
            Gdx.files.local("screenshots").mkdirs()
            val name = "screenshots/rebirth-$tag-${System.currentTimeMillis()}.png"
            PixmapIO.writePNG(Gdx.files.local(name), flipped)
            info("Screenshots") { "wrote " + Gdx.files.local(name).file().absolutePath }
            // disposeSafely releases both pixmaps even if the first release throws
            // (a plain throw here would previously leak the second pixmap).
            flipped.disposeSafely()
            frame.disposeSafely()
        } catch (failure: RuntimeException) {
            error(failure, "Screenshots") { "capture failed" }
        }
    }
}
