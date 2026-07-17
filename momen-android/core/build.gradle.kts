plugins {
    id("org.jetbrains.kotlin.jvm")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
}
