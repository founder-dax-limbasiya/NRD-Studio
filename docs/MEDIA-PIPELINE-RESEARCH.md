# Media pipeline research and architecture decision

**Reviewed:** 23 November 2026  
**Scope:** Android-first, local video export for the NRD mobile creator workflow.  
**Status:** A first Java/Media3 native Android prototype has now been added under android/. Its remote Gradle build and physical-device behavior are not yet verified.

## 1. Current prototype

The current PWA has a browser Canvas + MediaRecorder slideshow exporter:

- reads scene images from the local IndexedDB media library;
- renders the selected project aspect ratio;
- adds gentle pan/zoom and a short crossfade at scene changes;
- records to WebM when the browser exposes a supported MediaRecorder codec;
- exports a silent video file with progress feedback.

This is a first working path, not a substitute for a native video engine. It relies on the browser staying open, has no background/resume guarantee, has no audio mixing, and does not promise MP4 output. Device/browser capability varies.

## 2. Primary native candidate: AndroidX Media3 Transformer

Repository: https://github.com/androidx/media  
Official guide: https://developer.android.com/media/media3/transformer  
Image input guide: https://developer.android.com/media/media3/transformer/transformations

Verified facts:
- The androidx/media repository declares Apache License 2.0. Preserve notices and mark modified files as required by the license.
- Media3 Transformer supports media conversion, trimming, crop/scale/rotation and custom effects.
- The official guide says it is compatible with Android 6.0 (API 23) and higher, and is implemented over Android MediaCodec and OpenGL.
- Transformer can treat static images as video clips. MediaItem.Builder.setImageDurationMs(...) sets the output duration and EditedMediaItem.Builder.setFrameRate(...) sets the frame rate.
- Exports run asynchronously; progress can be polled and cancellation is supported through the Transformer API.

### Verified version and Android build baseline (23 November 2026)

- The AndroidX releases page shows Media3 1.11.1 as the latest stable release; 1.12.0-beta01 was published on 11 November 2026 and is a pre-release. Pin 1.11.1 for the first native prototype instead of adopting the beta.
- Android Gradle Plugin 9.6.0 requires Gradle 9.8.2 and JDK 17. The Android Developers compatibility page lists these minimums.
- Keep the initial Android native module in Java to avoid introducing an additional Kotlin plugin compatibility dependency before the first native build is stable.

### Decision

Use Media3 Transformer 1.11.1 as the first native Android rendering candidate. It is a better fit than bundling a general-purpose FFmpeg binary for the initial Android export workflow, because the target is local Android device export and the project can use Android's media codecs and OpenGL.

The native module now uses the pinned prototype baseline AGP 9.6.0 + Gradle 9.8.2 + JDK 17 + Media3 1.11.1. It is a Java app module under android/, with a GitHub Actions debug-APK build. The CI compile and physical Android device run must pass before calling it device-ready. Test portrait/landscape/square output, image durations, effect behavior, encoder compatibility and memory use.

## 3. FFmpeg option: FFmpegKitNext

Official continuation: https://github.com/arthenica/ffmpeg-kit-next

Verified facts from its current project documentation:
- FFmpegKitNext is the original project's continuation.
- Its distribution is source-only; it does not publish ready-to-use Android packages to Maven Central in the documented release line.
- Android builds require a local toolchain workflow (Nix or Android SDK/NDK and build dependencies).
- The library/bundles are LGPL-3.0 by default; enabling GPL components makes the resulting bundle subject to GPL-3.0. Optional external libraries need their own license review.

### Decision

Do not make FFmpegKitNext the first Android MVP dependency. Its source-build and native-toolchain burden is too high for the current phone-only, zero-budget development environment. Re-evaluate it later if the product needs codecs, muxing or filters that Media3 cannot provide and a reproducible build pipeline is available.

Do not start new development against the old arthenica/ffmpeg-kit binary artifacts. The old repository is archived; the official continuation is FFmpegKitNext.

## 4. Licensing and distribution checklist

Before adding any media component:
- check the repository code license and pinned version;
- check each separately downloaded binary or prebuilt AAR;
- enumerate bundled codecs and optional external libraries;
- preserve copyright/license notices and source-offer obligations where applicable;
- check patent implications for codecs such as H.264/AAC separately from copyright licensing;
- keep model-weight licenses separate from the software license whenever AI models are introduced.

No RIFE, Real-ESRGAN, Whisper, TTS or other model has been added to the current NRD codebase.

## 5. Planned native renderer contract

The native renderer should accept a project manifest containing:
- project aspect ratio and export settings;
- ordered scene image URIs;
- each scene's duration and motion/effect settings;
- optional subtitle track and selected audio assets.

It should return:
- a saved local video URI;
- progress events;
- cancellation and error states;
- a clear warning when the phone does not support the requested output profile.

The web UI must not claim that a file has been exported until the native renderer reports completion and the output file can be reopened.

## 6. References

- Android Media3 Transformer guide: https://developer.android.com/media/media3/transformer
- Android Media3 image transformations: https://developer.android.com/media/media3/transformer/transformations
- Android Media3 Transformer API: https://developer.android.com/reference/androidx/media3/transformer/Transformer
- AndroidX Media releases: https://github.com/androidx/media/releases
- Android Gradle Plugin compatibility: https://developer.android.com/build/releases/about-agp
- Android Gradle Plugin 9.5 release notes: https://developer.android.com/build/releases/agp-9-5-0-release-notes
- AndroidX Media license: https://github.com/androidx/media/blob/release/LICENSE
- Official FFmpegKitNext repository: https://github.com/arthenica/ffmpeg-kit-next
- FFmpegKitNext Android build guide: https://github.com/arthenica/ffmpeg-kit-next/tree/main/android
