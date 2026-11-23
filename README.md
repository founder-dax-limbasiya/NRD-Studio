# NRD Studio

**NRD (NotRealDaksh)** is a mobile-first workspace for planning, preparing and organising digital content.

The current foundation is a dependency-free Progressive Web App (PWA). Drafts and project metadata stay in this browser; media files are kept in IndexedDB on the current device.

## Native Android prototype

A separate native Android module now lives in [android/](android/). It contains an on-device image-sequence to silent H.264 MP4 export prototype using AndroidX Media3 Transformer 1.11.1. See [android/README.md](android/README.md) for the toolchain and limitations. A GitHub Actions workflow builds a debug APK artifact on Android-folder changes. The native source compiled successfully in GitHub Actions and a debug APK artifact was uploaded from commit a7b1d08. The APK is a debug/test build, not a Play Store release. Physical-device export and playback testing are still outstanding.

## Run and deploy

This is a static web application; there is no build step and no runtime package dependency.

- Serve the repository root with any static web server.
- For local testing, a machine with Python can run `python -m http.server 4173`.
- For a hosted installable PWA, deploy the repository root as a static site over HTTPS.
- No environment variables are required for the current local workflows.

## Implemented in the current foundation

- Responsive mobile-first workspace and installable PWA shell.
- Local content drafts with platform and format labels.
- Rule-based outline helper (not an AI model).
- Media library for image, video and audio files using IndexedDB.
- Local planner reminders (these do not publish content).
- Local project library with scene storyboards, scene order, durations and image references.
- Editable subtitle cues with SRT/VTT import, SRT export and estimated starter timings from a script.
- Browser Canvas slideshow export to WebM with gentle pan/zoom, crossfade, progress and cancellation (silent prototype; browser support required).
- JSON backup of drafts, subtitle cues, reminders and project/storyboard metadata.

## Not connected or not implemented yet

- AI script, image or video generation.
- Voice cloning, voiceover generation, music generation or dubbing.
- Speech-to-text transcription and automatic subtitle timing from audio.
- Native Android Media3 MP4 export prototype (unit tests and debug APK build pass in GitHub Actions; physical-device verification remains open).
- Audio mixing in the current local video renderer.
- Full editor timeline for video/audio clips, transitions and layered tracks.
- Social account OAuth, automatic publishing, analytics or cloud sync.

The PWA's WebM renderer requires image assets on every scene, runs in the phone's browser, may be slow or unsupported on some devices, and exports no audio. Keep the PWA tab open while it renders; browser output is only offered after MediaRecorder completes. The native Android prototype is separate: it exports still images to silent H.264 MP4 using Media3 and lets the user save the file with Android's document picker. Neither renderer currently adds an audio track.

The Channels screen is informational only. It does not connect accounts or send posts. Each social platform has separate app-review, permission, account-type and API requirements. Do not treat a locally planned reminder as a platform schedule.

## Data and privacy

- Drafts and planner reminders are stored in this browser's local storage.
- Projects and storyboards are stored in this browser's local storage.
- Media files are stored in IndexedDB for this browser on this device.
- Clearing browser data may remove locally stored project data.
- The workspace backup exports drafts (including subtitle cues), reminders and project/storyboard metadata; media binaries are not included in that JSON backup.
- Do not store API secrets or OAuth tokens in browser code or commit them to the repository.

## Development checks

Run:

```bash
node --check app.js
node --check projects.js
node --check subtitles.js
node --check render.js
node --check sw.js
node scripts/check-project.mjs
node scripts/test-subtitles.mjs
node scripts/test-render.mjs
```

GitHub Actions runs syntax checks, project smoke checks, subtitle parser tests and renderer capability/dimension tests on pushes and pull requests.

## Roadmap and integration research

- Development plan: [docs/ROADMAP.md](docs/ROADMAP.md)
- Publishing engine evaluation: [docs/PUBLISHING-INTEGRATION-RESEARCH.md](docs/PUBLISHING-INTEGRATION-RESEARCH.md)
- Media pipeline evaluation: [docs/MEDIA-PIPELINE-RESEARCH.md](docs/MEDIA-PIPELINE-RESEARCH.md)

## Architecture direction

Keep the product modular:

1. Workspace and content planning.
2. Project/storyboard and media asset management.
3. Script, voice and subtitle production.
4. Video assembly and export.
5. Platform-specific publishing adapters.
6. Optional server-side services for OAuth, scheduling and secure credential storage.

External providers should be optional. Any third-party code or model must be checked separately for its source-code licence, model-weight licence, commercial-use terms, attribution and mobile/server compatibility before integration.

## Project licence

No project-wide licence has been selected yet. Do not assume that the repository or future bundled assets are licensed for redistribution. Preserve the individual licences and notices of any third-party components that are added.


## Native Android build check

The native Android project now has shared render-plan validation and five JUnit test methods covering scene-duration boundaries, scene-count and total-duration limits, output dimensions, frame rates, aspect presets and filename sanitization. On 23 November 2026, GitHub Actions run [#15](https://github.com/founder-dax-limbasiya/NRD-Studio/actions/runs/45143316223) passed `testDebugUnitTest` and `assembleDebug`, then uploaded a debug APK. This is a CI build/test result, not a physical-device test or a Play Store release.
