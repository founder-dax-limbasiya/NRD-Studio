# NRD Studio

**NRD (NotRealDaksh)** is a mobile-first workspace for planning, preparing and organising digital content.

The current foundation is a dependency-free Progressive Web App (PWA). It is deliberately local-first: drafts are stored in browser storage and uploaded media is kept in IndexedDB on the current device.

## Run and deploy

This is a static web application; there is no build step and no runtime package dependency.

- Serve the repository root with any static web server.
- For local testing, a machine with Python can run `python -m http.server 4173`.
- For a hosted installable PWA, deploy the repository root as a static site over HTTPS.
- No environment variables are required for the current local workflows.

## Implemented in the current foundation

- Responsive mobile-first workspace and navigation.
- Installable PWA manifest and offline app-shell service worker.
- Local content drafts with platform and format labels.
- Local text outline helper (rule-based; not an AI model).
- Media library for image, video and audio files using IndexedDB.
- Local planner reminders (these do not publish content).
- Script-to-SRT subtitle draft export with starter timing.
- JSON export of drafts and planner reminders.

## Not connected yet

These features are planned, not currently implemented:

- AI script or image/video generation.
- Voice cloning, voiceover generation, music generation or dubbing.
- Speech-to-text transcription and subtitle timing from audio.
- Final video rendering and automated editing.
- Social account OAuth, automatic publishing, analytics or cloud sync.

The Channels screen is informational only. It does not connect accounts or send posts. Each social platform has separate app-review, permission, account-type and API requirements. Do not treat a locally planned reminder as a platform schedule.

## Data and privacy

- Drafts and planner reminders are stored in this browser's local storage.
- Media files are stored in IndexedDB for this browser on this device.
- Clearing browser data may remove locally stored project data.
- The workspace backup exports drafts and planner reminders; media binaries are not included in that JSON backup.
- Do not store API secrets or OAuth tokens in browser code or commit them to the repository.

## Development checks

Run:

```bash
node --check app.js
node scripts/check-project.mjs
```

GitHub Actions runs these checks on pushes and pull requests.

## Architecture direction

Keep the product modular:

1. Workspace and content planning.
2. Media and asset management.
3. Script, voice and subtitle production.
4. Video assembly and export.
5. Platform-specific publishing adapters.
6. Optional server-side services for OAuth, scheduling and secure credential storage.

External providers should be optional. Any third-party code or model must be checked separately for its source-code licence, model-weight licence, commercial-use terms, attribution and mobile/server compatibility before integration.

## Project licence

No project-wide licence has been selected yet. Do not assume that the repository or future bundled assets are licensed for redistribution. Preserve the individual licences and notices of any third-party components that are added.
