package cloud.vinh.rebirthsaga.presentation.screens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.PixmapIO;
import com.badlogic.gdx.utils.ScreenUtils;

/** Prototype diagnostic: F12 writes the current frame into {@code screenshots/}
 * in the game's local storage. Purely for verifying rendering during
 * development; never touches gameplay state. Safe to remove with the prototype
 * in Phase 9. */
public final class Screenshots {
    private Screenshots() {
    }

    public static void captureIfRequested(String tag) {
        if(Gdx.input.isKeyJustPressed(Input.Keys.F12))
            capture(tag);
    }

    public static void capture(String tag) {
        try {
            int width = Gdx.graphics.getWidth();
            int height = Gdx.graphics.getHeight();
            Pixmap frame = ScreenUtils.getFrameBufferPixmap(0, 0, width, height);
            // The framebuffer reads bottom-up; flip rows into a top-down image.
            Pixmap flipped = new Pixmap(width, height, frame.getFormat());
            for(int y = 0; y < height; y++)
                flipped.drawPixmap(frame, 0, y, width, 1, 0, height - 1 - y, width, 1);
            Gdx.files.local("screenshots").mkdirs();
            String name = "screenshots/rebirth-" + tag + "-" + System.currentTimeMillis() + ".png";
            PixmapIO.writePNG(Gdx.files.local(name), flipped);
            Gdx.app.log("Screenshots", "wrote " + Gdx.files.local(name).file().getAbsolutePath());
            flipped.dispose();
            frame.dispose();
        } catch(RuntimeException failure) {
            Gdx.app.error("Screenshots", "capture failed", failure);
        }
    }
}
