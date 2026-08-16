# Zemen Academy Version 1 — final release plan

Updated: 16 August 2026

This is the authoritative path from the current source tree to Google Play. Do not add another
Version 1 feature. Only fix a release-blocking defect discovered by these gates.

## Current decision

**DO NOT BUILD YET.** The application code passes locally, but the production backend is one
release behind and the source tree has not been committed and pushed. Building now would produce
an artifact that cannot be reproduced safely.

## Completed baseline

- Gate 1 timer and both quiz modes: owner pass; repeat once on the signed candidate.
- Gate 2 one-phone/one-tablet and released-slot flow: owner pass; repeat once on the signed candidate.
- Gate 3 Version 1 scope lock: pass. Past Papers and incomplete Amharic remain deferred.
- Gate 4 production content: pass for all six profiles — 16 subjects, 84 units, 9,950 questions;
  mathematics, airplane-mode downloads, Premium activation, and announcements owner-tested.
- Local quality: TypeScript passes, 42 Jest suites/149 tests pass, release audit passes 25/25,
  public URL checks pass, and the production EAS environment contains the API URL.
- The local Android export completes successfully: 1,314 modules, 4.3 MB Hermes bundle, and no
  JavaScript bundling error. This check consumes no EAS build credit.

## Gate 5 — owner security and Play preparation

### 5A. Deploy the reviewed backend

Deploy `backend/Code.gs` and `backend/Setup.gs` as a new version of the existing deployment. Keep
the existing URL and Script Properties. `npm run audit:backend` must report the same
`2026-08-16-timetable-v2` marker for local health and version.

### 5B. Secure and verify production data

Run the spreadsheet's **Zemen Security** actions in this order:

1. Install timetable sync storage.
2. Install daily security cleanup.
3. Protect sensitive sheets.
4. Create private production backup.
5. Verify latest private backup.
6. Run release security diagnostic.

Require exactly one cleanup trigger, Restricted Drive access, expected sheet protection, no
unexpected viewers/editors, and both backup timestamps. Test **Delete selected user account data**
on a disposable account only.

### 5C. Prepare Play declarations privately

- Complete the Data safety mapping in `docs/PLAY_DATA_SAFETY.md`.
- Prepare one dedicated Free reviewer account and one Premium reviewer account.
- Store credentials only in Play Console App access.
- Use the official privacy, terms, help, and account-deletion URLs.

## Source freeze — required before any EAS build

1. Review all changed files and remove local-only output.
2. Run `npm run verify:gate6`.
3. Intentionally commit the Version 1 source.
4. Push the exact commit to GitHub.
5. Run `npm run verify:gate6` again. It must finish with zero failures.

The preflight blocks a dirty worktree or a commit that is not present on the matching origin branch.

## Gate 6 — one signed APK

Only after Gate 5 and source freeze pass:

```powershell
cd "C:\zemen academy final"
eas.cmd build --platform android --profile preview
```

Use this one APK for the complete matrix in `docs/GATE4D_SIGNED_DEVICE_RUN.md`: clean install,
upgrade, low-width/low-memory phone, tablet, timer, math, offline, Premium, announcements,
notifications, account/device security, timetable, accessibility, and performance. Record PASS or
FAIL for every row. Fix only P0/P1 defects; if code changes, repeat source freeze and build one new
candidate.

## Gate 7 — production AAB and Play Console

After the APK candidate passes:

1. Confirm the final semantic version and increment `android.versionCode` if necessary.
2. Run `npm ci` and `npm run verify:gate6` from the exact release commit.
3. Build with `eas.cmd build --platform android --profile production`.
4. Record the AAB SHA-256 and EAS build URL privately.
5. Upload the AAB to Play Console and enable Play App Signing.
6. Verify package `com.zemenacademy.app`, target API 36, notification-only runtime permission,
   signing certificates, App Links, Firebase, and the restricted Android API key.
7. Complete store listing, Data safety, privacy, ads, target audience, content rating, App access,
   and account-deletion declarations.

## Gate 8 — testing and rollout

Start with internal testing. If Play Console identifies the developer as a personal account created
after 13 November 2023, run a closed test with at least 12 continuously opted-in testers for 14 days,
then apply for production access. Release gradually and monitor crashes, ANRs, authentication,
Apps Script quotas, notifications, and support reports.

## Release rule

Release only when Gates 5–8 have evidence and there is no P0/P1 crash, freeze, data loss, privacy
leak, broken primary action, or policy mismatch. Feature requests move to Version 2.
