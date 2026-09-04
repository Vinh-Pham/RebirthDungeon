package cloud.vinh.rebirthsaga.game.ecs.systems;

import cloud.vinh.rebirthsaga.game.commands.PendingCommand;
import com.artemis.Aspect;
import com.artemis.BaseEntitySystem;

/** Pipeline slot 800. Clears the transient command intent so it cannot leak
 * into a later step; the resolved result stays until the controller reads it.
 * Runs last among this slice's systems. */
public class CleanupSystem extends BaseEntitySystem {
    private final PendingCommand pending;

    public CleanupSystem(PendingCommand pending) {
        super(Aspect.all());
        this.pending = pending;
    }

    @Override
    protected void processSystem() {
        pending.clearIntent();
    }
}
