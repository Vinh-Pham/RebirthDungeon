import org.gradle.plugins.ide.eclipse.model.EclipseModel

val appName: String by project
val gdxVersion: String by project
val gdxControllersVersion: String by project

buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath("com.mobidevelop.robovm:robovm-gradle-plugin:${property("robovmVersion")}")
    }
}

apply(plugin = "robovm")

extra["mainClassName"] = "cloud.vinh.rebirthdungeon.IOSLauncher"

tasks.named("launchIPhoneSimulator") { dependsOn("build") }
tasks.named("launchIPadSimulator") { dependsOn("build") }
tasks.named("launchIOSDevice") { dependsOn("build") }
tasks.named("createIPA") { dependsOn("build") }

configure<EclipseModel> {
    project {
        name = "$appName-ios"
        natures("org.robovm.eclipse.RoboVMNature")
    }
}

val robovmVersion: String by project

dependencies {
    implementation("com.badlogicgames.gdx:gdx-backend-robovm-metalangle:$gdxVersion")
    implementation("com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-ios")
    implementation("com.badlogicgames.gdx-controllers:gdx-controllers-ios:$gdxControllersVersion")
    implementation("com.mobidevelop.robovm:robovm-cocoatouch:$robovmVersion")
    implementation("com.mobidevelop.robovm:robovm-rt:$robovmVersion")
    implementation(project(":core"))
}
