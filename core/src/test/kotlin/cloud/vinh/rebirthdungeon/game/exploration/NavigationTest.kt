package cloud.vinh.rebirthdungeon.game.exploration
import cloud.vinh.rebirthdungeon.data.content.JacksonContentRepository
import cloud.vinh.rebirthdungeon.game.algorithms.RandomStream
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams
import org.junit.Assert.*
import org.junit.Test
import java.io.File
class NavigationTest {
    private val content = JacksonContentRepository { File("../assets/data/$it").readText() }.load().world
    private fun p(x: Int, y: Int) = WorldPoint.pixels(x, y)
    @Test fun routesAroundMarketObstacleWithClearSegmentsAndNoCellSnapping() {
        val town = AreaBuilder.town(content); val nav = town.navigation
        val start = p(64, 96); val end = WorldPoint(260 * 256 + 27, 96 * 256 + 11)
        assertFalse(nav.clear(start, end, town.rooms))
        val path = nav.path(start, end, town.rooms)!!
        assertEquals(end, path.last()); assertTrue(path.size > 1)
        assertTrue((listOf(start) + path).zipWithNext().all { nav.clear(it.first, it.second, town.rooms) })
        assertEquals(path, nav.path(start, end, town.rooms))
        assertNull(nav.path(start, p(160, 96), town.rooms))
        assertNull(nav.destination(start, p(160, 96), town.rooms))
    }
    @Test fun projectionDoesNotSnapAcrossObstacleAndDirectInputCannotTunnel() {
        val town = AreaBuilder.town(content); val nav = town.navigation
        assertEquals(p(8, 32), nav.destination(p(48, 32), p(6, 32), town.rooms))
        assertNull(nav.destination(p(64, 96), p(205, 96), town.rooms))
        val s = ExplorationSimulation(town)
        s.submit(MoveTo(p(100, 96))); repeat(150) { s.step() }
        s.submit(SetMoveDirection(1, 0)); repeat(1000) { s.step() }
        assertTrue(s.position.x <= 112 * 256)
        assertTrue(nav.polygon(s.position, town.rooms) != null)
    }
    @Test fun fixedTicksRestoreAndReplacementPathsAreDeterministic() {
        val area = AreaBuilder.town(content)
        val a = ExplorationSimulation(area)
        assertTrue(a.submit(MoveTo(p(260, 96))))
        repeat(53) { a.step() }
        val saved = a.restoreExport(); val b = ExplorationSimulation(area, saved)
        repeat(220) { a.step(); b.step(); assertEquals(a.position, b.position) }
        assertEquals(saved.tick, 53L)
        assertThrows(UnsupportedOperationException::class.java) { (saved.path as MutableList).clear() }
        assertTrue(a.submit(MoveTo(p(48, 32)))); assertTrue(a.submit(MoveTo(p(256, 32))))
        repeat(240) { a.step() }; assertEquals(p(256, 32), a.position)
        assertFalse(a.submit(TimedExplorationCommand(0, 0, StopMovement)))
    }
    @Test fun generatedRoomsAreConnectedSeededAndHiddenEnemiesStayHidden() {
        repeat(30) { seed ->
            val a = AreaBuilder.dungeon(content, RunRandomStreams.seeded(seed.toLong())[RandomStream.GENERATION])
            val b = AreaBuilder.dungeon(content, RunRandomStreams.seeded(seed.toLong())[RandomStream.GENERATION])
            assertEquals(a.placements, b.placements)
            assertEquals(content.rooms, a.placements.size)
            a.objects.forEach { assertNotNull(a.navigation.path(a.spawn, it.approach, a.rooms)) }
            val s = ExplorationSimulation(a)
            assertTrue(s.observe().objects.none { it.service == Service.ENEMY })
            assertTrue(s.observe().polygons.all { it.room == 0 })
            assertFalse(s.submit(MoveTo(a.objects.last().position)))
        }
    }
    @Test fun doorwayRevealsNextRoomAndEnemyDetectionHasNoRng() {
        val area = AreaBuilder.dungeon(content, RunRandomStreams.seeded(1)[RandomStream.GENERATION]); val s = ExplorationSimulation(area)
        val portal = area.mesh.portals.first { portal -> area.mesh.polygons.single { it.id == portal.a }.room != area.mesh.polygons.single { it.id == portal.b }.room }
        val doorway = WorldPoint((portal.left.x + portal.right.x) / 2, (portal.left.y + portal.right.y) / 2)
        assertTrue(s.submit(MoveTo(doorway)))
        repeat(300) { s.step() }
        assertTrue(1 in s.restoreExport().discovered)
        val enemy = area.objects.first { it.room == 1 && it.service == Service.ENEMY }
        assertTrue(s.submit(MoveTo(enemy.position)))
        repeat(300) { s.step() }
        assertEquals(enemy.id, s.encounter?.id)
        val position = s.position; repeat(100) { s.step() }; assertEquals(position, s.position)
    }
    @Test fun playerCanTraverseNarrowAndSlantedGeneratedRoomsAcrossSeeds() {
        repeat(20) { seed ->
            val area = AreaBuilder.dungeon(content, RunRandomStreams.seeded(seed.toLong())[RandomStream.GENERATION])
            val s = ExplorationSimulation(area)
            for (room in 1 until content.rooms) {
                val doorway = s.observe().frontiers.single()
                assertTrue("seed $seed room $room", s.submit(MoveTo(doorway)))
                repeat(900) { s.step() }
                assertTrue("seed $seed room $room position ${s.position}", room in s.restoreExport().discovered)
                val enemy = area.objects.single { it.room == room && it.service == Service.ENEMY }
                assertTrue(s.submit(MoveTo(enemy.position)))
                repeat(900) { s.step() }
                assertEquals("seed $seed room $room", enemy.id, s.encounter?.id)
                s.defeated(enemy.id)
            }
        }
    }
    @Test fun reversedDegenerateAndDisconnectedGeometryIsRejected() {
        assertThrows(IllegalArgumentException::class.java) { NavPolygon(0, 0, listOf(p(0, 0), p(0, 1), p(1, 0))) }
        assertThrows(IllegalArgumentException::class.java) { NavPolygon(0, 0, listOf(p(0, 0), p(1, 0), p(2, 0))) }
        val a = NavPolygon(0, 0, listOf(p(0, 0), p(10, 0), p(10, 10), p(0, 10)))
        val b = NavPolygon(1, 0, listOf(p(20, 0), p(30, 0), p(30, 10), p(20, 10)))
        val nav = PolygonNavigation(NavMesh(listOf(a, b), emptyList()))
        assertNull(nav.path(p(5, 5), p(25, 5), setOf(0)))
        assertFalse(nav.clear(p(5, 5), p(25, 5), setOf(0)))
    }
}
