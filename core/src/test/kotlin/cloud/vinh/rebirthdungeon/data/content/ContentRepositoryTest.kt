package cloud.vinh.rebirthdungeon.data.content

import cloud.vinh.rebirthdungeon.game.BattleSession
import cloud.vinh.rebirthdungeon.game.BattleSimulation
import cloud.vinh.rebirthdungeon.game.algorithms.RandomStream
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.databind.node.ArrayNode
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class ContentRepositoryTest {
    private val mapper = ObjectMapper()
    private fun source(path: String): String = File("../assets/data/$path").readText()
    private fun load(): ContentBundle = JacksonContentRepository(::source).load()
    private fun invalid(field: String, mutate: (ObjectNode) -> Unit) {
        val tree = mapper.readTree(source("starter.json")) as ObjectNode
        mutate(tree)
        val failure = assertThrows(ContentException::class.java) {
            JacksonContentRepository { if (it == "starter.json") tree.toString() else source(it) }.load()
        }
        assertTrue(failure.message, failure.message!!.contains(field))
        assertTrue(failure.message!!.contains("starter.json"))
    }
    private fun ObjectNode.row(category: String): ObjectNode = get(category)[0] as ObjectNode
    private fun ObjectNode.rank(): ObjectNode = row("skills").get("ranks")[0] as ObjectNode

    @Test fun allBundledContentAndActualAtlasRegionsValidateWithoutGraphics() {
        val bundle = load()
        val atlas = File("../assets/atlases/dungeon.atlas").readLines().toSet()
        bundle.validateVisuals { file, region -> file == "atlases/dungeon.atlas" && region in atlas }
        assertEquals(2, bundle.catalog.skills.getValue(ContentId("skill.sword")).ranks.size)
        assertEquals("E", bundle.catalog.skills.getValue(ContentId("skill.sword")).prototypeCap)
        assertEquals(8, bundle.catalog.scoring.values.single().multipliers.size)
        assertThrows(IllegalArgumentException::class.java) { bundle.validateVisuals { _, _ -> false } }
    }

    @Test fun rejectsMissingUnknownNullAndCoercedFields() {
        invalid("name") { it.row("skills").remove("name") }
        invalid("surprise") { it.put("surprise", true) }
        invalid("kind") { it.row("actors").put("kind", "ALIEN") }
        invalid("kind") { it.row("actors").put("kind", 0) }
        invalid("weights") { (it.rank().get("weights") as ArrayNode).addNull() }
        invalid("schemaVersion") { it.put("schemaVersion", 1) }
    }

    @Test fun rejectsBadIdsRangesWeightsRanksAndProbabilityTotals() {
        invalid("id") { it.row("actors").put("id", "bad id") }
        invalid("duplicate") { it.row("actors").put("id", "skill.sword") }
        invalid("weights") { it.rank().putArray("weights").add(1) }
        invalid("weights") { it.rank().putArray("weights").apply { repeat(6) { add(0) } } }
        invalid("weights") { it.rank().putArray("weights").apply { add(-1); repeat(5) { add(1) } } }
        invalid("weights") { it.rank().putArray("weights").apply { repeat(6) { add(Int.MAX_VALUE) } } }
        invalid("cost") { (it.rank().get("cost") as ObjectNode).put("sp", 0) }
        invalid("order") { it.rank().put("order", 1) }
        invalid("prototypeCap") { it.row("skills").put("prototypeCap", "D") }
        invalid("probabilities") { (it.row("loot").get("entries")[0] as ObjectNode).put("probability", 1) }
        invalid("thresholds") { it.row("progression").putArray("thresholds").add(0).add(100).add(90) }
        invalid("multipliers") { (it.row("scoring").get("multipliers") as ArrayNode).remove(0) }
    }

    @Test fun rejectsReferencesAndStatCycles() {
        invalid("scoring") { it.row("skills").put("scoring", "missing.scoring") }
        invalid("attackStat") { it.row("skills").put("attackStat", "missing.stat") }
        invalid("rank") { it.row("actors").put("rank", "D") }
        invalid("enemy") { it.row("encounters").put("enemy", "actor.hero") }
        invalid("status") { it.row("potions").put("status", "missing.status") }
        invalid("potion") { (it.row("loot").get("entries")[0] as ObjectNode).put("potion", "missing.potion") }
        invalid("terms") {
            val stat = it.get("stats")[5] as ObjectNode
            (stat.get("terms")[0] as ObjectNode).put("stat", "stat.max_hp")
        }
        invalid("terms") { it.row("stats").putArray("terms").addObject().put("stat", "stat.str").put("numerator", 1).put("denominator", 1) }
    }

    @Test fun rejectsManifestVersionsPathsAndDuplicateJsonKeys() {
        listOf(source("manifest.json").replace("\"rulesVersion\": 2", "\"rulesVersion\": 9"),
            source("manifest.json").replace("starter.json", "../starter.json"),
            source("manifest.json").replace("\"schemaVersion\": 2", "\"schemaVersion\": 2, \"schemaVersion\": 2")).forEach { json ->
            assertThrows(ContentException::class.java) { JacksonContentRepository { if (it == "manifest.json") json else source(it) }.load() }
        }
    }

    @Test fun validatesVisualIdsAnimationsAndManifestReadOrder() {
        val paths = mutableListOf<String>()
        JacksonContentRepository { paths.add(it); source(it) }.load()
        assertEquals(listOf("manifest.json", "starter.json", "visuals.json", "world.json"), paths)
        listOf("id" to "missing.actor", "atlas" to "missing.atlas", "animation" to "typo").forEach { (field, value) ->
            val tree = mapper.readTree(source("visuals.json")) as ObjectNode
            (tree.get("bindings")[0] as ObjectNode).put(field, value)
            val failure = assertThrows(ContentException::class.java) {
                JacksonContentRepository { if (it == "visuals.json") tree.toString() else source(it) }.load()
            }
            assertTrue(failure.message, failure.message!!.contains("visuals.json.bindings[0].$field"))
        }
        val tree = mapper.readTree(source("visuals.json")) as ObjectNode
        (tree.get("bindings") as ArrayNode).remove(0)
        assertThrows(ContentException::class.java) {
            JacksonContentRepository { if (it == "visuals.json") tree.toString() else source(it) }.load()
        }
    }

    @Test fun catalogAndObservedEventsAreDetachedAndRunPinsInputs() {
        val catalog = load().catalog
        assertThrows(UnsupportedOperationException::class.java) { (catalog.skills as MutableMap).clear() }
        val rank = catalog.skills.getValue(ContentId("skill.sword")).ranks.first()
        assertThrows(UnsupportedOperationException::class.java) { (rank.weights as MutableList)[0] = 9 }
        assertThrows(UnsupportedOperationException::class.java) { (catalog.actors.values.first().stats as MutableMap).clear() }
        val run = BattleSession(42, catalog)
        val simulation = BattleSimulation.create(run)
        try {
            assertSame(catalog, simulation.session.content)
            val snapshot = simulation.observe()
            simulation.apply(cloud.vinh.rebirthdungeon.game.commands.EndTurnCommand)
            assertEquals(0L, snapshot.commandCount)
            assertTrue(snapshot.events.isEmpty())
        } finally { simulation.dispose() }
    }
    @Test fun validatesAuthoredCombatFieldsAndUnsupportedEnemyEffects() {
        invalid("effect") { it.row("skills").remove("effect") }
        invalid("effect") { it.row("skills").put("effect", "HEAL_UNAUTHORED") }
        invalid("requiredEquipment") { it.row("skills").put("requiredEquipment", "gun") }
        invalid("target") { it.row("skills").put("target", "SELF") }
        invalid("shieldDuration") { it.row("skills").put("shieldDuration", 1) }
        invalid("cooldown") { it.row("skills").put("cooldown", -1) }
        invalid("status") { it.row("skills").put("status", "status.missing") }
        invalid("periodicDamage") { it.row("statuses").put("periodicDamage", -1) }
        invalid("percent") { it.row("statuses").put("percent", 10001) }
        invalid("skill") { (it.get("actors")[1] as ObjectNode).put("skill", "skill.sword") }
    }

}
