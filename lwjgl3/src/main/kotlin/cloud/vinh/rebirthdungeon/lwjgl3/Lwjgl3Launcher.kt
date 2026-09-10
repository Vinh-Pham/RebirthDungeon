package cloud.vinh.rebirthdungeon.lwjgl3

import cloud.vinh.rebirthdungeon.RebirthDungeon
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration

/** Launches the desktop (LWJGL3) application. */
object Lwjgl3Launcher {

    @JvmStatic
    fun main(args: Array<String>) {
        if (StartupHelper.startNewJvmIfRequired()) return // This handles macOS support and helps on Windows.
        createApplication()
    }

    private fun createApplication(): Lwjgl3Application {
        return Lwjgl3Application(RebirthDungeon(), defaultConfiguration)
    }

    private val defaultConfiguration: Lwjgl3ApplicationConfiguration
        get() {
            val configuration = Lwjgl3ApplicationConfiguration()
            configuration.setTitle("RebirthDungeon")
            configuration.setPauseWhenLostFocus(true)
            // Vsync limits the frames per second to what your hardware can display, and helps eliminate
            // screen tearing. This setting doesn't always work on Linux, so the line after is a safeguard.
            configuration.useVsync(true)
            // Limits FPS to the refresh rate of the currently active monitor, plus 1 to try to match fractional
            // refresh rates. The Vsync setting above should limit the actual FPS to match the monitor.
            configuration.setForegroundFPS(Lwjgl3ApplicationConfiguration.getDisplayMode().refreshRate + 1)

            // Landscape window matching the mobile layout (16:9); the world
            // viewport scales 3x integer from its 320x180 logical minimum.
            configuration.setWindowedMode(960, 540)
            // Window icons live in lwjgl3/src/main/resources/.
            configuration.setWindowIcon("libgdx128.png", "libgdx64.png", "libgdx32.png", "libgdx16.png")

            return configuration
        }
}
