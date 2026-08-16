# Gate 2 — account, backend, device, and progress acceptance

Updated: 16 August 2026

## Current decision

**LOCAL AND OWNER DEVICE TEST PASS — LATEST BACKEND DEPLOYMENT AND FINAL APK REPEAT PENDING**

The owner confirmed one phone plus one tablet, blocking of additional devices, and released-slot
recovery on 16 August 2026. The existing production Apps Script URL still serves
`2026-08-15-gate-5`; the current local release is `2026-08-16-timetable-v2`, so the latest backend
must be deployed on the existing URL before this gate closes.

## Automated evidence

| ID | Check | Result |
| --- | --- | --- |
| A01 | Live health responds within the 35-second bound | PASS |
| A02 | Live health reports release `2026-08-15-gate-5` | PASS |
| A03 | Live version returns latest/minimum app versions | PASS |
| A04 | Live version reports release `2026-08-15-gate-5` | PASS |
| A05 | Protected catalog action is rejected through GET without data/internal details | PASS |
| A06 | Backend security and safe public errors | PASS |
| A07 | One-phone/one-tablet and released-slot policy | PASS |
| A08 | Server progress aggregation and persistence | PASS |
| A09 | Password-reset validation | PASS |
| A10 | Ethiopian phone normalization/validation | PASS |
| A11 | Client device-revocation/local purge policy | PASS |

Fresh targeted result: 7 test suites and 23 tests passed. The complete release suite is rerun at
each final gate.

## Owner Apps Script diagnostic

Run this only from the production Apps Script editor while signed in as the owner:

1. Select `diagnoseV1AccountAndDeviceGate` in the function list.
2. Click **Run** and allow it to finish once.
3. Confirm the result has `status: "SUCCESS"` and exactly these eight checks:
   - `signup`
   - `login`
   - `one-phone-one-tablet`
   - `second-phone-blocked`
   - `admin-release-reclaim`
   - `progress-persisted`
   - `logout-revoked`
   - `relogin`
4. Confirm the execution completes without a six-minute timeout.
5. Confirm its temporary diagnostic user, sessions, devices, attempt, and progress row were
   removed automatically.

| Evidence | Status |
| --- | --- |
| Diagnostic returned SUCCESS with eight checks | PASS — 16 August 2026 |
| Temporary diagnostic records cleaned | PASS — confirmed by execution log |
| Execution time and timestamp recorded privately | PASS — approximately 24 seconds |

Do not paste production emails, tokens, password hashes, salts, phone numbers, or spreadsheet IDs
into this document.

## Signed physical-device acceptance

Use dedicated test accounts on the single Gate 6 preview APK.

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| P01 | Create a new account on a clean phone | Account, secure session, and phone slot are created once | NOT RUN |
| P02 | Repeat with the same email | Clear existing-account message; no duplicate row | NOT RUN |
| P03 | Enter unsupported Ethiopian phone prefixes and valid 09/07 forms | Invalid prefixes are rejected; valid local/international forms normalize | NOT RUN |
| P04 | Sign in with a wrong password, then the correct password | Safe error, then successful access; no backend internals | NOT RUN |
| P05 | Sign out and relaunch | Session is revoked and account-scoped local data is cleared | NOT RUN |
| P06 | Complete Premium password recovery with a real test email | One code arrives; reset succeeds; old password stops working | NOT RUN |
| P07 | Exercise expired session and a forced network timeout | Reauthentication/retry guidance appears; no indefinite spinner | NOT RUN |
| P08 | Link one phone and one tablet | Both categories show 1/1 and remain usable | OWNER PASS — FINAL APK REPEAT PENDING |
| P09 | Attempt a second phone and second tablet | Extra device of each category is blocked clearly | OWNER PASS — FINAL APK REPEAT PENDING |
| P10 | Admin releases one device, then retry/refresh on its replacement | Empty slot is reclaimed without stale blocking UI | OWNER PASS — FINAL APK REPEAT PENDING |
| P11 | Complete a quiz on one authorized device and sync | Server progress is written once | NOT RUN |
| P12 | Sign in on the second authorized device | Synced completed count, study time, streak, and scores appear | NOT RUN |

## Exit rule

Gate 2 passes when the live audit, all local tests, the owner diagnostic, and P01–P12 pass without
manual row repair, account/data leakage, duplicate records, stale device blocking, exposed backend
details, or a P0/P1 authentication/progress defect. Physical rows are executed with Gate 6 so a
separate EAS build is not consumed.
