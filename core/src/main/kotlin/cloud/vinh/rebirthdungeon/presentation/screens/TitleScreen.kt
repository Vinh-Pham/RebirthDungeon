package cloud.vinh.rebirthdungeon.presentation.screens

import cloud.vinh.rebirthdungeon.RebirthDungeon
import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.Pixmap
import com.badlogic.gdx.graphics.Texture
import com.badlogic.gdx.graphics.g2d.BitmapFont
import com.badlogic.gdx.graphics.g2d.NinePatch
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.ui.Image
import com.badlogic.gdx.scenes.scene2d.ui.Label
import com.badlogic.gdx.scenes.scene2d.ui.TextButton
import com.badlogic.gdx.scenes.scene2d.utils.NinePatchDrawable
import com.badlogic.gdx.utils.viewport.FitViewport
import ktx.app.KtxScreen
import ktx.app.clearScreen
import ktx.assets.disposeSafely
import ktx.assets.getAsset
import ktx.actors.onClick
import kotlin.math.sqrt

/** Title screen mirroring the Penpot board "Title Screen" (1280x720): navy
 * gradient, edge vignette, torch glow, the gold Press Start 2P title with a
 * hard pixel shadow, a gold divider, and the bottom-center Start Game
 * button that enters [ExplorationScreen]. This is the menu hub the dungeon's Menu
 * action returns to.
 *
 * The FitViewport pins the design space, so every actor sits at the board's
 * exact coordinates (converted to GL bottom-up y). Background layers, divider and button patches are procedurally generated Pixmaps owned and
 * disposed by this screen; the title fonts are managed assets. */
class TitleScreen(private val game: RebirthDungeon) : KtxScreen {
    private var stage: Stage? = null
    private var ownedTextures: MutableCollection<Texture> = ArrayList()

    override fun show() {
        val stage = Stage(FitViewport(DESIGN_WIDTH, DESIGN_HEIGHT))
        this.stage = stage
        val fontTitle = game.assets().getAsset<BitmapFont>(RebirthDungeon.TITLE_FONT_52)
        val fontButton = game.assets().getAsset<BitmapFont>(RebirthDungeon.TITLE_FONT_20)

        stage.addActor(Image(ownedTexture(gradientPixmap())).apply { setBounds(0f, 0f, DESIGN_WIDTH, DESIGN_HEIGHT) })
        stage.addActor(Image(ownedTexture(vignettePixmap())).apply { setBounds(0f, 0f, DESIGN_WIDTH, DESIGN_HEIGHT) })
        stage.addActor(Image(ownedTexture(glowPixmap())).apply { setBounds(180f, topToGl(50f, 300f), 920f, 300f) })
        stage.addActor(Image(ownedTexture(dividerPixmap())).apply { setBounds(529f, topToGl(292f, 30f), 222f, 30f) })

        // The board title's hard pixel shadow is a second label offset 5px
        // down; Label has no shadow of its own.
        val shadow = Label(TITLE_TEXT, Label.LabelStyle(fontTitle, Color(0f, 0f, 0f, 0.55f)))
        val title = Label(TITLE_TEXT, Label.LabelStyle(fontTitle, Color.valueOf(TITLE_GOLD)))
        shadow.pack(); title.pack()
        shadow.setPosition(640f - shadow.width / 2f, topToGl(TITLE_TOP, shadow.height) - 5f)
        title.setPosition(640f - title.width / 2f, topToGl(TITLE_TOP, title.height))
        stage.addActor(shadow)
        stage.addActor(title)

        val style = TextButton.TextButtonStyle().apply {
            font = fontButton
            fontColor = Color.valueOf(TITLE_GOLD)
            overFontColor = Color.valueOf("FFE9A8")
            downFontColor = Color.valueOf("D9B44A")
            pressedOffsetY = -2f
            up = NinePatchDrawable(NinePatch(ownedTexture(buttonPixmap(BUTTON_FILL, BORDER_GOLD)), 8, 8, 8, 8))
            over = NinePatchDrawable(NinePatch(ownedTexture(buttonPixmap(BUTTON_FILL, BORDER_BRIGHT)), 8, 8, 8, 8))
            down = NinePatchDrawable(NinePatch(ownedTexture(buttonPixmap(PRESSED_FILL, BORDER_GOLD)), 8, 8, 8, 8))
        }
        val start = TextButton("Start Game", style)
        start.setBounds(490f, topToGl(580f, 68f), 300f, 68f)
        start.onClick { game.navigateTo(ExplorationScreen(game)) }
        stage.addActor(start)

        Gdx.input.inputProcessor = stage
    }

    override fun render(delta: Float) {
        clearScreen(0.043f, 0.055f, 0.102f, 1f)
        stage?.act(minOf(delta, 0.1f))
        stage?.draw()
        Screenshots.captureIfRequested("title")
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
        detachInput()
        stage?.disposeSafely()
        stage = null
        // Fonts are managed by the application AssetManager and are
        // intentionally NOT disposed here; generated textures are screen-owned.
        ownedTextures.forEach { it.disposeSafely() }
        ownedTextures.clear()
    }

    private fun detachInput() {
        if (Gdx.input.inputProcessor === stage)
            Gdx.input.inputProcessor = null
    }

    /** Uploads a generated pixmap into a screen-owned texture. */
    private fun ownedTexture(pixmap: Pixmap): Texture {
        val texture = Texture(pixmap)
        pixmap.disposeSafely()
        ownedTextures.add(texture)
        return texture
    }

    /** Converts a design-space top edge plus height into GL bottom-up y. */
    private fun topToGl(top: Float, height: Float) = DESIGN_HEIGHT - top - height

    private fun gradientPixmap(): Pixmap {
        val pixmap = Pixmap(4, 180, Pixmap.Format.RGBA8888)
        val top = Color.valueOf(BG_TOP)
        val bottom = Color.valueOf(BG_BOTTOM)
        for (y in 0 until 180) {
            val t = y / 179f
            pixmap.setColor(
                top.r + (bottom.r - top.r) * t,
                top.g + (bottom.g - top.g) * t,
                top.b + (bottom.b - top.b) * t, 1f)
            pixmap.fillRectangle(0, y, 4, 1)
        }
        return pixmap
    }

    /** Radial black falloff matching the board vignette (clear to 55% of the
     * radius, black 0.45 at the edge); generated at quarter resolution and
     * stretched — the falloff is smooth. */
    private fun vignettePixmap(): Pixmap {
        val width = 320; val height = 180
        val pixmap = Pixmap(width, height, Pixmap.Format.RGBA8888)
        val cx = 160f; val cy = 82.5f; val radius = 180f
        for (y in 0 until height)
            for (x in 0 until width) {
                val d = distance(x + 0.5f, y + 0.5f, cx, cy) / radius
                val alpha = if (d >= 0.55f) 0.45f * ((d - 0.55f) / 0.45f) else 0f
                if (alpha > 0f) {
                    pixmap.setColor(0f, 0f, 0f, alpha)
                    pixmap.drawPixel(x, y)
                }
            }
        return pixmap
    }

    /** Amber elliptical glow behind the title (board: 0.22 center fading to 0). */
    private fun glowPixmap(): Pixmap {
        val width = 230; val height = 75
        val pixmap = Pixmap(width, height, Pixmap.Format.RGBA8888)
        val gold = Color.valueOf(TITLE_GOLD)
        for (y in 0 until height)
            for (x in 0 until width) {
                val dx = (x + 0.5f - width / 2f) / 115f
                val dy = (y + 0.5f - height / 2f) / 37.5f
                val d = sqrt(dx * dx + dy * dy)
                if (d < 1f) {
                    pixmap.setColor(gold.r, gold.g, gold.b, 0.22f * (1f - d))
                    pixmap.drawPixel(x, y)
                }
            }
        return pixmap
    }

    /** Neutral pixel ornament shared with the title's gold palette. */
    private fun dividerPixmap(): Pixmap {
        val pixmap = Pixmap(222, 30, Pixmap.Format.RGBA8888)
        pixmap.setColor(Color.valueOf(TITLE_GOLD))
        pixmap.fillRectangle(0, 14, 90, 2); pixmap.fillRectangle(132, 14, 90, 2)
        pixmap.fillTriangle(101, 15, 111, 5, 121, 15)
        pixmap.fillTriangle(101, 15, 111, 25, 121, 15)
        return pixmap
    }

    /** Button background patch in design resolution: dark fill, 4px gold
     * border, 8px corner radius, matching the board's rounded rectangle. */
    private fun buttonPixmap(fillHex: String, borderHex: String): Pixmap {
        val pixmap = Pixmap(32, 32, Pixmap.Format.RGBA8888)
        pixmap.setColor(Color.valueOf(borderHex))
        drawRoundedFill(pixmap, 0, 0, 32, 32, 8)
        pixmap.setColor(Color.valueOf(fillHex))
        drawRoundedFill(pixmap, 4, 4, 24, 24, 5)
        return pixmap
    }

    /** Filled rounded rectangle: two overlapping rectangles plus four corner circles. */
    private fun drawRoundedFill(pixmap: Pixmap, x: Int, y: Int, w: Int, h: Int, r: Int) {
        pixmap.fillRectangle(x + r, y, w - 2 * r, h)
        pixmap.fillRectangle(x, y + r, w, h - 2 * r)
        pixmap.fillCircle(x + r, y + r, r)
        pixmap.fillCircle(x + w - r - 1, y + r, r)
        pixmap.fillCircle(x + r, y + h - r - 1, r)
        pixmap.fillCircle(x + w - r - 1, y + h - r - 1, r)
    }

    companion object {
        private const val DESIGN_WIDTH = 1280f
        private const val DESIGN_HEIGHT = 720f
        private const val TITLE_TEXT = "Rebirth Dungeon"
        private const val TITLE_TOP = 168.5f

        // Board palette (extracted from the Penpot design).
        private const val BG_TOP = "273052"
        private const val BG_BOTTOM = "0B0E1A"
        private const val TITLE_GOLD = "EFC75E"
        private const val BUTTON_FILL = "131829"
        private const val BORDER_GOLD = "C9A227"
        private const val BORDER_BRIGHT = "EFC75E"
        private const val PRESSED_FILL = "0D1120"

        private fun distance(x: Float, y: Float, cx: Float, cy: Float): Float {
            val dx = x - cx; val dy = y - cy
            return sqrt(dx * dx + dy * dy)
        }
    }
}
