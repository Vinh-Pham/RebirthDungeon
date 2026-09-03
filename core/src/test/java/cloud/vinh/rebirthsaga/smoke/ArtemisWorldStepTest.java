package cloud.vinh.rebirthsaga.smoke;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import com.artemis.Aspect;
import com.artemis.BaseEntitySystem;
import com.artemis.Component;
import com.artemis.ComponentMapper;
import com.artemis.World;
import com.artemis.WorldConfiguration;
import com.artemis.WorldConfigurationBuilder;
import com.artemis.systems.IteratingSystem;
import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

/**
 * Proves the ordered artemis-odb step the whole simulation builds on: systems run in
 * registration order inside one synchronous {@link World#process()} call, and aspect
 * subscriptions expose only matching entities. Unlike Ashley, artemis-odb has no
 * per-system priority field; pipeline order is expressed by registration order, and
 * the builder accepts at most one system instance per class. Components are created
 * reflectively, so they need a public constructor. Plain JVM test; no Gdx.app, no
 * OpenGL.
 */
public class ArtemisWorldStepTest {

    /** Component data; artemis components hold state and carry no behavior. */
    public static class Health extends Component {
        public Health() {
        }

        public int value;
    }

    /** Records its own execution into the shared call log; matches every entity. */
    abstract static class RecordingSystem extends BaseEntitySystem {
        final String name;
        final List<String> callLog;

        RecordingSystem(String name, List<String> callLog) {
            super(Aspect.all());
            this.name = name;
            this.callLog = callLog;
        }

        @Override
        protected void processSystem() {
            callLog.add(name);
        }
    }

    // The builder allows one instance per system class, so each pipeline slot is its
    // own subclass; registration order (not a priority field) fixes execution order.
    static class ValidationSlot extends RecordingSystem {
        ValidationSlot(List<String> callLog) {
            super("validation", callLog);
        }
    }

    static class MovementSlot extends RecordingSystem {
        MovementSlot(List<String> callLog) {
            super("movement", callLog);
        }
    }

    static class CleanupSlot extends RecordingSystem {
        CleanupSlot(List<String> callLog) {
            super("cleanup", callLog);
        }
    }

    /** Applies the rule once per aspect-matching entity via the injected mapper. */
    public static class HealthIncrementSystem extends IteratingSystem {
        ComponentMapper<Health> mHealth;

        public HealthIncrementSystem() {
            super(Aspect.all(Health.class));
        }

        @Override
        protected void process(int entityId) {
            mHealth.create(entityId).value += 1;
        }
    }

    @Test
    public void systemsRunInRegistrationOrder() {
        List<String> callLog = new ArrayList<>();
        WorldConfiguration config = new WorldConfigurationBuilder()
                .with(new ValidationSlot(callLog),
                        new MovementSlot(callLog),
                        new CleanupSlot(callLog))
                .build();
        World world = new World(config);

        world.process();

        assertEquals(3, callLog.size());
        assertEquals("validation", callLog.get(0));
        assertEquals("movement", callLog.get(1));
        assertEquals("cleanup", callLog.get(2));
    }

    @Test
    public void aspectSubscriptionAppliesRuleOnlyToMatchingEntities() {
        WorldConfiguration config = new WorldConfigurationBuilder()
                .with(new HealthIncrementSystem())
                .build();
        World world = new World(config);

        ComponentMapper<Health> mHealth = world.getMapper(Health.class);
        int tagged = world.create();
        mHealth.create(tagged);
        int untagged = world.create();

        world.process();

        assertEquals(1, mHealth.get(tagged).value);
        assertFalse(mHealth.has(untagged));
    }
}
