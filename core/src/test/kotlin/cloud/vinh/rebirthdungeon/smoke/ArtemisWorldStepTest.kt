package cloud.vinh.rebirthdungeon.smoke

import com.artemis.Aspect
import com.artemis.BaseEntitySystem
import com.artemis.Component
import com.artemis.ComponentMapper
import com.artemis.World
import com.artemis.WorldConfigurationBuilder
import com.artemis.systems.IteratingSystem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.util.ArrayList

/**
 * Proves the ordered artemis-odb step the whole simulation builds on: systems run in
 * registration order inside one synchronous [World.process] call, and aspect
 * subscriptions expose only matching entities. Unlike Ashley, artemis-odb has no
 * per-system priority field; pipeline order is expressed by registration order, and
 * the builder accepts at most one system instance per class. Components are created
 * reflectively, so they need a public constructor. Plain JVM test; no Gdx.app, no
 * OpenGL.
 */
class ArtemisWorldStepTest {

    /** Component data; artemis components hold state and carry no behavior. */
    class Health : Component() {
        var value = 0
    }

    /** Records its own execution into the shared call log; matches every entity. */
    abstract class RecordingSystem(private val name: String, private val callLog: MutableList<String>) :
        BaseEntitySystem(Aspect.all()) {

        override fun processSystem() {
            callLog.add(name)
        }
    }

    // The builder allows one instance per system class, so each pipeline slot is its
    // own subclass; registration order (not a priority field) fixes execution order.
    class ValidationSlot(callLog: MutableList<String>) : RecordingSystem("validation", callLog)

    class MovementSlot(callLog: MutableList<String>) : RecordingSystem("movement", callLog)

    class CleanupSlot(callLog: MutableList<String>) : RecordingSystem("cleanup", callLog)

    /** Applies the rule once per aspect-matching entity via the injected mapper. */
    class HealthIncrementSystem : IteratingSystem(Aspect.all(Health::class.java)) {
        var mHealth: ComponentMapper<Health>? = null

        override fun process(entityId: Int) {
            mHealth!!.create(entityId).value += 1
        }
    }

    @Test
    fun systemsRunInRegistrationOrder() {
        val callLog = ArrayList<String>()
        val config = WorldConfigurationBuilder()
            .with(ValidationSlot(callLog), MovementSlot(callLog), CleanupSlot(callLog))
            .build()
        val world = World(config)

        world.process()

        assertEquals(3, callLog.size)
        assertEquals("validation", callLog[0])
        assertEquals("movement", callLog[1])
        assertEquals("cleanup", callLog[2])
    }

    @Test
    fun aspectSubscriptionAppliesRuleOnlyToMatchingEntities() {
        val config = WorldConfigurationBuilder()
            .with(HealthIncrementSystem())
            .build()
        val world = World(config)

        val mHealth = world.getMapper(Health::class.java)
        val tagged = world.create()
        mHealth.create(tagged)
        val untagged = world.create()

        world.process()

        assertEquals(1, mHealth.get(tagged).value)
        assertFalse(mHealth.has(untagged))
    }
}
