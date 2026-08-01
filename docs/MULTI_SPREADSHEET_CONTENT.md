# Subject-level content spreadsheets

Zemen Academy keeps accounts and operational data in the original master spreadsheet,
while quiz content can be split into one Google spreadsheet per grade and subject.

Example files:

```text
Zemen Academy - Grade 9 - Physics
Zemen Academy - Grade 9 - Chemistry
Zemen Academy - Grade 10 - Physics
Zemen Academy - Grade 11 - Natural - Physics
```

This architecture is backward compatible. A subject without an active `ContentSources`
row continues to read its `Units` and `Questions` from the master spreadsheet.

## Master spreadsheet

Keep these tabs in the master file:

- `Users`
- `Grades`
- `Subjects`
- `ContentSources`
- `PastPapers`
- `Announcements`
- `Versions`
- `Sessions`
- `Attempts`

The legacy master `Units` and `Questions` tabs remain as a fallback and migration
backup. Do not delete their existing rows immediately after provisioning a subject.

`ContentSources` routes each subject to its content spreadsheet:

| subjectId | spreadsheetId | spreadsheetName | status | updatedAt |
| --- | --- | --- | --- | --- |
| `g9-physics` | Google spreadsheet ID | Human-readable file name | `active` | ISO timestamp |

Only one source should be active for a subject.

## Subject spreadsheet

Each provisioned subject file contains:

- `Units`
- `Questions`
- `QuestionIndex`
- `ImportHistory`

`QuestionIndex` stores the exact row blocks for each unit. The API uses these blocks
to avoid scanning every question in the subject file. If the index is missing or
stale, the API safely falls back to filtering that subject's `Questions` tab.

## Upgrade the existing backend

1. Back up the master spreadsheet.
2. Replace the Apps Script `Code.gs` and `Setup.gs` with the repository versions.
3. Open the master spreadsheet and run `setupZemenAcademy()` once.
4. Reload the spreadsheet. A **Zemen Content** menu will appear.
5. Update the existing Apps Script web-app deployment so the `/exec` URL stays the same.

Running setup again preserves existing rows. It creates and formats the new
`ContentSources` tab.

## Provision a subject file

1. Make sure the subject has a stable ID in the master `Subjects` tab.
2. Select any cell in that subject's row.
3. Choose **Zemen Content -> Provision selected subject file**.
4. Approve the additional spreadsheet permission if Google asks.
5. Open the URL displayed after provisioning.

The command creates the subject file, copies matching master units and questions,
builds its question index, and registers the file in `ContentSources`. Existing
master content is not deleted.

Running the command again for an already registered subject returns the existing
content file instead of creating a duplicate.

## Manual content changes during phase 1

Until the private uploader is built:

1. Add or update unit rows in the subject file's `Units` tab.
2. Add question rows in its `Questions` tab.
3. Keep `unitId` values identical between both tabs.
4. Set `questionCount` to the number of active questions.
5. Increase the unit `version` when published questions change.
6. From the master file, run **Zemen Content -> Rebuild all question indexes**.
7. Wait up to five minutes for catalog cache expiry, or rebuild the indexes to clear it immediately.

The mobile app now sends both `unitId` and `subjectId`, allowing the API to open the
correct subject file directly. Older app builds still work through the slower fallback
resolver.

## Private bulk importer

The master spreadsheet includes **Zemen Content -> Open content manager**. The
importer can provision an unprepared subject, create units, validate UTF-8 CSV files,
import rows as Draft in batches, record the operation in `ImportHistory`, and publish
only after a separate confirmation.

See [QUESTION_IMPORTER.md](QUESTION_IMPORTER.md) for installation, CSV columns,
validation, publishing, and recovery behavior.

## Recovery

To temporarily return a subject to the master spreadsheet, change its
`ContentSources.status` from `active` to `disabled`, then run
**Rebuild all question indexes**. The API will use the master `Units` and `Questions`
tabs for that subject again.
