package cloud.vinh.rebirthdungeon.presentation.hud

import cloud.vinh.rebirthdungeon.game.projection.CombatActorObservation
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.g2d.Batch
import com.badlogic.gdx.scenes.scene2d.Touchable
import com.badlogic.gdx.scenes.scene2d.ui.*
import com.badlogic.gdx.scenes.scene2d.utils.BaseDrawable
import com.badlogic.gdx.scenes.scene2d.utils.Drawable

/** Persistent presentation-only dock. No invented progression values or owned GPU resources. */
class GameBar(private val skin: Skin, button: (String, () -> Unit) -> TextButton,
    character: () -> Unit, skills: () -> Unit, quests: () -> Unit, inventory: () -> Unit,
    pets: () -> Unit, inspect: () -> Unit, options: () -> Unit, menu: () -> Unit) : Table() {
    private val hp = Meter(skin, "HP", Color.valueOf("c34985"))
    private val mp = Meter(skin, "MP", Color.valueOf("527ac8"))
    private val sp = Meter(skin, "SP", Color.valueOf("d1ad39"))
    private val resources = Table()
    private val center = Table()
    private val toolbar = Table()
    private val toolbarScroll = ScrollPane(toolbar, skin).apply { setScrollingDisabled(false, true); setFadeScrollBars(false) }
    private val level = Label("Lv. --", skin)
    private val xp = Meter(skin, "EXP", Color.valueOf("45cbb6"), true)
    private val menuButton = button("MENU", menu)
    init {
        background = HudFrame(skin.getDrawable("white"))
        pad(6f)
        listOf(hp, mp, sp).forEach { resources.add(it).height(18f).growX().row() }
        val destinations = listOf(
            Triple("Character", "0011100/0100010/0100010/0011100/0001000/0111110/1000001", character),
            Triple("Skills", "0001000/0011100/0001000/1111111/0011100/0101010/1000001", skills),
            Triple("Quests", "0111110/0100010/0101010/0101010/0100010/0101010/0111110", quests),
            Triple("Inventory", "0011100/0100010/1111111/1000001/1011101/1000001/1111111", inventory),
            Triple("Pets", "0100010/1010101/0100010/0001000/0011100/0111110/0010100", pets),
            Triple("Inspect", "0011100/0100010/1001001/1001001/1000001/0100010/0011100", inspect),
            Triple("Options", "0010100/0111110/1100011/0101010/1100011/0111110/0010100", options))
        destinations.forEach { (name, pixels, action) ->
            val b = button(name, action)
            b.style = TextButton.TextButtonStyle(b.style).apply {
                up = HudFrame(skin.getDrawable("white"))
                over = HudFrame(skin.getDrawable("white"), true)
                down = over; focused = over
                fontColor = Color.valueOf("81d9d3")
            }
            b.clearChildren(); b.pad(0f)
            b.add(Image(PixelIcon(skin.getDrawable("white"), pixels)).apply { touchable = Touchable.disabled }).size(24f).padTop(4f).row()
            b.label.setFontScale(1f)
            b.add(b.label).padBottom(4f)
            toolbar.add(b).size(76f, 52f).padRight(3f)
        }
        xp.caption = "EXP unavailable" // Progression is introduced by its owning phase.
        level.color = Color.valueOf("cfdfda")
        val progression = Table()
        progression.add(level).width(58f)
        progression.add(xp).growX().height(18f)
        center.add(toolbarScroll).growX().height(56f).row()
        center.add(progression).growX().padTop(4f)
        arrange(false)
    }
    fun arrange(compact: Boolean) {
        clearChildren()
        if (compact) {
            add(toolbarScroll).colspan(3).growX().height(56f).row()
            add(menuButton).width(56f).height(54f).padRight(6f)
            add(resources).width(180f).padRight(10f)
            val progression = Table()
            progression.add(level).left().row(); progression.add(xp).growX().height(18f)
            add(progression).growX()
        } else {
            // Reparent stable actors after switching back from compact mode.
            center.clearChildren()
            val progression = Table()
            progression.add(level).width(58f); progression.add(xp).growX().height(18f)
            center.add(toolbarScroll).growX().height(56f).row()
            center.add(progression).growX().padTop(4f)
            add(menuButton).width(56f).height(54f).bottom().padRight(8f)
            add(resources).width(202f).bottom().padRight(16f)
            add(center).growX()
        }
    }
    fun bind(hero: CombatActorObservation?) {
        hp.bind(hero?.current?.hp, hero?.maximum?.hp, hero?.reserved?.hp ?: 0)
        mp.bind(hero?.current?.mp, hero?.maximum?.mp, hero?.reserved?.mp ?: 0)
        sp.bind(hero?.current?.sp, hero?.maximum?.sp, hero?.reserved?.sp ?: 0)
    }
}

/** Thin beveled frame drawn from the managed skin's white pixel. */
internal class HudFrame(private val pixel: Drawable, private val highlighted: Boolean = false) : BaseDrawable() {
    override fun draw(batch: Batch, x: Float, y: Float, width: Float, height: Float) {
        val old = batch.packedColor
        batch.setColor(0.025f, 0.08f, 0.09f, 0.98f); pixel.draw(batch, x, y, width, height)
        batch.setColor(if (highlighted) 0.25f else 0.16f, if (highlighted) 0.85f else 0.32f, if (highlighted) 0.8f else 0.33f, 1f)
        pixel.draw(batch, x, y + height - 1, width, 1f); pixel.draw(batch, x, y, 1f, height)
        pixel.draw(batch, x + width - 1, y, 1f, height); pixel.draw(batch, x, y, width, 1f)
        batch.setColor(0.12f, 0.23f, 0.24f, 0.45f); pixel.draw(batch, x + 2, y + height / 2, width - 4, height / 2 - 2)
        batch.packedColor = old
    }
}

private class PixelIcon(private val pixel: Drawable, pattern: String) : BaseDrawable() {
    private val rows = pattern.split('/')
    override fun draw(batch: Batch, x: Float, y: Float, width: Float, height: Float) {
        val old = batch.packedColor
        batch.setColor(0.25f, 0.79f, 0.77f, 1f)
        rows.forEachIndexed { row, values -> values.forEachIndexed { col, c ->
            if (c == '1') pixel.draw(batch, x + col * width / 7, y + (6 - row) * height / 7, width / 7, height / 7)
        } }
        batch.packedColor = old
    }
}

private class Meter(skin: Skin, private val name: String, private val fill: Color, private val segmented: Boolean = false) : Stack() {
    private val pixel = skin.getDrawable("white")
    private var fraction = 0f
    private var reserved = 0f
    private val label = Label("$name -- / --", skin).apply { setAlignment(com.badlogic.gdx.utils.Align.center) }
    var caption: String
        get() = label.text.toString()
        set(value) { label.setText(value) }
    init {
        add(object : com.badlogic.gdx.scenes.scene2d.Actor() {
            override fun draw(batch: Batch, parentAlpha: Float) {
                val old = batch.packedColor
                batch.setColor(0.31f, 0.4f, 0.4f, parentAlpha); pixel.draw(batch, x, y, width, height)
                batch.setColor(0.025f, 0.045f, 0.065f, parentAlpha); pixel.draw(batch, x + 1, y + 1, width - 2, height - 2)
                val w = (width - 4).coerceAtLeast(0f)
                batch.setColor(fill.r, fill.g, fill.b, parentAlpha); pixel.draw(batch, x + 2, y + 2, w * fraction, height - 4)
                batch.setColor(1f, 1f, 1f, 0.22f * parentAlpha); pixel.draw(batch, x + 2, y + height - 5, w * fraction, 2f)
                batch.setColor(1f, 0.85f, 0.65f, 0.7f * parentAlpha)
                pixel.draw(batch, x + 2 + w * (fraction - reserved), y + 2, w * reserved, 3f)
                if (segmented) {
                    batch.setColor(0.42f, 0.55f, 0.54f, parentAlpha)
                    for (i in 1..9) pixel.draw(batch, x + w * i / 10, y + 1, 1f, height - 2)
                }
                batch.packedColor = old
            }
        })
        add(label)
    }
    fun bind(current: Int?, maximum: Int?, cost: Int) {
        fraction = if (current != null && maximum != null && maximum > 0) (current.toFloat() / maximum).coerceIn(0f, 1f) else 0f
        reserved = if (maximum != null && maximum > 0) (cost.toFloat() / maximum).coerceIn(0f, fraction) else 0f
        caption = if (current == null || maximum == null) "$name -- / --" else "$name $current / $maximum"
    }
}
