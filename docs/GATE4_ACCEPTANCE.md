# Gate 4 acceptance — content, offline, Premium, and notifications

Updated: 16 August 2026

## Gate 4 decision

**CONTENT AND OWNER DEVICE CHECKS PASS — FINAL SIGNED-CANDIDATE REPEAT PENDING**

The app-side Gate 4 matrix passes and all six production profiles now contain published content.
Grade 11 Social and Grade 12 Social each expose an active subject, two units, and 300 published
questions. The owner also confirmed mathematics on a 360 dp phone, downloaded quiz/note behavior
in airplane mode, Premium activation, and announcements. Those checks are repeated once on the
single signed Gate 6 candidate before release.

## Gate 4D execution status

**AUTOMATED AND OWNER CHECKS PASS — SIGNED CANDIDATE REPEAT PENDING**

The local workspace currently contains Expo Go only; it does not contain a signed Zemen
Academy release-candidate APK. Android Debug Bridge is also not installed on this computer,
and the read-only EAS build-history lookup did not return within the bounded check window.
No EAS build was started and no build credit was consumed.

Use [`GATE4D_SIGNED_DEVICE_RUN.md`](./GATE4D_SIGNED_DEVICE_RUN.md) for the physical run. Gate
4D must not be marked passed from Expo Go, an unsigned export, screenshots alone, or automated
tests alone.

## Automated acceptance completed

- Offline quiz questions and complete note bodies survive state serialization and app restart.
- Download lists are isolated by grade and, for Grades 11–12, by stream.
- A different signed-in account cannot inherit the previous account's downloads, attempts, or reports.
- Logout removes downloaded quizzes, notes, papers, local attempts, reports, and account note caches.
- A remotely released installation removes its downloaded learning data and Premium offline lease.
- Confirmed Premium expiry removes Premium-only downloads while retaining free units and notes.
- A temporary offline-verification lapse blocks Premium without deleting downloads before expiry.
- Fractions, radicals, indexed roots, powers, subscripts, superscripts, repeating decimals, units,
  and malformed legacy notation render through bundled offline KaTeX with a readable fallback.
- Announcement refresh, retry timing, read state, quiz destinations, personal welcome messages,
  and notification-event parsing are covered by tests.
- Notification denial returns an actionable state and does not prevent in-app announcements.
- Premium activation, expiry, renewal projection, offline lease, and one-time celebration are covered.

The reusable production audit `npm run audit:content` now checks all six grade/stream profiles,
subject/unit relationships, duplicate IDs, access tiers, advertised question counts, four complete
and distinct choices, correct-answer indexes, explanations, and spreadsheet date-conversion
artifacts in one live free unit per populated profile. Its 16 August 2026 result was:

| Profile | Subjects | Units | Published questions | Live questions sampled | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Grade 9 | 4 | 27 | 3,240 | 150 | PASS |
| Grade 10 | 4 | 18 | 1,870 | 100 | PASS |
| Grade 11 Natural | 3 | 19 | 2,170 | 100 | PASS |
| Grade 11 Social | 1 | 2 | 300 | 150 | PASS |
| Grade 12 Natural | 3 | 16 | 2,070 | 100 | PASS |
| Grade 12 Social | 1 | 2 | 300 | 150 | PASS |

The six profiles contain 16 subjects, 84 units, and 9,950 published questions. All 750 sampled
question records passed the structural checks. Catalog responses were 1.6–9.2 seconds during the
final audit; the client retains a bounded 30-second timeout for cold Apps Script reads and keeps a
visible loading state. This structural audit does not replace curriculum review or the final
signed-device repeat.

## Physical-device acceptance still required

Run these checks on the signed Gate 6 APK. Record device model, Android version, account, date,
and pass/fail evidence for every section in the Gate 4D signed-device runbook.

### 1. Content and mathematics

1. Open one reviewed Mathematics unit and one Physics or Chemistry unit on a 360 dp phone.
2. Inspect a fraction, radical, indexed root, exponent, subscript, repeating decimal, interval,
   scientific-notation expression, and a long explanation.
3. Confirm all four options remain visible by normal scrolling and no raw LaTeX command,
   red renderer error, rectangle glyph, or clipped equation appears.
4. A curriculum reviewer signs off the question, answer, explanation, and note manifest.

### 2. Offline quiz and note restart

1. Sign in, download one free quiz, one Premium quiz, one free note, and one Premium note.
2. Force-close the app, enable airplane mode, and reopen it.
3. Complete the downloaded quiz in Instant mode and open both downloaded notes.
4. Confirm online-only content shows a useful connection message instead of freezing.
5. Reconnect and verify queued progress and question reports synchronize once.

### 3. Grade, account, and device isolation

1. Download Grade 9 content, change to Grade 10, and confirm it is not shown there.
2. Return to Grade 9 and confirm the download reappears.
3. Sign out and confirm Downloads is empty before another account signs in.
4. Sign in with a different account and confirm no prior download or attempt appears.
5. Release this installation from the administrator workflow, bring the app online, and confirm
   the device-access screen appears and local downloads are purged.

### 4. Premium lifecycle

1. Test free, newly approved, renewed, expired, and already-active Premium accounts.
2. Confirm approval produces one notification and one celebration, never on every launch.
3. Confirm active Premium shows start/expiry information without offering another subscription.
4. Confirm expiry removes paid downloads but retains free Unit 1 content.
5. Confirm a temporary verification requirement does not prematurely delete paid downloads.

### 5. Announcements and notifications

1. Deny notification permission and confirm announcements still refresh and open in-app.
2. Publish a grade-specific quiz announcement and confirm only the intended grade receives it.
3. Tap the announcement and confirm its details open, then its action opens the exact quiz.
4. Test welcome, notes, Premium, and general announcements.
5. Grant permission, background the app, and confirm announcement and Premium push taps reach
   the correct detailed screen.

## Gate exit rule

Gate 4 can be marked complete only after the reviewer manifest and every physical-device section
above passes without a P0 or P1 defect. Automated checks alone do not approve curriculum content.
