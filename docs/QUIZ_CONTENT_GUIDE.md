# Publishing real quizzes

Zemen Academy reads quiz content in this order:

`Subjects` → `Units` → `Questions`

`Subjects` remains in the master spreadsheet. `Units` and `Questions` should be kept
in the subject spreadsheet created through the **Zemen Content** menu. Subjects that
have not been provisioned continue to use the master tabs as a fallback.

Content changes happen in Google Sheets. You do not need to rebuild the Android app or
redeploy Apps Script when only sheet rows change. Rebuild question indexes after
manual content changes.

## 1. Create the subject

Open the `Subjects` tab and add one row.

| Column | Example | Rule |
| --- | --- | --- |
| id | `g12-natural-physics` | Permanent lowercase ID; never reuse it for another subject. |
| grade | `12` | One of 9, 10, 11, or 12. |
| stream | `Natural` | Blank for Grades 9–10; `Natural` or `Social` for Grades 11–12. |
| name | `Physics` | English display name. |
| nameAm | `ፊዚክስ` | Amharic display name. |
| icon | `atom` | Material Community Icons name. |
| order | `1` | Position in the subject list. |
| status | `active` | Use `draft` while reviewing and `active` to publish. |
| updatedAt | `2026-07-31T12:00:00.000Z` | ISO-8601 timestamp. |

## 2. Create the quiz unit

Open the provisioned subject file's `Units` tab and add one row. Its `subjectId` must
exactly match the master subject ID.

| Column | Example | Rule |
| --- | --- | --- |
| id | `g12-natural-physics-u1` | Permanent unique unit ID. |
| subjectId | `g12-natural-physics` | Exact parent subject ID. |
| number | `1` | Whole number only. Unit 1 is available to guests. |
| title | `Motion and Forces` | Student-facing English title. |
| titleAm | `እንቅስቃሴ እና ኃይል` | Student-facing Amharic title. |
| questionCount | `20` | Number of active questions belonging to this unit. |
| version | `1` | Increase whenever questions or explanations change. |
| status | `active` | Use `draft` until the unit is ready. |
| updatedAt | `2026-07-31T12:00:00.000Z` | ISO-8601 timestamp. |

## 3. Add the questions

Open the provisioned subject file's `Questions` tab. Add one row per question. Every
question requires four non-empty choices and an explanation.

For mathematics, put every formula inside `$...$` and use LaTeX commands. Write
fractions as `$\frac{3}{11}$`, radicals as `$\sqrt{5}$`, and powers as `$x^{2}$`.
Never use a bare fraction such as `3/11` in a spreadsheet cell because Excel or
Google Sheets may convert it into a calendar date. Question and option columns must
remain formatted as plain text.

| Column | Example |
| --- | --- |
| id | `g12-natural-physics-u1-q001` |
| unitId | `g12-natural-physics-u1` |
| question | `A body travels 60 m in 3 s. What is its average speed?` |
| optionA | `10 m/s` |
| optionB | `20 m/s` |
| optionC | `30 m/s` |
| optionD | `180 m/s` |
| correctAnswer | `B` |
| explanation | `Average speed = distance ÷ time = 60 ÷ 3 = 20 m/s.` |
| difficulty | `easy` |
| order | `1` |
| status | `active` |
| updatedAt | `2026-07-31T12:00:00.000Z` |

Use only `A`, `B`, `C`, or `D` for `correctAnswer`. Recommended difficulty values are
`easy`, `medium`, and `hard`. The current app stores difficulty for editorial use but
does not yet filter by it.

## 4. Review before publishing

For each unit:

1. Keep the subject, unit, and questions as `draft` while editing.
2. Check that IDs are unique and parent IDs match exactly.
3. Check spelling, curriculum alignment, and exactly four choices.
4. Make sure only one answer is correct.
5. Write an explanation that teaches why the answer is correct.
6. Set the unit `questionCount` to the number of active question rows.
7. Change the reviewed subject, unit, and question rows to `active`.
8. Set a fresh `updatedAt` timestamp.
9. Run **Zemen Content → Rebuild all question indexes** from the master spreadsheet.

## 5. See the quiz in the app

1. Open **Quizzes** in Zemen Academy.
2. Tap **Sync content**.
3. Open the subject and unit.
4. Start Instant Mode or Exam Mode directly to test online access.
5. Tap **Download for offline** and test the saved copy as well.

When changing questions that students may already have downloaded, increment the
unit's `version`. The app will then offer **Update content**.

## Removing the old Apps Script sample

The current `backend/Setup.gs` includes `removeLegacySampleContent()`. Copy the updated
file into Apps Script and run that function once. It removes only these legacy IDs:

- `g12-natural-mathematics`
- `g12-natural-mathematics-u1`
- `g12-natural-mathematics-u1-q1`
- `g12-natural-mathematics-u1-q2`

You can also delete those exact rows manually from `Questions`, then `Units`, then
`Subjects`. Existing offline copies remain on a student's device until the student
deletes that download or clears the development app's storage.

## Getting help from Codex

You can provide questions as a Word file, PDF, spreadsheet, or pasted text. Include
the grade, stream, subject, unit name, correct answers, and explanations when
available. Codex can normalize the content, flag ambiguous questions, create the
three import tables, and validate IDs and answer keys before you paste them into the
production Sheet.
