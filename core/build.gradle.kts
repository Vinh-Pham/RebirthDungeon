import org.gradle.plugins.ide.eclipse.model.EclipseModel

val appName: String by project
val kotlinVersion: String by project
val ktxVersion: String by project
val gdxVersion: String by project
val artemisVersion: String by project
val squidSquadVersion: String by project
val jdkgdxdsVersion: String by project
val juniperVersion: String by project
val jacksonVersion: String by project
val jacksonAnnotationsVersion: String by project
val junitVersion: String by project
val enableGraalNative: String by project
val graalHelperVersion: String by project

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
    // Kotlin runtime; pinned to the Kotlin version the build plugins use.
    implementation("org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion")

    // Exposed to launcher compilation (RebirthDungeon extends com.badlogic.gdx.Game).
    api("com.badlogicgames.gdx:gdx:$gdxVersion")

    // First-slice simulation stack, internal to core: artemis-odb ECS, SquidSquad
    // algorithms, and Juniper RNG. `implementation` keeps them off launcher compile
    // classpaths; they still reach consumer runtime classpaths for packaging.
    implementation("net.onedaybeard.artemis:artemis-odb:$artemisVersion")
    // Versioned content definitions (assets/data JSON -> data/content DTOs). Jackson's
    // strict default binding (unknown fields and enum values fail) backs the explicit
    // content validation boundary. Save bundles keep LibGDX JSON codecs (game-plan 14).
    implementation("com.fasterxml.jackson.core:jackson-databind:$jacksonVersion")
    implementation("com.fasterxml.jackson.core:jackson-annotations:$jacksonAnnotationsVersion")
    implementation("com.github.tommyettinger:juniper:$juniperVersion")
    implementation("com.github.tommyettinger:jdkgdxds:$jdkgdxdsVersion")
    implementation("com.github.yellowstonegames.squidsquad:squidcore:$squidSquadVersion")
    implementation("com.github.yellowstonegames.squidsquad:squidgrid:$squidSquadVersion")
    implementation("com.github.yellowstonegames.squidsquad:squidplace:$squidSquadVersion")
    implementation("com.github.yellowstonegames.squidsquad:squidpath:$squidSquadVersion")

    // KTX Kotlin DSL modules (io.github.libktx). Extension-only usage over APIs this
    // project already owns; each is imported by project code. Modules without a
    // current usage site are deliberately not declared (see project-phases Work Notes,
    // 2026-09-06 KTX adoption entry).
    implementation("io.github.libktx:ktx-app:$ktxVersion")
    implementation("io.github.libktx:ktx-artemis:$ktxVersion")
    implementation("io.github.libktx:ktx-actors:$ktxVersion")
    implementation("io.github.libktx:ktx-assets:$ktxVersion")
    implementation("io.github.libktx:ktx-graphics:$ktxVersion")
    implementation("io.github.libktx:ktx-log:$ktxVersion")
    implementation("io.github.libktx:ktx-scene2d:$ktxVersion")

    // digital, regexodus, crux and funderby arrive transitively; declare them here only
    // when project code imports their types directly.

    // Pinned Java 8-compatible JVM test framework. Tests must not start Gdx.app,
    // OpenGL, native UI or any provider SDK.
    testImplementation("junit:junit:$junitVersion")

    if (enableGraalNative == "true") {
        implementation("io.github.berstanio:gdx-svmhelper-annotations:$graalHelperVersion")
    }
}
