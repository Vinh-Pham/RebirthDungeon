package cloud.vinh.rebirthsaga.presentation.screens;

/** Temporary desktop verification aid for the Phase 1 prototype; removed with
 * the prototype in Phase 9. When the JVM is launched with
 * {@code -Drebirth.autodemo=true} (a system property no store/mobile launch
 * sets), the loading screen drives itself into the dungeon, the dungeon
 * exercises accepted and rejected move commands through the real
 * {@code submitMove} path, and the two screens transition menu-to-dungeon
 * twice to prove repeatable lifecycle transitions. Each stage captures a frame
 * into {@code screenshots/}. Inactive and allocation-free without the flag. */
final class AutoDemo {
    /** Number of dungeon activations in this demo run; the second entry exits. */
    static int dungeonEntries;

    private AutoDemo() {
    }

    static boolean enabled() {
        // Env fallback for RoboVM/iOS, where simctl launches cannot pass -D flags.
        return Boolean.getBoolean("rebirth.autodemo")
                || "1".equals(System.getenv("REBIRTH_AUTODEMO"));
    }
}
