package cloud.vinh.rebirthsaga;

import cloud.vinh.rebirthsaga.presentation.screens.LoadingScreen;
import com.badlogic.gdx.Game;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.assets.AssetManager;
import com.badlogic.gdx.assets.loaders.SkinLoader;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;

/** {@link com.badlogic.gdx.ApplicationListener} shared by all platforms.
 * Owns the application-wide {@link AssetManager} and the screen coordinator:
 * screens are single-activation instances disposed on navigation, and every
 * managed resource is released only through the manager. Platform launchers
 * construct this class; service interfaces will be injected here as features
 * need them (game-plan section 13). */
public class RebirthDungeon extends Game {
    public static final String DUNGEON_ATLAS = "atlases/dungeon.atlas";
    public static final String UI_SKIN_ATLAS = "ui/uiskin.atlas";
    public static final String UI_SKIN = "ui/uiskin.json";

    private AssetManager assets;

    @Override
    public void create() {
        assets = new AssetManager();
        queueCoreAssets();
        navigateTo(new LoadingScreen(this));
    }

    /** The resources every screen relies on. LoadingScreen drains the manager
     * and surfaces failures before any gameplay screen is activated. */
    private void queueCoreAssets() {
        assets.load(DUNGEON_ATLAS, TextureAtlas.class);
        assets.load(UI_SKIN_ATLAS, TextureAtlas.class);
        assets.load(UI_SKIN, Skin.class, new SkinLoader.SkinParameter(UI_SKIN_ATLAS));
    }

    public AssetManager assets() {
        return assets;
    }

    /** Screen transitions go through here: the previous screen is disposed
     * after the new one takes over, so repeated transitions leak neither GL
     * resources nor input processors. Cached screens arrive with the real menu
     * structure in Phase 7. */
    public void navigateTo(Screen next) {
        Screen previous = screen;
        setScreen(next);
        if(previous != null)
            previous.dispose();
    }

    @Override
    public void dispose() {
        // Game.dispose hides the current screen; the coordinator also owns its
        // disposal, matching navigateTo's contract.
        super.dispose();
        if(screen != null)
            screen.dispose();
        if(assets != null) {
            assets.dispose();
            assets = null;
        }
    }
}
