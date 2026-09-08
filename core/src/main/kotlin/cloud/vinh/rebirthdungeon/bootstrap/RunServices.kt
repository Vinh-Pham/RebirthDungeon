package cloud.vinh.rebirthdungeon.bootstrap

import cloud.vinh.rebirthdungeon.application.run.RunController
import cloud.vinh.rebirthdungeon.data.save.*
import cloud.vinh.rebirthdungeon.data.save.codec.UnsupportedCheckpoint
import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.content.ContentCatalog
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.grid.FloorGenerationResult
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.ActorState
import com.badlogic.gdx.Application
import com.badlogic.gdx.Gdx

/** Application lifetime owns the one writer and active controller across screen changes. */
class RunServices(private val catalog: ContentCatalog) {
    private val root = if (Gdx.app.type == Application.ApplicationType.Desktop)
        Gdx.files.absolute(System.getenv("REBIRTH_CHECKPOINT_DIR") ?: (System.getProperty("user.home") + "/.rebirthdungeon/saves")) else Gdx.files.local("saves")
    private val repository = AlternatingCheckpointRepository(LocalCheckpointStorage(root)) {
        if (it.version != catalog.version) throw UnsupportedCheckpoint("Checkpoint requires different content/rules; files preserved")
        DungeonSimulation.validateRestore(it, catalog)
    }
    private var token = 0L
    var active: RunController? = null
        private set
    fun resume(): RunController? {
        active?.let { return it }
        val state = repository.load() ?: return null
        val controller = RunController(DungeonSimulation.restore(state, catalog), repository, ++token)
        active = controller
        controller.startOrResume()
        return controller
    }
    fun reload(): RunController? {
        val state = repository.load() ?: return active
        val replacement = RunController(DungeonSimulation.restore(state, catalog), repository, ++token)
        replacement.startOrResume()
        active?.close(); active = replacement
        return replacement
    }
    fun start(seed: Long, generated: FloorGenerationResult.Success): RunController {
        val enemy = catalog.actors.getValue(ContentId("actor.enemy"))
        val actors = generated.enemy?.let { listOf(ActorState(EntityId(2), enemy.id, Cell(it.x, it.y), false, true, true, 6,
            enemy.resources.hp, enemy.resources.hp)) } ?: emptyList()
        val floor = generated.floor
        val session = RunSession(seed, catalog, runId = "run.${java.util.UUID.randomUUID()}")
        val simulation = DungeonSimulation.create(floor.floor, floor.spawnX, floor.spawnY, session, actors, generated.attempt)
        val controller = RunController(simulation, repository, ++token)
        controller.startOrResume()
        active?.close()
        active = controller
        return controller
    }
    fun dispose() { active?.checkpoint(); active?.close(); active = null }
}
