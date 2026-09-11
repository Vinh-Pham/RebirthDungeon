package cloud.vinh.rebirthdungeon.presentation.input

import cloud.vinh.rebirthdungeon.presentation.hud.BattleHud
import com.badlogic.gdx.*
import com.badlogic.gdx.scenes.scene2d.Stage

/** UI-owned gestures never reach the world, even across disabled controls or panel whitespace. */
class BattleInput(private val stage: Stage, private val hud: BattleHud,
    private val identity: () -> Pair<Long, Long>?) : InputAdapter() {
    private val ownership = InputOwnership()
    private val gestureIdentity = mutableMapOf<Int, Pair<Long, Long>>()
    fun cancel() { gestureIdentity.clear(); ownership.cancel(); stage.cancelTouchFocus(); hud.inputRevision = null; hud.inputToken = null }
    override fun touchDown(x: Int, y: Int, pointer: Int, button: Int): Boolean {
        val owner = ownership.down(pointer, InputOwnership.Owner.UI)
        if (owner != InputOwnership.Owner.BLOCKED) {
            identity()?.let { gestureIdentity[pointer] = it; hud.inputToken = it.first; hud.inputRevision = it.second }
            stage.touchDown(x, y, pointer, button)
        }
        return true
    }
    override fun touchDragged(x: Int, y: Int, pointer: Int): Boolean {
        when (ownership.owner(pointer)) {
            InputOwnership.Owner.UI -> stage.touchDragged(x, y, pointer)
            else -> Unit
        }; return true
    }
    override fun touchUp(x: Int, y: Int, pointer: Int, button: Int): Boolean {
        gestureIdentity.remove(pointer)?.let { hud.inputToken = it.first; hud.inputRevision = it.second }
        when (ownership.up(pointer)) {
            InputOwnership.Owner.UI -> stage.touchUp(x, y, pointer, button)
            else -> return true
        }
        hud.inputRevision = null; hud.inputToken = null; return true
    }
    override fun touchCancelled(x: Int, y: Int, pointer: Int, button: Int): Boolean { cancel(); ownership.up(pointer); return true }
    override fun keyDown(keycode: Int): Boolean {
        if (!ownership.keyDown(keycode)) return true
        hud.inputRevision = null; hud.inputToken = null
        return hud.key(keycode, Gdx.input.isKeyPressed(Input.Keys.SHIFT_LEFT) || Gdx.input.isKeyPressed(Input.Keys.SHIFT_RIGHT)) || stage.keyDown(keycode)
    }
    override fun keyUp(keycode: Int): Boolean { ownership.keyUp(keycode); stage.keyUp(keycode); return true }
    override fun keyTyped(character: Char) = stage.keyTyped(character)
    override fun mouseMoved(x: Int, y: Int) = stage.mouseMoved(x, y)
    override fun scrolled(x: Float, y: Float) = stage.scrolled(x, y)
}
