import com.android.build.gradle.AppExtension
import org.gradle.plugins.ide.eclipse.model.EclipseModel
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinAndroidProjectExtension
import java.util.Properties

val appName: String by project
val gdxVersion: String by project

apply(plugin = "com.android.application")
apply(plugin = "org.jetbrains.kotlin.android")

configure<AppExtension> {
    namespace = "cloud.vinh.rebirthdungeon"
    compileSdkVersion(36)
    sourceSets.getByName("main") {
        manifest.srcFile("AndroidManifest.xml")
        java.setSrcDirs(listOf("src/main/java"))
        aidl.setSrcDirs(listOf("src/main/java"))
        renderscript.setSrcDirs(listOf("src/main/java"))
        res.setSrcDirs(listOf("res"))
        assets.setSrcDirs(listOf("../assets"))
        jniLibs.setSrcDirs(listOf("libs"))
    }
    packagingOptions {
        resources {
            excludes += listOf(
                "META-INF/robovm/ios/robovm.xml", "META-INF/DEPENDENCIES.txt", "META-INF/DEPENDENCIES",
                "META-INF/dependencies.txt", "**/*.gwt.xml"
            )
            pickFirsts += listOf(
                "META-INF/LICENSE.txt", "META-INF/LICENSE", "META-INF/license.txt", "META-INF/LGPL2.1",
                "META-INF/NOTICE.txt", "META-INF/NOTICE", "META-INF/notice.txt"
            )
        }
    }
    defaultConfig {
        applicationId = "cloud.vinh.rebirthdungeon"
        minSdk = 21
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
        isCoreLibraryDesugaringEnabled = true
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

// Kotlin compiles to the same JVM 1.8 target as the Java compileOptions above
// (kept in sync; the dexer consumes the bytecode).
configure<KotlinAndroidProjectExtension> {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_1_8
    }
}

repositories {
    // needed for AAPT2, may be needed for other tools
    google()
}

val natives by configurations.creating

dependencies {
    add("coreLibraryDesugaring", "com.android.tools:desugar_jdk_libs:2.1.5")
    add("implementation", "com.badlogicgames.gdx:gdx-backend-android:$gdxVersion")
    add("implementation", project(":core"))

    add("natives", "com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-arm64-v8a")
    add("natives", "com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-armeabi-v7a")
    add("natives", "com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-x86")
    add("natives", "com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-x86_64")
}

// Called every time gradle gets executed, takes the native dependencies of
// the natives configuration, and extracts them to the proper libs/ folders
// so they get packed with the APK.
tasks.register("copyAndroidNatives") {
    doFirst {
        file("libs/armeabi-v7a/").mkdirs()
        file("libs/arm64-v8a/").mkdirs()
        file("libs/x86_64/").mkdirs()
        file("libs/x86/").mkdirs()

        configurations.getByName("natives").copy().files.forEach { jar ->
            val outputDir = when {
                jar.name.endsWith("natives-armeabi-v7a.jar") -> file("libs/armeabi-v7a")
                jar.name.endsWith("natives-arm64-v8a.jar") -> file("libs/arm64-v8a")
                jar.name.endsWith("natives-x86_64.jar") -> file("libs/x86_64")
                jar.name.endsWith("natives-x86.jar") -> file("libs/x86")
                else -> null
            }
            if (outputDir != null) {
                project.copy {
                    from(zipTree(jar))
                    into(outputDir)
                    include("*.so")
                }
            }
        }
    }
}

tasks.matching { it.name.contains("merge") && it.name.contains("JniLibFolders") }.configureEach {
    dependsOn("copyAndroidNatives")
}

tasks.register<Exec>("run") {
    val localProperties = project.file("../local.properties")
    val path = if (localProperties.exists()) {
        val properties = Properties()
        localProperties.inputStream().use { properties.load(it) }
        properties.getProperty("sdk.dir") ?: System.getenv("ANDROID_SDK_ROOT")
    } else {
        System.getenv("ANDROID_SDK_ROOT")
    }

    val adb = "$path/platform-tools/adb"
    commandLine(adb, "shell", "am", "start", "-n", "cloud.vinh.rebirthdungeon/cloud.vinh.rebirthdungeon.android.AndroidLauncher")
}

configure<EclipseModel> {
    project {
        name = "$appName-android"
    }
}
