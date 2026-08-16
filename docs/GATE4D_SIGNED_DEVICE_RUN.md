# Gate 4D — signed physical-device acceptance

Updated: 15 August 2026

## Current status

**NOT STARTED — signed release candidate and physical evidence required**

- Project: Zemen Academy
- Android package: `com.zemenacademy.app`
- App version: `1.0.0`
- Android version code: `2`
- Required build profile: `preview` (signed internal-distribution APK)
- Distribution channel: `play`
- Local signed project APK: not found
- Connected ADB device: unavailable; ADB is not installed
- EAS build started during this gate: no

Do not replace this status with PASS until every required result below has evidence from the
same signed release candidate.

## Build identity

Complete this before installing the APK.

| Field | Recorded value |
| --- | --- |
| EAS build ID | |
| Build URL | |
| Git commit | |
| APK SHA-256 | |
| Build completion time | |
| Tester | |
| Test date | |

The APK must be built after all intended Gates 1–5 changes. When those gates are ready, create
exactly one candidate with:

```powershell
cd "C:\zemen academy final"
npx.cmd eas-cli build --platform android --profile preview --non-interactive
```

Do not run that command merely to preview UI. A new candidate is required after any P0/P1 fix.

## Required device matrix

| Device ID | Form factor | Model | Android | RAM class | Width | Installation | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PHONE-LOW | Phone | | | Low/mid | About 360 dp | Clean install | NOT RUN |
| PHONE-CURRENT | Phone | | | Current | | Upgrade or clean | NOT RUN |
| TABLET | Tablet | | | Any supported | | Clean install | NOT RUN |

At least one phone must represent the smallest or slowest supported real device. If the current
phone also satisfies PHONE-LOW, record that explicitly instead of inventing a second result.

## Controlled test data

Use dedicated test accounts. Never publish a real student's personal or payment information in
the evidence.

| Role | Account alias | Prepared state |
| --- | --- | --- |
| FREE-A | | Free; Grade 9 |
| FREE-B | | Different account; no inherited local data |
| PREMIUM-NEW | | Pending request that can be approved once |
| PREMIUM-ACTIVE | | Active with known start and expiry dates |
| PREMIUM-EXPIRED | | Expired; has free and Premium downloads prepared |
| ADMIN | | Can approve Premium, release devices, and publish test announcements |

Prepare one reviewed Mathematics unit containing a fraction, radical, indexed root, exponent,
subscript, repeating decimal, interval, scientific notation, and long explanation. Also prepare
one Physics or Chemistry unit, one free note, one Premium note, and one grade-targeted
announcement. Record their IDs in the evidence table.

## Evidence rules

- PASS requires the actual observed result plus a screenshot, short recording, or timestamped
  tester note. A screenshot alone is not enough for timing, offline, restart, or synchronization.
- FAIL requires a defect ID and severity.
- BLOCKED requires the exact missing prerequisite; it is not a pass.
- Retest a fixed P0/P1 item against a newly signed candidate and retain both results.
- Redact email addresses, phone numbers, tokens, bank details, and notification tokens.

Severity:

- **P0:** crash, data/account leak, authentication bypass, wrong Premium entitlement, destructive
  data loss, or an unusable primary flow.
- **P1:** freeze, broken timer/submission, unusable equations, offline download failure, wrong
  grade/account data, device-release failure, broken payment status, or notification deep link
  reaching the wrong content.
- **P2:** important visual, copy, accessibility, or recoverable interaction defect.
- **P3:** cosmetic issue with no meaningful task impact.

## Signed-device execution

Record PASS, FAIL, or BLOCKED for every row.

| ID | Required action and expected result | Device/account | Status | Evidence or defect |
| --- | --- | --- | --- | --- |
| D01 | Clean-install the signed APK; launch succeeds without Expo Go or a native-module error. | PHONE-LOW | NOT RUN | |
| D02 | Upgrade the previous test version; account and valid local state remain usable. | PHONE-CURRENT | NOT RUN | |
| D03 | Launch, onboarding, sign-up, sign-in, sign-out, and guest profile actions show safe, useful errors and no backend internals. | PHONE-LOW | NOT RUN | |
| D04 | Cached Home, Quizzes, Downloads, Notes, Progress, and Profile tabs respond without a visible multi-second freeze. | PHONE-LOW | NOT RUN | |
| D05 | Timer decreases continuously, survives normal rerenders, formats long durations clearly, and auto-submits exactly once at zero. | PHONE-LOW | NOT RUN | |
| D06 | Back from a live quiz asks for confirmation; cancel preserves the attempt and confirmed exit ends it once. | PHONE-LOW | NOT RUN | |
| D07 | Instant mode shows the answer and explanation, scrolls it into view when needed, and permits reviewing previous answered questions. | PHONE-LOW | NOT RUN | |
| D08 | Exam and Instant modes permit early submission through a clear confirmation flow. | PHONE-LOW | NOT RUN | |
| D09 | Fraction, radical, indexed root, exponent, subscript, repeating decimal, interval, scientific notation, four options, and long explanation render without raw commands, boxes, red errors, or clipping. | PHONE-LOW | NOT RUN | Content ID: |
| D10 | A curriculum reviewer approves the tested question, answer, explanation, and note manifest. | REVIEWER | NOT RUN | Manifest: |
| D11 | Download one free quiz, Premium quiz, free note, and Premium note; each reaches a clear completed state. | PREMIUM-ACTIVE | NOT RUN | Content IDs: |
| D12 | Force-close, enable airplane mode, reopen, complete a downloaded Instant quiz, and open both downloaded notes. | PREMIUM-ACTIVE | NOT RUN | |
| D13 | Online-only content while offline shows a useful connection state and never freezes indefinitely. | PREMIUM-ACTIVE | NOT RUN | |
| D14 | Reconnect; queued progress and question reports synchronize once without duplication. | PREMIUM-ACTIVE | NOT RUN | |
| D15 | Grade 9 downloads disappear in Grade 10 and reappear after returning to Grade 9. | FREE-A | NOT RUN | |
| D16 | Grade 11 Natural/Social content remains isolated when the stream changes. | FREE-A | NOT RUN | |
| D17 | Sign-out immediately clears account learning data; FREE-B inherits no downloads, attempts, progress, or reports. | FREE-A/FREE-B | NOT RUN | |
| D18 | Admin device release is recognized after refresh/sign-in retry; access resumes only in an allowed slot and released-device local learning data is purged. | FREE-A/ADMIN | NOT RUN | |
| D19 | Premium approval creates the correct entitlement, one in-app notification, and one celebration—not again on later launches. | PREMIUM-NEW | NOT RUN | |
| D20 | Active Premium shows plan, start date, and expiry date and does not offer a duplicate subscription flow. | PREMIUM-ACTIVE | NOT RUN | |
| D21 | Renewal extends the correct entitlement and does not duplicate the request or celebration. | PREMIUM-ACTIVE | NOT RUN | |
| D22 | Confirmed expiry removes Premium-only downloads while retaining free Unit 1 content. | PREMIUM-EXPIRED | NOT RUN | |
| D23 | Temporary verification/network failure blocks paid access safely but does not delete unexpired downloads prematurely. | PREMIUM-ACTIVE | NOT RUN | |
| D24 | With notification permission denied, in-app announcements refresh and open normally. | FREE-A | NOT RUN | |
| D25 | Grade-specific announcement is visible only to the target grade and its action opens the exact quiz. | FREE-A | NOT RUN | Announcement/content IDs: |
| D26 | General, welcome, note, and Premium announcements open a readable detail view and correct destination. | FREE-A/PREMIUM-ACTIVE | NOT RUN | |
| D27 | With permission granted and app backgrounded, push taps open the correct detail/content screen once. | PHONE-CURRENT | NOT RUN | |
| D28 | Downloads empty states for quizzes and notes explain that nothing is saved and do not navigate backward unexpectedly. | FREE-A | NOT RUN | |
| D29 | Status/navigation bars, keyboard, dialogs, dark/light mode, large text, and back animations do not obscure primary content. | PHONE-LOW/TABLET | NOT RUN | |
| D30 | TalkBack announces controls and state meaningfully; primary flows remain operable without relying only on color. | PHONE-CURRENT | NOT RUN | |

## Performance evidence

Measure release behavior, not Expo development behavior. Record at least three repetitions and
use the median.

| Metric | PHONE-LOW median | PHONE-CURRENT median | TABLET median | Result/notes |
| --- | --- | --- | --- | --- |
| Cold launch to usable Home | | | | |
| Cached tab change | | | | |
| Quiz open from cached catalog | | | | |
| Next-question transition | | | | |
| Long note scrolling | | | | |
| Pull-to-refresh completion | | | | |

Network operations may exceed local-navigation targets, but they must immediately show progress,
finish within their bounded timeout, and offer retry. A spinner that never resolves is a failure.

## Gate decision

| Decision item | Result |
| --- | --- |
| All D01–D30 have evidence | NO |
| Curriculum manifest approved | NO |
| Open P0 defects | UNKNOWN |
| Open P1 defects | UNKNOWN |
| Gate 4D decision | NOT STARTED |

Gate 4D passes only when all required rows pass, the manifest is approved, and no P0/P1 defect
remains. After that, record the decision in `GATE4_ACCEPTANCE.md` and proceed to the production
AAB gate without changing application code between the accepted APK and AAB.
