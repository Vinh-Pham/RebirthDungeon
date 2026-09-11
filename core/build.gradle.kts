import org.gradle.plugins.ide.eclipse.model.EclipseModel

val appName: String by project
val kotlinVersion: String by project
val ktxVersion: String by project
val gdxVersion: String by project
val artemisVersion: String by project
val jdkgdxdsVersion: String by project
val juniperVersion: String by project
val jacksonVersion: String by project
val jacksonAnnotationsVersion: String by project
val junitVersion: String by project
val enableGraalNative: String by project
val graalHelperVersion: String by project
val gdxControllersVersion: String by project
val aiVersion: String by project
val bladeInkVersion: String by project
val spineRuntimeVersion: String by project
val box2dlightsVersion: String by project
val tantrumDigitalVersion: String by project
val tantrumJdkgdxdsVersion: String by project
val tantrumRegExodusVersion: String by project
val anim8Version: String by project
val cruxVersion: String by project
val digitalVersion: String by project
val funderbyVersion: String by project
val gandVersion: String by project
val gdcruxVersion: String by project
val jdkgdxdsInteropVersion: String by project
val utilsVersion: String by project
val regExodusVersion: String by project
val inGameConsoleVersion: String by project
val typingLabelVersion: String by project
val visUiVersion: String by project
val kotlinxCoroutinesVersion: String by project

configure<EclipseModel> {
    project {
        name = "$appName-core"
    }
}

// Kotlin port of the former Checkstyle gate: formatting hygiene plus the
// architecture boundary. Simulation code under cloud/vinh/rebirthdungeon/game/
// must not import LibGDX (game-plan section 3); `:core:check` runs this with
// the tests.
tasks.register("checkSimulationBoundary") {
    group = "verification"
    description = "Formatting hygiene + architecture boundary: game/ must not import com.badlogic.gdx."
    doLast {
        val kotlinFiles = mutableListOf<File>()
        listOf("src/main/kotlin", "src/test/kotlin").forEach { dirName ->
            val dir = project.file(dirName)
            if (dir.exists()) {
                dir.walkTopDown().filter { it.extension == "kt" }.forEach { kotlinFiles.add(it) }
            }
        }
        val gameSources = kotlinFiles.filter { it.path.contains("/game/") }
        val violations = mutableListOf<String>()
        kotlinFiles.forEach { file ->
            if (file.readText().contains('\r'))
                violations += "$file: CR line ending"
            file.useLines { lines ->
                lines.forEachIndexed { index, line ->
                    val no = index + 1
                    val trimmed = line.trim()
                    if ("\t" in line)
                        violations += "$file:$no: tab character"
                    if (line != line.trimEnd())
                        violations += "$file:$no: trailing whitespace"
                    // The load-bearing rule: game/ stays plain JVM code (no Gdx, no
                    // graphics/audio/files) so it runs in JVM tests. Adapters live in
                    // game/squidsquad/ and presentation code may import Gdx.
                    if (file in gameSources && trimmed.startsWith("import com.badlogic.gdx"))
                        violations += "$file:$no: $trimmed"
                }
            }
        }
        if (violations.isNotEmpty()) {
            violations.forEach { logger.error(it) }
            throw GradleException("simulation boundary / formatting violations:\n" + violations.joinToString("\n"))
        }
    }
}

tasks.named("check") { dependsOn("checkSimulationBoundary") }

dependencies {
    // Kotlin runtime and coroutines (used by ktx-async/ktx-assets-async); pinned to
    // the Kotlin version the build plugins use.
    implementation("org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:$kotlinxCoroutinesVersion")

    // Exposed to launcher compilation (RebirthDungeon extends com.badlogic.gdx.Game).
    api("com.badlogicgames.gdx:gdx:$gdxVersion")

    // ktx-app is api because RebirthDungeon publicly extends KtxGame: a supertype
    // used in the public API must be on consumers' compile classpaths, or they
    // cannot resolve RebirthDungeon as an ApplicationListener.
    api("io.github.quillraven.libktx:ktx-app:$ktxVersion")

    // libGDX extensions from the gdx-liftoff Kotlin + KTX setup (user-directed full
    // adoption 2026-09-06). gdx-box2d/gdx-freetype natives are wired per launcher in
    // the lwjgl3/android/ios build scripts (gdx-platform natives-ios carries both).
    implementation("com.badlogicgames.gdx:gdx-ai:$aiVersion")
    implementation("com.badlogicgames.gdx:gdx-box2d:$gdxVersion")
    implementation("com.badlogicgames.gdx:gdx-freetype:$gdxVersion")
    implementation("com.badlogicgames.gdx-controllers:gdx-controllers-core:$gdxControllersVersion")

    // Third-party libraries from the same liftoff setup; version pins in
    // gradle.properties. Kept at implementation scope per the dependency rule
    // (only gdx is api).
    implementation("com.bladecoder.ink:blade-ink:$bladeInkVersion")
    implementation("com.esotericsoftware.spine:spine-libgdx:$spineRuntimeVersion")
    implementation("com.github.libgdx:box2dlights:$box2dlightsVersion")
    // EXCLUDED from the liftoff set: org.apache.fory:fory-core and the
    // com.github.tommyettinger.tantrum:* modules built on it. Fory requires Android
    // API 26+ (its bytecode carries invokedynamic instructions D8 cannot process at
    // minSdk 21 — "Increase the minSdkVersion to 26 or above"), verified against
    // fory 1.7.1/1.6.1/1.5.0 and https://fory.apache.org/docs/guide/java/android_support/.
    // Restore both if the reviewed minSdk 21 target is ever raised to 26.
    implementation("com.github.tommyettinger:anim8-gdx:$anim8Version")
    implementation("com.github.tommyettinger:crux:$cruxVersion")
    implementation("com.github.tommyettinger:digital:$digitalVersion")
    implementation("com.github.tommyettinger:funderby:$funderbyVersion")
    implementation("com.github.tommyettinger:gand:$gandVersion")
    implementation("com.github.tommyettinger:gdcrux:$gdcruxVersion")
    implementation("com.github.tommyettinger:jdkgdxds_interop:$jdkgdxdsInteropVersion")
    implementation("com.github.tommyettinger:libgdx-utils:$utilsVersion")
    implementation("com.github.tommyettinger:regexodus:$regExodusVersion")
    implementation("com.github.tommyettinger:sjInGameConsole:$inGameConsoleVersion")
    implementation("com.github.tommyettinger:typing-label:$typingLabelVersion")
    implementation("com.kotcrab.vis:vis-ui:$visUiVersion")

    // Simulation stack, internal to core: artemis-odb ECS and Juniper RNG.
    // Exploration navigation/generation is project-owned pure Kotlin; the obsolete
    // SquidSquad/SquidLib grid stack and its companion modules are removed.
    // `implementation` keeps this stack off launcher compile classpaths; it still
    // reaches consumer runtime classpaths for packaging.
    implementation("net.onedaybeard.artemis:artemis-odb:$artemisVersion")
    // Versioned content definitions (assets/data JSON -> data/content DTOs). Jackson's
    // strict default binding (unknown fields and enum values fail) backs the explicit
    // content validation boundary. Save bundles keep LibGDX JSON codecs (game-plan 14).
    implementation("com.fasterxml.jackson.core:jackson-databind:$jacksonVersion")
    implementation("com.fasterxml.jackson.core:jackson-annotations:$jacksonAnnotationsVersion")
    implementation("com.github.tommyettinger:juniper:$juniperVersion")
    implementation("com.github.tommyettinger:jdkgdxds:$jdkgdxdsVersion")

    // KTX Kotlin DSL modules, quillraven group — the full gdx-liftoff set. 1.14.2-rc1
    // is built against this project's exact pins (gdx 1.14.2, artemis-odb 2.3.0,
    // kotlin-stdlib 2.4.10).
    implementation("io.github.quillraven.libktx:ktx-actors:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-ai:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-artemis:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-assets-async:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-assets:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-async:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-box2d:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-collections:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-freetype-async:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-freetype:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-graphics:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-i18n:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-inject:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-json:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-log:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-math:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-preferences:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-reflect:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-scene2d:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-style:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-tiled:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-vis-style:$ktxVersion")
    implementation("io.github.quillraven.libktx:ktx-vis:$ktxVersion")

    // Pinned Java 8-compatible JVM test framework. Tests must not start Gdx.app,
    // OpenGL, native UI or any provider SDK.
    testImplementation("junit:junit:$junitVersion")

    if (enableGraalNative == "true") {
        implementation("io.github.berstanio:gdx-svmhelper-annotations:$graalHelperVersion")
    }
}
