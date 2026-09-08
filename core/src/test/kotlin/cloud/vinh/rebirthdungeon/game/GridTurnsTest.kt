package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.grid.*
import cloud.vinh.rebirthdungeon.game.identity.EntityId
import cloud.vinh.rebirthdungeon.game.replay.RunCanonical
import cloud.vinh.rebirthdungeon.game.squidsquad.*
import cloud.vinh.rebirthdungeon.game.turns.*
import org.junit.Assert.*
import org.junit.Test

class GridTurnsTest {
    @Test fun openingDoorCostsOneActivationWithoutMovementAndInvalidCommandsAreAtomic() {
        val sim = Phase3Fixtures.simulation(Phase3Fixtures.floor("#######", "#.+L.>#", "#######"))
        try {
            assertTrue(sim.apply(MoveCommand(1, 0)).accepted())
            assertEquals(1, sim.playerX())
            assertEquals(FloorMap.OPEN_DOOR, sim.floor.tileAt(2, 1))
            assertTrue(sim.events().single().event is DoorOpened)
            assertEquals(100L, sim.restoreExport().scheduler.tick)
            sim.apply(MoveCommand(1, 0))
            val before = RunCanonical.state(sim.restoreExport())
            listOf(MoveCommand(1, 0), MoveCommand(0, 1), MoveCommand(Int.MIN_VALUE, Int.MIN_VALUE), MoveCommand(0, 0)).forEach {
                assertFalse(sim.apply(it).accepted()); assertEquals(before, RunCanonical.state(sim.restoreExport()))
            }
            assertTrue(sim.apply(WaitCommand).accepted())
            assertEquals(300L, sim.restoreExport().scheduler.tick)
            assertEquals(2, sim.playerX())
        } finally { sim.dispose() }
    }

    @Test fun occupancyRejectsHostileContactAndDeadActorCleanupRemovesSchedulerEntry() {
        val floor = Phase3Fixtures.floor("######", "#...>#", "######")
        val sim = Phase3Fixtures.simulation(floor, enemies = listOf(Phase3Fixtures.enemy(2, 1)))
        try {
            val before = RunCanonical.state(sim.restoreExport())
            assertEquals(CommandResult.Reason.HOSTILE_CONTACT, sim.apply(MoveCommand(1, 0)).reason)
            assertEquals(before, RunCanonical.state(sim.restoreExport()))
        } finally { sim.dispose() }
        val dead = Phase3Fixtures.simulation(floor, enemies = listOf(Phase3Fixtures.enemy(2, 1, hp = 0)))
        try {
            dead.apply(WaitCommand)
            assertEquals(1, dead.restoreExport().actors.size)
            assertEquals(EntityId(1), dead.restoreExport().scheduler.active)
            assertTrue(dead.apply(MoveCommand(1, 0)).accepted())
        } finally { dead.dispose() }
        assertThrows(IllegalArgumentException::class.java) { Phase3Fixtures.simulation(floor, enemies = listOf(Phase3Fixtures.enemy(1, 1))) }
    }

    @Test fun occupancyIndexMovesAtomicallyAndRejectsOverlaps() {
        val grid = DungeonGrid(Phase3Fixtures.floor("....", "...."))
        grid.place(EntityId(1), Cell(0, 0)); grid.place(EntityId(2), Cell(1, 0))
        assertThrows(IllegalStateException::class.java) { grid.move(EntityId(1), Cell(0, 0), Cell(1, 0)) }
        assertEquals(EntityId(1), grid.occupant(0, 0))
        grid.move(EntityId(1), Cell(0, 0), Cell(0, 1))
        assertNull(grid.occupant(0, 0)); assertEquals(EntityId(1), grid.occupant(0, 1))
    }

    @Test fun schedulerUsesDueTickThenInsertionSequenceAndRestoresActiveActor() {
        val scheduler = TurnScheduler.create(listOf(EntityId(9), EntityId(2), EntityId(4)))
        assertEquals(EntityId(9), scheduler.active)
        scheduler.finish(); assertEquals(EntityId(2), scheduler.active)
        val saved = scheduler.capture(); val restored = TurnScheduler.restore(saved)
        repeat(15) {
            assertEquals(scheduler.active, restored.active); assertEquals(scheduler.tick, restored.tick)
            assertFalse(scheduler.capture().queue.any { it.actor == scheduler.active })
            scheduler.finish(); restored.finish()
        }
        val invalid = SchedulerState(0, EntityId(1), 2, listOf(TurnEntry(EntityId(1), 0, 1)))
        assertThrows(IllegalArgumentException::class.java) { TurnScheduler.restore(invalid) }
    }

    @Test fun dijkstraUsesCardinalRoutesAndRebuildsForDynamicBlockersAndDoors() {
        val grid = DungeonGrid(Phase3Fixtures.floor("#######", "#.....#", "#..+..#", "#.....#", "#######"))
        val finder = SquidPathfinder()
        val from = Cell(2, 2); val goal = Cell(4, 2)
        assertNotEquals(Cell(3, 2), finder.nextStep(grid, from, goal, emptyList()))
        grid.openDoor(Cell(3, 2))
        assertEquals(Cell(3, 2), finder.nextStep(grid, from, goal, emptyList()))
        assertNotEquals(Cell(3, 2), finder.nextStep(grid, from, goal, listOf(Cell(3, 2))))
        assertNull(finder.nextStep(grid, from, goal, listOf(Cell(3, 2), Cell(1, 2), Cell(2, 1), Cell(2, 3))))
    }

    @Test fun doorOpacityInvalidatesFovAndExplorationRemembersWithoutLeakingActors() {
        val sim = Phase3Fixtures.simulation(Phase3Fixtures.floor("##########", "#.+.....>#", "##########"), enemies = listOf(Phase3Fixtures.enemy(5, 1)))
        try {
            val before = sim.observe()
            assertFalse(before.visibleAt(4, 1)); assertEquals(-1, before.tileAt(4, 1)); assertEquals(1, before.actors.size)
            sim.apply(MoveCommand(1, 0))
            val after = sim.observe()
            assertTrue(after.visibleAt(4, 1)); assertEquals(2, after.actors.size)
            assertFalse(before.visibleAt(4, 1))
            val export = sim.restoreExport(); val remembered = export.remembered(); remembered[0] = 42
            assertNotEquals(42, sim.restoreExport().remembered()[0])
            assertThrows(UnsupportedOperationException::class.java) { (after.actors as MutableList).clear() }
        } finally { sim.dispose() }
    }

    @Test fun fovUsesDiamondRadiusAndWallsOcclude() {
        val fov = SquidFieldOfView()
        val grid = DungeonGrid(Phase3Fixtures.floor(".......", ".......", ".......", ".......", ".......", ".......", "......."))
        val visible = fov.visible(grid, Cell(3, 3), 3)
        assertTrue(visible[grid.index(3, 4)])
        assertFalse(visible[grid.index(5, 5)])
        val wall = DungeonGrid(Phase3Fixtures.floor("#######", "#.#...#", "#######"))
        assertFalse(fov.visible(wall, Cell(1, 1), 6)[wall.index(3, 1)])
    }

    @Test fun generationIsBoundedAndCannotCrossLockedDoors() {
        var calls = 0
        val bad = cloud.vinh.rebirthdungeon.game.algorithms.DungeonGenerator { _, _, _ ->
            calls++; GeneratedFloor(Phase3Fixtures.floor("#####", "#.L>#", "#####"), 1, 1, 3, 1)
        }
        val profile = Phase3Fixtures.content.generations.values.single().copy(width = 5, height = 3, maxAttempts = 3)
        val result = FloorGeneration(bad).generate(1, 0, profile)
        assertTrue(result is FloorGenerationResult.Failure); assertEquals(3, calls)
        val path = FloorGeneration.reachablePath(Phase3Fixtures.floor("#####", "#.+>#", "#####"), Cell(1, 1), Cell(3, 1))
        assertEquals(3, path.size)
    }

    @Test fun generatedFloorHasReachableExitAndDistinctOffRouteEnemy() {
        val generator = FloorGeneration(SquidDungeonGenerator())
        val profile = Phase3Fixtures.content.generations.values.single()
        val a = generator.generate(0x5DEECE66DL, 0, profile) as FloorGenerationResult.Success
        val b = generator.generate(0x5DEECE66DL, 0, profile) as FloorGenerationResult.Success
        assertArrayEquals(a.floor.floor.copyTiles(), b.floor.floor.copyTiles())
        assertEquals(a.enemy, b.enemy); assertEquals(a.attempt, b.attempt)
        val path = FloorGeneration.reachablePath(a.floor.floor, Cell(a.floor.spawnX, a.floor.spawnY), Cell(a.floor.exitX, a.floor.exitY))
        assertFalse(a.enemy in path)
        assertEquals(FloorMap.EXIT, a.floor.floor.tileAt(a.floor.exitX, a.floor.exitY))
    }
}
