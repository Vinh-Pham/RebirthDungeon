package cloud.vinh.rebirthsaga.smoke;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

/**
 * Smoke fixture for the Jackson stack that will back the versioned content catalog
 * (game-plan section 15): versioned JSON definitions bind to plain DTOs with strict
 * defaults, so unknown fields and unknown enum values fail the load instead of
 * silently defaulting. Dice notation such as "1d6+1" stays a String at the parsing
 * boundary; parsing it into rules data is the content validator's job (Phase 2+).
 * Plain JVM test; no Gdx.app, no OpenGL.
 */
public class JacksonContentBindingTest {

    enum Rarity {
        COMMON, UNCOMMON, RARE, LEGENDARY
    }

    /** Shape mirrors the planned item definitions; Jackson needs public accessors. */
    public static class ItemDefinition {
        public String id;
        public String name;
        public Rarity rarity;
        public String damage;
        public List<String> tags;
        public int sellValue;
    }

    private static final String RUSTED_SWORD_JSON = "{\n"
            + "  \"id\": \"rusted_sword\",\n"
            + "  \"name\": \"Rusted Sword\",\n"
            + "  \"rarity\": \"COMMON\",\n"
            + "  \"damage\": \"1d6+1\",\n"
            + "  \"tags\": [\"SWORD\", \"MELEE\"],\n"
            + "  \"sellValue\": 12\n"
            + "}\n";

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    public void bindsContentDefinitionFromJson() throws Exception {
        ItemDefinition item = mapper.readValue(RUSTED_SWORD_JSON, ItemDefinition.class);

        assertEquals("rusted_sword", item.id);
        assertEquals("Rusted Sword", item.name);
        assertEquals(Rarity.COMMON, item.rarity);
        assertEquals("1d6+1", item.damage);
        assertEquals(Arrays.asList("SWORD", "MELEE"), item.tags);
        assertEquals(12, item.sellValue);
    }

    @Test
    public void unknownFieldFailsWithActionableName() throws Exception {
        String json = RUSTED_SWORD_JSON.replace("\"sellValue\": 12", "\"sellValue\": 12, \"selValue\": 12");
        try {
            mapper.readValue(json, ItemDefinition.class);
            fail("Unknown content field must fail the load");
        } catch(UnrecognizedPropertyException expected) {
            assertTrue("Report the offending field name",
                    expected.getMessage().contains("\"selValue\""));
        }
    }

    @Test
    public void unknownEnumValueFailsTheLoad() throws Exception {
        String json = RUSTED_SWORD_JSON.replace("\"rarity\": \"COMMON\"", "\"rarity\": \"EXOTIC\"");
        try {
            mapper.readValue(json, ItemDefinition.class);
            fail("Unknown enum value must fail the load");
        } catch(InvalidFormatException expected) {
            assertEquals(Rarity.class, expected.getTargetType());
        }
    }

    @Test
    public void serializedDefinitionRestoresEqually() throws Exception {
        ItemDefinition item = mapper.readValue(RUSTED_SWORD_JSON, ItemDefinition.class);
        String written = mapper.writeValueAsString(item);
        ItemDefinition restored = mapper.readValue(written, ItemDefinition.class);

        assertEquals(item.id, restored.id);
        assertEquals(item.rarity, restored.rarity);
        assertEquals(item.damage, restored.damage);
        assertEquals(item.tags, restored.tags);
        assertEquals(item.sellValue, restored.sellValue);
    }
}
