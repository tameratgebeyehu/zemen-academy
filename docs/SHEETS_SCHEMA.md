# Google Sheets schema

Run `setupZemenAcademy()` from `backend/Setup.gs` to create and format every required tab. Do not combine tabs.

| Sheet | Purpose | Important rules |
| --- | --- | --- |
| Users | Account and profile data | Email must be unique. Never enter plain-text passwords. |
| Grades | Supported grade levels | Keep `status` as `active` for visible grades. |
| Subjects | Subjects by grade and stream | Leave `stream` empty for Grades 9–10; use `Natural` or `Social` for Grades 11–12. |
| ContentSources | Routes a subject to its own spreadsheet | Use one active row per subject. `spreadsheetId` is the ID between `/d/` and `/edit` in its Google Sheets URL. |
| Units | Flat unit list in a subject file, with master fallback | Version 1 uses integer unit numbers only; do not add sub-units such as 3.1. |
| Questions | Text-only multiple choice questions in a subject file, with master fallback | Fill options A–D, set `correctAnswer` to A/B/C/D, and always add an explanation. Optional `externalId`, `topic`, `sourceReference`, and `importId` columns support the private importer. |
| QuestionIndex | Fast unit-to-row lookup inside each subject file | Rebuild after manually adding, deleting, or moving question rows. |
| ImportHistory | Reserved audit trail for the private bulk uploader | Do not manually change completed import records. |
| PastPapers | In-app offline papers | Put text in `content`. `downloadUrl` is reserved for a later binary-paper implementation. |
| Announcements | Home updates and notification source | Use a stable unique `id`, optional `audienceGrade` and `audienceStream`, an ISO-8601 `publishedAt`, and `active` status. Updates can take up to 60 seconds to leave the API cache. |
| Versions | Android version policy | `minimumVersion` can later enforce a mandatory update. |
| Sessions | Hashed login sessions | App-managed. Do not edit manually. |
| PasswordResets | Hashed, expiring email verification codes | App-managed. Never enter or store readable reset codes. |
| Attempts | Synced student results | App-managed. Answers are stored as JSON; question content remains in the content sheets. |
| QuestionReports | Student-reported content problems | App-managed. Review `open` reports and change `status` to `reviewing`, `resolved`, or `dismissed`. |

All content rows should have stable IDs, an `active` status where applicable, and an ISO-8601 `updatedAt` value. Increase a unit or paper’s `version` when its downloadable content changes.

Before importing large question sets, validate that each row has exactly four non-empty options, one valid correct answer, and a useful explanation. The app deliberately does not support question images in Version 1.

See [QUIZ_CONTENT_GUIDE.md](QUIZ_CONTENT_GUIDE.md) for the complete authoring,
review, publishing, updating, and legacy-sample removal workflow. Blank CSV templates
for all three content tabs are in this `docs` folder.

See [MULTI_SPREADSHEET_CONTENT.md](MULTI_SPREADSHEET_CONTENT.md) for the subject-file
registry, provisioning, routing, indexing, fallback, and recovery workflow.

See [QUESTION_IMPORTER.md](QUESTION_IMPORTER.md) for the private CSV import and
controlled publishing workflow.

See [ANNOUNCEMENTS.md](ANNOUNCEMENTS.md) for announcement examples, audience targeting,
publishing, and student read-state behavior.
