package cloud.vinh.rebirthdungeon.presentation.dungeon

import com.badlogic.gdx.Input
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.utils.viewport.Viewport
import ktx.app.KtxInputAdapter
import kotlin.math.abs
import kotlin.math.floor

/** Stage gets first refusal. Taps and swipes resolve on release, so one gesture produces one command. */
class WorldInputHandler(private val viewport: Viewport, private val renderer: DungeonRenderer,
    private val wait: () -> Unit, private val sink: (Int, Int) -> Unit) : KtxInputAdapter {
    private var pointerId = -1
    private var startX = 0
    private var startY = 0
    fun cancelGesture() { pointerId = -1 }
    override fun touchCancelled(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
        if (pointer != pointerId) return false
        cancelGesture(); return true
    }
    override fun keyDown(keycode: Int): Boolean {
        when (keycode) {
            Input.Keys.UP, Input.Keys.W -> sink(0, 1)
            Input.Keys.DOWN, Input.Keys.S -> sink(0, -1)
            Input.Keys.LEFT, Input.Keys.A -> sink(-1, 0)
            Input.Keys.RIGHT, Input.Keys.D -> sink(1, 0)
            Input.Keys.SPACE, Input.Keys.PERIOD -> wait()
            else -> return false
        }
        return true
    }
    override fun touchDown(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
        if (pointerId != -1 || button != Input.Buttons.LEFT) return false
        pointerId = pointer; startX = screenX; startY = screenY
        return true
    }
    override fun touchUp(screenX: Int, screenY: Int, pointer: Int, button: Int): Boolean {
        if (pointer != pointerId) return false
        pointerId = -1
        val dx = screenX - startX; val dy = screenY - startY
        if (maxOf(abs(dx), abs(dy)) >= 32) {
            if (abs(dx) > abs(dy)) sink(if (dx > 0) 1 else -1, 0) else sink(0, if (dy < 0) 1 else -1)
        } else {
            val point = viewport.unproject(Vector3(screenX.toFloat(), screenY.toFloat(), 0f))
            val x = floor(point.x / DungeonRenderer.TILE_SIZE).toInt() - renderer.playerCellX
            val y = floor(point.y / DungeonRenderer.TILE_SIZE).toInt() - renderer.playerCellY
            if (abs(x) + abs(y) == 1) sink(x, y)
        }
        return true
    }
}
