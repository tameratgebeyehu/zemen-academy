# Public release checklist

## Required owner-provided values

- [ ] Replace social links and support email in `src/config.ts`.
- [ ] Replace payment account placeholders in `src/config.ts` and verify account names.
- [ ] Add final application icon, adaptive icon, splash artwork, and notification icon to `app.json`.
- [ ] Deploy Apps Script and add its `/exec` URL to the production environment.
- [ ] Run `npx eas-cli@latest init` to attach the correct EAS project ID.

## Content and policy

- [ ] Have qualified curriculum reviewers approve every question and explanation.
- [ ] Remove or clearly retain the bundled demonstration content according to launch policy.
- [ ] Confirm permission to distribute every past paper.
- [ ] Publish a privacy policy covering accounts, quiz attempts, and notifications.
- [ ] Publish terms of use and a support contact.
- [ ] Complete Google Play Data safety disclosures.
- [ ] Decide and document account-deletion handling before enabling public sign-up.

## Backend

- [ ] Restrict spreadsheet access and protect Users, Sessions, PasswordResets, Attempts, and QuestionReports tabs.
- [ ] Create the daily `cleanupExpiredSessions` trigger.
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
- [ ] Check Amharic glyph rendering, clipping, and line wrapping on small screens.
- [ ] Test large catalogs, long questions, and long answer choices.
- [ ] Confirm logout/account switching does not expose another student’s attempt history.
- [ ] Build and test a signed release APK before uploading the AAB.

## Automated gates

```bash
npm ci
npm run typecheck
npm test
npx expo export --platform android
```

Do not publish with any `REPLACE_WITH_...` values remaining.
