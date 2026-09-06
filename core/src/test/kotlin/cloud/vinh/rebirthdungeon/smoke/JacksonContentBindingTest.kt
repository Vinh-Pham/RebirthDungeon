package cloud.vinh.rebirthdungeon.smoke

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.exc.InvalidFormatException
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.util.Arrays

/**
 * Smoke fixture for the Jackson stack that will back the versioned content catalog
 * (game-plan section 15): versioned JSON definitions bind to plain DTOs with strict
 * defaults, so unknown fields and unknown enum values fail the load instead of
 * silently defaulting. Dice notation such as "1d6+1" stays a String at the parsing
 * boundary; parsing it into rules data is the content validator's job (Phase 2+).
 * Plain JVM test; no Gdx.app, no OpenGL.
 */
class JacksonContentBindingTest {

    enum class Rarity {
        COMMON, UNCOMMON, RARE, LEGENDARY
    }

    /** Shape mirrors the planned item definitions; Jackson binds via the
     * no-arg constructor and the generated accessors. */
    class ItemDefinition {
        var id: String? = null
        var name: String? = null
        var rarity: Rarity? = null
        var damage: String? = null
        var tags: List<String>? = null
        var sellValue = 0
    }

    private val mapper = ObjectMapper()

    @Test
    fun bindsContentDefinitionFromJson() {
        val item = mapper.readValue(RUSTED_SWORD_JSON, ItemDefinition::class.java)

        assertEquals("rusted_sword", item.id)
        assertEquals("Rusted Sword", item.name)
        assertEquals(Rarity.COMMON, item.rarity)
        assertEquals("1d6+1", item.damage)
        assertEquals(Arrays.asList("SWORD", "MELEE"), item.tags)
        assertEquals(12, item.sellValue)
    }

    @Test
    fun unknownFieldFailsWithActionableName() {
        val json = RUSTED_SWORD_JSON.replace("\"sellValue\": 12", "\"sellValue\": 12, \"selValue\": 12")
        try {
            mapper.readValue(json, ItemDefinition::class.java)
            fail("Unknown content field must fail the load")
        } catch (expected: UnrecognizedPropertyException) {
            assertTrue("Report the offending field name",
                expected.message!!.contains("\"selValue\""))
        }
    }

    @Test
    fun unknownEnumValueFailsTheLoad() {
        val json = RUSTED_SWORD_JSON.replace("\"rarity\": \"COMMON\"", "\"rarity\": \"EXOTIC\"")
        try {
            mapper.readValue(json, ItemDefinition::class.java)
            fail("Unknown enum value must fail the load")
        } catch (expected: InvalidFormatException) {
            assertEquals(Rarity::class.java, expected.targetType)
        }
    }

    @Test
    fun serializedDefinitionRestoresEqually() {
        val item = mapper.readValue(RUSTED_SWORD_JSON, ItemDefinition::class.java)
        val written = mapper.writeValueAsString(item)
        val restored = mapper.readValue(written, ItemDefinition::class.java)

        assertEquals(item.id, restored.id)
        assertEquals(item.rarity, restored.rarity)
        assertEquals(item.damage, restored.damage)
        assertEquals(item.tags, restored.tags)
        assertEquals(item.sellValue, restored.sellValue)
    }

    companion object {
        private const val RUSTED_SWORD_JSON = """{
  "id": "rusted_sword",
  "name": "Rusted Sword",
  "rarity": "COMMON",
  "damage": "1d6+1",
  "tags": ["SWORD", "MELEE"],
  "sellValue": 12
}
"""
    }
}
