package cloud.vinh.rebirthsaga.game;

import cloud.vinh.rebirthsaga.game.commands.CommandResult;
import cloud.vinh.rebirthsaga.game.commands.MoveCommand;
import cloud.vinh.rebirthsaga.game.commands.PendingCommand;
import cloud.vinh.rebirthsaga.game.ecs.components.GridPosition;
import cloud.vinh.rebirthsaga.game.ecs.components.PlayerControlled;
import cloud.vinh.rebirthsaga.game.ecs.systems.CleanupSystem;
import cloud.vinh.rebirthsaga.game.ecs.systems.CommandValidationSystem;
import cloud.vinh.rebirthsaga.game.ecs.systems.MovementSystem;
import cloud.vinh.rebirthsaga.game.grid.FloorMap;
import com.artemis.Aspect;
import com.artemis.BaseEntitySystem;
import com.artemis.ComponentMapper;
import com.artemis.World;
import com.artemis.WorldConfiguration;
import com.artemis.WorldConfigurationBuilder;

/** Command-driven artemis-odb spike for Phase 1: one {@link World}, explicit
 * system registration order, and exactly one synchronous {@code process()} per
 * resolved command. Idle frames must not advance anything — rendering only
 * reads {@link #playerX()}/{@link #playerY()}. Owns its world; dispose when the
 * owning screen goes away. The full RunController replaces this slice in
 * Phase 3. */
public final class DungeonSimulation {
    /** Counts completed {@code world.process()} calls; diagnostics evidence
     * that only explicit commands step the simulation. */
    private static final class StepCounterSystem extends BaseEntitySystem {
        int steps;

        StepCounterSystem() {
            super(Aspect.all());
        }

        @Override
        protected void processSystem() {
            steps++;
        }
    }

    private final World world;
    private final FloorMap floor;
    private final PendingCommand pending;
    private final int playerEntity;
    private final ComponentMapper<GridPosition> mPosition;
    private final StepCounterSystem stepCounter;
    private int acceptedCommands;

    private DungeonSimulation(World world, FloorMap floor, PendingCommand pending, int playerEntity,
                              StepCounterSystem stepCounter) {
        this.world = world;
        this.floor = floor;
        this.pending = pending;
        this.playerEntity = playerEntity;
        this.stepCounter = stepCounter;
        this.mPosition = world.getMapper(GridPosition.class);
    }

    /** Builds the world on the calling thread (the render thread in production).
     * System registration order is the pipeline order: validation, movement,
     * then cleanup, with the step counter last. The player entity is created
     * after the world exists and resolved by the systems through their aspect
     * subscription, never through a cached id (artemis recycles ids). */
    public static DungeonSimulation create(FloorMap floor, int spawnX, int spawnY) {
        if(floor == null)
            throw new IllegalArgumentException("floor must not be null");
        PendingCommand pending = new PendingCommand();
        StepCounterSystem counter = new StepCounterSystem();

        WorldConfiguration configuration = new WorldConfigurationBuilder()
                // Slot numbers (100/200/800) are documentation labels; execution
                // order is fixed by registration order below.
                .with(new CommandValidationSystem(pending, floor.width(), floor.height()),
                        new MovementSystem(pending, floor),
                        new CleanupSystem(pending),
                        counter)
                .build();
        World world = new World(configuration);

        int player = world.create();
        GridPosition position = world.getMapper(GridPosition.class).create(player);
        position.x = spawnX;
        position.y = spawnY;
        world.getMapper(PlayerControlled.class).create(player);

        return new DungeonSimulation(world, floor, pending, player, counter);
    }

    /** Resolves one command synchronously on the calling thread: sets the
     * pending context, runs one {@code world.process()}, and copies the result
     * out after the flush. Rejections leave authoritative state untouched. */
    public CommandResult apply(MoveCommand command) {
        if(command == null)
            throw new IllegalArgumentException("command must not be null");
        pending.resetAll();
        pending.move = command;
        world.process();
        CommandResult result = pending.result;
        pending.resetAll();
        if(result == null)
            throw new IllegalStateException("command pipeline produced no result for " + command);
        if(result.accepted())
            acceptedCommands++;
        return result;
    }

    public int playerX() {
        return mPosition.get(playerEntity).x;
    }

    public int playerY() {
        return mPosition.get(playerEntity).y;
    }

    public FloorMap floor() {
        return floor;
    }

    /** Accepted commands since creation; presentation counter, never saved. */
    public int acceptedCommandCount() {
        return acceptedCommands;
    }

    /** Completed {@code world.process()} calls; proves idle frames do not step
     * the simulation. Diagnostics evidence, not gameplay state. */
    public int completedSteps() {
        return stepCounter.steps;
    }

    public void dispose() {
        world.dispose();
    }
}
