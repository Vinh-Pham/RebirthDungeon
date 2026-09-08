package cloud.vinh.rebirthdungeon.presentation.screens

import cloud.vinh.rebirthdungeon.RebirthDungeon
import cloud.vinh.rebirthdungeon.application.run.RunController
import cloud.vinh.rebirthdungeon.bootstrap.SessionWorker
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.grid.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import cloud.vinh.rebirthdungeon.game.squidsquad.SquidDungeonGenerator
import cloud.vinh.rebirthdungeon.presentation.dungeon.*
import com.badlogic.gdx.*
import com.badlogic.gdx.graphics.OrthographicCamera
import com.badlogic.gdx.graphics.g2d.SpriteBatch
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.ui.*
import com.badlogic.gdx.utils.viewport.*
import ktx.app.KtxScreen
import ktx.app.clearScreen
import ktx.actors.onClick
import java.util.concurrent.Callable

/** Screen owns presentation/worker only; the application controller and writer survive menus. */
class DungeonScreen(private val game: RebirthDungeon) : KtxScreen {
    private lateinit var batch: SpriteBatch
    private lateinit var camera: OrthographicCamera
    private lateinit var viewport: ExtendViewport
    private lateinit var stage: Stage
    private lateinit var renderer: DungeonRenderer
    private lateinit var worldInput: WorldInputHandler
    private lateinit var input: InputMultiplexer
    private lateinit var status: Label
    private lateinit var hud: Label
    private var worker: SessionWorker? = null
    private var controller: RunController? = null
    private var generating = false
    private var demoTimer = 0f
    private var demoStep = 0
    private var newRun = 0L
    override fun show() {
        batch = SpriteBatch(); camera = OrthographicCamera(); viewport = ExtendViewport(320f, 180f, camera)
        stage = Stage(ScreenViewport())
        renderer = DungeonRenderer(game.assets().get(RebirthDungeon.DUNGEON_ATLAS, TextureAtlas::class.java), game.content())
        val skin = game.assets().get(RebirthDungeon.UI_SKIN, Skin::class.java)
        val root = Table(); root.setFillParent(true); root.top().left().pad(Gdx.graphics.safeInsetTop + 8f, Gdx.graphics.safeInsetRight + 8f,
            Gdx.graphics.safeInsetBottom + 8f, Gdx.graphics.safeInsetLeft + 8f); stage.addActor(root)
        hud = Label("", skin); status = Label("Loading checkpoint...", skin)
        root.add(hud).left().row(); root.add(status).left().row()
        val controls = Table()
        fun button(label: String, action: () -> Unit) = TextButton(label, skin).also {
            it.onClick { action() }; controls.add(it).minWidth(76f).minHeight(44f).pad(2f)
        }
        button("Menu") { controller?.checkpoint(); game.navigateTo(LoadingScreen(game)) }
        button("New run") { startGeneration() }
        button("Reload") { reload() }
        button("Retry save") { controller?.retrySave(); refresh(false) }
        controls.row()
        button("<") { submit(MoveCommand(-1, 0)) }; button("^") { submit(MoveCommand(0, 1)) }
        button("v") { submit(MoveCommand(0, -1)) }; button(">") { submit(MoveCommand(1, 0)) }
        button("Wait") { submit(WaitCommand) }
        root.add(controls).expand().bottom().right()
        worldInput = WorldInputHandler(viewport, renderer, { submit(WaitCommand) }) { x, y -> submit(MoveCommand(x, y)) }
        input = InputMultiplexer(stage, worldInput)
        Gdx.input.inputProcessor = input
        worker = SessionWorker(SessionWorker.Trampoline { Gdx.app.postRunnable(it) })
        try {
            controller = game.runs().resume()
            if (controller == null) startGeneration() else refresh(false)
        } catch (failure: Exception) { status.setText("Checkpoint load failed: ${failure.message}") }
    }
    private fun startGeneration() {
        if (generating || controller?.failure != null) return
        generating = true
        status.setText("Generating floor...")
        val profile = game.content().catalog.generations.getValue(ContentId("generation.starter"))
        val seed = 0x5DEECE66DL + newRun++
        val worker = checkNotNull(worker)
        val token = worker.beginSession()
        worker.submit(token, Callable { FloorGeneration(SquidDungeonGenerator()).generate(seed, 0, profile) }, object : SessionWorker.ResultHandler<FloorGenerationResult> {
            override fun onResult(result: FloorGenerationResult) {
                generating = false
                when (result) {
                    is FloorGenerationResult.Failure -> status.setText("Generation failed after ${result.attempts}: ${result.reason}")
                    is FloorGenerationResult.Success -> {
                        try { controller = game.runs().start(seed, result); refresh(false) }
                        catch (failure: Exception) { status.setText("Could not start run: ${failure.message}") }
                    }
                }
            }
            override fun onFailure(failure: Throwable) { generating = false; status.setText("Generation failed: ${failure.message}") }
        })
    }
    private fun reload() {
        if (generating || controller?.failure != null) return
        try { controller = game.runs().reload(); refresh(false) }
        catch (failure: Exception) { status.setText("Reload failed: ${failure.message}") }
    }
    private fun submit(command: RunCommand) {
        val controller = controller ?: return
        if (generating || renderer.isAnimating) return
        val result = try { controller.submit(command, controller.token) }
        catch (failure: Exception) { refresh(false); return }
        refresh(result.accepted())
        if (!result.accepted()) status.setText(when (result.reason) {
            CommandResult.Reason.HOSTILE_CONTACT -> "Hostile blocks the way; combat is unavailable in this prototype."
            CommandResult.Reason.LOCKED_DOOR -> "Locked door — no key."
            else -> "${result.reason}"
        })
    }
    private fun refresh(animate: Boolean) {
        val c = controller ?: return
        val view = c.observe(); renderer.accept(view, animate)
        val hero = view.actors.single { it.player }
        hud.setText("HP ${hero.hp}/${hero.maxHp}   Actions ${view.commandCount}   Turns ${view.turnCount}   Tick ${view.tick}")
        status.setText(c.failure?.let { "Save paused: $it — Retry save" } ?: if (view.reachedExit)
            "Exit reached! Keep exploring or start a new run." else "Explore — WASD/arrows, tap/swipe, Space to wait")
    }
    override fun render(delta: Float) {
        clearScreen(0.025f, 0.025f, 0.035f, 1f)
        camera.position.set(renderer.spriteCenterX, renderer.spriteCenterY, 0f); camera.update()
        renderer.render(batch, camera, delta.coerceIn(0f, 0.1f))
        stage.act(delta.coerceIn(0f, 0.1f)); stage.draw()
        Screenshots.captureIfRequested("dungeon")
        autoDemo(delta)
    }
    private fun autoDemo(delta: Float) {
        if (!AutoDemo.enabled() || controller == null || generating || controller?.failure != null) return
        demoTimer += delta
        if (demoTimer < 0.5f) return
        demoTimer = 0f
        when (demoStep++) {
            0 -> Screenshots.capture("phase3-entry")
            1 -> submit(MoveCommand(1, 0))
            2 -> submit(WaitCommand)
            3 -> { Screenshots.capture("phase3-before-reload"); reload() }
            4 -> Screenshots.capture("phase3-after-reload")
            5 -> if (AutoDemo.dungeonEntries >= 2) Gdx.app.exit() else game.navigateTo(LoadingScreen(game))
        }
    }
    override fun resize(width: Int, height: Int) { if (width > 0 && height > 0) { viewport.update(width, height); stage.viewport.update(width, height, true) } }
    override fun pause() { worldInput.cancelGesture(); controller?.checkpoint(); refresh(false) }
    override fun hide() { worker?.shutdown(); worker = null; if (Gdx.input.inputProcessor === input) Gdx.input.inputProcessor = null }
    override fun dispose() { worker?.shutdown(); worker = null; stage.dispose(); batch.dispose() }
}
