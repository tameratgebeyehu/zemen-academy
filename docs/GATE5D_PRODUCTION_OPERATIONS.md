# Gate 5D — production operations and recovery

Updated: 16 August 2026

## Decision

**LATEST DEPLOYMENT AND OWNER OPERATIONS PENDING**

The live Apps Script endpoint is reachable and healthy and reports backend release
`2026-08-15-gate-5`. The reviewed local backend is now `2026-08-16-timetable-v2`, so a new version
must be deployed on the existing URL. Gate 5D also remains open for spreadsheet-owner controls,
private backup verification, account operations, quota review, and incident-response evidence.

Observed on 16 August 2026:

| Endpoint action | HTTP/API result | Live release | Local release | Result |
| --- | --- | --- | --- | --- |
| `health` | Healthy, app version 1.0.0 | `2026-08-15-gate-5` | `2026-08-16-timetable-v2` | DEPLOY |
| `version` | Successful | `2026-08-15-gate-5` | `2026-08-16-timetable-v2` | DEPLOY |
| protected GET | Safe rejection; no data/internal detail | `2026-08-15-gate-5` | `2026-08-16-timetable-v2` | PASS — SAFE ERROR |

The production URL is intentionally omitted from evidence output. It remains stored only in the
untracked local `.env`.

## Future backend deployment procedure

Perform these actions while signed in as the owner of the existing production Apps Script
project. Do not create a different web-app URL.

1. Open the Apps Script project attached to the production spreadsheet.
2. Replace its backend source with the reviewed local files:
   - `C:\zemen academy final\backend\Code.gs`
   - `C:\zemen academy final\backend\Setup.gs`
3. Preserve Script Properties such as `SPREADSHEET_ID`, `PASSWORD_PEPPER`, and any notification
   secret. Never paste these values into source code.
4. Save the project.
5. Select **Deploy → Manage deployments**.
6. Edit the existing web-app deployment, choose **New version**, add a release description, and
   deploy it. Keep the existing `/exec` URL.
7. Wait briefly for propagation, then run locally:

```powershell
cd "C:\zemen academy final"
npm.cmd run audit:backend
```

Expected result: every check passes and both public actions report
`2026-08-16-timetable-v2`. If the live marker remains older, verify that the existing deployment was
edited and a new version—not merely a saved editor draft—was selected.

## Spreadsheet owner controls

After the live marker matches, reload the production spreadsheet and use **Zemen Security** in
this order:

| ID | Owner action | Expected evidence | Status |
| --- | --- | --- | --- |
| D01 | Install daily security cleanup | Exactly one `cleanupExpiredSecurityRecords` trigger | PENDING |
| D02 | Protect sensitive sheets | Every sheet listed by the diagnostic is protected | PENDING |
| D03 | Create private production backup | New owner-only Drive copy and `LAST_PRIVATE_BACKUP_AT` | PENDING |
| D03A | Verify latest private backup | `verified: true`, private sharing, expected sheets/headers | PENDING |
| D04 | Run release security diagnostic | Healthy trigger, all sensitive sheets protected, expected sharing counts | PENDING |
| D05 | Review master spreadsheet Drive sharing | Only explicitly authorized production operators remain | PENDING |
| D06 | Review backup Drive sharing | Private; not shared by link, domain, or group | PENDING |
| D07 | Test recovery using a temporary private copy | Headers, account/content mappings, and setup instructions verified | PENDING |
| D08 | Delete the temporary recovery-test copy | No unnecessary student-data duplicate remains | PENDING |

Sheet protection controls editing, not viewing. D05 and D06 must be verified separately in Google
Drive. Record counts and timestamps, not people's emails, in release evidence.

## Operational acceptance

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| D09 | Run health and version three times | Successful, bounded responses with matching backend marker | PASS — 16 August 2026 |
| D10 | Test invalid GET action | Safe public error; authenticated/state-changing data is not returned | PASS — 16 August 2026 |
| D11 | Test sign-up, login, logout, invalid login, and expired session | Correct behavior with no stack trace or spreadsheet details exposed | PENDING |
| D12 | Test a real password-recovery email | One code, bounded response, no repeated six-minute execution | PENDING |
| D13 | Inspect Apps Script executions | No repeating signup, authentication, push, quota, or timeout failure pattern | PENDING |
| D14 | Record MailApp and Apps Script quota headroom | Sufficient for expected launch traffic or release is limited/deferred | PENDING |
| D15 | Exercise incident response on test records | Session/device/push revocation works without editing real student data | PENDING |

Use dedicated test accounts and redact names, emails, phone numbers, tokens, password hashes,
reset codes, payment records, and file IDs from evidence.

## Gate exit rule

Gate 5D passes only when:

1. `npm run audit:backend` reports a matching `2026-08-16-timetable-v2` live release.
2. D01–D15 have owner evidence and no unexpected editor/viewer remains.
3. A private backup has been created and recovery tested.
4. Exactly one daily cleanup trigger exists.
5. No P0/P1 authentication, privacy, quota, data-loss, recovery, or operational defect remains.

Any backend source, deployment, Script Property, spreadsheet schema/protection, sharing, or
retention change reopens this gate.
