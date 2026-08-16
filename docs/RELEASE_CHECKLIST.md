# Public release checklist

Execution order and the current release/no-release decision are maintained in
[`FINAL_RELEASE_PLAN.md`](./FINAL_RELEASE_PLAN.md). This file remains the detailed QA checklist.

## Required owner-provided values

- [ ] Re-check every public contact, privacy, terms, support, and account-deletion URL from the signed release.
- [ ] Verify the final icon, adaptive icon, splash artwork, and notification appearance on a physical Android device.
- [ ] Confirm the production Apps Script `/exec` deployment is the version intended for launch.
- [ ] Confirm the EAS project owner and project ID belong to the production developer account.

## Play Console setup

- [ ] Upload store-listing assets: app icon, feature graphic, phone screenshots, tablet screenshots, short description, and full description.
- [ ] Complete App content: privacy policy, ads declaration, app access instructions, target audience, content rating, Data safety, and any required payment declaration.
- [ ] If this is a personal developer account created after 13 November 2023, run a closed test with at least 12 continuously opted-in testers for 14 days before applying for production access.
- [ ] Confirm the generated AAB targets Android 16 / API 36. Expo SDK 57 uses API 36, but verify the uploaded artifact in Play Console.
- [ ] In **App integrity**, compare the Play app-signing SHA-256 certificate with the certificate served by `https://zemenacademy.com/.well-known/assetlinks.json`.
- [ ] If Play's app-signing certificate differs from the EAS certificate, add the Play SHA-256 fingerprint to `assetlinks.json`, Firebase's Android app, and the restricted Android API key before production rollout.
- [ ] Confirm any previously shared APK and the Play build use compatible signing certificates; otherwise document a clean-install migration for those testers.

## Content and policy

- [ ] Build the Play artifact only with the `production` EAS profile; confirm the release audit reports the `play` channel.
- [ ] Confirm the Play AAB shows no plans, amounts, bank details, transfer instructions, payment links, or manual request form.
- [ ] Upload only the AAB produced by the `production` profile; preview APKs are for device testing only.
- [ ] Confirm `https://zemenacademy.com/premium` completes sign-in, plan selection, bank selection, request submission, pending refresh, and active-entitlement display.
- [ ] Confirm the website request activates the same account in the Android app without consuming a phone or tablet device slot.
- [ ] Add accurate reviewer instructions and free/Premium test credentials under Play Console App access.
- [ ] Have qualified curriculum reviewers approve every question and explanation.
- [ ] Remove or clearly retain the bundled demonstration content according to launch policy.
- [x] Keep Past Papers disabled in Version 1; distribution-rights review is a Version 2 gate.
- [ ] Publish a privacy policy covering accounts, quiz attempts, and notifications.
- [ ] Publish terms of use and a support contact.
- [ ] Complete Google Play Data safety disclosures.
- [x] Document account deletion and provide a direct in-app path plus the public deletion resource.

## Backend

- [ ] Run **Zemen Security → Install timetable sync storage**, then **Protect sensitive sheets**; confirm the protected `StudyPlans` tab exists and deploy a new Apps Script version on the existing `/exec` URL.
- [ ] Restrict spreadsheet access and protect Users, Sessions, PasswordResets, Attempts, and QuestionReports tabs.
- [ ] Run **Zemen Security → Install daily security cleanup** and confirm exactly one `cleanupExpiredSecurityRecords` trigger.
- [ ] Run **Protect sensitive sheets**, then verify all protected tabs remain writable by the Apps Script owner workflow.
- [ ] Test sign-up, login, logout, invalid credentials, expired sessions, and duplicate emails.
- [ ] Run `authorizePasswordResetEmail` and complete an email-code reset on a real Android device.
- [ ] Test Apps Script quotas with expected launch traffic.
- [ ] Back up the production spreadsheet and test recovery.

## Android QA

- [ ] Test on at least one low-memory Android phone and the oldest Android version you support.
- [ ] Test first launch with no internet and guest onboarding.
- [ ] Download content, enable airplane mode, restart the app, and complete both quiz modes.
- [ ] Verify screenshot blocking and background termination on physical devices.
- [ ] Verify reminder behavior on Android versions used by target students.
- [ ] Create a four-week timetable, complete/skip/move sessions, restart the app, and confirm the dated plan and next 14 days of reminders remain correct.
- [ ] Sign in on the allowed phone and tablet, then confirm the newer timetable state synchronizes without overwriting a later offline change.
- [x] Confirm Version 1 exposes English only; complete Amharic typography QA is deferred to Version 2.
- [ ] Test large catalogs, long questions, and long answer choices.
- [ ] Confirm logout/account switching does not expose another student’s attempt history.
- [ ] Build and test a signed release APK before uploading the AAB.

## Educational quality

- [ ] A qualified reviewer approves every published question, answer, explanation, note, and past paper.
- [ ] Every quiz has exactly four distinct choices and exactly one defensible correct answer.
- [ ] Instant mode gives immediate, readable reasoning; exam mode preserves assessment integrity until submission.
- [ ] Report Issue reaches the spreadsheet with enough question context to reproduce the problem.
- [ ] Progress survives sign-in on a second authorized device after synchronization.
- [ ] Daily goals and timetable suggestions remain optional, editable, and achievable.
- [ ] Notes use the validated `NoteEditor` flow, render their mathematics correctly, and identify free versus Premium access before publication.
- [x] Confirm Past Papers has no Version 1 navigation, search, download, announcement, or Premium entry point.

## Usability and accessibility

- [ ] A first-time student can sign up, choose a grade, find a subject, and start a free quiz without assistance.
- [ ] Every tap gives visible feedback immediately; cached tab content is usable while background refresh continues.
- [ ] On the slowest test phone, cached tab changes feel immediate and a cold start reaches usable Home within the internal 3-second target.
- [ ] Interactive targets are at least 48 × 48 dp or have equivalent hit area.
- [ ] TalkBack announces icon-only actions, form errors, answer state, and dialogs meaningfully.
- [ ] Large text does not clip English or Amharic content on a 360 dp-wide phone.
- [ ] Meaning is never communicated by color alone, and Reduce Motion is respected.
- [ ] Loading, empty, offline, retry, and permission-denied states explain what the student can do next.

## Privacy and account safety

- [ ] Collect only account, learning, device-security, payment-verification, and notification data required by documented features.
- [ ] Verify that password text, raw session tokens, reset codes, Firebase Admin keys, and signing keys never appear in Sheets, logs, screenshots, builds, or Git.
- [ ] Log out, account switching, Premium expiry, and device release remove access to account-scoped downloads and cached Premium notes.
- [ ] Privacy policy, terms, account deletion, and support URLs work from both the website and app.
- [ ] Play Console Data safety and target-audience answers match the shipped behavior exactly.

## Automated gates

```bash
npm ci
npm run audit:v1
npm run audit:public
npm run typecheck
npm test
npx expo install --check
npx expo export --platform android
```

Do not publish with any `REPLACE_WITH_...` values remaining.
