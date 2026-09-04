package cloud.vinh.rebirthsaga.presentation.dungeon;

import com.badlogic.gdx.Input;
import com.badlogic.gdx.InputAdapter;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.viewport.Viewport;

/** World-level input, routed AFTER the UI stage by the screen's
 * {@code InputMultiplexer}. Touches that the stage consumed (any HUD control)
 * never reach this handler; only taps that fall through onto the world do, and
 * they are unprojected through the world viewport — including extend/letterbox
 * areas — before touching gameplay. World coordinates are y-up, so "up" is
 * +1 on the y axis. */
public final class WorldInputHandler extends InputAdapter {
    /** Callback that submits a move into the simulation for the active screen. */
    public interface MoveSink {
        void requestMove(int dx, int dy);
    }

    private final Viewport worldViewport;
    private final DungeonRenderer renderer;
    private final MoveSink sink;
    private final Vector3 unproject = new Vector3();

    public WorldInputHandler(Viewport worldViewport, DungeonRenderer renderer, MoveSink sink) {
        this.worldViewport = worldViewport;
        this.renderer = renderer;
        this.sink = sink;
    }

    @Override
    public boolean keyDown(int keycode) {
        switch(keycode) {
            case Input.Keys.UP:
            case Input.Keys.W:
                sink.requestMove(0, 1);
                return true;
            case Input.Keys.DOWN:
            case Input.Keys.S:
                sink.requestMove(0, -1);
                return true;
            case Input.Keys.LEFT:
            case Input.Keys.A:
                sink.requestMove(-1, 0);
                return true;
            case Input.Keys.RIGHT:
            case Input.Keys.D:
                sink.requestMove(1, 0);
                return true;
            default:
                return false;
        }
    }

    @Override
    public boolean touchDown(int screenX, int screenY, int pointer, int button) {
        unproject.set(screenX, screenY, 0f);
        worldViewport.unproject(unproject);
        int cellX = (int)Math.floor(unproject.x / DungeonRenderer.TILE_SIZE);
        int cellY = (int)Math.floor(unproject.y / DungeonRenderer.TILE_SIZE);
        // Targeting reads the last completed cell; while the move track is
        // animating, the screen's submit gate drops any command anyway.
        int dx = cellX - renderer.playerCellX();
        int dy = cellY - renderer.playerCellY();
        if(Math.abs(dx) + Math.abs(dy) == 1) {
            sink.requestMove(dx, dy);
            return true;
        }
        return false;
    }
}
