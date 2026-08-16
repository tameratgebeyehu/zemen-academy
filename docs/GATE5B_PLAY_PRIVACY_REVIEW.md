# Gate 5B — Play privacy, policy, and reviewer handoff

Updated: 16 August 2026

## Decision

**LOCAL PASS — PLAY CONSOLE OWNER SUBMISSION PENDING**

Gate 5B verifies that the shipped Play configuration, public policies, declared data handling,
account-deletion path, Premium behavior, and reviewer instructions agree. It does not claim that
Google has approved the app, and it cannot mark Play Console forms complete without owner evidence.

## Automated evidence

| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| B01 | Production Android identity | PASS | Package `com.zemenacademy.app`, version `1.0.0`, version code `2` |
| B02 | Android permission minimization | PASS | Resolved explicit permission list contains only `POST_NOTIFICATIONS` |
| B03 | Device backup protection | PASS | `android.allowBackup` is `false` |
| B04 | Verified official-domain links | PASS | HTTPS App Links use only `zemenacademy.com/app/` with `autoVerify`; public policy pages remain external |
| B05 | Public privacy URL | PASS | `https://zemenacademy.com/privacy` returned successfully on 16 August 2026 |
| B06 | Public terms URL | PASS | `https://zemenacademy.com/terms` returned successfully on 16 August 2026 |
| B07 | Public help URL | PASS | `https://zemenacademy.com/help` returned successfully on 16 August 2026 |
| B08 | Public deletion URL | PASS | `https://zemenacademy.com/account-deletion` returned successfully on 16 August 2026 |
| B09 | Android App Links association | PASS | Public `assetlinks.json` verification passed |
| B10 | Ads/analytics/telemetry SDK review | PASS | No advertising, Sentry, PostHog, Analytics, or Crashlytics dependency is declared |
| B11 | Play payment surface | PASS | Release audit confirms every Android profile is consumption-only and cannot expose bank/manual-payment UI |
| B12 | Backend public error/security tests | PASS | `backendSecurity.test.ts`: 6 of 6 tests passed |
| B13 | Account-deletion discoverability | PASS | Direct Profile deletion entry and official web/email request paths are included in the release audit |
| B14 | Secret/release audit | PASS | Version 1 release audit: 25 of 25 checks passed |

No reviewer password, reset code, session token, bank information, student record, or production
backup belongs in this document, source control, screenshots, or release notes.

## Data safety declaration matrix

Enter these values for the current Version 1 AAB only. Re-audit if a dependency, permission, or
data flow changes.

| Play category | Current declaration |
| --- | --- |
| Data collected or shared | Yes; signed-in features transmit limited account, progress, device-security, notification, and report data |
| Encrypted in transit | Yes; production communication uses HTTPS and notification-provider transport |
| Data deletion available | Yes; use `https://zemenacademy.com/account-deletion` |
| Data sold | No |
| Third-party advertising | No |
| Name | Collected for accounts; optional overall because guest mode is available |
| Email address | Collected for accounts; optional overall because guest mode is available |
| Phone number | Optional; account management and security |
| User ID | Collected for signed-in accounts |
| App interactions | Quiz attempts and progress for signed-in learning; not advertising analytics |
| Other user-generated content | Question reports and optional report details |
| Device or other IDs | Installation identity and optional Expo push token |
| Financial information/purchase history | Do not select for the Play AAB; it reads an existing entitlement and exposes no transfer/request flow |
| Location, contacts, media/files, microphone, camera, SMS/calls, health, calendar | Not collected by the current app |
| Crash/diagnostic/performance telemetry | Not collected by an SDK in Version 1 |

The field-by-field source of truth is `docs/PLAY_DATA_SAFETY.md`.

## Play Console owner checklist

Record only completion status and timestamps here. Store private screenshots/exports in the
release evidence folder outside Git.

| ID | Owner action | Status | Evidence date/location |
| --- | --- | --- | --- |
| O01 | Upload the accepted production AAB before final artifact-dependent declarations. | PENDING | |
| O02 | App content → Privacy policy: enter `https://zemenacademy.com/privacy`. | PENDING | |
| O03 | App content → Data safety: enter the Version 1 matrix and export the submitted response. | PENDING | |
| O04 | App content → App access: declare that some features are restricted and enter both reviewer accounts privately. | PENDING | |
| O05 | Test the free and Premium reviewer accounts on a clean signed installation. | PENDING | |
| O06 | Release old reviewer device slots immediately before submission. | PENDING | |
| O07 | Ads declaration: declare no ads for Version 1. | PENDING | |
| O08 | Target audience and content: answer for the real Ethiopian secondary-student audience. | PENDING | |
| O09 | Complete content rating truthfully from shipped content and communication features. | PENDING | |
| O10 | Complete any Payments/monetization declaration consistently with the consumption-only AAB. | PENDING | |
| O11 | Enter the public account-deletion URL and confirm the in-app deletion path from the signed build. | PENDING | |
| O12 | Confirm the store listing support email and website use official, monitored contacts. | PENDING | |

Do not hide a payment screen only for review, identify reviewers, or remotely enable a prohibited
Android payment flow after approval. All Android build profiles are intentionally consumption-only.
Any enrollment outside the app must remain policy-compliant and must not be promoted through a
disallowed in-app steering flow.

## Reviewer access acceptance

Prepare two temporary, dedicated accounts immediately before submission:

| Account | Required state | Physical acceptance |
| --- | --- | --- |
| Free reviewer | Grade 9, active, no Premium entitlement, device slots released | PENDING |
| Premium reviewer | Active entitlement at least 30 days beyond review, device slots released | PENDING |

Place their credentials only in **Play Console → App content → App access**. Follow
`docs/PLAY_REVIEWER_ACCESS.md` for navigation instructions. After review, rotate the passwords or
delete the accounts according to the retention policy.

## Gate exit rule

Gate 5B is complete only when:

1. B01–B14 still pass against the final production commit and AAB configuration.
2. O01–O12 are completed with private evidence.
3. Both reviewer accounts pass on the signed build without device-limit or entitlement errors.
4. Play Data safety, privacy, deletion, App access, ads, audience, content-rating, and payments
   answers exactly match the uploaded AAB.
5. No P0/P1 privacy, authentication, account-deletion, entitlement, or policy defect remains.

Any code, SDK, permission, payment, deletion, authentication, or data-collection change reopens
this gate.
