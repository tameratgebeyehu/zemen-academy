# Zemen Academy security operations

## Protected values

- Keep `PASSWORD_PEPPER`, `SPREADSHEET_ID`, and `EXPO_ACCESS_TOKEN` only in Apps Script Properties.
- Never commit Firebase Admin service-account JSON, keystores, passwords, session tokens, or password-reset codes.
- `google-services.json` is Android client configuration, not a Firebase Admin credential. Restrict its API key in Google Cloud to `com.zemenacademy.app` and the production signing certificate where supported.
- Back up `PASSWORD_PEPPER` securely. Replacing it invalidates existing password hashes and sessions.

## Deployment

1. Deploy the web app as a new Apps Script version after changing backend files.
2. Keep the existing `/exec` URL in `EXPO_PUBLIC_APPS_SCRIPT_URL` and use HTTPS only.
3. Run `installSecurityMaintenance` once from the Apps Script editor. It installs daily removal of expired sessions and old password-reset records.
4. Confirm that only `health` and `version` work through HTTP GET. Authenticated and state-changing actions must use POST.

## Spreadsheet owner controls

After deploying `Code.gs` and `Setup.gs`, use the spreadsheet's **Zemen Security** menu as the production owner:

1. **Install daily security cleanup** and confirm exactly one `cleanupExpiredSecurityRecords` trigger exists.
2. **Protect sensitive sheets** so normal content editors cannot directly change accounts, sessions, password resets, attempts/progress, reports, notification tokens/queues, Premium records, or device links.
3. **Create private production backup** before every production backend migration. The copy is forced to private Drive access and its timestamp is recorded in Script Properties.
4. **Run release security diagnostic** and investigate any unexpected file editor/viewer, missing protected sheet, missing secret, missing backup, or duplicate/missing trigger.

Sheet protection controls editing, not viewing. Independently open Google Drive sharing for the master spreadsheet and remove every viewer/editor who does not require production data. Never share a production backup by link.

Test recovery using a private temporary copy: confirm headers, account rows, content-source mappings, and trigger/setup instructions are present. Delete the temporary recovery copy after the test.

## Release checks

- Run `npm audit --omit=dev`, `npx expo install --check`, `npm run typecheck`, and `npm test -- --runInBand`.
- Treat npm's suggested framework downgrades as incompatible until Expo supports them. Record inherited Expo/Metro advisories, keep Expo dependencies aligned, and never use `npm audit fix --force` on the release branch.
- Verify that `*-firebase-adminsdk-*.json`, service-account files, `.env`, and signing keys remain ignored by Git.
- Review Apps Script executions for repeated authentication, signup, reporting, or push-registration failures.
- Run `npm run audit:public` and verify privacy, terms, help, account deletion, and Android App Links before submission.
- Use separate test accounts and test data; never copy production password hashes or reset records into shared workbooks.

## Local and offline data

- Offline downloads, queued question reports, and attempts are scoped to the signed-in account and cleared when a different account or guest session takes control of the device.
- Premium downloads remain hidden and unusable when the verified premium lease expires. The server must be contacted again before premium access is restored.
- Unsynced attempts retain their full details. Older synced attempts are compacted locally so long-term use does not cause unbounded startup and storage costs.
- Authentication tokens and the stable installation identifier belong in SecureStore. Do not move them into AsyncStorage.
- Before every release, test airplane-mode startup, downloaded quiz access, queued attempt/report recovery, expired premium access, corrupt local-state recovery, logout, and account switching on a physical Android phone.

## Incident response

- Revoke affected rows in `Sessions` and `UserDevices` immediately.
- Disable compromised Expo push tokens in `DeviceTokens`.
- If an Apps Script secret is exposed, create a new deployment after replacing the secret. If `PASSWORD_PEPPER` is exposed, plan a forced password-reset migration because rotating it directly makes current password hashes unverifiable.
