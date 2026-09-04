package cloud.vinh.rebirthsaga.presentation.dungeon;

import cloud.vinh.rebirthsaga.game.grid.FloorMap;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.MathUtils;

/** World-space rendering for the prototype dungeon: terrain tiles then actors,
 * through one SpriteBatch and the world camera. Also owns the move
 * presentation track: while a committed step animates, the authoritative
 * position is already the destination; the track only interpolates the sprite
 * and never changes gameplay state. Idle frames advance only this track. */
public final class DungeonRenderer {
    public static final int TILE_SIZE = 16;
    private static final float MOVE_SECONDS = 0.12f;
    private static final float STEP_FRAME_SECONDS = 0.09f;

    private final TextureRegion floorTile;
    private final TextureRegion wallTile;
    private final TextureRegion doorTile;
    private final TextureRegion exitTile;
    private final TextureRegion[] playerFrames = new TextureRegion[2];

    private FloorMap floor;
    private int playerCellX;
    private int playerCellY;
    private final int[] moveFrom = new int[2];
    private final int[] moveTo = new int[2];
    private boolean moving;
    private float moveElapsed;
    private float frameClock;

    public DungeonRenderer(TextureAtlas atlas) {
        floorTile = requireRegion(atlas, "floor");
        wallTile = requireRegion(atlas, "wall");
        doorTile = requireRegion(atlas, "door");
        exitTile = requireRegion(atlas, "exit");
        playerFrames[0] = requireRegion(atlas, "player_a");
        playerFrames[1] = requireRegion(atlas, "player_b");
    }

    private static TextureRegion requireRegion(TextureAtlas atlas, String name) {
        TextureRegion region = atlas.findRegion(name);
        if(region == null)
            throw new IllegalArgumentException("dungeon atlas is missing region '" + name + "'");
        return region;
    }

    public void setFloor(FloorMap floor) {
        this.floor = floor;
    }

    /** Places the sprite on the authoritative cell and stops any animation. */
    public void snapPlayer(int x, int y) {
        playerCellX = x;
        playerCellY = y;
        moving = false;
        moveElapsed = 0f;
    }

    /** Begins interpolating from the previous cell to the committed cell. */
    public void beginMove(int fromX, int fromY, int toX, int toY) {
        moveFrom[0] = fromX;
        moveFrom[1] = fromY;
        moveTo[0] = toX;
        moveTo[1] = toY;
        moving = true;
        moveElapsed = 0f;
    }

    public boolean isAnimating() {
        return moving;
    }

    /** Committed (authoritative) player cell; input targeting uses this, not
     * the interpolated sprite position. */
    public int playerCellX() {
        return playerCellX;
    }

    public int playerCellY() {
        return playerCellY;
    }

    /** Animated sprite centre in world pixels; the camera follows this. */
    public float spriteCenterX() {
        return (moving ? interpolate(moveFrom[0], moveTo[0]) : playerCellX + 0.5f) * TILE_SIZE;
    }

    public float spriteCenterY() {
        return (moving ? interpolate(moveFrom[1], moveTo[1]) : playerCellY + 0.5f) * TILE_SIZE;
    }

    private float interpolate(int from, int to) {
        float progress = MathUtils.clamp(moveElapsed / MOVE_SECONDS, 0f, 1f);
        return from + (to - from) * progress;
    }

    private void update(float delta) {
        if(moving) {
            moveElapsed += delta;
            frameClock += delta;
            if(moveElapsed >= MOVE_SECONDS) {
                playerCellX = moveTo[0];
                playerCellY = moveTo[1];
                moving = false;
                moveElapsed = 0f;
            }
        }
    }

    /** Draws one frame: terrain pass, then the actor pass (stable depth rule:
     * layer first, then cell y, then stable id — one actor today). */
    public void render(SpriteBatch batch, OrthographicCamera camera, float delta) {
        update(delta);
        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        if(floor != null) {
            for(int x = 0; x < floor.width(); x++) {
                for(int y = 0; y < floor.height(); y++) {
                    int tile = floor.tileAt(x, y);
                    batch.draw(floorTile, x * TILE_SIZE, y * TILE_SIZE);
                    if(tile == FloorMap.WALL)
                        batch.draw(wallTile, x * TILE_SIZE, y * TILE_SIZE);
                    else if(tile == FloorMap.DOOR)
                        batch.draw(doorTile, x * TILE_SIZE, y * TILE_SIZE);
                    else if(tile == FloorMap.EXIT)
                        batch.draw(exitTile, x * TILE_SIZE, y * TILE_SIZE);
                }
            }
        }
        TextureRegion frame = playerFrames[0];
        if(moving)
            frame = ((int)(frameClock / STEP_FRAME_SECONDS) % 2) == 0 ? playerFrames[0] : playerFrames[1];
        float drawX = spriteCenterX() - TILE_SIZE / 2f;
        float drawY = spriteCenterY() - TILE_SIZE / 2f;
        batch.draw(frame, drawX, drawY);
        batch.end();
    }
}
