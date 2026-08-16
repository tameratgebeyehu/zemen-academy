# Gate 3 — Version 1 scope acceptance

Updated: 16 August 2026

## Decision

**PASS — VERSION 1 FEATURE SURFACE LOCKED**

Version 1 ships the complete English quiz, notes, downloads, progress, timetable,
announcement, account, and entitlement-recognition experience. Past Papers and Amharic UI remain
in the long-term codebase but have no Version 1 entry point.

## Verified scope

| ID | Requirement | Result |
| --- | --- | --- |
| S01 | `V1_PAST_PAPERS_ENABLED` is `false` | PASS |
| S02 | `V1_AMHARIC_UI_ENABLED` is `false` | PASS |
| S03 | Supported Version 1 language list is English only | PASS |
| S04 | Home has no Past Papers shortcut | PASS |
| S05 | Search returns no Past Papers result while disabled | PASS |
| S06 | Downloads exposes Quizzes and Notes only | PASS |
| S07 | Past Papers navigation screens are not registered while disabled | PASS |
| S08 | Past-paper announcement action becomes informational instead of opening a missing page | PASS |
| S09 | Premium benefits mention entrance exams only when the future flag is enabled | PASS |
| S10 | Setup/Profile expose no Amharic selector | PASS |
| S11 | Persisted Amharic preference is migrated safely to English | PASS |
| S12 | No `REPLACE_WITH_...`, demo coursework, or unfinished direct-payment build profile is exposed | PASS |

Fresh verification: the Gate 3 suites passed 3/3 suites and 7/7 tests. The release audit passed
25/25 checks.

## Deferred to Version 2

- Publishing and surfacing Ethiopian entrance-exam Past Papers.
- Past-paper download/offline acceptance and distribution-rights review.
- Complete Amharic translation and small-screen Amharic typography QA.
- Any new feature that is not required to repair a Version 1 P0/P1 defect.

The importer/editor code may remain for controlled content preparation, but changing either
release flag reopens this gate and requires full navigation, policy, content, and signed-device
acceptance.

## Exit rule

Gate 3 remains passed only while every visible Version 1 control has a complete destination plus
loading, empty, offline, and safe-error behavior. Do not add new Version 1 features after this
decision; move them to the Version 2 backlog.
