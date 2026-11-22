# NRD development roadmap

This roadmap reflects the current repository state. A checked item means the feature exists in code; it does not mean the overall product is production-complete.

## Milestone 0 — Mobile-first foundation

- [x] Static, dependency-free PWA shell.
- [x] Responsive mobile navigation and creator workspace.
- [x] Local draft save/edit.
- [x] Rule-based outline helper (not AI generation).
- [x] Image/video/audio library using IndexedDB.
- [x] Local planning reminders (not social scheduling).
- [x] Offline shell caching and basic CI smoke checks.

## Milestone 1 — Production workspace

- [x] First-class local projects with independent storyboards.
- [x] Scene/shot organisation, ordering, durations and media-library image references.
- [ ] Per-platform content variants and safe preview.
- [x] Editable subtitle cues with timing and SRT/VTT import/export.
- [ ] Voiceover asset workflow and audio track organisation.
- [ ] Export presets and production checklist.

## Milestone 2 — Open-source media pipeline

- [ ] Compare Android-compatible and browser-compatible media engines.
- [ ] Verify code and model licences independently.
- [x] Browser-based local silent WebM slideshow prototype with pan/zoom, crossfade and progress.
- [ ] Native Android hardware-accelerated MP4 render pipeline with background progress, cancellation and resume.
- [ ] Add optional speech-to-text and TTS adapters after model/voice licence review.
- [ ] Provide a useful non-AI fallback for every optional AI step.

## Milestone 3 — Secure publishing service

- [ ] Decide whether to deploy a separate scheduler service.
- [ ] Audit the chosen publisher's source, licence, OAuth flows and network adapters.
- [ ] Store OAuth secrets and tokens only on the server, encrypted at rest.
- [ ] Implement platform-specific validation and explicit user confirmation.
- [ ] Add retries, idempotency, audit history and disconnect/revocation.
- [ ] Only enable platforms after developer-app approvals and end-to-end testing.

## Release gates

- Never show an AI-generated result unless an actual model produced it.
- Never show a post as published unless the platform confirms it.
- Never treat a local reminder as a real social platform schedule.
- Never promise free, unlimited hosting, GPU time, storage or API quota.
- Keep media files out of JSON metadata backups unless the user explicitly exports the binary assets.
- Keep provider credentials out of browser storage, frontend bundles and Git history.
- Clearly label browser rendering limits and unsupported formats.

## Immediate next engineering work

1. Add automated tests for scene/project persistence, subtitle parsing and media-render capability checks.
2. Build a native Android render module using AndroidX Media3 Transformer after Gradle/SDK compatibility is pinned.
3. Add audio track selection and mixing with a real preview workflow.
4. Prototype one secure server-side publishing adapter only after the deployment/storage choice is known.
