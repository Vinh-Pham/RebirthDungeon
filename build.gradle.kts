import org.gradle.plugins.ide.eclipse.model.EclipseModel
import org.gradle.plugins.ide.idea.model.IdeaModel

buildscript {
    repositories {
        mavenCentral()
        gradlePluginPortal()
        google()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.13.2")
        // Kotlin for all modules; version pinned in gradle.properties.
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${property("kotlinVersion")}")
    }
}

allprojects {
    apply(plugin = "eclipse")
    apply(plugin = "idea")

    // This allows you to "Build and run using IntelliJ IDEA", an option in IDEA's Settings.
    configure<IdeaModel> {
        module {
            outputDir = file("build/classes/kotlin/main")
            testOutputDir = file("build/classes/kotlin/test")
        }
    }
}

configure(subprojects.filter { it.name != "android" }) {
    apply(plugin = "java-library")
    apply(plugin = "org.jetbrains.kotlin.jvm")

    configure<JavaPluginExtension> {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    // Compile against the Java 8 API surface on newer build JDKs. Source/target
    // compatibility alone would still let shared code call newer JDK APIs that do not
    // exist on the Android/RoboVM runtimes. The build JVM itself stays a separate choice
    // (see gradle/gradle-daemon-jvm.properties).
    tasks.withType<JavaCompile>().configureEach {
        options.isIncremental = true
        if (JavaVersion.current().isJava9Compatible) {
            options.release.set(8)
        }
    }

    // Shared code is Kotlin compiling to JVM 1.8 bytecode: the Android dexer and
    // the RoboVM iOS compiler do not consume newer bytecode. -Xjdk-release is the
    // Kotlin equivalent of JavaCompile's options.release=8: it fails compilation
    // when shared code calls JDK APIs newer than the Java 8 surface.
    configure<org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension> {
        compilerOptions {
            jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_1_8
            freeCompilerArgs.add("-Xjdk-release=1.8")
        }
    }

    // From https://lyze.dev/2021/04/29/libGDX-Internal-Assets-List/
    // The article can be helpful when using assets.txt in your project.
    tasks.register("generateAssetList") {
        inputs.dir("${project.rootDir}/assets/")
        // projectFolder/assets
        val assetsFolder = project.file("${project.rootDir}/assets/")
        // projectFolder/assets/assets.txt
        val assetsFile = File(assetsFolder, "assets.txt")
        doLast {
            // delete the file in case we've already created it
            assetsFile.delete()

            // iterate through all files inside that folder, convert each to a
            // relative path, and append it to the file assets.txt
            assetsFolder.walkTopDown()
                .filter { it.isFile }
                .map { assetsFolder.toPath().relativize(it.toPath()).toString() }
                .sorted()
                .forEach { assetsFile.appendText(it + "\n") }
        }
    }
    tasks.named("processResources") { dependsOn("generateAssetList") }
}

subprojects {
    val projectVersion: String by project
    version = projectVersion
    extra["appName"] = "RebirthDungeon"

    // Reproducible resolution: lockfiles under each module pin the exact resolved
    // versions. Regenerate with `--write-locks` after an intentional version bump.
    dependencyLocking {
        lockAllConfigurations()
    }

    // Narrow repair for the jdkgdxds 2.1.8 JitPack publication: its root POM depends on
    // BOTH com.github.tommyettinger.jdkgdxds:build:2.1.8 and
    // com.github.tommyettinger.jdkgdxds:jdkgdxds:2.1.8, and the two JARs contain the same
    // 533 classes, which fails Android's checkDebugDuplicateClasses. The retained
    // :jdkgdxds module declares the same dependencies (funderby, digital), so this
    // exclusion drops no code and no libraries. It is a dependency-graph repair, not a
    // packaging rule; no duplicate bytecode is hidden from consumers.
    configurations.configureEach {
        exclude(group = "com.github.tommyettinger.jdkgdxds", module = "build")
    }

    repositories {
        mavenCentral()
        // JitPack is required: jdkgdxds, juniper and the SquidSquad modules are published there.
        maven { url = uri("https://jitpack.io") }
        // Opt-in only, so local artifacts cannot silently replace published ones:
        // run with -Prebirth.enableMavenLocal=true to enable.
        if (providers.gradleProperty("rebirth.enableMavenLocal").getOrElse("false").toBoolean()) {
            mavenLocal()
        }
    }
}

configure<EclipseModel> {
    project {
        name = "RebirthDungeon-parent"
    }
}
