package cloud.vinh.rebirthsaga.game.ecs.systems;

import cloud.vinh.rebirthsaga.game.commands.CommandResult;
import cloud.vinh.rebirthsaga.game.commands.MoveCommand;
import cloud.vinh.rebirthsaga.game.commands.PendingCommand;
import cloud.vinh.rebirthsaga.game.ecs.components.GridPosition;
import cloud.vinh.rebirthsaga.game.ecs.components.PlayerControlled;
import com.artemis.Aspect;
import com.artemis.ComponentMapper;
import com.artemis.BaseEntitySystem;
import com.artemis.utils.IntBag;

/** Pipeline slot 100 (documentation label; order is fixed by registration).
 * Validates the pending command against the active player and the floor before
 * any system mutates state; a rejected command leaves the world untouched. The
 * player is resolved from its aspect subscription at process time, never from
 * a cached entity id (ids are recycled by artemis). */
public class CommandValidationSystem extends BaseEntitySystem {
    private final PendingCommand pending;
    private final int floorWidth;
    private final int floorHeight;

    private ComponentMapper<GridPosition> mPosition;

    public CommandValidationSystem(PendingCommand pending, int floorWidth, int floorHeight) {
        super(Aspect.all(PlayerControlled.class));
        this.pending = pending;
        this.floorWidth = floorWidth;
        this.floorHeight = floorHeight;
    }

    @Override
    protected void processSystem() {
        MoveCommand move = pending.move;
        if(move == null)
            return;

        int player = solePlayerEntity();

        // Exactly one axis may move, by exactly one cell.
        if(Math.abs(move.dx) + Math.abs(move.dy) != 1) {
            pending.result = CommandResult.NOT_CARDINAL;
            pending.clearIntent();
            return;
        }

        GridPosition position = mPosition.get(player);
        int targetX = position.x + move.dx;
        int targetY = position.y + move.dy;
        if(targetX < 0 || targetY < 0 || targetX >= floorWidth || targetY >= floorHeight) {
            pending.result = CommandResult.OUT_OF_BOUNDS;
            pending.clearIntent();
            return;
        }

        // Validated so far; MovementSystem decides terrain walkability.
        pending.result = CommandResult.ACCEPTED;
    }

    /** The spike has exactly one player; Phase 3's active-actor selection
     * replaces this lookup. */
    private int solePlayerEntity() {
        IntBag entities = getSubscription().getEntities();
        if(entities.size() != 1)
            throw new IllegalStateException("expected exactly one player entity, found " + entities.size());
        return entities.get(0);
    }
}
