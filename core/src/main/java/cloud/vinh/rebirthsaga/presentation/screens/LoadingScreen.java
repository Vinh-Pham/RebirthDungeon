package cloud.vinh.rebirthsaga.presentation.screens;

import cloud.vinh.rebirthsaga.RebirthDungeon;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.badlogic.gdx.utils.viewport.ScreenViewport;

/** First screen: drives the application-owned {@code AssetManager} to
 * completion, then offers the dungeon entry (and stays reachable as the menu
 * hub, which keeps screen transitions repeatable). A loading failure is shown
 * here with its cause and a quit action — the game screen is never activated
 * on a half-loaded asset set. */
public class LoadingScreen implements Screen {
    private final RebirthDungeon game;
    private Stage stage;
    private Label statusLabel;
    private Table root;
    /** Screen-owned font for the pre-skin UI (loading progress, failure text);
     * the skin's fonts only exist once loading succeeded. Disposed with the
     * screen so repeated menu round-trips leak nothing. */
    private BitmapFont fallbackFont;
    private boolean activated;
    private String failureMessage;
    private float demoTimer;
    private int demoPhase;

    public LoadingScreen(RebirthDungeon game) {
        this.game = game;
    }

    @Override
    public void show() {
        if(fallbackFont == null)
            fallbackFont = new BitmapFont();
        stage = new Stage(new ScreenViewport());
        root = new Table();
        root.setFillParent(true);
        stage.addActor(root);
        statusLabel = new Label("Loading assets...", new Label.LabelStyle(fallbackFont, null));
        root.add(statusLabel);
        Gdx.input.setInputProcessor(stage);

        if(game.assets().isFinished())
            onAssetsReady();
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.07f, 0.07f, 0.10f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);

        if(!activated && failureMessage == null)
            pollAssets();
        stage.act(Math.min(delta, 0.1f));
        stage.draw();
        Screenshots.captureIfRequested("loading");
        runAutoDemo(delta);
    }

    /** Auto-demo (see {@link AutoDemo}): after assets are ready, capture the
     * menu and enter the dungeon through the same navigation the button uses. */
    private void runAutoDemo(float delta) {
        if(!AutoDemo.enabled() || !activated || demoPhase > 0)
            return;
        demoTimer += delta;
        if(demoTimer > 1f) {
            demoPhase = 1;
            Screenshots.capture("menu");
            AutoDemo.dungeonEntries++;
            game.navigateTo(new DungeonScreen(game));
        }
    }

    private void pollAssets() {
        try {
            boolean finished = game.assets().update();
            statusLabel.setText("Loading assets... " + (int)(game.assets().getProgress() * 100f) + "%");
            if(finished)
                onAssetsReady();
        } catch(RuntimeException failure) {
            // The manager records which asset failed; surface that instead of
            // activating screens that would touch missing resources.
            Gdx.app.error("LoadingScreen", "asset loading failed", failure);
            persistDiagnostics(failure);
            failureMessage = failure.getMessage() == null ? failure.toString() : failure.getMessage();
            showFailure();
        }
    }

    /** Writes the loading failure to local storage so it survives stdout
     * buffering; prototype diagnostics, removed with the prototype. */
    private void persistDiagnostics(Throwable failure) {
        try {
            StringBuilder text = new StringBuilder();
            text.append(failure.toString());
            for(StackTraceElement element : failure.getStackTrace())
                text.append("\n  at ").append(element);
            Gdx.files.local("screenshots").mkdirs();
            Gdx.files.local("screenshots/load-error.txt").writeString(text.toString(), false);
        } catch(RuntimeException ignored) {
            // Diagnostics are best-effort; the on-screen failure UI still shows.
        }
    }

    private void onAssetsReady() {
        activated = true;
        Gdx.app.log("LoadingScreen", "assets ready: " + game.assets().getLoadedAssets() + " loaded");
        // Prove the managed resources are actually retrievable before wiring UI.
        game.assets().get(RebirthDungeon.DUNGEON_ATLAS, TextureAtlas.class);
        Skin skin = game.assets().get(RebirthDungeon.UI_SKIN, Skin.class);

        root.clear();
        root.add(new Label("Rebirth Dungeon", skin, "subtitle")).padBottom(24f).row();
        TextButton enter = new TextButton("Enter Dungeon", skin);
        enter.addListener(new ClickListener() {
            @Override
            public void clicked(InputEvent event, float x, float y) {
                game.navigateTo(new DungeonScreen(game));
            }
        });
        root.add(enter).minWidth(220f).minHeight(52f);
    }

    private void showFailure() {
        Skin skin = null;
        try {
            skin = game.assets().get(RebirthDungeon.UI_SKIN, Skin.class);
        } catch(RuntimeException notLoaded) {
            // The skin itself failed; the raw-font layout below still reports it.
        }
        String detail = "Asset loading failed:\n" + failureMessage
                + "\n\nLoaded so far: " + game.assets().getLoadedAssets() + " asset(s).";
        root.clear();
        if(skin != null) {
            root.add(new Label(detail, skin)).width(600f).padBottom(16f).row();
        } else {
            root.add(new Label(detail, new Label.LabelStyle(fallbackFont, null)))
                    .width(600f).padBottom(16f).row();
        }
        TextButton quit;
        if(skin != null) {
            quit = new TextButton("Quit", skin);
        } else {
            TextButton.TextButtonStyle rawStyle = new TextButton.TextButtonStyle();
            rawStyle.font = fallbackFont;
            quit = new TextButton("Quit", rawStyle);
        }
        quit.addListener(new ClickListener() {
            @Override
            public void clicked(InputEvent event, float x, float y) {
                Gdx.app.exit();
            }
        });
        root.add(quit).minWidth(160f).minHeight(48f);
    }

    @Override
    public void resize(int width, int height) {
        if(width <= 0 || height <= 0)
            return;
        stage.getViewport().update(width, height, true);
    }

    @Override
    public void pause() {
    }

    @Override
    public void resume() {
    }

    @Override
    public void hide() {
        detachInput();
    }

    @Override
    public void dispose() {
        // The skin and atlases are managed by the application AssetManager and
        // are intentionally NOT disposed here; the fallback font is screen-owned.
        detachInput();
        if(stage != null) {
            stage.dispose();
            stage = null;
        }
        if(fallbackFont != null) {
            fallbackFont.dispose();
            fallbackFont = null;
        }
    }

    private void detachInput() {
        if(Gdx.input.getInputProcessor() == stage)
            Gdx.input.setInputProcessor(null);
    }
}
