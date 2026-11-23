# NRD Studio — native Android prototype

This folder contains the first native Android export prototype. It is separate from the static PWA in the repository root.

## What this prototype does

1. Opens Android's document picker and accepts multiple image files.
2. Lets the user change each scene's duration and reorder the scene list.
3. Exports the ordered image sequence to an H.264 MP4 file on the phone.
4. Offers a choice of 9:16, 16:9 or 1:1 output and 24 or 30 FPS.
5. Reports export progress and supports cancellation.
6. Opens Android's Save dialog so the user can copy the resulting MP4 to a folder of their choice.

The renderer uses AndroidX Media3 Transformer 1.11.1 and Presentation to scale each still image into the chosen output shape while preserving its full picture (fit/letterbox behavior). It is a silent slideshow: audio tracks, animated crossfades, pan/zoom keyframes, subtitles, background rendering and resumable jobs are not part of this first native prototype.

## Toolchain

- JDK 17
- Android Gradle Plugin 9.5.0
- Gradle 9.6.0
- Android SDK platform 36 and Build Tools 36.0.0
- Minimum Android API 23
- AndroidX Media3 Transformer and Media3 Effect 1.11.1 (Apache-2.0)

The android folder can be opened as a project in Android Studio. The CI workflow provisions the pinned toolchain and builds the debug APK on pushes to main that change this folder.

## Build from a machine with Android tooling

    gradle --no-daemon -p android :app:assembleDebug

The debug APK is produced at:

    android/app/build/outputs/apk/debug/app-debug.apk

## Device test checklist

- Import 2–5 ordinary JPEG or PNG images.
- Change one scene duration and reorder the scenes.
- Export a short 9:16, 16:9 and 1:1 project.
- Confirm the result is playable and the image order/durations are correct.
- Cancel a longer export and confirm the partial file is not offered as a completed output.
- Test on a lower-memory Android phone and record render time, memory pressure and failures.

## Known limits

- Project/scene metadata is stored locally in app preferences; this prototype does not yet import the PWA's project JSON.
- Image access is retained through Android's document-provider permission when the provider supports persistable grants.
- A native export currently runs while the app is open. Background work, process-death recovery and persistent render jobs need a separate lifecycle design.
- The output is saved only after the user selects a destination in the Android Save dialog.
- Successful compilation does not prove compatibility with every device codec. Physical-device testing is required.

No paid API, external server or model download is required for this image-to-MP4 path.
