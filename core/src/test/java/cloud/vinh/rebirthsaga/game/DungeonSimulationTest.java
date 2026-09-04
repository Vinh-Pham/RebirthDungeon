package cloud.vinh.rebirthsaga.game;

import static org.junit.Assert.assertEquals;

import cloud.vinh.rebirthsaga.game.commands.CommandResult;
import cloud.vinh.rebirthsaga.game.commands.MoveCommand;
import cloud.vinh.rebirthsaga.game.grid.FloorMap;
import org.junit.Test;

/** Proves the command-driven artemis-odb step: explicit commands advance the
 * world through exactly one synchronous {@code process()} each, rejections do
 * not mutate authoritative state, and "idle frames" (no commands applied) step
 * nothing. Plain JVM test; no Gdx.app, no OpenGL. */
public class DungeonSimulationTest {

    /** 5x3 room, y-up: walls on the border, one pillar blocking the middle of
     * the middle row. {@code '#'} wall, {@code '.'} floor. */
    private static FloorMap roomWithCenterPillar() {
        String[] rowsTopToBottom = {
                "#####",
                "#.#.#",
                "#...#",
        };
        return fromGlyphs(rowsTopToBottom);
    }

    /** 4x3 room whose bottom-left border cell is open, so stepping further west
     * leaves the map: the only route to an out-of-bounds target. */
    private static FloorMap roomWithOpenWestEdge() {
        String[] rowsTopToBottom = {
                "####",
                "#..#",
                "...#",
        };
        return fromGlyphs(rowsTopToBottom);
    }

    private static FloorMap fromGlyphs(String[] rowsTopToBottom) {
        int width = rowsTopToBottom[0].length();
        int height = rowsTopToBottom.length;
        int[] tiles = new int[width * height];
        for(int y = 0; y < height; y++)
            for(int x = 0; x < width; x++)
                tiles[y * width + x] = rowsTopToBottom[height - 1 - y].charAt(x) == '#'
                        ? FloorMap.WALL : FloorMap.FLOOR;
        return new FloorMap(width, height, tiles);
    }

    @Test
    public void acceptedCommandMovesPlayerAndStepsWorldOnce() {
        DungeonSimulation simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1);

        CommandResult result = simulation.apply(new MoveCommand(0, -1));

        assertEquals(CommandResult.Reason.ACCEPTED, result.reason());
        assertEquals(1, simulation.playerX());
        assertEquals(0, simulation.playerY());
        assertEquals("one command must resolve through exactly one world.process()",
                1, simulation.completedSteps());
        assertEquals(1, simulation.acceptedCommandCount());
    }

    @Test
    public void wallRejectsWithoutMutation() {
        DungeonSimulation simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1);

        CommandResult result = simulation.apply(new MoveCommand(0, 1));

        assertEquals(CommandResult.Reason.BLOCKED, result.reason());
        assertEquals(1, simulation.playerX());
        assertEquals(1, simulation.playerY());
        assertEquals("a rejected command still consumes its single step",
                1, simulation.completedSteps());
        assertEquals(0, simulation.acceptedCommandCount());
    }

    @Test
    public void pillarBlocksEntryFromBothSides() {
        DungeonSimulation simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1);

        assertEquals(CommandResult.Reason.BLOCKED, simulation.apply(new MoveCommand(1, 0)).reason());
        assertEquals(1, simulation.playerX());
        assertEquals(1, simulation.playerY());

        // Walk around the pillar and confirm it blocks from the far side too.
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(new MoveCommand(0, -1)).reason());
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(new MoveCommand(1, 0)).reason());
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(new MoveCommand(1, 0)).reason());
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(new MoveCommand(0, 1)).reason());
        assertEquals(3, simulation.playerX());
        assertEquals(1, simulation.playerY());
        assertEquals(CommandResult.Reason.BLOCKED, simulation.apply(new MoveCommand(-1, 0)).reason());
        assertEquals(3, simulation.playerX());
        assertEquals(1, simulation.playerY());
    }

    @Test
    public void outOfBoundsRejectsWithoutMutation() {
        DungeonSimulation simulation = DungeonSimulation.create(roomWithOpenWestEdge(), 1, 0);

        // One step west lands on the open edge cell and is accepted...
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(new MoveCommand(-1, 0)).reason());
        assertEquals(0, simulation.playerX());
        assertEquals(0, simulation.playerY());
        // ...a second west step targets a cell outside the floor.
        assertEquals(CommandResult.Reason.OUT_OF_BOUNDS, simulation.apply(new MoveCommand(-1, 0)).reason());
        assertEquals(0, simulation.playerX());
        assertEquals(0, simulation.playerY());
    }

    @Test
    public void nonCardinalRejectsWithoutMutation() {
        DungeonSimulation simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1);

        assertEquals(CommandResult.Reason.NOT_CARDINAL,
                simulation.apply(new MoveCommand(1, 1)).reason());
        assertEquals(CommandResult.Reason.NOT_CARDINAL,
                simulation.apply(new MoveCommand(2, 0)).reason());
        assertEquals(CommandResult.Reason.NOT_CARDINAL,
                simulation.apply(new MoveCommand(0, 0)).reason());
        assertEquals(1, simulation.playerX());
        assertEquals(1, simulation.playerY());
    }

    @Test
    public void idleFramesDoNotAdvanceTheSimulation() {
        DungeonSimulation simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1);

        // Ten idle render frames: presentation only, no commands applied. A real
        // screen would read playerX/playerY and draw; nothing else happens.
        for(int frame = 0; frame < 10; frame++)
            assertEquals(1, simulation.playerX());

        assertEquals(0, simulation.completedSteps());
        assertEquals(1, simulation.playerX());
        assertEquals(1, simulation.playerY());

        simulation.apply(new MoveCommand(0, -1));
        assertEquals(1, simulation.completedSteps());
    }

    @Test
    public void eachCommandResolvesThroughValidationThenMovement() {
        // Slot 200 answers terrain blocks; slot 100 answers malformed deltas.
        // Both must run inside one step, in registration order.
        DungeonSimulation simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1);

        assertEquals(CommandResult.Reason.BLOCKED, simulation.apply(new MoveCommand(0, 1)).reason());
        assertEquals(CommandResult.Reason.NOT_CARDINAL, simulation.apply(new MoveCommand(1, 1)).reason());
        assertEquals(2, simulation.completedSteps());
        assertEquals(1, simulation.playerX());
        assertEquals(1, simulation.playerY());
    }
}
