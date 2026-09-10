package cloud.vinh.rebirthdungeon.presentation.input

import cloud.vinh.rebirthdungeon.game.Phase3Fixtures
import cloud.vinh.rebirthdungeon.game.DungeonSimulation
import cloud.vinh.rebirthdungeon.game.RunSession
import cloud.vinh.rebirthdungeon.game.commands.MoveCommand
import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.projection.DungeonObservation
import org.junit.Assert.*
import org.junit.Test

class ExplorationWalkTest {
    // Fixture for terrain explored earlier, including areas now occluded by walls/closed doors.
    private fun explored(s: DungeonSimulation): DungeonObservation {
        val v = s.observe()
        return DungeonObservation(v.runId, v.commandCount, v.turnCount, v.tick, v.player, v.playerCell,
            v.reachedExit, v.width, v.height, s.restoreExport().floor.copyTiles(), BooleanArray(v.width * v.height), v.actors, v.events)
    }
    @Test fun walksAroundWallsWithOnlyCardinalCommandsAndStopsAtDestination() {
        val s = Phase3Fixtures.simulation(Phase3Fixtures.floor("#######", "#.....#", "#..#..#", "#..#..#", "#######"))
        val walk = ExplorationWalk()
        try {
            assertTrue(walk.start(explored(s), Cell(5, 1)))
            var steps = 0
            while (true) {
                val command = walk.next(explored(s), false, false) ?: break
                assertEquals(1, kotlin.math.abs(command.dx) + kotlin.math.abs(command.dy))
                assertTrue(s.apply(command).accepted()); check(++steps < 20)
            }
            assertEquals(Cell(5, 1), s.observe().playerCell)
            assertEquals(8, steps); assertNull(walk.destination)
        } finally { s.dispose() }
    }

    @Test fun unknownWallsLockedDoorsAndOutsideClicksNeverQueueMovement() {
        val tiles = intArrayOf(1, 0, 1, 1, -1, 5)
        val view = DungeonObservation("run", 0, 0, 0, EntityId(1), Cell(0, 0), false, 3, 2,
            tiles, BooleanArray(6), emptyList(), emptyList())
        val walk = ExplorationWalk()
        for (target in listOf(Cell(1, 0), Cell(1, 1), Cell(2, 1), Cell(2, 0), Cell(-1, 0), Cell(3, 0), Cell(0, 0))) {
            assertFalse(walk.start(view, target)); assertNull(walk.next(view, false, false))
        }
    }

    @Test fun doorOpeningReplansWithoutSkippingATile() {
        val s = Phase3Fixtures.simulation(Phase3Fixtures.floor("######", "#.+..#", "######"))
        val walk = ExplorationWalk()
        try {
            assertTrue(walk.start(explored(s), Cell(4, 1)))
            val first = walk.next(explored(s), false, false)!!
            assertTrue(s.apply(first).accepted())
            assertEquals(Cell(1, 1), s.observe().playerCell)
            assertEquals(first, walk.next(explored(s), false, false))
            repeat(3) { assertTrue(s.apply(walk.next(explored(s), false, false)!!).accepted()) }
            assertNull(walk.next(explored(s), false, false))
            assertEquals(Cell(4, 1), s.observe().playerCell)
        } finally { s.dispose() }
    }

    @Test fun enemyDestinationEntersBattleAndCancelsRemainingRoute() {
        val s = DungeonSimulation.create(Phase3Fixtures.floor("######", "#....#", "######"), 1, 1,
            RunSession(71, Phase3Fixtures.content, combatEnabled = true), listOf(Phase3Fixtures.enemy(2, 1)))
        val walk = ExplorationWalk()
        try {
            assertTrue(walk.start(explored(s), Cell(2, 1)))
            assertTrue(s.apply(walk.next(explored(s), false, false)!!).accepted())
            assertTrue(s.combatObservation().inBattle)
            assertNull(walk.next(explored(s), true, false)); assertNull(walk.destination)
            assertEquals(Cell(1, 1), s.observe().playerCell)
        } finally { s.dispose() }
    }

    @Test fun retargetCancelAndDefeatDiscardOldIntent() {
        val s = Phase3Fixtures.simulation(Phase3Fixtures.floor("#####", "#...#", "#...#", "#####"))
        val walk = ExplorationWalk()
        try {
            assertTrue(walk.start(explored(s), Cell(3, 1)))
            assertTrue(walk.start(explored(s), Cell(1, 2)))
            assertEquals(MoveCommand(0, 1), walk.next(explored(s), false, false))
            walk.cancel(); assertNull(walk.next(explored(s), false, false))
            assertTrue(walk.start(explored(s), Cell(3, 1)))
            assertNull(walk.next(explored(s), false, true)); assertNull(walk.destination)
        } finally { s.dispose() }
    }
}
