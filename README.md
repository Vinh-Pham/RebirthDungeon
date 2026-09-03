# RebirthDungeon

A 2D pixel-art, grid-based roguelike dungeon crawler with dice combat, built in Java with [libGDX](https://libgdx.com/). See [game-plan.md](game-plan.md) for the architecture contract and [project-phases.md](project-phases.md) for the implementation tracker.

This project was generated with [gdx-liftoff](https://github.com/libgdx/gdx-liftoff) and reworked in Phase 0 into a reproducible build baseline.

## Platforms

- `core`: Main module with the application logic shared by all platforms. Targets Java 8 language/API level.
- `lwjgl3`: Primary desktop platform using LWJGL3; the fastest development target.
- `android`: Android mobile platform. Needs the Android SDK.
- `ios`: iOS mobile platform using RoboVM. Needs macOS with Xcode.
- `assets`: Shared resources (UI skin, bitmap fonts; gameplay content arrives in later phases).

## Prerequisites

### Desktop

- A JDK to run Gradle with; the build selects JDK 25 automatically via the daemon JVM criteria in `gradle/gradle-daemon-jvm.properties` (downloaded on demand through the foojay resolver). Shared code stays on the Java 8 API surface regardless of the build JDK (`options.release = 8`), which keeps the Android dexer and the RoboVM iOS compiler — neither of which consumes Java 25 bytecode — working unchanged.
- No other setup; `./gradlew :lwjgl3:run` starts the game.

### Android

- Android SDK with platform `36` (compile/target SDK) and build-tools; `minSdkVersion` is 21.
- Set `sdk.dir` in `local.properties` (or `ANDROID_SDK_ROOT`). Gradle fetches missing SDK components when licenses are accepted.
- Debug packaging is verified with `./gradlew :android:assembleDebug`; JVM compilation alone does not verify Android packaging.

### iOS

- macOS with Xcode and its iOS simulator runtimes, matching RoboVM `2.3.23` support. The iOS plist advertises a minimum of iOS 12.0.
- The RoboVM Gradle plugin links native code; an iOS verification run is a full AOT build, distinct from any JVM compile.
- Simulator verification (on a macOS host):
  - `xcodebuild -version` — record the Xcode version used.
  - `xcrun simctl list devices available` — pick an iPhone simulator.
  - `./gradlew :ios:launchIPhoneSimulator` — builds AOT and boots the app on the chosen simulator.
  - Device builds use `./gradlew :ios:launchIOSDevice` with signing configured in Xcode; `createIPA` produces the archive.
- Successful `:ios:compileJava` on any host is **not** an iOS build and must not be reported as one.

## Dependencies

The first-slice runtime (pinned in `gradle.properties`, audited in game-plan section 2):

- `com.badlogicgames.gdx:gdx` 1.14.2 — lifecycle, graphics, audio, input, Scene2D, assets, JSON. Exposed as `api` because launchers compile against `Game`.
- `net.onedaybeard.artemis:artemis-odb` 2.3.0 — authoritative ECS (systems run in registration order; components need public constructors).
- SquidSquad `squidcore`, `squidgrid`, `squidplace`, `squidpath` 4.0.12 — generation and cardinal pathfinding (implemented with jdkgdxds/juniper/digital/regexodus/crux transitively).
- `com.github.tommyettinger:jdkgdxds` 2.1.8 and `com.github.tommyettinger:juniper` 0.10.5 — collections and seeded RNG.
- `com.fasterxml.jackson.core:jackson-databind` 2.22.2 (+ `jackson-annotations` 2.22) — versioned content definitions in `assets/data` JSON, bound strictly to plain DTOs (unknown fields/enum values fail the load). Save bundles stay on LibGDX JSON.
- `junit:junit` 4.13.2 (tests only).

Dependency policy:

- **Duplicate-artifact repair.** The jdkgdxds `2.1.8` JitPack publication depends on both `com.github.tommyettinger.jdkgdxds:build` and `com.github.tommyettinger.jdkgdxds:jdkgdxds`, which contain identical classes and fail Android's `checkDebugDuplicateClasses`. The root build excludes exactly `com.github.tommyettinger.jdkgdxds:build` from every configuration; the retained `:jdkgdxds` module declares the same dependencies, so nothing else is dropped. This is a graph repair — no packaging rule hides duplicate bytecode.
- **Deferrals.** Box2D (+ lights extension and all platform natives), gdx-controllers (all backends), gdx-ai, Spine, blade-ink, typing-label, anim8, vis-ui, gdx-kiwi, libgdx-utils, sjInGameConsole, squidlib 3.x, squidseek/squidpress/squidsmooth/squidtext, squidstore*/squidwrath* (serialization stacks), fory/tantrum, gand/gdcrux and jdkgdxds_interop are all out of the initial runtime. Re-add an entry only for a concrete feature, with a reviewed pin and matching natives on every launcher.
- **`api` vs `implementation`.** Only `gdx` is `api`; internal libraries are `implementation` so launchers do not leak their types.
- **Repositories.** Maven Central + JitPack (required by tommyettinger/yellowstonegames artifacts). `mavenLocal()` is opt-in via `-Prebirth.enableMavenLocal=true`; snapshot repositories were removed.
- **Reproducibility.** Dependency locking is on for all configurations (`gradle.lockfile` per module; regenerate with `--write-locks` after an intentional bump) and checksum verification is committed in `gradle/verification-metadata.xml` (regenerate with `--write-verification-metadata sha256` when the graph changes).
- **Desktop tooling.** `gdx-tools` lives in the `gdxTools` configuration, not on the runtime classpath. Use `./gradlew :lwjgl3:gdxToolsClasspath`, then `java -cp "$(cat lwjgl3/build/gdx-tools-classpath.txt)" com.badlogic.gdx.tools.texturepacker.TexturePacker <inputDir> <packFile>` for offline atlas packing.

## Tests and checks

- `./gradlew :core:test` runs plain JVM tests under `core/src/test/java`. They must not start `Gdx.app`, OpenGL, native UI or provider SDKs; the LibGDX headless backend may be added later as an explicit test dependency only for tests that need it.
- Fixtures in `cloud.vinh.rebirthsaga.smoke` pin the selected stack: ordered artemis-odb system execution (registration order, one system per class, public component constructors), Jackson strict content binding (item definitions with dice-notation strings, enum rarities, tag arrays), Juniper `AceRandom` sequence reproduction and five-word state restore, and jdkgdxds collection behavior.
- `./gradlew :core:check` also runs Checkstyle (`config/checkstyle/checkstyle.xml`): import/format hygiene plus the architecture boundary rule — files under `.../game/` (the deterministic simulation tree) must not import `com.badlogic.gdx`.
- Java 8 API compliance of shared code is enforced by `options.release = 8`, not by the build JDK version.

## CI

`.github/workflows/ci.yml.backup` runs on push/PR: shared tests and checks, desktop compilation, and Android duplicate-class checking plus debug packaging on an Ubuntu runner. iOS verification is run manually on a macOS host as described above and is not asserted by CI.

## Gradle

The Gradle wrapper (`9.7.1`) is included; run tasks with `./gradlew`. Useful tasks:

- `:core:check` — shared tests + Checkstyle.
- `:core:compileJava :lwjgl3:compileJava` — shared and desktop compilation.
- `:android:checkDebugDuplicateClasses :android:assembleDebug` — Android packaging gate and debug APK.
- `:lwjgl3:run` — start the desktop game.
- `lwjgl3:jar` — runnable fat JAR in `lwjgl3/build/libs`.
- `clean`, `idea`, `eclipse` — housekeeping.
- Most tasks accept a project prefix, e.g. `core:clean`.
