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
class DungeonRenderer(atlas: TextureAtlas, content: ContentBundle,
    val combatTracks: cloud.vinh.rebirthdungeon.presentation.animation.CombatTracks = cloud.vinh.rebirthdungeon.presentation.animation.CombatTracks(),
    private val font: com.badlogic.gdx.graphics.g2d.BitmapFont? = null) {
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
    val isAnimating get() = elapsed < MOVE_SECONDS || combatTracks.playing
    val cameraFeedbackX get() = if (combatTracks.tracks.any { it.kind == "damage" && it.actor == observation?.player })
        kotlin.math.sin(combatTracks.progress * kotlin.math.PI.toFloat() * 4) * (1 - combatTracks.progress) * 2f else 0f
    val spriteCenterX get() = (fromX + (toX - fromX) * progress() + 0.5f) * TILE_SIZE
    val spriteCenterY get() = (fromY + (toY - fromY) * progress() + 0.5f) * TILE_SIZE
    private fun progress() = (elapsed / MOVE_SECONDS).coerceIn(0f, 1f)
    fun snapPlayer(x: Int, y: Int) {
        playerCellX = x; playerCellY = y; fromX = x; toX = x; fromY = y; toY = y; elapsed = MOVE_SECONDS
    }
    fun accept(value: DungeonObservation, animate: Boolean = true) {
        if (runId != value.runId) { runId = value.runId; lastEvent = 0 }
        combatTracks.accept(value, animate)
        observation = value
        val movement = value.events.filter { it.sequence > lastEvent }.map { it.event }.filterIsInstance<ActorMoved>().lastOrNull { it.actor == value.player }
        lastEvent = maxOf(lastEvent, value.events.maxOfOrNull { it.sequence } ?: 0)
        if (animate && movement != null) {
            fromX = movement.from.x; fromY = movement.from.y; toX = movement.to.x; toY = movement.to.y; elapsed = 0f
        } else snapPlayer(value.playerCell.x, value.playerCell.y)
    }
    fun skip() { combatTracks.skip(); elapsed = MOVE_SECONDS; observation?.let { snapPlayer(it.playerCell.x, it.playerCell.y) } }
    fun render(batch: SpriteBatch, camera: OrthographicCamera, delta: Float) {
        combatTracks.advance(delta)
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
                val movement = combatTracks.tracks.lastOrNull { it.actor == actor.id && it.kind == "move" }
                if (combatTracks.tracks.any { it.actor == actor.id && it.kind == "attack" }) b.setColor(1f, 0.85f, 0.4f, 1f)
                val x = if (actor.player) spriteCenterX - TILE_SIZE / 2f else ((movement?.from?.x?.let { it + (actor.cell.x - it) * combatTracks.progress } ?: actor.cell.x.toFloat()) * TILE_SIZE)
                val y = if (actor.player) spriteCenterY - TILE_SIZE / 2f else ((movement?.from?.y?.let { it + (actor.cell.y - it) * combatTracks.progress } ?: actor.cell.y.toFloat()) * TILE_SIZE)
                b.draw(frames[if (isAnimating) (elapsed / 0.06f).toInt() % frames.size else 0], x, y)
            }
            b.setColor(1f, 1f, 1f, 1f)
            combatTracks.tracks.filter { it.kind != "move" }.forEach { track ->
                val text = when (track.kind) { "damage" -> "-${track.amount}"; "death" -> "X"; else -> "!" }
                font?.draw(b, text, track.cell.x * TILE_SIZE.toFloat(), (track.cell.y + 1) * TILE_SIZE + combatTracks.progress * 8f)
            }
        }
    }
    companion object { const val TILE_SIZE = 16; private const val MOVE_SECONDS = 0.12f }
}
