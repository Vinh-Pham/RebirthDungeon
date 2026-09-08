package cloud.vinh.rebirthdungeon.presentation.dungeon

import cloud.vinh.rebirthdungeon.data.content.ContentBundle
import cloud.vinh.rebirthdungeon.game.events.ActorMoved
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import cloud.vinh.rebirthdungeon.game.projection.DungeonObservation
import com.badlogic.gdx.graphics.OrthographicCamera
import com.badlogic.gdx.graphics.g2d.SpriteBatch
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import ktx.graphics.use

/** Receives observed values only. Unseen actor positions and actual hidden terrain never enter here. */
class DungeonRenderer(atlas: TextureAtlas, content: ContentBundle) {
    private val regions = content.visuals.associate { binding -> binding.id to binding.frames.map { checkNotNull(atlas.findRegion(it)) } }
    private var observation: DungeonObservation? = null
    var playerCellX = 0
        private set
    var playerCellY = 0
        private set
    private var elapsed = 1f
    private var fromX = 0
    private var fromY = 0
    private var toX = 0
    private var toY = 0
    private var lastEvent = 0L
    private var runId: String? = null
    val isAnimating get() = elapsed < MOVE_SECONDS
    val spriteCenterX get() = (fromX + (toX - fromX) * progress() + 0.5f) * TILE_SIZE
    val spriteCenterY get() = (fromY + (toY - fromY) * progress() + 0.5f) * TILE_SIZE
    private fun progress() = (elapsed / MOVE_SECONDS).coerceIn(0f, 1f)
    fun snapPlayer(x: Int, y: Int) {
        playerCellX = x; playerCellY = y; fromX = x; toX = x; fromY = y; toY = y; elapsed = MOVE_SECONDS
    }
    fun accept(value: DungeonObservation, animate: Boolean = true) {
        if (runId != value.runId) { runId = value.runId; lastEvent = 0 }
        observation = value
        val movement = value.events.filter { it.sequence > lastEvent }.map { it.event }.filterIsInstance<ActorMoved>().lastOrNull { it.actor == value.player }
        lastEvent = maxOf(lastEvent, value.events.maxOfOrNull { it.sequence } ?: 0)
        if (animate && movement != null) {
            fromX = movement.from.x; fromY = movement.from.y; toX = movement.to.x; toY = movement.to.y; elapsed = 0f
        } else snapPlayer(value.playerCell.x, value.playerCell.y)
    }
    fun render(batch: SpriteBatch, camera: OrthographicCamera, delta: Float) {
        elapsed = minOf(MOVE_SECONDS, elapsed + delta)
        if (!isAnimating) { playerCellX = toX; playerCellY = toY }
        val view = observation ?: return
        batch.use(camera) { b ->
            for (y in 0 until view.height) for (x in 0 until view.width) {
                val tile = view.tileAt(x, y)
                if (tile < 0) continue
                val brightness = if (view.visibleAt(x, y)) 1f else 0.28f
                b.setColor(brightness, brightness, brightness, 1f)
                val id = when (tile) {
                    FloorMap.WALL -> "tile.wall"
                    FloorMap.DOOR, FloorMap.LOCKED_DOOR -> "tile.door"
                    FloorMap.EXIT -> "tile.exit"
                    else -> "tile.floor"
                }
                b.draw(regions.getValue(ContentId(id)).first(), (x * TILE_SIZE).toFloat(), (y * TILE_SIZE).toFloat())
            }
            for (actor in view.actors.sortedWith(compareBy({ it.cell.y }, { it.id.value }))) {
                val frames = regions.getValue(actor.definition)
                if (actor.player) b.setColor(1f, 1f, 1f, 1f) else b.setColor(1f, 0.45f, 0.45f, 1f)
                val x = if (actor.player) spriteCenterX - TILE_SIZE / 2f else (actor.cell.x * TILE_SIZE).toFloat()
                val y = if (actor.player) spriteCenterY - TILE_SIZE / 2f else (actor.cell.y * TILE_SIZE).toFloat()
                b.draw(frames[if (isAnimating) (elapsed / 0.06f).toInt() % frames.size else 0], x, y)
            }
            b.setColor(1f, 1f, 1f, 1f)
        }
    }
    companion object { const val TILE_SIZE = 16; private const val MOVE_SECONDS = 0.12f }
}
