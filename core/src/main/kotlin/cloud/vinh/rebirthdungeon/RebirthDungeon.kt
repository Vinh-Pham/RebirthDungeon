package cloud.vinh.rebirthdungeon

import cloud.vinh.rebirthdungeon.presentation.screens.LoadingScreen
import com.badlogic.gdx.Game
import com.badlogic.gdx.Screen
import com.badlogic.gdx.assets.AssetManager
import com.badlogic.gdx.assets.loaders.SkinLoader
import com.badlogic.gdx.graphics.g2d.TextureAtlas
import com.badlogic.gdx.scenes.scene2d.ui.Skin
import ktx.assets.load

/** [ApplicationListener][com.badlogic.gdx.ApplicationListener] shared by all platforms.
 * Owns the application-wide [AssetManager] and the screen coordinator:
 * screens are single-activation instances disposed on navigation, and every
 * managed resource is released only through the manager. Platform launchers
 * construct this class; service interfaces will be injected here as features
 * need them (game-plan section 13). */
class RebirthDungeon : Game() {
    private var assets: AssetManager? = null

    override fun create() {
        assets = AssetManager()
        queueCoreAssets()
        navigateTo(LoadingScreen(this))
    }

    /** The resources every screen relies on. LoadingScreen drains the manager
     * and surfaces failures before any gameplay screen is activated. */
    private fun queueCoreAssets() {
        val manager = assets()
        manager.load<TextureAtlas>(DUNGEON_ATLAS)
        manager.load<TextureAtlas>(UI_SKIN_ATLAS)
        // The skin must bind to its atlas at load time, so it needs the
        // explicit SkinParameter overload instead of the typed ktx helper.
        manager.load(UI_SKIN, Skin::class.java, SkinLoader.SkinParameter(UI_SKIN_ATLAS))
    }

    fun assets(): AssetManager = requireNotNull(assets) { "assets() called before create()" }

    /** Screen transitions go through here: the previous screen is disposed
     * after the new one takes over, so repeated transitions leak neither GL
     * resources nor input processors. Cached screens arrive with the real menu
     * structure in Phase 7. */
    fun navigateTo(next: Screen) {
        val previous = screen
        setScreen(next)
        previous?.dispose()
    }

    override fun dispose() {
        // Game.dispose hides the current screen; the coordinator also owns its
        // disposal, matching navigateTo's contract.
        super.dispose()
        screen?.dispose()
        assets?.let {
            it.dispose()
            assets = null
        }
    }

    companion object {
        const val DUNGEON_ATLAS = "atlases/dungeon.atlas"
        const val UI_SKIN_ATLAS = "ui/uiskin.atlas"
        const val UI_SKIN = "ui/uiskin.json"
    }
}
