package cloud.vinh.rebirthsaga.smoke;

import static org.junit.Assert.assertEquals;

import com.github.tommyettinger.ds.IntFloatMap;
import com.github.tommyettinger.ds.ObjectList;
import org.junit.Test;

/**
 * Smoke fixture for the repaired jdkgdxds artifact: the collections implement JDK
 * interfaces, which later simulation code (occupancy index, run state) relies on.
 * This class comes from {@code com.github.tommyettinger.jdkgdxds:jdkgdxds}; the
 * duplicate {@code :build} artifact is excluded at the dependency-graph level.
 * Plain JVM test; no Gdx.app, no OpenGL.
 */
public class JdkgdxdsCollectionsTest {

    @Test
    public void objectListBehavesLikeAJavaList() {
        ObjectList<String> list = new ObjectList<>();
        list.add("spawn");
        list.add("exit");
        assertEquals(2, list.size());
        assertEquals("spawn", list.get(0));
        assertEquals("exit", list.get(1));

        list.remove(0);
        assertEquals(1, list.size());
        assertEquals("exit", list.get(0));
    }

    @Test
    public void intFloatMapStoresAndReplacesValues() {
        IntFloatMap occupancyCost = new IntFloatMap();
        assertEquals(0.0f, occupancyCost.put(42, 0.25f), 0.0f);
        assertEquals(0.25f, occupancyCost.put(42, 0.5f), 0.0f);
        assertEquals(0.5f, occupancyCost.get(42), 0.0f);
        assertEquals(1, occupancyCost.size());
    }
}
