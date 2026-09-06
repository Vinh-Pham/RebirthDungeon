import io.github.fourlastor.construo.ConstruoPluginExtension
import io.github.fourlastor.construo.Target
import org.gradle.api.tasks.application.CreateStartScripts
import org.gradle.plugins.ide.eclipse.model.EclipseModel
import java.util.Locale

buildscript {
    repositories {
        gradlePluginPortal()
    }
    dependencies {
        classpath("io.github.fourlastor:construo:2.1.0")
        if (property("enableGraalNative") == "true") {
            classpath("org.graalvm.buildtools.native:org.graalvm.buildtools.native.gradle.plugin:0.9.28")
        }
    }
}

plugins {
    id("application")
}

apply(plugin = "io.github.fourlastor.construo")

val appName: String by project
val projectVersion: String by project
val gdxVersion: String by project
val lwjgl3Version: String by project
val enableGraalNative: String by project
val graalHelperVersion: String by project

configure<SourceSetContainer> {
    named("main") {
        resources.srcDir(rootProject.file("assets").path)
    }
}

application {
    mainClass.set("cloud.vinh.rebirthdungeon.lwjgl3.Lwjgl3Launcher")
    applicationName = appName
}

configure<EclipseModel> {
    project {
        name = "$appName-lwjgl3"
    }
}

configure<JavaPluginExtension> {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
}

if (JavaVersion.current().isJava9Compatible) {
    tasks.withType<JavaCompile>().configureEach {
        options.release.set(8)
    }
}

// Offline tooling only: gdx-tools carries headless/FreeType tooling that must not ship
// with the game, so it lives in its own configuration instead of implementation.
val gdxTools by configurations.creating

dependencies {
    implementation("com.badlogicgames.gdx:gdx-backend-lwjgl3:$gdxVersion")
    implementation("com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-desktop")
    implementation(project(":core"))

    add("gdxTools", "com.badlogicgames.gdx:gdx-tools:$gdxVersion") {
        exclude(group = "com.badlogicgames.gdx", module = "gdx-backend-lwjgl")
    }

    if (enableGraalNative == "true") {
        implementation("io.github.berstanio:gdx-svmhelper-backend-lwjgl3:$graalHelperVersion")
    }

    // Forces LWJGL3 to use at least $lwjgl3Version, currently 3.4.3, to avoid warnings on Java 25 and up.
    constraints {
        implementation("org.lwjgl:lwjgl:$lwjgl3Version")
        implementation("org.lwjgl:lwjgl-glfw:$lwjgl3Version")
        implementation("org.lwjgl:lwjgl-jemalloc:$lwjgl3Version")
        implementation("org.lwjgl:lwjgl-openal:$lwjgl3Version")
        implementation("org.lwjgl:lwjgl-opengl:$lwjgl3Version")
        implementation("org.lwjgl:lwjgl-stb:$lwjgl3Version")
    }
}

// Writes the resolved gdx-tools classpath to build/gdx-tools-classpath.txt for
// offline use, e.g.:
//   ./gradlew :lwjgl3:gdxToolsClasspath
//   java -cp "$(cat lwjgl3/build/gdx-tools-classpath.txt)" \
//     com.badlogic.gdx.tools.texturepacker.TexturePacker <inputDir> <packFile>
tasks.register("gdxToolsClasspath") {
    group = "build"
    description = "Resolves the offline gdx-tools classpath (atlas packing etc.); not part of the shipped game."
    val outputFile = layout.buildDirectory.file("gdx-tools-classpath.txt")
    outputs.file(outputFile)
    doLast {
        outputFile.get().asFile.writeText(
            configurations.getByName("gdxTools").resolve().joinToString(File.pathSeparator)
        )
    }
}

val os = System.getProperty("os.name").lowercase(Locale.ROOT)

tasks.named<JavaExec>("run") {
    workingDir = rootProject.file("assets")
    // You can uncomment the next line if your IDE claims a build failure even when the app closed properly.
    // setIgnoreExitValue(true)
    jvmArgs("--enable-native-access=ALL-UNNAMED")
    if (os.contains("mac")) jvmArgs("-XstartOnFirstThread")
    // LWJGL's default memory backend calls sun.misc.Unsafe methods that JDK 24+ reports as
    // terminally deprecated (JEP 498). LWJGL's FFM backend (Java 25+, runs under the native
    // access enabled above) is warning-free; older JVMs keep LWJGL's default backend.
    if (JavaVersion.current().isCompatibleWith(JavaVersion.VERSION_25)) {
        jvmArgs("-Dorg.lwjgl.system.memoryBackend=ffm")
    }
}

tasks.named<Jar>("jar") {
    // sets the name of the .jar file this produces to the name of the game or app, with the version after.
    archiveFileName.set("$appName-$projectVersion.jar")
    // the duplicatesStrategy matters starting in Gradle 7.0; this setting works.
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    dependsOn(configurations.runtimeClasspath)
    from(configurations.runtimeClasspath.map { config -> config.map { if (it.isDirectory) it else zipTree(it) } })
    // these "exclude" lines remove some unnecessary duplicate files in the output JAR.
    exclude(
        "META-INF/INDEX.LIST", "META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA", "META-INF/maven/**"
    )
    // setting the manifest makes the JAR runnable.
    // enabling native access helps avoid a warning when Java 24 or later runs the JAR.
    // setting Multi-Release to true allows LWJGL3 to use different classes on recent Java versions.
    manifest {
        attributes(
            "Main-Class" to application.mainClass.get(),
            "Enable-Native-Access" to "ALL-UNNAMED",
            "Multi-Release" to "true"
        )
    }
    // this last step may help on some OSes that need extra instruction to make runnable JARs.
    doLast {
        archiveFile.get().asFile.setExecutable(true, false)
    }
}

// Platform-specific jar variants: each variant task depends on the shared jar task.
// Building a variant reconfigures the shared jar task (archive name + platform
// excludes) based on the requested start parameters — a task configuration action
// itself may not reach into the task container ("named(...) cannot be executed in
// the current context" during IDE model building).
val jarTaskProvider = tasks.named<Jar>("jar")

val jarVariants = listOf(
    // Builds a JAR that only includes the files needed to run on macOS, not Windows or Linux.
    // The file size for a Mac-only JAR is about 7MB smaller than a cross-platform JAR.
    Triple(
        "jarMac",
        "$appName-$projectVersion-mac.jar",
        listOf(
            "windows/x86/**", "windows/x64/**", "linux/arm32/**", "linux/arm64/**", "linux/x64/**", "**/*.dll", "**/*.so",
            "META-INF/INDEX.LIST", "META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA", "META-INF/maven/**"
        )
    ),
    // Builds a JAR that only includes the files needed to run on Linux, not Windows or macOS.
    // The file size for a Linux-only JAR is about 5MB smaller than a cross-platform JAR.
    Triple(
        "jarLinux",
        "$appName-$projectVersion-linux.jar",
        listOf(
            "windows/x86/**", "windows/x64/**", "macos/arm64/**", "macos/x64/**", "**/*.dll", "**/*.dylib",
            "META-INF/INDEX.LIST", "META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA", "META-INF/maven/**"
        )
    ),
    // Builds a JAR that only includes the files needed to run on Windows, not Linux or macOS.
    // The file size for a Windows-only JAR is about 6MB smaller than a cross-platform JAR.
    Triple(
        "jarWin",
        "$appName-$projectVersion-win.jar",
        listOf(
            "macos/arm64/**", "macos/x64/**", "linux/arm32/**", "linux/arm64/**", "linux/x64/**", "**/*.dylib", "**/*.so",
            "META-INF/INDEX.LIST", "META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA", "META-INF/maven/**"
        )
    )
)

jarVariants.forEach { (taskName, _, _) ->
    tasks.register(taskName) {
        dependsOn(jarTaskProvider)
        group = "build"
    }
}

val requestedVariant = jarVariants.find { variant ->
    gradle.startParameter.taskNames.any { it.substringAfterLast(':') == variant.first }
}
if (requestedVariant != null) {
    jarTaskProvider.configure {
        archiveFileName.set(requestedVariant.second)
        exclude(*requestedVariant.third.toTypedArray())
    }
}

configure<ConstruoPluginExtension> {
    // name of the executable
    name.set(appName)
    // human-readable name, used for example in the `.app` name for macOS
    humanName.set(appName)
    jlink {
        guessModulesFromJar.set(false)
        // You may need to add more modules, as needed.
        modules.addAll("java.base", "java.management", "java.desktop", "jdk.unsupported")
    }

    targets.register("linuxX64", Target.Linux::class.java) {
        architecture.set(Target.Architecture.X86_64)
        jdkUrl.set("https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jdk_x64_linux_hotspot_25.0.4.1_1.tar.gz")
        // Linux does not currently have a way to set the icon on the executable
    }
    targets.register("macM1", Target.MacOs::class.java) {
        architecture.set(Target.Architecture.AARCH64)
        jdkUrl.set("https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jdk_aarch64_mac_hotspot_25.0.4.1_1.tar.gz")
        // macOS needs an identifier
        identifier.set("cloud.vinh.rebirthdungeon." + appName)
        // Optional: icon for macOS, as an ICNS file
        macIcon.set(project.file("icons/logo.icns"))
    }
    targets.register("macX64", Target.MacOs::class.java) {
        architecture.set(Target.Architecture.X86_64)
        jdkUrl.set("https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jdk_x64_mac_hotspot_25.0.4.1_1.tar.gz")
        // macOS needs an identifier
        identifier.set("cloud.vinh.rebirthdungeon." + appName)
        // Optional: icon for macOS, as an ICNS file
        macIcon.set(project.file("icons/logo.icns"))
    }
    targets.register("winX64", Target.Windows::class.java) {
        architecture.set(Target.Architecture.X86_64)
        // Optional: icon for Windows, as a PNG
        icon.set(project.file("icons/logo.png"))
        jdkUrl.set("https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jdk_x64_windows_hotspot_25.0.4.1_1.zip")
        // Uncomment the next line to show a console when the game runs, to print messages.
        //useConsole.set(true)
    }
}

// Equivalent to the jar task; here for compatibility with gdx-setup.
tasks.register("dist") {
    dependsOn("jar")
}

distributions {
    main {
        contents {
            into("libs") {
                project.configurations.runtimeClasspath.get().files
                    .filter { it.name != tasks.named<Jar>("jar").get().outputs.files.singleFile.name }
                    .forEach { exclude(it.name) }
            }
        }
    }
}

tasks.named<CreateStartScripts>("startScripts") {
    dependsOn(":lwjgl3:jar")
    classpath = files(tasks.named<Jar>("jar").get().outputs.files)
}

// Helps if debugging on Linux with an Nvidia GPU.
// This means StartupHelper won't try to restart the JVM, which can prevent debugging.
// This only applies to Gradle tasks, not main methods debugged when launching a main() method directly.
// As a more general solution, set the environment variable __GL_THREADED_OPTIMIZATIONS to 0 globally, on Linux
// machines with Nvidia GPUs where you need to debug LWJGL3 apps and games.
// You can also set __GL_THREADED_OPTIMIZATIONS to 0 in run configurations, which you would need per main() method.
// StartupHelper will still restart the JVM to set this environment variable when run as a distributable JAR, which is
// a good thing for end users. They won't need to ever set the debug-specific environment variable.
tasks.withType<JavaExec>().configureEach {
    environment("__GL_THREADED_OPTIMIZATIONS", "0")
}

if (enableGraalNative == "true") {
    // Kept as a Groovy script plugin: opt-in dead config (see gradle.properties), and
    // the GraalVM native DSL is not exercised while the flag is off.
    apply(from = file("nativeimage.gradle"))
}
