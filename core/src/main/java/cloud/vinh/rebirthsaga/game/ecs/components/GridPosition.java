package cloud.vinh.rebirthsaga.game.ecs.components;

import com.artemis.Component;

/** Authoritative grid cell of an entity on the current floor, in floor
 * coordinates (y-up). artemis components need a public constructor. */
public class GridPosition extends Component {
    public int x;
    public int y;

    public GridPosition() {
    }

    public GridPosition(int x, int y) {
        this.x = x;
        this.y = y;
    }
}
