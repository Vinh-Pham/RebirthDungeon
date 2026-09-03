package cloud.vinh.rebirthsaga;

import com.badlogic.gdx.Game;

/** {@link com.badlogic.gdx.ApplicationListener} implementation shared by all platforms. */
public class RebirthDungeon extends Game {
    @Override
    public void create() {
        setScreen(new FirstScreen());
    }
}