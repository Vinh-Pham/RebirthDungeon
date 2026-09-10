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
import java.util.concurrent.Callable

/** Screen owns presentation/worker only; the application controller and writer survive menus. */
class DungeonScreen(private val game: RebirthDungeon) : KtxScreen {
    private lateinit var batch: SpriteBatch
    private lateinit var camera: OrthographicCamera
    private lateinit var viewport: ExtendViewport
    private lateinit var stage: Stage
    private lateinit var renderer: DungeonRenderer
    private lateinit var worldInput: WorldInputHandler
    private lateinit var input: cloud.vinh.rebirthdungeon.presentation.input.DungeonInput
    private lateinit var battleHud: cloud.vinh.rebirthdungeon.presentation.hud.BattleHud
    private lateinit var feedback: cloud.vinh.rebirthdungeon.presentation.audio.GdxCombatFeedback
    private val walk = cloud.vinh.rebirthdungeon.presentation.input.ExplorationWalk()
    private var walkDelay = 0f
    private data class Submission(val command: RunCommand, val token: Long, val revision: Long, val walking: Boolean)
    private var pendingSubmission: Submission? = null
    private var pendingFrames = 0
    private var wasAnimating = false
    private var worker: SessionWorker? = null
    private var controller: RunController? = null
    private var generating = false
    private var demoTimer = 0f
    private var demoStep = 0
    private var newRun = 0L
    override fun show() {
        batch = SpriteBatch(); camera = OrthographicCamera(); viewport = ExtendViewport(320f, 180f, camera)
        val density = if (Gdx.app.type == Application.ApplicationType.Android) Gdx.graphics.density.coerceAtLeast(1f) else 1f
        stage = Stage(ScreenViewport().apply { unitsPerPixel = 1f / (density * game.presentationSettings.uiScale) })
        feedback = cloud.vinh.rebirthdungeon.presentation.audio.GdxCombatFeedback(game.assets().get("audio/combat.wav", com.badlogic.gdx.audio.Sound::class.java))
        renderer = DungeonRenderer(game.assets().get(RebirthDungeon.DUNGEON_ATLAS, TextureAtlas::class.java), game.content(),
            cloud.vinh.rebirthdungeon.presentation.animation.CombatTracks(feedback), game.assets().get(RebirthDungeon.UI_SKIN, Skin::class.java).getFont("font"))
        renderer.combatTracks.reducedMotion = game.presentationSettings.reducedMotion
        feedback.volume = if (game.presentationSettings.sound) 0.35f else 0f
        feedback.haptics = game.presentationSettings.haptics
        val skin = game.assets().get(RebirthDungeon.UI_SKIN, Skin::class.java)
        battleHud = cloud.vinh.rebirthdungeon.presentation.hud.BattleHud(stage, skin, game.content().catalog,
            { command, token, revision -> submit(command, token, revision) },
            { input.cancel(); controller?.checkpoint(); game.navigateTo(TitleScreen(game)) },
            { controller?.retrySave(); refresh(false) },
            { renderer.skip(); refresh(false) }, { startGeneration() }, game.presentationSettings, {
                val density = if (Gdx.app.type == Application.ApplicationType.Android) Gdx.graphics.density.coerceAtLeast(1f) else 1f
                (stage.viewport as ScreenViewport).unitsPerPixel = 1f / (density * game.presentationSettings.uiScale)
                renderer.combatTracks.reducedMotion = game.presentationSettings.reducedMotion
                feedback.volume = if (game.presentationSettings.sound) 0.35f else 0f
                feedback.haptics = game.presentationSettings.haptics
                if (game.presentationSettings.reducedMotion) renderer.skip()
                resize(Gdx.graphics.width, Gdx.graphics.height)
            }, cloud.vinh.rebirthdungeon.bootstrap.CombatAcceptance.enabled)
        worldInput = WorldInputHandler(viewport, ::walkTo, { submit(WaitCommand, battleHud.inputToken, battleHud.inputRevision) }) { x, y ->
            submit(MoveCommand(x, y), battleHud.inputToken, battleHud.inputRevision)
        }
        input = cloud.vinh.rebirthdungeon.presentation.input.DungeonInput(stage, battleHud, worldInput) {
            controller?.let { it.token to it.observe().commandCount }
        }
        battleHud.onModal = { cancelWalk(); input.cancel() }
        Gdx.input.setCatchKey(Input.Keys.BACK, true)
        Gdx.input.inputProcessor = input
        worker = SessionWorker(SessionWorker.Trampoline { Gdx.app.postRunnable(it) })
        try {
            controller = game.runs().resume()
            if (controller == null) startGeneration() else refresh(false)
        } catch (failure: Exception) {
            // Preserve unreadable checkpoints and offer navigation without replacing the run.
            battleHud.systemMessage("Checkpoint load failed: ${failure.message}. Files preserved; return to Menu.")
        }
    }
    private fun startGeneration() {
        if (generating || controller?.failure != null) return
        cancelWalk()
        generating = true
        battleHud.systemMessage("Generating floor...")
        val profile = game.content().catalog.generations.getValue(ContentId("generation.starter"))
        val seed = 0x5DEECE66DL + newRun++
        val worker = checkNotNull(worker)
        val token = worker.beginSession()
        worker.submit(token, Callable { cloud.vinh.rebirthdungeon.bootstrap.CombatAcceptance.floor() ?: FloorGeneration(SquidDungeonGenerator()).generate(seed, 0, profile) }, object : SessionWorker.ResultHandler<FloorGenerationResult> {
            override fun onResult(result: FloorGenerationResult) {
                generating = false
                when (result) {
                    is FloorGenerationResult.Failure -> battleHud.systemMessage("Generation failed after ${result.attempts}: ${result.reason}")
                    is FloorGenerationResult.Success -> {
                        try { controller = game.runs().start(seed, result); refresh(false) }
                        catch (failure: Exception) { battleHud.systemMessage("Could not start run: ${failure.message}") }
                    }
                }
            }
            override fun onFailure(failure: Throwable) { generating = false; battleHud.systemMessage("Generation failed: ${failure.message}") }
        })
    }
    private fun reload() {
        cancelWalk()
        if (generating || controller?.failure != null) return
        try { controller = game.runs().reload(); refresh(false) }
        catch (failure: Exception) { battleHud.systemMessage("Reload failed: ${failure.message}") }
    }
    private fun cancelWalk() {
        walk.cancel(); walkDelay = 0f
        if (pendingSubmission?.walking == true) { pendingSubmission = null; controller?.let { battleHud.bind(it, renderer.isAnimating) } }
    }
    private fun walkTo(x: Int, y: Int) {
        cancelWalk()
        val c = controller ?: return
        val combat = c.combatObservation()
        if (generating || battleHud.hasModal || c.failure != null || combat?.inBattle == true || combat?.defeated == true) return
        val view = c.observe()
        val target = cloud.vinh.rebirthdungeon.game.events.Cell(x, y)
        if (target == view.playerCell) return
        if (!walk.start(view, target))
            battleHud.systemMessage("No explored route to that tile.")
    }
    private fun advanceWalk(delta: Float) {
        walkDelay = maxOf(0f, walkDelay - delta)
        val c = controller ?: return
        if (generating || battleHud.hasModal || c.failure != null) { cancelWalk(); return }
        val combat = c.combatObservation()
        if (combat?.inBattle == true || combat?.defeated == true) { cancelWalk(); return }
        if (pendingSubmission != null || renderer.isAnimating || walkDelay > 0f) return
        val command = walk.next(c.observe(), combat?.inBattle == true, combat?.defeated == true) ?: return
        submit(command, walking = true)
        walkDelay = 0.12f
    }
    private fun submit(command: RunCommand, token: Long? = null, revision: Long? = null, walking: Boolean = false) {
        if (!walking) cancelWalk()
        val controller = controller ?: return
        if (generating || renderer.isAnimating || pendingSubmission != null) return
        pendingSubmission = Submission(command, token ?: controller.token, revision ?: controller.observe().commandCount, walking)
        pendingFrames = 0; battleHud.saving()
    }
    private fun resolveSubmission() {
        val request = pendingSubmission ?: return
        if (pendingFrames++ == 0) return // Present Saving for one frame before the synchronous write.
        pendingSubmission = null
        val controller = controller ?: return
        val result = try { controller.submit(request.command, request.token, request.revision) }
        catch (failure: Exception) { cancelWalk(); refresh(false); return }
        if (!result.accepted()) cancelWalk()
        refresh(result.accepted())
        if (!result.accepted()) battleHud.systemMessage(when (result.reason) {
            CommandResult.Reason.HOSTILE_CONTACT -> "Hostile blocks the way."
            CommandResult.Reason.LOCKED_DOOR -> "Locked door — no key."
            else -> "${result.reason}"
        })
    }
    private fun refresh(animate: Boolean) {
        val c = controller ?: return
        val view = c.observe(); renderer.accept(view, animate && !game.presentationSettings.reducedMotion)
        battleHud.bind(c, renderer.isAnimating); wasAnimating = renderer.isAnimating

    }
    override fun render(delta: Float) {
        if (Gdx.graphics.width <= 0 || Gdx.graphics.height <= 0) return
        clearScreen(0.025f, 0.025f, 0.035f, 1f)
        camera.position.set(renderer.spriteCenterX + renderer.cameraFeedbackX, renderer.spriteCenterY, 0f); camera.update()
        val bounds = battleHud.worldBounds()
        val scale = Gdx.graphics.width / stage.width
        viewport.update(maxOf(1, (bounds.width * scale).toInt()), maxOf(1, (bounds.height * scale).toInt()))
        viewport.setScreenPosition((bounds.x * scale).toInt(), (bounds.y * scale).toInt()); viewport.apply()
        renderer.render(batch, camera, delta.coerceIn(0f, 0.1f))
        if (wasAnimating && !renderer.isAnimating) { controller?.let { battleHud.bind(it, false) }; wasAnimating = false }
        stage.viewport.apply(); stage.act(delta.coerceIn(0f, 0.1f)); stage.draw()
        Screenshots.captureIfRequested("dungeon")
        resolveSubmission()
        advanceWalk(delta.coerceIn(0f, 0.1f))
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
            5 -> if (AutoDemo.dungeonEntries >= 2) Gdx.app.exit() else game.navigateTo(TitleScreen(game))
        }
    }
    override fun resize(width: Int, height: Int) { if (width > 0 && height > 0) { viewport.update(width, height); stage.viewport.update(width, height, true)
        battleHud.resize(stage.width, stage.height, Gdx.graphics.safeInsetLeft * stage.width / width, Gdx.graphics.safeInsetRight * stage.width / width,
            Gdx.graphics.safeInsetTop * stage.height / height, Gdx.graphics.safeInsetBottom * stage.height / height)
        controller?.let { battleHud.bind(it, renderer.isAnimating) }
    } else if (::input.isInitialized) { cancelWalk(); input.cancel() } }
    override fun pause() { cancelWalk(); pendingSubmission = null; input.cancel(); renderer.skip(); controller?.checkpoint(); refresh(false) }
    override fun hide() { cancelWalk(); pendingSubmission = null; Gdx.input.setCatchKey(Input.Keys.BACK, false); input.cancel(); renderer.skip(); worker?.shutdown(); worker = null; if (Gdx.input.inputProcessor === input) Gdx.input.inputProcessor = null }
    override fun dispose() { worker?.shutdown(); worker = null; stage.dispose(); batch.dispose() }
}
