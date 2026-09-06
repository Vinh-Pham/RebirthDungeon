package cloud.vinh.rebirthdungeon.presentation.dungeon

import com.badlogic.gdx.Input
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.utils.viewport.Viewport
import ktx.app.KtxInputAdapter
import kotlin.math.abs
import kotlin.math.floor

/** World-level input, routed AFTER the UI stage by the screen's
 * InputMultiplexer. Touches that the stage consumed (any HUD control)
 * never reach this handler; only taps that fall through onto the world do, and
 * they are unprojected through the world viewport — including extend/letterbox
 * areas — before touching gameplay. World coordinates are y-up, so "up" is
 * +1 on the y axis. */
class WorldInputHandler(
    private val worldViewport: Viewport,
    private val renderer: DungeonRenderer,
    private val sink: MoveSink
) : KtxInputAdapter {
    /** Callback that submits a move into the simulation for the active screen. */
    fun interface MoveSink {
        fun requestMove(dx: Int, dy: Int)
    }

    private val unproject = Vector3()

    override fun keyDown(keycode: Int): Boolean = when (keycode) {
        Input.Keys.UP, Input.Keys.W -> {
            sink.requestMove(0, 1)
            true
        }
        Input.Keys.DOWN, Input.Keys.S -> {
            sink.requestMove(0, -1)
            true
        }
        Input.Keys.LEFT, Input.Keys.A -> {
            sink.requestMove(-1, 0)
            true
        }
        Input.Keys.RIGHT, Input.Keys.D -> {
            sink.requestMove(1, 0)
            true
        }
        else -> false
    }

    override fun touchDown(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
        unproject.set(screenX.toFloat(), screenY.toFloat(), 0f)
        worldViewport.unproject(unproject)
        val cellX = floor(unproject.x / DungeonRenderer.TILE_SIZE).toInt()
        val cellY = floor(unproject.y / DungeonRenderer.TILE_SIZE).toInt()
        // Targeting reads the last completed cell; while the move track is
        // animating, the screen's submit gate drops any command anyway.
        val dx = cellX - renderer.playerCellX
        val dy = cellY - renderer.playerCellY
        if (abs(dx) + abs(dy) == 1) {
            sink.requestMove(dx, dy)
            return true
        }
        return false
    }
}
