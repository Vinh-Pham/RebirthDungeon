package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.commands.CommandResult
import cloud.vinh.rebirthdungeon.game.commands.MoveCommand
import cloud.vinh.rebirthdungeon.game.grid.FloorMap
import org.junit.Assert.assertEquals
import org.junit.Test

/** Proves the command-driven artemis-odb step: explicit commands advance the
 * world through exactly one synchronous `process()` each, rejections do
 * not mutate authoritative state, and "idle frames" (no commands applied) step
 * nothing. Plain JVM test; no Gdx.app, no OpenGL. */
class DungeonSimulationTest {

    /** 5x3 room, y-up: walls on the border, one pillar blocking the middle of
     * the middle row. `#` wall, `.` floor. */
    private fun roomWithCenterPillar(): FloorMap =
        fromGlyphs(arrayOf("#####", "#.#.#", "#...#"))

    /** 4x3 room whose bottom-left border cell is open, so stepping further west
     * leaves the map: the only route to an out-of-bounds target. */
    private fun roomWithOpenWestEdge(): FloorMap =
        fromGlyphs(arrayOf("####", "#..#", "...#"))

    private fun fromGlyphs(rowsTopToBottom: Array<String>): FloorMap {
        val width = rowsTopToBottom[0].length
        val height = rowsTopToBottom.size
        val tiles = IntArray(width * height)
        for (y in 0 until height)
            for (x in 0 until width)
                tiles[y * width + x] = if (rowsTopToBottom[height - 1 - y][x] == '#')
                    FloorMap.WALL else FloorMap.FLOOR
        return FloorMap(width, height, tiles)
    }

    @Test
    fun acceptedCommandMovesPlayerAndStepsWorldOnce() {
        val simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1)

        val result = simulation.apply(MoveCommand(0, -1))

        assertEquals(CommandResult.Reason.ACCEPTED, result.reason)
        assertEquals(1, simulation.playerX())
        assertEquals(0, simulation.playerY())
        assertEquals("one command must resolve through exactly one world.process()",
            1, simulation.completedSteps())
        assertEquals(1, simulation.acceptedCommandCount())
    }

    @Test
    fun wallRejectsWithoutMutation() {
        val simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1)

        val result = simulation.apply(MoveCommand(0, 1))

        assertEquals(CommandResult.Reason.BLOCKED, result.reason)
        assertEquals(1, simulation.playerX())
        assertEquals(1, simulation.playerY())
        assertEquals("a rejected command still consumes its single step",
            1, simulation.completedSteps())
        assertEquals(0, simulation.acceptedCommandCount())
    }

    @Test
    fun pillarBlocksEntryFromBothSides() {
        val simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1)

        assertEquals(CommandResult.Reason.BLOCKED, simulation.apply(MoveCommand(1, 0)).reason)
        assertEquals(1, simulation.playerX())
        assertEquals(1, simulation.playerY())

        // Walk around the pillar and confirm it blocks from the far side too.
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(MoveCommand(0, -1)).reason)
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(MoveCommand(1, 0)).reason)
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(MoveCommand(1, 0)).reason)
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(MoveCommand(0, 1)).reason)
        assertEquals(3, simulation.playerX())
        assertEquals(1, simulation.playerY())
        assertEquals(CommandResult.Reason.BLOCKED, simulation.apply(MoveCommand(-1, 0)).reason)
        assertEquals(3, simulation.playerX())
        assertEquals(1, simulation.playerY())
    }

    @Test
    fun outOfBoundsRejectsWithoutMutation() {
        val simulation = DungeonSimulation.create(roomWithOpenWestEdge(), 1, 0)

        // One step west lands on the open edge cell and is accepted...
        assertEquals(CommandResult.Reason.ACCEPTED, simulation.apply(MoveCommand(-1, 0)).reason)
        assertEquals(0, simulation.playerX())
        assertEquals(0, simulation.playerY())
        // ...a second west step targets a cell outside the floor.
        assertEquals(CommandResult.Reason.OUT_OF_BOUNDS, simulation.apply(MoveCommand(-1, 0)).reason)
        assertEquals(0, simulation.playerX())
        assertEquals(0, simulation.playerY())
    }

    @Test
    fun nonCardinalRejectsWithoutMutation() {
        val simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1)

        assertEquals(CommandResult.Reason.NOT_CARDINAL,
            simulation.apply(MoveCommand(1, 1)).reason)
        assertEquals(CommandResult.Reason.NOT_CARDINAL,
            simulation.apply(MoveCommand(2, 0)).reason)
        assertEquals(CommandResult.Reason.NOT_CARDINAL,
            simulation.apply(MoveCommand(0, 0)).reason)
        assertEquals(1, simulation.playerX())
        assertEquals(1, simulation.playerY())
    }

    @Test
    fun idleFramesDoNotAdvanceTheSimulation() {
        val simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1)

        // Ten idle render frames: presentation only, no commands applied. A real
        // screen would read playerX/playerY and draw; nothing else happens.
        for (frame in 0 until 10)
            assertEquals(1, simulation.playerX())

        assertEquals(0, simulation.completedSteps())
        assertEquals(1, simulation.playerX())
        assertEquals(1, simulation.playerY())

        simulation.apply(MoveCommand(0, -1))
        assertEquals(1, simulation.completedSteps())
    }

    @Test
    fun eachCommandResolvesThroughValidationThenMovement() {
        // Slot 200 answers terrain blocks; slot 100 answers malformed deltas.
        // Both must run inside one step, in registration order.
        val simulation = DungeonSimulation.create(roomWithCenterPillar(), 1, 1)

        assertEquals(CommandResult.Reason.BLOCKED, simulation.apply(MoveCommand(0, 1)).reason)
        assertEquals(CommandResult.Reason.NOT_CARDINAL, simulation.apply(MoveCommand(1, 1)).reason)
        assertEquals(2, simulation.completedSteps())
        assertEquals(1, simulation.playerX())
        assertEquals(1, simulation.playerY())
    }
}
