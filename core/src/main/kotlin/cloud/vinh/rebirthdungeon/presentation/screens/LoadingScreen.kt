package cloud.vinh.rebirthdungeon.presentation.screens

import cloud.vinh.rebirthdungeon.RebirthDungeon
import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.g2d.BitmapFont
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.ui.Label
import com.badlogic.gdx.scenes.scene2d.ui.Skin
import com.badlogic.gdx.scenes.scene2d.ui.Table
import com.badlogic.gdx.scenes.scene2d.ui.TextButton
import com.badlogic.gdx.utils.viewport.ScreenViewport
import ktx.app.KtxScreen
import ktx.app.clearScreen
import ktx.assets.getAsset
import ktx.actors.onClick
import ktx.log.error
import ktx.log.info
import ktx.scene2d.*

/** First screen: drives the application-owned `AssetManager` to
 * completion, then offers the dungeon entry (and stays reachable as the menu
 * hub, which keeps screen transitions repeatable). A loading failure is shown
 * here with its cause and a quit action — the game screen is never activated
 * on a half-loaded asset set. */
class LoadingScreen(private val game: RebirthDungeon) : KtxScreen {
    private var stage: Stage? = null
    private var statusLabel: Label? = null
    private var root: Table? = null

    /** Screen-owned font for the pre-skin UI (loading progress, failure text);
     * the skin's fonts only exist once loading succeeded. Disposed with the
     * screen so repeated menu round-trips leak nothing. */
    private var fallbackFont: BitmapFont? = null
    private var activated = false
    private var failureMessage: String? = null
    private var demoTimer = 0f
    private var demoPhase = 0

    override fun show() {
        if (fallbackFont == null)
            fallbackFont = BitmapFont()
        val font = fallbackFont!!

        val stage = Stage(ScreenViewport())
        this.stage = stage
        val root = Table()
        this.root = root
        root.setFillParent(true)
        stage.addActor(root)
        val statusLabel = Label("Loading assets...", Label.LabelStyle(font, null))
        this.statusLabel = statusLabel
        root.add(statusLabel)
        Gdx.input.inputProcessor = stage

        if (game.assets().isFinished)
            onAssetsReady()
    }

    override fun render(delta: Float) {
        clearScreen(0.07f, 0.07f, 0.10f, 1f)

        if (!activated && failureMessage == null)
            pollAssets()
        stage?.act(minOf(delta, 0.1f))
        stage?.draw()
        Screenshots.captureIfRequested("loading")
        runAutoDemo(delta)
    }

    /** Auto-demo (see [AutoDemo]): after assets are ready, capture the
     * menu and enter the dungeon through the same navigation the button uses. */
    private fun runAutoDemo(delta: Float) {
        if (!AutoDemo.enabled() || !activated || demoPhase > 0)
            return
        demoTimer += delta
        if (demoTimer > 1f) {
            demoPhase = 1
            Screenshots.capture("menu")
            AutoDemo.dungeonEntries++
            game.navigateTo(DungeonScreen(game))
        }
    }

    private fun pollAssets() {
        try {
            val finished = game.assets().update()
            statusLabel?.setText("Loading assets... " + (game.assets().progress * 100f).toInt() + "%")
            if (finished)
                onAssetsReady()
        } catch (failure: RuntimeException) {
            // The manager records which asset failed; surface that instead of
            // activating screens that would touch missing resources.
            error(failure, "LoadingScreen") { "asset loading failed" }
            persistDiagnostics(failure)
            failureMessage = failure.message ?: failure.toString()
            showFailure()
        }
    }

    /** Writes the loading failure to local storage so it survives stdout
     * buffering; prototype diagnostics, removed with the prototype. */
    private fun persistDiagnostics(failure: Throwable) {
        try {
            val text = StringBuilder()
            text.append(failure.toString())
            for (element in failure.stackTrace)
                text.append("\n  at ").append(element)
            Gdx.files.local("screenshots").mkdirs()
            Gdx.files.local("screenshots/load-error.txt").writeString(text.toString(), false)
        } catch (ignored: RuntimeException) {
            // Diagnostics are best-effort; the on-screen failure UI still shows.
        }
    }

    private fun onAssetsReady() {
        activated = true
        info("LoadingScreen") { "assets ready: ${game.assets().loadedAssets} loaded" }
        // Prove the managed resources are actually retrievable before wiring UI.
        game.assets().getAsset<TextureAtlas>(RebirthDungeon.DUNGEON_ATLAS)
        val skin = game.assets().getAsset<Skin>(RebirthDungeon.UI_SKIN)

        val root = this.root ?: return
        root.clear()
        root.add(Label("Rebirth Dungeon", skin, "subtitle")).padBottom(24f).row()
        val enter = scene2d.textButton("Enter Dungeon", skin = skin) {
            onClick { game.navigateTo(DungeonScreen(game)) }
        }
        root.add(enter).minWidth(220f).minHeight(52f)
    }

    private fun showFailure() {
        val skin: Skin? = try {
            game.assets().getAsset<Skin>(RebirthDungeon.UI_SKIN)
        } catch (notLoaded: RuntimeException) {
            // The skin itself failed; the raw-font layout below still reports it.
            null
        }
        val root = this.root ?: return
        val detail = "Asset loading failed:\n" + failureMessage +
            "\n\nLoaded so far: " + game.assets().loadedAssets + " asset(s)."
        root.clear()
        if (skin != null) {
            root.add(Label(detail, skin)).width(600f).padBottom(16f).row()
        } else {
            root.add(Label(detail, Label.LabelStyle(fallbackFont, null)))
                .width(600f).padBottom(16f).row()
        }
        val quit: TextButton = if (skin != null) {
            TextButton("Quit", skin)
        } else {
            val rawStyle = TextButton.TextButtonStyle()
            rawStyle.font = fallbackFont
            TextButton("Quit", rawStyle)
        }
        quit.onClick { Gdx.app.exit() }
        root.add(quit).minWidth(160f).minHeight(48f)
    }

    override fun resize(width: Int, height: Int) {
        if (width <= 0 || height <= 0)
            return
        stage?.viewport?.update(width, height, true)
    }

    override fun hide() {
        detachInput()
    }

    override fun dispose() {
        // The skin and atlases are managed by the application AssetManager and
        // are intentionally NOT disposed here; the fallback font is screen-owned.
        detachInput()
        stage?.dispose()
        stage = null
        fallbackFont?.dispose()
        fallbackFont = null
    }

    private fun detachInput() {
        if (Gdx.input.inputProcessor === stage)
            Gdx.input.inputProcessor = null
    }
}
