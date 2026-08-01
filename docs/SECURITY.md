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

## Release checks

- Run `npm audit --omit=dev`, `npx expo install --check`, `npm run typecheck`, and `npm test -- --runInBand`.
- Verify that `*-firebase-adminsdk-*.json`, service-account files, `.env`, and signing keys remain ignored by Git.
- Review Apps Script executions for repeated authentication, signup, reporting, or push-registration failures.
- Use separate test accounts and test data; never copy production password hashes or reset records into shared workbooks.

## Incident response

- Revoke affected rows in `Sessions` and `UserDevices` immediately.
- Disable compromised Expo push tokens in `DeviceTokens`.
- If an Apps Script secret is exposed, create a new deployment after replacing the secret. If `PASSWORD_PEPPER` is exposed, plan a forced password-reset migration because rotating it directly makes current password hashes unverifiable.
