package cloud.vinh.rebirthdungeon.presentation.screens

/** Temporary desktop verification aid for the Phase 1 prototype; removed with
 * the prototype in Phase 9. When the JVM is launched with
 * `-Drebirth.autodemo=true` (a system property no store/mobile launch
 * sets), the loading screen hands off to the title screen, which captures the
 * menu and drives itself into the dungeon; the dungeon exercises accepted and
 * rejected move commands through the real `submitMove` path, and the two
 * screens transition menu-to-dungeon twice to prove repeatable lifecycle
 * transitions. Each stage captures a frame into `screenshots/`. Inactive and
 * allocation-free without the flag. */
object AutoDemo {
    /** Number of dungeon activations in this demo run; the second entry exits. */
    var dungeonEntries = 0

    fun enabled(): Boolean {
        // Env fallback for RoboVM/iOS, where simctl launches cannot pass -D flags.
        return java.lang.Boolean.getBoolean("rebirth.autodemo") ||
            "1" == System.getenv("REBIRTH_AUTODEMO")
    }
}
