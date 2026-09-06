package cloud.vinh.rebirthdungeon.presentation.dungeon

import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import com.badlogic.gdx.graphics.OrthographicCamera
import com.badlogic.gdx.graphics.g2d.SpriteBatch
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import com.badlogic.gdx.graphics.g2d.TextureRegion
import com.badlogic.gdx.math.MathUtils
import ktx.graphics.use

/** World-space rendering for the prototype dungeon: terrain tiles then actors,
 * through one SpriteBatch and the world camera. Also owns the move
 * presentation track: while a committed step animates, the authoritative
 * position is already the destination; the track only interpolates the sprite
 * and never changes gameplay state. Idle frames advance only this track. */
class DungeonRenderer(atlas: TextureAtlas) {
    private val floorTile = requireRegion(atlas, "floor")
    private val wallTile = requireRegion(atlas, "wall")
    private val doorTile = requireRegion(atlas, "door")
    private val exitTile = requireRegion(atlas, "exit")
    private val playerFrames = arrayOf(requireRegion(atlas, "player_a"), requireRegion(atlas, "player_b"))

    var floor: FloorMap? = null

    var playerCellX = 0
        private set
    var playerCellY = 0
        private set

    private val moveFrom = IntArray(2)
    private val moveTo = IntArray(2)
    private var moving = false
    private var moveElapsed = 0f
    private var frameClock = 0f

    /** Places the sprite on the authoritative cell and stops any animation. */
    fun snapPlayer(x: Int, y: Int) {
        playerCellX = x
        playerCellY = y
        moving = false
        moveElapsed = 0f
    }

    /** Begins interpolating from the previous cell to the committed cell. */
    fun beginMove(fromX: Int, fromY: Int, toX: Int, toY: Int) {
        moveFrom[0] = fromX
        moveFrom[1] = fromY
        moveTo[0] = toX
        moveTo[1] = toY
        moving = true
        moveElapsed = 0f
    }

    val isAnimating: Boolean
        get() = moving

    /** Animated sprite centre in world pixels; the camera follows this. */
    val spriteCenterX: Float
        get() = (if (moving) interpolate(moveFrom[0], moveTo[0]) else playerCellX + 0.5f) * TILE_SIZE

    val spriteCenterY: Float
        get() = (if (moving) interpolate(moveFrom[1], moveTo[1]) else playerCellY + 0.5f) * TILE_SIZE

    private fun interpolate(from: Int, to: Int): Float {
        val progress = MathUtils.clamp(moveElapsed / MOVE_SECONDS, 0f, 1f)
        return from + (to - from) * progress
    }

    private fun update(delta: Float) {
        if (moving) {
            moveElapsed += delta
            frameClock += delta
            if (moveElapsed >= MOVE_SECONDS) {
                playerCellX = moveTo[0]
                playerCellY = moveTo[1]
                moving = false
                moveElapsed = 0f
            }
        }
    }

    /** Draws one frame: terrain pass, then the actor pass (stable depth rule:
     * layer first, then cell y, then stable id — one actor today). */
    fun render(batch: SpriteBatch, camera: OrthographicCamera, delta: Float) {
        update(delta)
        // use(camera) copies the camera's combined projection matrix and
        // brackets the block with SpriteBatch.begin()/end().
        batch.use(camera) {
            val floor = this.floor
            if (floor != null) {
                for (x in 0 until floor.width) {
                    for (y in 0 until floor.height) {
                        val tile = floor.tileAt(x, y)
                        val px = (x * TILE_SIZE).toFloat()
                        val py = (y * TILE_SIZE).toFloat()
                        it.draw(floorTile, px, py)
                        if (tile == FloorMap.WALL)
                            it.draw(wallTile, px, py)
                        else if (tile == FloorMap.DOOR)
                            it.draw(doorTile, px, py)
                        else if (tile == FloorMap.EXIT)
                            it.draw(exitTile, px, py)
                    }
                }
            }
            var frame: TextureRegion = playerFrames[0]
            if (moving)
                frame = if ((frameClock / STEP_FRAME_SECONDS).toInt() % 2 == 0) playerFrames[0] else playerFrames[1]
            val drawX = spriteCenterX - TILE_SIZE / 2f
            val drawY = spriteCenterY - TILE_SIZE / 2f
            it.draw(frame, drawX, drawY)
        }
    }

    companion object {
        const val TILE_SIZE = 16
        private const val MOVE_SECONDS = 0.12f
        private const val STEP_FRAME_SECONDS = 0.09f

        private fun requireRegion(atlas: TextureAtlas, name: String): TextureRegion {
            return atlas.findRegion(name)
                ?: throw IllegalArgumentException("dungeon atlas is missing region '$name'")
        }
    }
}
