# Gate 5 — security, privacy, and Play policy record

## Subgate status

- **Gate 5A — backend owner controls:** owner execution and recovery evidence pending.
- **Gate 5B — Play privacy, policy, and reviewer handoff:** local verification passed;
  Play Console owner submission pending. See `docs/GATE5B_PLAY_PRIVACY_REVIEW.md`.
- **Gate 5C — dependency and release-artifact security:** compatible patches applied;
  conditional local pass with two upstream advisories recorded. See
  `docs/GATE5C_SUPPLY_CHAIN_SECURITY.md`.
- **Gate 5D — production operations and recovery:** latest backend deployment plus
  spreadsheet-owner controls and recovery evidence pending. See
  `docs/GATE5D_PRODUCTION_OPERATIONS.md`.

## Automated evidence

- Android package: `com.zemenacademy.app`.
- Android backups disabled; explicit permission list limited to notifications.
- Firebase Android client package matches the app package. The Firebase API key is client configuration, not an Admin credential; its Google Cloud restriction remains a console-side check.
- HTTPS App Links use the dedicated `zemenacademy.com/app/` namespace so public website and
  account-deletion pages cannot be captured by the Android app.
- Backend GET is restricted to health/version; authenticated and state-changing operations use POST.
- Public API errors are sanitized; detailed errors remain in Apps Script execution logs.
- Passwords use salted/peppered hashes, sessions store token hashes, and the device stores the raw session token in SecureStore.
- The app has a direct **Profile → Account deletion** entry plus official web and email request actions.
- Live checks on 16 August 2026 returned successfully for privacy, terms, help, account deletion,
  and `assetlinks.json`.
- Three consecutive production backend audits on 16 August 2026 matched local release
  `2026-08-15-gate-5`; protected GET requests returned no catalog data or backend internals.
- Security-focused suites passed for authentication protection, owner account deletion,
  private-backup verification, password recovery, Ethiopian phone validation, device policy,
  account-scoped storage, Play distribution, Premium requests, public errors, and App Links.
- The complete application suite passed: 42 suites and 149 tests. TypeScript, the installed
  production dependency tree, Expo dependency alignment, and the 25-check release audit passed.

## Owner actions in Apps Script

After deploying the latest backend files on the existing URL, run these from the spreadsheet's
**Zemen Security** menu as the owner:

1. **Install daily security cleanup** — replaces duplicate cleanup triggers with one daily trigger.
2. **Protect sensitive sheets** — protects account, session, reset, attempt/progress, report, push, Premium, and device tabs. Content-authoring tabs remain editable.
3. **Create private production backup** — creates an owner-only Google Drive copy and records its timestamp in Script Properties.
4. **Verify latest private backup** — proves the newest copy is private and contains the expected sheets and headers.
5. **Run release security diagnostic** — require one cleanup trigger, all sensitive sheets protected, and no unexpected viewers/editors.

Also open Google Drive sharing for the production spreadsheet and remove every person who does not need production access. Sheet protection prevents editing; Drive sharing controls viewing.

## Firebase and signing handoff

- The local `google-services.json` resolves to `com.zemenacademy.app`.
- The Android key restriction was configured in Google Cloud for this package and the current production signing certificate.
- After the first AAB is uploaded, compare the **Play App Signing** SHA-256 certificate with EAS/Firebase/API-key restrictions and `assetlinks.json`. If Play uses a different certificate, add the Play fingerprint everywhere before rollout. This is a Gate 7 upload-time action, not something local code can prove now.

## Public policy and reviewer handoff

- Privacy: `https://zemenacademy.com/privacy`
- Terms: `https://zemenacademy.com/terms`
- Help: `https://zemenacademy.com/help`
- Account deletion: `https://zemenacademy.com/account-deletion`
- Data safety answers: `docs/PLAY_DATA_SAFETY.md`
- Reviewer instructions: `docs/PLAY_REVIEWER_ACCESS.md`
- Owner execution guide: `docs/GATE5_OWNER_RUNBOOK.md`
- Premium disclosure: `docs/PLAY_REVIEW_PAYMENT_NOTE.md`
- Gate 5B evidence and Play Console matrix: `docs/GATE5B_PLAY_PRIVACY_REVIEW.md`

## Gate result

Code and documentation checks can pass locally. Gate 5 is fully closed only after the owner runs
the Apps Script security actions, confirms Drive sharing, tests deletion on a dedicated account,
enters Data safety/App access in Play Console, and records the private backup verification.
