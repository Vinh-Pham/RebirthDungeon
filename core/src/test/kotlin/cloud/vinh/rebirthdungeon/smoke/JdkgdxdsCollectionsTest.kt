package cloud.vinh.rebirthdungeon.smoke

import com.github.tommyettinger.ds.IntFloatMap
import com.github.tommyettinger.ds.ObjectList
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Smoke fixture for the repaired jdkgdxds artifact: the collections implement JDK
 * interfaces, which later simulation code (occupancy index, run state) relies on.
 * This class comes from `com.github.tommyettinger.jdkgdxds:jdkgdxds`; the
 * duplicate `:build` artifact is excluded at the dependency-graph level.
 * Plain JVM test; no Gdx.app, no OpenGL.
 */
class JdkgdxdsCollectionsTest {

    @Test
    fun objectListBehavesLikeAJavaList() {
        val list = ObjectList<String>()
        list.add("spawn")
        list.add("exit")
        assertEquals(2, list.size)
        assertEquals("spawn", list[0])
        assertEquals("exit", list[1])

        list.removeAt(0)
        assertEquals(1, list.size)
        assertEquals("exit", list[0])
    }

    @Test
    fun intFloatMapStoresAndReplacesValues() {
        val occupancyCost = IntFloatMap()
        assertEquals(0.0f, occupancyCost.put(42, 0.25f), 0.0f)
        assertEquals(0.25f, occupancyCost.put(42, 0.5f), 0.0f)
        assertEquals(0.5f, occupancyCost.get(42), 0.0f)
        // size is a protected field on IntFloatMap; the public accessor is the method.
        assertEquals(1, occupancyCost.size())
    }
}
