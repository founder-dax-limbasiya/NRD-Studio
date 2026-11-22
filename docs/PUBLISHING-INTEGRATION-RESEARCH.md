# Publishing integration research

**Reviewed:** 22 November 2026  
**Status:** research only — no publishing engine has been installed or connected.

## Candidate: SocialDesk

Repository: https://github.com/ykflove/socialdesk

What was verified from its current public repository:
- The repository includes an MIT license. Preserve the copyright and license notice if any code is reused.
- Its package metadata describes a self-hosted social scheduler and publisher, version 2.0.0, with Node.js >=22.13 and no declared runtime package dependencies.
- Its scheduler processes due post targets and retries failed publishes (source: `src/scheduler.js`).
- Its network registry includes adapters for Facebook, Instagram, Threads, X, LinkedIn, TikTok, YouTube, Pinterest, Bluesky, Mastodon, Telegram and Discord, plus manual/reminder modes (source: `src/networks/index.js`).
- Its environment example expects a public HTTPS URL for OAuth callbacks and some media delivery, and persistent storage for its database and uploads.

### Recommendation

Keep SocialDesk as the leading candidate for a future **server-side publishing service**, not as browser code. NRD's current frontend is a static PWA and must never hold platform client secrets or long-lived access tokens.

Before integration, run its own tests, inspect each selected network adapter, confirm current platform API scopes and app-review status, and test media delivery over HTTPS. Deploying a scheduler also requires an always-on server and persistent storage; a free cloud tier is not a guarantee of unlimited availability or storage.

## Alternative: Postiz

Repository: https://github.com/gitroomhq/postiz-app

- Current repository documentation identifies AGPL-3.0.
- The documented stack includes Next.js, NestJS, Prisma/PostgreSQL and Temporal.
- It is a capable larger self-hosting option, but it is heavier operationally and its AGPL terms need deliberate review before incorporating code into a proprietary distribution.

**Decision:** do not integrate Postiz into the current minimal NRD foundation.

## Platform policy notes

### TikTok

Official documentation:
- https://developers.tiktok.com/docs/en/content-posting-api-get-started
- https://developers.tiktok.com/docs/en/content-sharing-guidelines

The Direct Post flow requires the app to be approved for the `video.publish` scope and the creator to authorize it. TikTok says unaudited clients are restricted to private `SELF_ONLY` visibility, with user and posting limits. Its guidance also says a posting app should serve authentic creators broadly, not merely be a private utility for one team's own managed accounts.

**Implication:** do not promise public auto-posting to TikTok until the app passes the required audit and the intended product use complies with the current guidelines.

### YouTube

Official documentation:
- https://developers.google.com/youtube/data/revision_history
- https://developers.google.com/youtube/v3/docs/videos/insert

The YouTube Data API revision history records a change on 2 November 2026: uploads from unverified API projects are no longer automatically restricted to private visibility. Upload privacy still depends on the requested status and applicable creator/account settings.

**Implication:** use the current official policy, not the older blanket statement that unverified projects can only upload private videos.

## Required NRD publishing architecture

1. The PWA requests an action from a secured backend.
2. The backend owns OAuth callbacks, encrypted tokens, scheduler state and media delivery.
3. A platform adapter validates the connected account, supported media type, text limits, scopes and publishing permissions.
4. The user reviews the target accounts, post variants and schedule before confirming.
5. Every attempt records a result, provider response, retry state and canonical post URL where available.
6. Disconnect and token-revocation flows are available to the user.

Never store API secrets in frontend JavaScript, localStorage, or committed files.

## Current product boundary

NRD currently has local drafts, a local media library, local planner reminders and SRT draft export. No social account is connected and no post is being sent. This research does not mean that SocialDesk or any social platform has been integrated or tested inside NRD.
