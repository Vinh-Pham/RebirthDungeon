package cloud.vinh.rebirthdungeon.presentation.screens

import cloud.vinh.rebirthdungeon.game.RunSession
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import cloud.vinh.rebirthdungeon.game.algorithms.SeedDerivation
import cloud.vinh.rebirthdungeon.RebirthDungeon
import cloud.vinh.rebirthdungeon.bootstrap.SessionWorker
import cloud.vinh.rebirthdungeon.game.DungeonSimulation
import cloud.vinh.rebirthdungeon.game.algorithms.DungeonGenerator
import cloud.vinh.rebirthdungeon.game.commands.CommandResult
import cloud.vinh.rebirthdungeon.game.commands.MoveCommand
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import cloud.vinh.rebirthdungeon.game.grid.GeneratedFloor
import cloud.vinh.rebirthdungeon.game.squidsquad.SquidDungeonGenerator
import cloud.vinh.rebirthdungeon.presentation.dungeon.DungeonRenderer
import cloud.vinh.rebirthdungeon.presentation.dungeon.WorldInputHandler
import com.badlogic.gdx.Gdx
import com.badlogic.gdx.InputMultiplexer
import com.badlogic.gdx.InputProcessor
import com.badlogic.gdx.graphics.OrthographicCamera
import com.badlogic.gdx.graphics.g2d.SpriteBatch
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import com.badlogic.gdx.math.MathUtils
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.ui.Label
import com.badlogic.gdx.scenes.scene2d.ui.Skin
import com.badlogic.gdx.scenes.scene2d.ui.TextButton
import com.badlogic.gdx.utils.viewport.ExtendViewport
import com.badlogic.gdx.utils.viewport.ScreenViewport
import ktx.app.KtxScreen
import ktx.app.clearScreen
import ktx.assets.disposeSafely
import ktx.assets.getAsset
import ktx.actors.onClick
import ktx.scene2d.*
import java.util.concurrent.Callable

/** Phase 1 prototype: world viewport + SpriteBatch room rendering, a separate
 * Scene2D HUD stage, command-driven artemis-odb steps, worker-thread floor
 * generation delivered through postRunnable with stale-session rejection, and
 * InputMultiplexer routing (stage first, world second). Owns its batch, stage,
 * camera and worker; managed assets stay in the application AssetManager. */
class DungeonScreen(private val game: RebirthDungeon) : KtxScreen {
    /** Logical world resolution policy: a 16:9 minimum of 320x180 world units
     * (20x11.25 tiles at 16px), extended to fill larger windows so tiles stay
     * square and crisp at integer window scales (nearest-neighbor filtering). */
    private val generator: DungeonGenerator = SquidDungeonGenerator()
    private val run = RunSession(BASE_SEED, game.content().catalog)
    private val generation = run.content.generations.getValue(ContentId("generation.starter"))

    private var batch: SpriteBatch? = null
    private var worldCamera: OrthographicCamera? = null
    private var worldViewport: ExtendViewport? = null
    private var stage: Stage? = null
    private var renderer: DungeonRenderer? = null
    private var inputProcessor: InputProcessor? = null

    private var worker: SessionWorker? = null
    private var session: Long = 0
    private var attempt = 0

    private var simulation: DungeonSimulation? = null
    private var floor: FloorMap? = null
    private lateinit var statusLabel: Label
    private lateinit var stepsLabel: Label
    private lateinit var moveUp: TextButton
    private lateinit var moveDown: TextButton
    private lateinit var moveLeft: TextButton
    private lateinit var moveRight: TextButton
    private var demoTimer = 0f
    private var demoPhase = 0

    override fun show() {
        val atlas = game.assets().getAsset<TextureAtlas>(RebirthDungeon.DUNGEON_ATLAS)
        val skin = game.assets().getAsset<Skin>(RebirthDungeon.UI_SKIN)

        val batch = SpriteBatch()
        this.batch = batch
        val worldCamera = OrthographicCamera()
        this.worldCamera = worldCamera
        val worldViewport = ExtendViewport(MIN_WORLD_WIDTH, MIN_WORLD_HEIGHT, worldCamera)
        this.worldViewport = worldViewport
        val renderer = DungeonRenderer(atlas, game.content())
        this.renderer = renderer

        val stage = Stage(ScreenViewport())
        this.stage = stage
        buildHud(stage, skin)

        // UI consumes first; world input only sees what the stage did not.
        val inputProcessor: InputProcessor = InputMultiplexer(
            stage,
            WorldInputHandler(worldViewport, renderer) { dx: Int, dy: Int -> submitMove(dx, dy) }
        )
        this.inputProcessor = inputProcessor
        Gdx.input.inputProcessor = inputProcessor

        // One worker per screen activation; hide()/dispose() shut it down and
        // invalidate the session so late results are rejected as stale.
        worker = SessionWorker(SessionWorker.Trampoline { Gdx.app.postRunnable(it) })
        startGeneration()
    }

    private fun buildHud(stage: Stage, skin: Skin) {
        val root = scene2d.table(skin) {
            setFillParent(true)
            // Landscape layout padded by the platform's safe insets (notches,
            // rounded corners); desktop reports zero insets.
            pad(
                Gdx.graphics.safeInsetTop + 8f, Gdx.graphics.safeInsetRight + 8f,
                Gdx.graphics.safeInsetBottom + 8f, Gdx.graphics.safeInsetLeft + 8f
            )
            top().left()
            statusLabel = label("Generating floor...", skin = skin) { it.left().row() }
            stepsLabel = label("Steps 0", skin = skin) { it.left().row() }

            val menu = textButton("Menu", skin = skin) {
                onClick { game.navigateTo(LoadingScreen(game)) }
            }
            val rebuild = textButton("Rebuild", skin = skin) {
                onClick {
                    attempt++
                    startGeneration()
                }
            }
            moveUp = textButton("^", skin = skin) { onClick { submitMove(0, 1) } }
            moveDown = textButton("v", skin = skin) { onClick { submitMove(0, -1) } }
            moveLeft = textButton("<", skin = skin) { onClick { submitMove(-1, 0) } }
            moveRight = textButton(">", skin = skin) { onClick { submitMove(1, 0) } }

            val actions = table(skin) {
                add(menu).minWidth(88f).minHeight(44f)
                add(rebuild).minWidth(88f).minHeight(44f).spaceLeft(12f)
            }

            val dpad = table(skin) {
                add().minWidth(44f)
                add(moveUp).minWidth(44f).minHeight(44f)
                add().minWidth(44f)
                row()
                add(moveLeft).minWidth(44f).minHeight(44f)
                add(moveDown).minWidth(44f).minHeight(44f)
                add(moveRight).minWidth(44f).minHeight(44f)
            }

            val bottomGroup = table(skin) {
                add(actions).right().padBottom(16f).row()
                add(dpad).right()
            }

            // The expanding spacer cell pushes the controls to the bottom-right
            // while the table alignment keeps the labels top-left.
            add(bottomGroup).expandX().expandY().bottom().right().row()
        }
        stage.addActor(root)
    }

    /** Kicks off one detached generation attempt on the worker thread. The
     * result returns through postRunnable and is installed only if this screen
     * and this request are still the current session. */
    private fun startGeneration() {
        val worker = this.worker!!
        session = worker.beginSession()
        setStatus("Generating floor" + (if (attempt > 0) " (attempt ${attempt + 1})" else "") + "...")
        setControlsEnabled(false)
        val submittedSession = session
        val attemptNumber = attempt
        val job = Callable<GeneratedFloor> {
            // Worker thread: pure JVM code, detached output, no Gdx/graphics/ECS access.
            generator.generate(generation.width, generation.height,
                SeedDerivation.floorAttempt(run.seed, 0, generation.generatorVersion, attemptNumber))
        }
        worker.submit(submittedSession, job, object : SessionWorker.ResultHandler<GeneratedFloor> {
            override fun onResult(result: GeneratedFloor) {
                installFloor(result)
            }

            override fun onFailure(failure: Throwable) {
                setStatus("Floor generation failed: " + failure.message)
            }
        })
    }

    /** Runs on the render thread (the worker trampoline is postRunnable). */
    private fun installFloor(generated: GeneratedFloor) {
        if (worker == null)
            return // screen already torn down; a stale callback was rejected by the session guard
        simulation?.dispose()
        val simulation = DungeonSimulation.create(generated.floor, generated.spawnX, generated.spawnY, run)
        this.simulation = simulation
        floor = generated.floor
        val renderer = this.renderer ?: return
        renderer.floor = generated.floor
        renderer.snapPlayer(simulation.playerX(), simulation.playerY())
        updateSteps()
        centerCameraOnPlayer()
        setControlsEnabled(true)
        setStatus("Floor ready - WASD/arrows or tap an adjacent tile")
    }

    /** The only path that advances the simulation: one explicit command, one
     * synchronous world step on the render thread. Drawing frames never calls
     * this; input and HUD buttons do. */
    private fun submitMove(dx: Int, dy: Int) {
        val simulation = this.simulation ?: return // floor not installed yet
        val renderer = this.renderer ?: return
        if (renderer.isAnimating)
            return // presentation of the previous step is running
        val fromX = simulation.playerX()
        val fromY = simulation.playerY()
        val result = simulation.apply(MoveCommand(dx, dy))
        if (result.accepted()) {
            renderer.beginMove(fromX, fromY, simulation.playerX(), simulation.playerY())
            updateSteps()
            setStatus("")
        } else {
            setStatus(rejectionText(result))
        }
    }

    private fun rejectionText(result: CommandResult): String = when (result.reason) {
        CommandResult.Reason.BLOCKED -> "Blocked."
        CommandResult.Reason.OUT_OF_BOUNDS -> "That way is outside the floor."
        CommandResult.Reason.NOT_CARDINAL -> "Only single cardinal steps are allowed."
        else -> result.reason.name
    }

    private fun updateSteps() {
        // Label.getText() returns a read-only CharArray view; setText is the write path.
        stepsLabel.setText("Steps " + simulation!!.acceptedCommandCount())
    }

    private fun setStatus(text: String) {
        statusLabel.setText(text)
    }

    private fun setControlsEnabled(enabled: Boolean) {
        moveUp.isDisabled = !enabled
        moveDown.isDisabled = !enabled
        moveLeft.isDisabled = !enabled
        moveRight.isDisabled = !enabled
        // Movement is additionally gated in submitMove by the simulation being
        // installed; disabled buttons are the visible counterpart.
    }

    private fun centerCameraOnPlayer() {
        val floor = this.floor ?: return
        val worldViewport = this.worldViewport ?: return
        val worldCamera = this.worldCamera ?: return
        val renderer = this.renderer ?: return
        val viewWidth = worldViewport.worldWidth
        val viewHeight = worldViewport.worldHeight
        val mapPixelWidth = (floor.width * DungeonRenderer.TILE_SIZE).toFloat()
        val mapPixelHeight = (floor.height * DungeonRenderer.TILE_SIZE).toFloat()
        val x: Float = if (mapPixelWidth <= viewWidth)
            mapPixelWidth / 2f
        else
            MathUtils.clamp(renderer.spriteCenterX, viewWidth / 2f, mapPixelWidth - viewWidth / 2f)
        val y: Float = if (mapPixelHeight <= viewHeight)
            mapPixelHeight / 2f
        else
            MathUtils.clamp(renderer.spriteCenterY, viewHeight / 2f, mapPixelHeight - viewHeight / 2f)
        worldCamera.position.set(x, y, 0f)
        worldCamera.update()
    }

    override fun render(delta: Float) {
        clearScreen(0.05f, 0.05f, 0.08f, 1f)

        val clampedDelta = minOf(delta, 0.1f)
        val simulation = this.simulation
        val floor = this.floor
        val batch = this.batch
        val worldCamera = this.worldCamera
        val renderer = this.renderer
        if (simulation != null && floor != null && batch != null && worldCamera != null && renderer != null) {
            // Presentation only: interpolate the sprite, follow with the camera.
            renderer.render(batch, worldCamera, clampedDelta)
            centerCameraOnPlayer()
        }
        stage?.act(clampedDelta)
        stage?.draw()
        Screenshots.captureIfRequested("dungeon")
        runAutoDemo(clampedDelta)
    }

    /** Auto-demo (see [AutoDemo]): capture the fresh floor, walk through
     * an accepted move, a rejected move and the resulting status text, then
     * either transition back to the menu (first entry) or exit (second entry).
     * Everything goes through the same submitMove/navigateTo paths as the UI. */
    private fun runAutoDemo(delta: Float) {
        if (!AutoDemo.enabled()) {
            demoPhase = -1
            return
        }
        if (demoPhase < 0)
            return
        demoTimer += delta
        when (demoPhase) {
            0 -> if (simulation != null) {
                demoPhase = 1
                demoTimer = 0f
            }
            1 -> if (demoTimer > 1f) {
                Screenshots.capture("dungeon-entry-${AutoDemo.dungeonEntries}")
                demoPhase = 2
                demoTimer = 0f
            }
            2 -> {
                submitMove(1, 0)
                demoPhase = 3
                demoTimer = 0f
            }
            3 -> if (demoTimer > 0.5f) {
                Screenshots.capture("dungeon-after-move")
                submitMove(0, 1)
                demoPhase = 4
                demoTimer = 0f
            }
            4 -> if (demoTimer > 0.5f) {
                Screenshots.capture("dungeon-status")
                submitMove(0, -1)
                demoPhase = 5
                demoTimer = 0f
            }
            5 -> if (demoTimer > 0.5f) {
                Screenshots.capture("dungeon-after-move-2")
                demoPhase = 6
                demoTimer = 0f
            }
            6 -> if (AutoDemo.dungeonEntries >= 2) {
                Screenshots.capture("dungeon-final")
                demoPhase = -1
                Gdx.app.exit()
            } else if (demoTimer > 0.5f) {
                demoPhase = -1
                game.navigateTo(LoadingScreen(game))
            }
        }
    }

    override fun resize(width: Int, height: Int) {
        if (width <= 0 || height <= 0)
            return // minimized/zero-size windows must not poison the viewports
        worldViewport?.update(width, height)
        stage?.viewport?.update(width, height, true)
        if (floor != null)
            centerCameraOnPlayer()
    }

    override fun pause() {
        // No autosave exists yet; just snap the transient track so a resume
        // draws the committed cell while the simulation stays untouched.
        val renderer = this.renderer
        val simulation = this.simulation
        if (renderer != null && simulation != null)
            renderer.snapPlayer(simulation.playerX(), simulation.playerY())
    }

    override fun hide() {
        // Shutting the worker down invalidates the session: any generation
        // result arriving after this point is rejected as stale.
        shutdownWorker()
        if (Gdx.input.inputProcessor === inputProcessor)
            Gdx.input.inputProcessor = null
    }

    override fun dispose() {
        shutdownWorker()
        if (Gdx.input.inputProcessor === inputProcessor)
            Gdx.input.inputProcessor = null
        simulation?.dispose()
        simulation = null
        // disposeSafely keeps a failing release from skipping the other one.
        stage?.disposeSafely()
        stage = null
        batch?.disposeSafely()
        batch = null
        // Skin and atlases are managed by the application AssetManager; the
        // screen must not dispose them.
    }

    private fun shutdownWorker() {
        worker?.shutdown()
        worker = null
    }

    companion object {
        private const val MIN_WORLD_WIDTH = 320f
        private const val MIN_WORLD_HEIGHT = 180f
        private const val BASE_SEED = 0x5DEECE66DL
    }
}
