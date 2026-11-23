plugins {
    id("com.android.application")
}

android {
    namespace = "com.nrd.studio"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.nrd.studio"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.media3:media3-transformer:1.11.1")
    implementation("androidx.media3:media3-effect:1.11.1")
    implementation("androidx.annotation:annotation:1.11.0")
    implementation("androidx.annotation:annotation-experimental:1.6.0")
    testImplementation("junit:junit:4.13.2")
}
