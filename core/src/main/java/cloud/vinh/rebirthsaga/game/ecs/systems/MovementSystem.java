package cloud.vinh.rebirthsaga.game.ecs.systems;

import cloud.vinh.rebirthsaga.game.commands.CommandResult;
import cloud.vinh.rebirthsaga.game.commands.MoveCommand;
import cloud.vinh.rebirthsaga.game.commands.PendingCommand;
import cloud.vinh.rebirthsaga.game.ecs.components.GridPosition;
import cloud.vinh.rebirthsaga.game.ecs.components.PlayerControlled;
import cloud.vinh.rebirthsaga.game.grid.FloorMap;
import com.artemis.Aspect;
import com.artemis.ComponentMapper;
import com.artemis.BaseEntitySystem;
import com.artemis.utils.IntBag;

/** Pipeline slot 200. Commits a validated cardinal step when the destination
 * terrain allows it; a blocked destination is a normal CommandResult value and
 * mutates nothing. Runs after CommandValidationSystem by registration order. */
public class MovementSystem extends BaseEntitySystem {
    private final PendingCommand pending;
    private final FloorMap floor;

    private ComponentMapper<GridPosition> mPosition;

    public MovementSystem(PendingCommand pending, FloorMap floor) {
        super(Aspect.all(PlayerControlled.class));
        this.pending = pending;
        this.floor = floor;
    }

    @Override
    protected void processSystem() {
        MoveCommand move = pending.move;
        if(move == null)
            return;

        int player = solePlayerEntity();
        GridPosition position = mPosition.get(player);
        int targetX = position.x + move.dx;
        int targetY = position.y + move.dy;
        if(!floor.isWalkable(targetX, targetY)) {
            pending.result = CommandResult.BLOCKED;
            pending.clearIntent();
            return;
        }

        // Entity edits go through the mapper; create() returns the existing
        // component and the edit applies immediately to the entity.
        GridPosition target = mPosition.create(player);
        target.x = targetX;
        target.y = targetY;
        pending.result = CommandResult.ACCEPTED;
    }

    private int solePlayerEntity() {
        IntBag entities = getSubscription().getEntities();
        if(entities.size() != 1)
            throw new IllegalStateException("expected exactly one player entity, found " + entities.size());
        return entities.get(0);
    }
}
