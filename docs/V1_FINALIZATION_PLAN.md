# Zemen Academy Version 1 finalization plan

> Historical gate record. The current authoritative execution order is
> [`FINAL_RELEASE_PLAN.md`](./FINAL_RELEASE_PLAN.md). Use that file for the final APK, AAB, and
> Play Console handoff; this document preserves earlier gate decisions and may contain older counts.

Updated: 16 August 2026

## Release rule

Version 1 ships only when every **P0** gate below is complete. Optional or unfinished
features must be hidden instead of appearing as empty or partially translated screens.
No EAS build is started until the local gates and physical-device test script are ready.

## Current verified baseline

- `npm run audit:v1`: 25/25 checks pass.
- TypeScript: passes with no errors.
- Jest: 41 suites and 135 tests pass after the Gate 1 monotonic-clock hardening.
- Expo SDK 57 targets Android API 36.
- All EAS profiles use the Play/consumption-only distribution channel.
- The production AAB cannot expose plans, bank details, manual transfers, or an
  alternative-payment link inside the Android app.
- No private keys, service-account keys, signing files, APKs, AABs, or `.env` are
  tracked by Git.

## Gate 1 — Exam timer integrity (P0)

- [x] Use an absolute attempt deadline so rerenders cannot reset the countdown.
- [x] Keep the displayed time synchronized to wall-clock time after a delayed frame.
- [x] Use a monotonic runtime clock and never allow the visible countdown to gain time.
- [x] Submit the attempt exactly once when the deadline reaches zero.
- [x] Mark unanswered questions as skipped and identify time expiry on Results.
- [ ] Confirm the behavior in instant and exam mode on a signed physical-device build.
- [ ] Confirm a 150-question quiz receives exactly 2 hours 30 minutes.

Exit criterion: the timer never gains time, never resets, and always submits once at zero.

## Gate 2 — Account and backend reliability (P0)

- [x] Deploy the latest `backend/Code.gs` and `backend/Setup.gs` using the existing
  production Apps Script deployment URL.
- [x] Open the deployed `/exec?action=health` URL and confirm
  `backendRelease` is `2026-08-15-gate-5`.
- [x] Run `diagnoseV1AccountAndDeviceGate` once from the Apps Script editor and
  confirm it returns `SUCCESS` with all eight checks. The diagnostic deletes its
  temporary user, sessions, devices, attempt, and progress row automatically.
- [ ] On a clean physical phone, create a brand-new account and confirm the exact
  sign-up success path.
- [ ] Test duplicate email, invalid Ethiopian phone number, wrong password, logout,
  password reset, expired session, and retry after a network timeout.
- [ ] Link one phone and one tablet, reject a second device of each type, release a
  device, then confirm the released slot can sign in without stale blocking UI.
- [ ] Confirm server-side progress appears on the second authorized device.
- [ ] Confirm public errors are useful but never expose spreadsheet names, stack
  traces, salts, hashes, tokens, or Apps Script internals.

Exit criterion: all account scenarios pass on production data without manual sheet edits.

## Gate 3 — Version 1 scope lock (P0)

Evidence: `docs/GATE3_V1_SCOPE_ACCEPTANCE.md`.

- [x] Past Papers are deferred to Version 2; all Version 1 navigation, search,
  downloads, announcement, and Premium entry points are disabled by one release flag.
- [x] Version 1 is English-only; onboarding and Profile no longer offer the incomplete
  language choice, and persisted Amharic preferences migrate safely to English.
- [x] Release-source scan found no demo, placeholder, empty shortcut, or
  `REPLACE_WITH_...` value exposed by the app.
- [x] Freeze the Version 1 feature set after these decisions. New feature ideas move
  to Version 2 unless they fix a P0 defect.

Exit criterion: every visible control has complete content, a destination, and an
actionable loading, empty, offline, and error state.

## Gate 4 — Content, offline, Premium, and notification acceptance (P0)

Automated hardening is complete. The signed-device and curriculum-review evidence is tracked in
`docs/GATE4_ACCEPTANCE.md`. The executable Gate 4D evidence matrix is in
`docs/GATE4D_SIGNED_DEVICE_RUN.md`; the items below remain unchecked until that evidence is
recorded from the same signed release candidate.

- [x] Run the production catalog and free-question structural audit for Grade 9, Grade 10,
  Grade 11 Natural, and Grade 12 Natural (14 subjects, 80 units, 9,350 questions; 450 live
  records sampled successfully on 16 August 2026).
- [ ] Resolve the empty Grade 11 Social and Grade 12 Social production catalogs by publishing
  reviewed content, or explicitly remove Social from Version 1 and reopen Gate 3.
- [ ] A curriculum reviewer approves every published question, answer, explanation,
  note, and any included entrance-exam paper.
- [ ] Verify long mathematics, fractions, radicals, powers, subscripts, superscripts,
  repeating decimals, and explanations on a 360 dp phone.
- [ ] Download a quiz and note, enable airplane mode, restart, and complete the flow.
- [ ] Confirm downloads are isolated by grade and account and removed on logout,
  account switch, device release, and Premium expiry where required.
- [ ] Test Premium activation, renewal, expiry, existing-Premium screen, approval
  notification, and one-time celebration.
- [ ] Test announcement auto-refresh, deep links, detailed announcement view, and
  notification permission denial.

Exit criterion: the learning flow works online and offline without stale cross-account
or cross-grade data.

## Gate 5 — Security, privacy, and policy (P0)

Gate 5 is split into owner-operated backend controls (5A) and the Play-facing privacy,
declaration, and reviewer handoff (5B). Gate 5B evidence is recorded in
`docs/GATE5B_PLAY_PRIVACY_REVIEW.md`.

Dependency and release-artifact security is tracked as Gate 5C in
`docs/GATE5C_SUPPLY_CHAIN_SECURITY.md`. Compatible patches are applied immediately; incompatible
forced framework downgrades are prohibited and residual upstream risks require explicit release
acceptance.

Production deployment, cleanup, sheet protection, private backup/recovery, quotas, and incident
operations are tracked as Gate 5D in `docs/GATE5D_PRODUCTION_OPERATIONS.md`. The live Apps Script
release now matches the reviewed local marker; owner-operated controls remain before Gate 5 closes.

- [x] Verify the live backend release, protected GET behavior, public policy pages, App Links,
  Expo dependency alignment, TypeScript, the 25-check release audit, and all 41 suites/137 tests.
- [ ] Restrict spreadsheet access and protect authentication, sessions, attempts,
  payments, reports, and device-registration sheets.
- [ ] Create and verify the expired-session cleanup trigger and production backup.
- [x] Confirm the Android Firebase API key restriction includes
  `com.zemenacademy.app` and the current production certificate.
- [x] Confirm privacy, terms, help, and account-deletion pages return successfully.
- [ ] Keep a discoverable in-app deletion request path and submit
  `https://zemenacademy.com/account-deletion` in Play Console.
- [ ] Complete Data safety so it exactly matches account, optional phone, progress,
  device identity, notification token, reports, and Premium-entitlement processing.
- [ ] Prepare reviewer credentials and instructions for free and Premium access.

Exit criterion: app behavior, website policies, and Play declarations describe the
same system.

## Gate 6 — Signed release APK acceptance (P0)

- [ ] Produce one `preview` APK after Gates 1–5 are complete.
- [ ] Test a clean install and upgrade on a low-memory phone and a tablet.
- [ ] Test Android 7 or the oldest supported real device, plus a current Android device.
- [ ] Measure cold start, cached tab changes, long-list scrolling, quiz transitions,
  note scrolling, and background refresh.
- [ ] Verify status/navigation bars, keyboard handling, dialogs, back behavior,
  screenshot blocking, notifications, reminder timing, and verified web links.
- [ ] Run TalkBack, large-font, light/dark, offline, slow-network, and interrupted-request QA.
- [ ] Fix every crash, freeze, data-loss defect, account leak, and blocked primary action.

Exit criterion: the signed APK completes the acceptance script without a P0 or P1 defect.

## Gate 7 — AAB and Play Console (P0)

- [ ] Increment the release version/versionCode and tag the exact source commit.
- [ ] Run `npm ci`, `npm run verify:v1`, and `npx expo export --platform android`.
- [ ] Build only `eas build --platform android --profile production` for Play.
- [ ] Upload the AAB and confirm target API 36, permissions, package name, and signing.
- [ ] Add Play App Signing SHA-256 to `assetlinks.json`, Firebase Android settings,
  and the Android API-key restriction if it differs from the EAS certificate.
- [ ] Upload icon, feature graphic, phone/tablet screenshots, descriptions, support
  contact, privacy URL, and account-deletion URL.
- [ ] Complete ads, app access, target audience, content rating, Data safety, and
  payment declarations.

Exit criterion: Play Console reports no blocking setup, artifact, or policy issue.

## Gate 8 — Test and rollout (P0 when applicable)

- [ ] If the developer account is a personal account created after 13 November 2023,
  keep at least 12 testers opted into the closed test continuously for 14 days.
- [ ] Record tester devices, Android versions, completed scenarios, feedback, and fixes.
- [ ] Apply for production access after the closed-test requirement is satisfied.
- [ ] Release with a staged rollout, watch crashes, ANRs, sign-up failures, backend
  quotas, notification failures, and support reports, then expand gradually.

Exit criterion: production rollout is stable and can be paused safely if monitoring
shows a regression.

## Current release blockers

1. Complete the Gate 1–5 signed-phone/device acceptance rows using the single Gate 6 preview APK.
2. The Android export did not finish within the local four-minute diagnostic window;
   rerun after stopping the active Metro server and inspect production bundle timing.
3. Signed physical-device acceptance and Play Console declarations are not complete.
4. The website's E: drive workspace currently cannot create Vite's temporary config
   file even though the live deployment previously passed; restore a reproducible
   clean build from the GitHub source before the release tag.
