package cloud.vinh.rebirthdungeon.presentation.screens

import cloud.vinh.rebirthdungeon.RebirthDungeon
import cloud.vinh.rebirthdungeon.application.session.SessionMode
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.presentation.hud.BattleHud
import cloud.vinh.rebirthdungeon.presentation.input.BattleInput
import cloud.vinh.rebirthdungeon.presentation.animation.CombatTracks
import com.badlogic.gdx.*
import com.badlogic.gdx.graphics.*
import com.badlogic.gdx.graphics.g2d.*
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.ui.*
import com.badlogic.gdx.utils.ScreenUtils
import com.badlogic.gdx.utils.viewport.*
import ktx.app.KtxScreen
import ktx.actors.onClick

/** Battle staging is cosmetic: all targeting is by stable encounter identity. */
class BattleScreen(private val game: RebirthDungeon) : KtxScreen {
    private val session = game.runs().resume()
    private val stage = Stage(ScreenViewport())
    private val camera = OrthographicCamera()
    private val viewport = ExtendViewport(400f, 300f, camera)
    private val batch = SpriteBatch()
    private val skin = game.assets().get(RebirthDungeon.UI_SKIN, Skin::class.java)
    private val atlas = game.assets().get(RebirthDungeon.DUNGEON_ATLAS, TextureAtlas::class.java)
    private val feedback = cloud.vinh.rebirthdungeon.presentation.audio.GdxCombatFeedback(game.assets().get("audio/combat.wav", com.badlogic.gdx.audio.Sound::class.java))
    private val tracks = CombatTracks(feedback)
    private var active = false
    private var command: Triple<RunCommand, Long, Long>? = null
    private val hud = BattleHud(stage, skin, game.content().catalog,
        { c, token, revision -> if (command == null) { command = Triple(c, token, revision); hudSaving() } },
        { session.checkpoint(); game.navigateTo(TitleScreen(game)) }, { session.retrySave() }, { tracks.skip() }, {},
        game.presentationSettings, { tracks.reducedMotion = game.presentationSettings.reducedMotion; resize(Gdx.graphics.width, Gdx.graphics.height) }, supplyCount = { session.count(it) })
    private val input = BattleInput(stage, hud) { session.battle?.let { it.token to it.observe().commandCount } }

    private fun hudSaving() { hud.saving() }
    init {
        hud.onModal = { input.cancel() }
    }
    override fun show() { active = true; Gdx.input.inputProcessor = input; tracks.reducedMotion = game.presentationSettings.reducedMotion }
    override fun render(delta: Float) {
        if (!active || Gdx.graphics.width <= 0 || Gdx.graphics.height <= 0) return
        if (session.mode == SessionMode.EXPLORATION) { game.navigateTo(ExplorationScreen(game)); return }
        val c = session.battle ?: return
        val pending = command; command = null
        if (pending != null) session.battleCommand(pending.first, pending.second, pending.third)
        if (session.mode == SessionMode.EXPLORATION) { game.navigateTo(ExplorationScreen(game)); return }
        feedback.volume = if (game.presentationSettings.sound) 0.35f else 0f; feedback.haptics = game.presentationSettings.haptics
        tracks.accept(c.observe(), true); tracks.advance(delta)
        hud.bind(c, tracks.playing)
        ScreenUtils.clear(Color.valueOf("19232e")); viewport.apply(); camera.update(); batch.projectionMatrix = camera.combined
        batch.begin()
        val view = c.combatObservation()
        view?.actors?.forEach { actor ->
            val player = actor.id == EntityId(1)
            val binding = game.content().visuals.single { it.id == ContentId(if (player) "actor.hero" else "actor.enemy") }
            val region = atlas.findRegion(binding.frames.first())
            val attack = tracks.tracks.any { it.actor == actor.id && it.kind == "attack" }
            val shift = if (attack) (1f - tracks.progress) * (if (player) 12 else -12) else 0f
            val x = if (player) 160f else 270f
            batch.draw(region, x + shift, 180f, 32f, 40f)
            val font = skin.get(Label.LabelStyle::class.java).font; font.draw(batch, "HP ${actor.current.hp}/${actor.maximum.hp}", x - 8, 238f)
        }
        batch.end(); stage.viewport.apply(); stage.act(delta.coerceIn(0f, 0.1f)); stage.draw(); Screenshots.captureIfRequested("battle")
        if (!tracks.playing) session.finishBattleIfReady()
    }
    override fun resize(width: Int, height: Int) {
        if (width <= 0 || height <= 0) return
        viewport.update(width, height, true); (stage.viewport as ScreenViewport).unitsPerPixel = 1f / game.presentationSettings.uiScale; stage.viewport.update(width, height, true)
        hud.resize(stage.width, stage.height, Gdx.graphics.safeInsetLeft.toFloat(), Gdx.graphics.safeInsetRight.toFloat(), Gdx.graphics.safeInsetTop.toFloat(), Gdx.graphics.safeInsetBottom.toFloat())
    }
    override fun pause() { command = null; input.cancel(); session.checkpoint() }
    override fun hide() { active = false; command = null; input.cancel(); if (Gdx.input.inputProcessor === input) Gdx.input.inputProcessor = null }
    override fun dispose() { stage.dispose(); batch.dispose() }
}
