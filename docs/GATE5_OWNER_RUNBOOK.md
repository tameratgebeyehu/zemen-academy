# Gate 5 owner runbook — security, privacy, backup, and Play handoff

Use this checklist while signed in as the owner of the production spreadsheet and Play Console.
Do not record student emails, passwords, tokens, file IDs, or reviewer credentials in Git.

## 0. Deploy the reviewed backend first

The live audit currently reports `2026-08-15-gate-5`, while the reviewed local backend is
`2026-08-16-timetable-v2`.

1. Copy the latest `backend/Code.gs` and `backend/Setup.gs` into the existing Apps Script project.
2. Preserve every Script Property, especially `SPREADSHEET_ID` and `PASSWORD_PEPPER`.
3. Save the project.
4. Select **Deploy → Manage deployments → Edit → New version → Deploy**.
5. Keep the existing `/exec` URL.
6. Run `npm.cmd run audit:backend`. Continue only when all checks pass.

## 1. Install and verify expired-session cleanup

This cleanup deletes expired or revoked login sessions and old used/expired password-reset rows.
It does not delete active accounts, active sessions, quiz attempts, progress, downloads, or content.

1. Reload the production spreadsheet.
2. Select **Zemen Security → Install daily security cleanup** once.
3. In Apps Script, open **Triggers**.
4. Confirm exactly one time-driven trigger exists with handler `cleanupExpiredSecurityRecords`.
5. Confirm it runs daily. Delete no trigger manually unless it is an obvious duplicate.

## 2. Restrict production access and protect data sheets

1. Open the production spreadsheet's **Share** dialog.
2. Set General access to **Restricted**.
3. Remove every viewer/editor who does not operate production.
4. Keep only the owner and explicitly authorized production operator accounts.
5. Select **Zemen Security → Install timetable sync storage**.
6. Select **Zemen Security → Protect sensitive sheets** and confirm **Yes**.
7. Select **Zemen Security → Run release security diagnostic**.
8. Require one cleanup trigger, every sensitive sheet protected, and no unexpected file viewer/editor.

Sheet protection controls editing. The Drive Share dialog controls who can view the file; both checks
are required.

## 3. Create and verify the private production backup

1. Select **Zemen Security → Create private production backup** and confirm **Yes**.
2. Open Google Drive and confirm the new backup is owned by the production owner and is Restricted.
3. Select **Zemen Security → Verify latest private backup**.
4. Require `verified: true`, `sharing: PRIVATE`, and no missing/invalid sheet headers.
5. Run **Run release security diagnostic** again and confirm both backup timestamps are present.
6. Keep backups private and remove obsolete copies according to the published retention policy.

## 4. Process an account-deletion request

The request is discoverable at **Profile → Account deletion**, in **Privacy & terms**, and at
`https://zemenacademy.com/account-deletion`.

1. Accept the request only through the registered email path. Never request a password, bank login,
   identity document, or reset code.
2. Confirm the email matches exactly one row in `Users`.
3. Select that row in the `Users` sheet.
4. Select **Zemen Security → Delete selected user account data**.
5. Read the permanent-deletion warning and confirm **Yes** only for the intended account.
6. Confirm the result returns `deleted: true` and removes the Users row plus linked sessions,
   resets, attempts, progress, timetable, reports, device tokens, devices, and Premium records.
7. Reply to the requester confirming completion. Keep no password or private deletion evidence in Git.

## 5. Complete Play Console Data safety

Open **Play Console → App content → Data safety** and use `docs/PLAY_DATA_SAFETY.md` as the field-level
source of truth.

- Data collected: **Yes**.
- Data encrypted in transit: **Yes**.
- Account deletion: **Yes**.
- External deletion URL: `https://zemenacademy.com/account-deletion`.
- Data sold: **No**.
- Third-party advertising: **No**.
- Declare name, email, optional phone, user ID, signed-in quiz/study activity, question reports,
  installation identity, and optional notification token.
- Do not declare financial information for the consumption-only Play AAB.
- Do not declare location, contacts, media/files, microphone, camera, SMS/calls, health, calendar,
  advertising ID, or telemetry SDK data for Version 1.

Export or screenshot the submitted form into a private release-evidence folder outside Git.

## 6. Prepare reviewer access

1. Create a dedicated free account and a dedicated Premium account. Do not use a student account.
2. Set both to Grade 9 and verify login on the signed candidate.
3. Keep the free account without Premium.
4. Give the Premium account an entitlement lasting at least 30 days beyond the review window.
5. Release all old phone/tablet slots for both accounts immediately before submission.
6. Enter credentials and the instructions from `docs/PLAY_REVIEWER_ACCESS.md` only in
   **Play Console → App content → App access**.
7. Never place credentials in source, release notes, screenshots, or Git.
8. After review, rotate the passwords or delete both reviewer accounts.

## Gate 5 exit rule

Gate 5 passes only when the latest backend audit passes, exactly one cleanup trigger exists, sensitive
sheets and Drive sharing are restricted, a private backup verifies successfully, deletion is tested on a
dedicated account, Data safety is submitted, and both reviewer accounts work on the signed candidate.
