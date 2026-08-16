# Gate 1 — exam timer acceptance

Updated: 16 August 2026

## Scope

Gate 1 covers both Instant and Exam mode:

- one minute per question;
- a fixed monotonic deadline that cannot reset during rerenders;
- delayed frames catch up to the real elapsed runtime;
- the displayed countdown never gains time;
- expiry submits exactly once;
- unanswered items remain skipped;
- Results identifies time expiry; and
- long durations use clear clock and word formats.

## Automated evidence

| ID | Check | Expected result | Status |
| --- | --- | --- | --- |
| T01 | `quizDurationSeconds(150)` | 9,000 seconds | PASS |
| T02 | Clock formatting for 9,000 seconds | `2:30:00` and `2 hours 30 minutes` | PASS |
| T03 | Fixed-deadline boundary values | 60, 59, 1, then 0 without negative time | PASS |
| T04 | Runtime time source | Finite and monotonic | PASS |
| T05 | Score with unanswered item | Unanswered item is counted as skipped | PASS |
| T06 | Expiry finish guard | One recorded attempt and one Results navigation | CODE REVIEWED |
| T07 | Results expiry state | Time-expired banner and skipped count remain visible | CODE REVIEWED |

Fresh local verification on 16 August 2026: TypeScript passed, release audit passed 25/25,
targeted timer tests passed 5/5, and the complete Jest suite passed 41 suites/135 tests.

## Signed-device evidence

The owner verified the timer and navigation behavior in both Instant and Exam mode on
16 August 2026. Repeat the same matrix once on the single signed Gate 6 release-candidate APK;
that final repeat avoids consuming a separate EAS build now.

| ID | Physical action | Status | Evidence |
| --- | --- | --- | --- |
| P01 | Start a short Instant attempt; answer while the timer crosses minute and second boundaries. | OWNER PASS — FINAL APK REPEAT PENDING | Timer counted down normally. |
| P02 | Repeat in Exam mode and navigate between questions repeatedly. | OWNER PASS — FINAL APK REPEAT PENDING | Exam and Instant behavior passed. |
| P03 | Let an attempt expire; confirm automatic submission occurs once. | NOT RUN | |
| P04 | Confirm unanswered questions are skipped and Results states that time expired. | NOT RUN | |
| P05 | Open a 150-question quiz; confirm exactly `2:30:00` at the start. | OWNER PASS — FINAL APK REPEAT PENDING | Duration display verified. |
| P06 | Cause a delayed frame with a long question/scroll; confirm the timer catches up and never resets. | OWNER PASS — FINAL APK REPEAT PENDING | No reset observed. |

## Exit rule

Gate 1 passes only when T01–T07 and P01–P06 pass on the same signed release candidate without a
duplicate attempt, timer reset, gained time, freeze, or incorrect duration. Local automation can
mark Gate 1 ready for signed-device acceptance, but cannot close the physical portion.
