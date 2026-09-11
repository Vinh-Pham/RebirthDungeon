package cloud.vinh.rebirthdungeon.presentation.screens

import cloud.vinh.rebirthdungeon.RebirthDungeon
import cloud.vinh.rebirthdungeon.application.session.*
import cloud.vinh.rebirthdungeon.game.exploration.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import com.badlogic.gdx.*
import com.badlogic.gdx.graphics.*
import com.badlogic.gdx.graphics.g2d.*
import com.badlogic.gdx.graphics.glutils.ShapeRenderer
import com.badlogic.gdx.math.Vector2
import com.badlogic.gdx.scenes.scene2d.*
import com.badlogic.gdx.scenes.scene2d.ui.*
import com.badlogic.gdx.utils.ScreenUtils
import com.badlogic.gdx.utils.viewport.*
import ktx.app.KtxScreen
import ktx.actors.onClick

/** Town and dungeon share one exploration renderer and input translation. */
class ExplorationScreen(private val game: RebirthDungeon) : KtxScreen {
    private val camera = OrthographicCamera()
    private val viewport = ExtendViewport(360f, 240f, camera)
    private val stage = Stage(ScreenViewport())
    private val batch = SpriteBatch(); private val shapes = ShapeRenderer()
    private val skin = game.assets().get(RebirthDungeon.UI_SKIN, Skin::class.java)
    private val atlas = game.assets().get(RebirthDungeon.DUNGEON_ATLAS, TextureAtlas::class.java)
    private val title = Label("", skin); private val status = Label("", skin)
    private val root = Table(); private var dialog: Dialog? = null
    private var session: SessionCoordinator? = null
    private var accumulator = 0.0
    private var shownObject: String? = null
    private var direction = WorldPoint(0, 0)
    private var pointerOwner: Boolean? = null
    private var active = false
    private var lastArea: ExplorationArea? = null
    private var lastFacing = 1
    private val input = object : InputAdapter() {
        override fun touchDown(x: Int, y: Int, pointer: Int, button: Int): Boolean {
            if (pointer != 0 || pointerOwner != null) return true
            val p = stage.screenToStageCoordinates(Vector2(x.toFloat(), y.toFloat()))
            val ui = dialog != null || stage.hit(p.x, p.y, true) != null
            pointerOwner = ui
            if (ui) stage.touchDown(x, y, pointer, button)
            return true
        }
        override fun touchDragged(x: Int, y: Int, pointer: Int): Boolean { if (pointer == 0 && pointerOwner == true) stage.touchDragged(x, y, pointer); return true }
        override fun touchUp(x: Int, y: Int, pointer: Int, button: Int): Boolean {
            if (pointer != 0) return true
            val ui = pointerOwner ?: return true; pointerOwner = null
            if (ui) stage.touchUp(x, y, pointer, button)
            else if (dialog == null && session?.blocked == false) clickWorld(x, y)
            return true
        }
        override fun touchCancelled(x: Int, y: Int, pointer: Int, button: Int): Boolean { cancel(); return true }
        override fun keyDown(keycode: Int): Boolean {
            if (keycode == Input.Keys.ESCAPE || keycode == Input.Keys.BACK) { if (dialog != null) closeDialog() else menu(); return true }
            if (keycode == Input.Keys.F12) { Screenshots.capture("exploration"); return true }
            return stage.keyDown(keycode)
        }
        override fun keyUp(keycode: Int) = stage.keyUp(keycode)
        override fun keyTyped(character: Char) = stage.keyTyped(character)
        override fun mouseMoved(x: Int, y: Int) = stage.mouseMoved(x, y)
        override fun scrolled(x: Float, y: Float) = stage.scrolled(x, y)
    }
    init {
        root.setFillParent(true); root.touchable = Touchable.childrenOnly
        val top = Table(skin); top.background = skin.newDrawable("white", Color.valueOf("182a30")); top.touchable = Touchable.enabled
        title.setFontScale(1.3f); top.add(title).growX().left().pad(10f)
        top.add(button("Supplies") { supplies() }).minHeight(48f).pad(4f)
        top.add(button("Retry save") { session?.retrySave() }).minHeight(48f).pad(4f)
        top.add(button("Menu") { menu() }).minHeight(48f).pad(4f)
        val bottom = Table(skin); bottom.background = skin.newDrawable("white", Color.valueOf("182a30")); bottom.touchable = Touchable.enabled
        status.setWrap(true); status.setFontScale(1.2f); bottom.add(status).growX().pad(10f).minHeight(64f)
        root.top().add(top).growX().row(); root.add().expand().row(); root.add(bottom).growX(); stage.addActor(root)
    }
    private fun button(text: String, action: () -> Unit) = TextButton(text, skin).also { it.pad(8f); it.label.setFontScale(1.2f); it.onClick { action() } }
    override fun show() {
        active = true; Gdx.input.inputProcessor = input
        try { session = game.runs().resume() } catch (e: Exception) { status.setText("Cannot load: ${e.message}. Saves preserved.") }
    }
    private fun cancel() { pointerOwner = null; stage.cancelTouchFocus(); direction = WorldPoint(0, 0); session?.exploration?.stop() }
    private fun menu() { cancel(); session?.checkpoint(); game.navigateTo(TitleScreen(game)) }
    private fun clickWorld(x: Int, y: Int) {
        val s = session ?: return
        val p = viewport.unproject(Vector2(x.toFloat(), y.toFloat()))
        if (!p.x.isFinite() || !p.y.isFinite() || p.x !in -7800f..7800f || p.y !in -7800f..7800f) return
        val point = WorldPoint((p.x * WorldPoint.SCALE).toInt(), (p.y * WorldPoint.SCALE).toInt())
        val frontier = s.exploration.observe().frontiers.firstOrNull { squared(it, point) < 14L * 14 * WorldPoint.SCALE * WorldPoint.SCALE }
        if (frontier != null) { s.command(MoveTo(frontier)); return }
        val obj = s.exploration.observe().objects.filter { squared(it.position, point) < 16L * 16 * WorldPoint.SCALE * WorldPoint.SCALE }.minByOrNull { squared(it.position, point) }
        s.command(if (obj == null) MoveTo(point) else InteractWith(obj.id))
    }
    override fun render(delta: Float) {
        if (!active || Gdx.graphics.width <= 0 || Gdx.graphics.height <= 0) return
        val s = session
        if (s?.mode == SessionMode.BATTLE) { cancel(); game.navigateTo(BattleScreen(game)); return }
        if (s != null) {
            val paused = dialog != null || s.blocked
            if (!paused) {
                fun down(key: Int) = if (Gdx.input.isKeyPressed(key)) 1 else 0
                val d = WorldPoint((down(Input.Keys.D) + down(Input.Keys.RIGHT) - down(Input.Keys.A) - down(Input.Keys.LEFT)).coerceIn(-1, 1),
                    (down(Input.Keys.W) + down(Input.Keys.UP) - down(Input.Keys.S) - down(Input.Keys.DOWN)).coerceIn(-1, 1))
                if (d != direction) { direction = d; s.command(SetMoveDirection(d.x, d.y)) }
                accumulator += delta.coerceAtLeast(0f).toDouble()
                var steps = 0
                while (accumulator >= 1.0 / 60 && steps++ < 8 && s.mode == SessionMode.EXPLORATION && !s.blocked && s.exploration.reachedInteraction == null) {
                    s.step(); accumulator -= 1.0 / 60
                }
            } else accumulator = 0.0
            val obj = s.exploration.reachedInteraction
            if (obj != null && dialog == null && shownObject != obj.id && !s.blocked) { shownObject = obj.id; interact(obj) }
            val h = s.heroObservation()
            title.setText("${if (s.exploration.area.town) "Hearth Town" else "The Forgotten Halls"}  |  ${s.gold} gold  |  HP ${h.current.hp}/${h.maximum.hp}")
            status.setText(s.failure ?: s.battle?.failure ?: s.notice)
        }
        ScreenUtils.clear(Color.valueOf("0d151d"))
        s?.let { drawWorld(it, delta) }
        stage.viewport.apply(); stage.act(delta.coerceIn(0f, 0.1f)); stage.draw()
    }
    private fun drawWorld(s: SessionCoordinator, delta: Float) {
        val v = s.exploration.observe(); val scale = WorldPoint.SCALE.toFloat()
        val alpha = accumulator.times(60).coerceIn(0.0, 1.0).toFloat()
        val x = (v.previous.x + (v.position.x - v.previous.x) * alpha) / scale
        val y = (v.previous.y + (v.position.y - v.previous.y) * alpha) / scale
        val vertices = v.polygons.flatMap { it.vertices }
        fun clampCenter(target: Float, minimum: Float, maximum: Float, extent: Float) =
            if (maximum - minimum <= extent) (minimum + maximum) / 2 else target.coerceIn(minimum + extent / 2, maximum - extent / 2)
        val targetX = clampCenter(x, vertices.minOf { it.x } / scale, vertices.maxOf { it.x } / scale, viewport.worldWidth)
        val targetY = clampCenter(y, vertices.minOf { it.y } / scale, vertices.maxOf { it.y } / scale, viewport.worldHeight)
        if (lastArea !== s.exploration.area) { camera.position.set(targetX, targetY, 0f); lastArea = s.exploration.area }
        camera.position.x += (targetX - camera.position.x) * minOf(1f, delta * 8)
        camera.position.y += (targetY - camera.position.y) * minOf(1f, delta * 8)
        viewport.apply(); camera.update(); shapes.projectionMatrix = camera.combined
        shapes.begin(ShapeRenderer.ShapeType.Filled)
        for (p in v.polygons) {
            shapes.color = Color.valueOf(if (v.town) "3f6254" else if (p.room == v.room) "435560" else "26333f")
            val a = p.vertices.first()
            for (i in 1 until p.vertices.size - 1) {
                val b = p.vertices[i]; val c = p.vertices[i + 1]
                shapes.triangle(a.x / scale, a.y / scale, b.x / scale, b.y / scale, c.x / scale, c.y / scale)
            }
        }
        shapes.end()
        shapes.begin(ShapeRenderer.ShapeType.Line); shapes.color = Color.valueOf("729185")
        v.polygons.forEach { p -> p.vertices.indices.forEach { i -> val a = p.vertices[i]; val b = p.vertices[(i + 1) % p.vertices.size]; shapes.line(a.x / scale, a.y / scale, b.x / scale, b.y / scale) } }
        shapes.end()
        data class Figure(val px: Float, val py: Float, val name: String, val enemy: Boolean, val player: Boolean, val service: Service?)
        val figures = v.objects.map { Figure(it.position.x / scale, it.position.y / scale, it.name, it.service == Service.ENEMY, false, it.service) } + v.frontiers.map { Figure(it.x / scale, it.y / scale, "Explore", false, false, Service.EXIT) } + Figure(x, y, "", false, true, null)
        if (v.position.x != v.previous.x) lastFacing = if (v.position.x > v.previous.x) 1 else -1
        batch.projectionMatrix = camera.combined; batch.begin()
        val font = skin.get(Label.LabelStyle::class.java).font; val oldScale = font.data.scaleX; font.data.setScale(0.65f)
        for (f in figures.sortedByDescending { it.py }) {
            val id = ContentId(if (f.enemy) "actor.enemy" else "actor.hero")
            val binding = game.content().visuals.single { it.id == id }
            val frame = if (f.player && v.moving) (v.tick / 8 % binding.frames.size).toInt() else 0
            val region = atlas.findRegion(binding.frames[frame])
            batch.color = if (f.player || f.enemy) Color.WHITE else when (f.service) { Service.RECOVER -> Color.SKY; Service.DUNGEON, Service.EXIT -> Color.GOLD; else -> Color.TAN }
            batch.draw(region.texture, f.px - 8, f.py - 2, 16f, 20f, if (f.player && lastFacing < 0) region.u2 else region.u,
                region.v2, if (f.player && lastFacing < 0) region.u else region.u2, region.v)
            batch.color = Color.WHITE
            if (f.name.isNotEmpty()) font.draw(batch, f.name, f.px - 24, f.py + 28)
        }
        font.data.setScale(oldScale); batch.end()
    }
    private fun open(title: String, text: String, actions: List<Pair<String, () -> Unit>>) {
        cancel(); accumulator = 0.0
        val d = Dialog(title, skin); dialog = d; d.isMovable = false; d.padTop(36f); d.titleLabel.setFontScale(1.25f)
        val label = Label(text, skin); label.setWrap(true)
        val content = Table(); content.add(label).width(minOf(500f, stage.width - 96)).pad(12f).row()
        actions.forEach { (name, action) -> content.add(button(name, action)).growX().minHeight(48f).pad(4f).row() }
        content.add(button("Close") { closeDialog() }).growX().minHeight(48f).pad(4f)
        d.contentTable.add(ScrollPane(content, skin)).grow(); d.show(stage); sizeDialog()
    }
    private fun sizeDialog() { dialog?.let { it.setSize(minOf(580f, stage.width - 32), minOf(480f, stage.height - 32)); it.setPosition((stage.width - it.width) / 2, (stage.height - it.height) / 2) } }
    private fun closeDialog() { dialog?.remove(); dialog = null; shownObject = null; session?.dismiss(); accumulator = 0.0; cancel() }
    private fun interact(obj: WorldObject) {
        val s = session ?: return
        val expectedOperation = s.operation
        val actions = when (obj.service) {
            Service.SHOP -> s.world.offers.map { offer -> "Buy ${s.catalog.potions.getValue(offer.potion).name} - ${offer.price} gold (${s.count(offer.potion)}/${offer.capacity})" to {
                s.buy(offer.potion, expectedOperation); dialog?.remove(); dialog = null; interact(obj)
            } }
            Service.RECOVER -> listOf("Recover for free" to { s.recover(expectedOperation); closeDialog() })
            Service.DUNGEON -> listOf("Enter dungeon" to { s.enterDungeon(expectedOperation); closeDialog() })
            Service.EXIT -> listOf("Claim rewards and return" to { s.exitDungeon(expectedOperation); closeDialog() })
            else -> emptyList()
        }
        open(obj.name, obj.text + "\n\n" + s.notice, actions)
    }
    private fun supplies() {
        val s = session ?: return
        open("Potion supplies", "Use a potion outside battle. Pending dungeon loot is claimed at the exit.", s.world.offers.map { offer ->
            "Drink ${s.catalog.potions.getValue(offer.potion).name} (${s.count(offer.potion)})" to { s.drink(offer.potion, s.operation); closeDialog() }
        })
    }
    override fun resize(width: Int, height: Int) {
        if (width <= 0 || height <= 0) return
        viewport.update(width, height); stage.viewport.update(width, height, true)
        root.pad(Gdx.graphics.safeInsetTop.toFloat(), Gdx.graphics.safeInsetLeft.toFloat(), Gdx.graphics.safeInsetBottom.toFloat(), Gdx.graphics.safeInsetRight.toFloat()); sizeDialog()
    }
    override fun pause() { cancel(); accumulator = 0.0; session?.checkpoint() }
    override fun resume() { accumulator = 0.0; cancel() }
    override fun hide() { active = false; cancel(); if (Gdx.input.inputProcessor === input) Gdx.input.inputProcessor = null }
    override fun dispose() { stage.dispose(); batch.dispose(); shapes.dispose() }
}
