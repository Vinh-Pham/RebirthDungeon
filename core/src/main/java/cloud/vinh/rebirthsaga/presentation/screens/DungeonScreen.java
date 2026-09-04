package cloud.vinh.rebirthsaga.presentation.screens;

import cloud.vinh.rebirthsaga.RebirthDungeon;
import cloud.vinh.rebirthsaga.bootstrap.SessionWorker;
import cloud.vinh.rebirthsaga.game.DungeonSimulation;
import cloud.vinh.rebirthsaga.game.algorithms.DungeonGenerator;
import cloud.vinh.rebirthsaga.game.commands.CommandResult;
import cloud.vinh.rebirthsaga.game.commands.MoveCommand;
import cloud.vinh.rebirthsaga.game.grid.FloorMap;
import cloud.vinh.rebirthsaga.game.grid.GeneratedFloor;
import cloud.vinh.rebirthsaga.game.squidsquad.SquidDungeonGenerator;
import cloud.vinh.rebirthsaga.presentation.dungeon.DungeonRenderer;
import cloud.vinh.rebirthsaga.presentation.dungeon.WorldInputHandler;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.InputMultiplexer;
import com.badlogic.gdx.InputProcessor;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.ClickListener;
import com.badlogic.gdx.utils.viewport.ExtendViewport;
import com.badlogic.gdx.utils.viewport.ScreenViewport;
import java.util.concurrent.Callable;

/** Phase 1 prototype: world viewport + SpriteBatch room rendering, a separate
 * Scene2D HUD stage, command-driven artemis-odb steps, worker-thread floor
 * generation delivered through postRunnable with stale-session rejection, and
 * InputMultiplexer routing (stage first, world second). Owns its batch, stage,
 * camera and worker; managed assets stay in the application AssetManager. */
public class DungeonScreen implements Screen {
    /** Logical world resolution policy: a 16:9 minimum of 320x180 world units
     * (20x11.25 tiles at 16px), extended to fill larger windows so tiles stay
     * square and crisp at integer window scales (nearest-neighbor filtering). */
    private static final float MIN_WORLD_WIDTH = 320f;
    private static final float MIN_WORLD_HEIGHT = 180f;
    private static final int MAP_WIDTH = 48;
    private static final int MAP_HEIGHT = 27;
    private static final long BASE_SEED = 0x5DEECE66DL;

    private final RebirthDungeon game;
    private final DungeonGenerator generator = new SquidDungeonGenerator();

    private SpriteBatch batch;
    private OrthographicCamera worldCamera;
    private ExtendViewport worldViewport;
    private Stage stage;
    private DungeonRenderer renderer;
    private InputProcessor inputProcessor;

    private SessionWorker worker;
    private long session;
    private int attempt;

    private DungeonSimulation simulation;
    private FloorMap floor;
    private Label statusLabel;
    private Label stepsLabel;
    private TextButton up;
    private TextButton down;
    private TextButton left;
    private TextButton right;
    private float demoTimer;
    private int demoPhase;

    public DungeonScreen(RebirthDungeon game) {
        this.game = game;
    }

    @Override
    public void show() {
        TextureAtlas atlas = game.assets().get(RebirthDungeon.DUNGEON_ATLAS, TextureAtlas.class);
        Skin skin = game.assets().get(RebirthDungeon.UI_SKIN, Skin.class);

        batch = new SpriteBatch();
        worldCamera = new OrthographicCamera();
        worldViewport = new ExtendViewport(MIN_WORLD_WIDTH, MIN_WORLD_HEIGHT, worldCamera);
        renderer = new DungeonRenderer(atlas);

        stage = new Stage(new ScreenViewport());
        buildHud(skin);

        // UI consumes first; world input only sees what the stage did not.
        inputProcessor = new InputMultiplexer(stage,
                new WorldInputHandler(worldViewport, renderer, this::submitMove));
        Gdx.input.setInputProcessor(inputProcessor);

        // One worker per screen activation; hide()/dispose() shut it down and
        // invalidate the session so late results are rejected as stale.
        worker = new SessionWorker(Gdx.app::postRunnable);
        startGeneration();
    }

    private void buildHud(Skin skin) {
        Table root = new Table(skin);
        root.setFillParent(true);
        // Landscape layout padded by the platform's safe insets (notches,
        // rounded corners); desktop reports zero insets.
        root.pad(Gdx.graphics.getSafeInsetTop() + 8f, Gdx.graphics.getSafeInsetRight() + 8f,
                Gdx.graphics.getSafeInsetBottom() + 8f, Gdx.graphics.getSafeInsetLeft() + 8f);
        stage.addActor(root);

        statusLabel = new Label("Generating floor...", skin);
        stepsLabel = new Label("Steps 0", skin);
        root.top().left();
        root.add(statusLabel).left().row();
        root.add(stepsLabel).left().row();

        TextButton menu = new TextButton("Menu", skin);
        menu.addListener(new ClickListener() {
            @Override
            public void clicked(InputEvent event, float x, float y) {
                game.navigateTo(new LoadingScreen(game));
            }
        });
        TextButton rebuild = new TextButton("Rebuild", skin);
        rebuild.addListener(new ClickListener() {
            @Override
            public void clicked(InputEvent event, float x, float y) {
                attempt++;
                startGeneration();
            }
        });
        up = moveButton(skin, "^", 0, 1);
        down = moveButton(skin, "v", 0, -1);
        left = moveButton(skin, "<", -1, 0);
        right = moveButton(skin, ">", 1, 0);

        Table actions = new Table(skin);
        actions.add(menu).minWidth(88f).minHeight(44f);
        actions.add(rebuild).minWidth(88f).minHeight(44f).spaceLeft(12f);

        Table dpad = new Table(skin);
        dpad.add().minWidth(44f);
        dpad.add(up).minWidth(44f).minHeight(44f);
        dpad.add().minWidth(44f);
        dpad.row();
        dpad.add(left).minWidth(44f).minHeight(44f);
        dpad.add(down).minWidth(44f).minHeight(44f);
        dpad.add(right).minWidth(44f).minHeight(44f);

        Table bottomGroup = new Table(skin);
        bottomGroup.add(actions).right().padBottom(16f).row();
        bottomGroup.add(dpad).right();

        // The expanding spacer cell pushes the controls to the bottom-right
        // while the table alignment keeps the labels top-left.
        root.add(bottomGroup).expandX().expandY().bottom().right().row();
    }

    private TextButton moveButton(Skin skin, final String glyph, final int dx, final int dy) {
        TextButton button = new TextButton(glyph, skin);
        button.addListener(new ClickListener() {
            @Override
            public void clicked(InputEvent event, float x, float y) {
                submitMove(dx, dy);
            }
        });
        return button;
    }

    /** Kicks off one detached generation attempt on the worker thread. The
     * result returns through postRunnable and is installed only if this screen
     * and this request are still the current session. */
    private void startGeneration() {
        session = worker.beginSession();
        setStatus("Generating floor" + (attempt > 0 ? " (attempt " + (attempt + 1) + ")" : "") + "...");
        setControlsEnabled(false);
        final long submittedSession = session;
        final int attemptNumber = attempt;
        Callable<GeneratedFloor> job = new Callable<GeneratedFloor>() {
            @Override
            public GeneratedFloor call() {
                // Worker thread: pure Java, detached output, no Gdx/graphics/ECS access.
                return generator.generate(MAP_WIDTH, MAP_HEIGHT, BASE_SEED + attemptNumber);
            }
        };
        worker.submit(submittedSession, job, new SessionWorker.ResultHandler<GeneratedFloor>() {
            @Override
            public void onResult(GeneratedFloor result) {
                installFloor(result);
            }

            @Override
            public void onFailure(Throwable failure) {
                setStatus("Floor generation failed: " + failure.getMessage());
            }
        });
    }

    /** Runs on the render thread (the worker trampoline is postRunnable). */
    private void installFloor(GeneratedFloor generated) {
        if(worker == null || generated == null)
            return; // screen already torn down; a stale callback was rejected by the session guard
        if(simulation != null) {
            simulation.dispose();
            simulation = null;
        }
        simulation = DungeonSimulation.create(generated.floor(), generated.spawnX(), generated.spawnY());
        floor = generated.floor();
        renderer.setFloor(floor);
        renderer.snapPlayer(simulation.playerX(), simulation.playerY());
        updateSteps();
        centerCameraOnPlayer();
        setControlsEnabled(true);
        setStatus("Floor ready - WASD/arrows or tap an adjacent tile");
    }

    /** The only path that advances the simulation: one explicit command, one
     * synchronous world step on the render thread. Drawing frames never calls
     * this; input and HUD buttons do. */
    private void submitMove(int dx, int dy) {
        if(simulation == null || renderer.isAnimating())
            return; // floor not installed yet, or presentation of the previous step is running
        int fromX = simulation.playerX();
        int fromY = simulation.playerY();
        CommandResult result = simulation.apply(new MoveCommand(dx, dy));
        if(result.accepted()) {
            renderer.beginMove(fromX, fromY, simulation.playerX(), simulation.playerY());
            updateSteps();
            setStatus("");
        } else {
            setStatus(rejectionText(result));
        }
    }

    private String rejectionText(CommandResult result) {
        switch(result.reason()) {
            case BLOCKED:
                return "Blocked.";
            case OUT_OF_BOUNDS:
                return "That way is outside the floor.";
            case NOT_CARDINAL:
                return "Only single cardinal steps are allowed.";
            default:
                return result.reason().name();
        }
    }

    private void updateSteps() {
        stepsLabel.setText("Steps " + simulation.acceptedCommandCount());
    }

    private void setStatus(String text) {
        statusLabel.setText(text);
    }

    private void setControlsEnabled(boolean enabled) {
        up.setDisabled(!enabled);
        down.setDisabled(!enabled);
        left.setDisabled(!enabled);
        right.setDisabled(!enabled);
        // Movement is additionally gated in submitMove by the simulation being
        // installed; disabled buttons are the visible counterpart.
    }

    private void centerCameraOnPlayer() {
        float viewWidth = worldViewport.getWorldWidth();
        float viewHeight = worldViewport.getWorldHeight();
        float mapPixelWidth = floor.width() * DungeonRenderer.TILE_SIZE;
        float mapPixelHeight = floor.height() * DungeonRenderer.TILE_SIZE;
        float x;
        float y;
        if(mapPixelWidth <= viewWidth)
            x = mapPixelWidth / 2f;
        else
            x = MathUtils.clamp(renderer.spriteCenterX(), viewWidth / 2f, mapPixelWidth - viewWidth / 2f);
        if(mapPixelHeight <= viewHeight)
            y = mapPixelHeight / 2f;
        else
            y = MathUtils.clamp(renderer.spriteCenterY(), viewHeight / 2f, mapPixelHeight - viewHeight / 2f);
        worldCamera.position.set(x, y, 0f);
        worldCamera.update();
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.05f, 0.05f, 0.08f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);

        float clampedDelta = Math.min(delta, 0.1f);
        if(simulation != null && floor != null) {
            // Presentation only: interpolate the sprite, follow with the camera.
            renderer.render(batch, worldCamera, clampedDelta);
            centerCameraOnPlayer();
        }
        stage.act(clampedDelta);
        stage.draw();
        Screenshots.captureIfRequested("dungeon");
        runAutoDemo(clampedDelta);
    }

    /** Auto-demo (see {@link AutoDemo}): capture the fresh floor, walk through
     * an accepted move, a rejected move and the resulting status text, then
     * either transition back to the menu (first entry) or exit (second entry).
     * Everything goes through the same submitMove/navigateTo paths as the UI. */
    private void runAutoDemo(float delta) {
        if(!AutoDemo.enabled()) {
            demoPhase = -1;
            return;
        }
        if(demoPhase < 0)
            return;
        demoTimer += delta;
        switch(demoPhase) {
            case 0:
                if(simulation != null) {
                    demoPhase = 1;
                    demoTimer = 0f;
                }
                break;
            case 1:
                if(demoTimer > 1f) {
                    Screenshots.capture("dungeon-entry-" + AutoDemo.dungeonEntries);
                    demoPhase = 2;
                    demoTimer = 0f;
                }
                break;
            case 2:
                submitMove(1, 0);
                demoPhase = 3;
                demoTimer = 0f;
                break;
            case 3:
                if(demoTimer > 0.5f) {
                    Screenshots.capture("dungeon-after-move");
                    submitMove(0, 1);
                    demoPhase = 4;
                    demoTimer = 0f;
                }
                break;
            case 4:
                if(demoTimer > 0.5f) {
                    Screenshots.capture("dungeon-status");
                    submitMove(0, -1);
                    demoPhase = 5;
                    demoTimer = 0f;
                }
                break;
            case 5:
                if(demoTimer > 0.5f) {
                    Screenshots.capture("dungeon-after-move-2");
                    demoPhase = 6;
                    demoTimer = 0f;
                }
                break;
            case 6:
                if(AutoDemo.dungeonEntries >= 2) {
                    Screenshots.capture("dungeon-final");
                    demoPhase = -1;
                    Gdx.app.exit();
                } else if(demoTimer > 0.5f) {
                    demoPhase = -1;
                    game.navigateTo(new LoadingScreen(game));
                }
                break;
            default:
                break;
        }
    }

    @Override
    public void resize(int width, int height) {
        if(width <= 0 || height <= 0)
            return; // minimized/zero-size windows must not poison the viewports
        worldViewport.update(width, height);
        stage.getViewport().update(width, height, true);
        if(floor != null)
            centerCameraOnPlayer();
    }

    @Override
    public void pause() {
        // No autosave exists yet; just snap the transient track so a resume
        // draws the committed cell while the simulation stays untouched.
        if(renderer != null && simulation != null)
            renderer.snapPlayer(simulation.playerX(), simulation.playerY());
    }

    @Override
    public void resume() {
        // Focus returns with the sprite already snapped to the committed cell.
    }

    @Override
    public void hide() {
        // Shutting the worker down invalidates the session: any generation
        // result arriving after this point is rejected as stale.
        shutdownWorker();
        if(Gdx.input.getInputProcessor() == inputProcessor)
            Gdx.input.setInputProcessor(null);
    }

    @Override
    public void dispose() {
        shutdownWorker();
        if(Gdx.input.getInputProcessor() == inputProcessor)
            Gdx.input.setInputProcessor(null);
        if(simulation != null) {
            simulation.dispose();
            simulation = null;
        }
        if(stage != null) {
            stage.dispose();
            stage = null;
        }
        if(batch != null) {
            batch.dispose();
            batch = null;
        }
        // Skin and atlases are managed by the application AssetManager; the
        // screen must not dispose them.
    }

    private void shutdownWorker() {
        if(worker != null) {
            worker.shutdown();
            worker = null;
        }
    }
}
