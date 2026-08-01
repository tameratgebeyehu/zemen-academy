# Private CSV question importer

The importer is a private Apps Script dialog/sidebar inside the master Google Sheet.
It is not served through the public student API and requires edit access to the
master file.

## Install the importer

1. Open the existing Apps Script project attached to the master spreadsheet.
2. Replace `Code.gs` and `Setup.gs` with the repository versions.
3. Add a new **Script** file named `QuestionImporterServer` and paste
   `backend/QuestionImporterServer.gs`.
4. Add a new **HTML** file named `QuestionImporterPage` and paste
   `backend/QuestionImporterPage.html`.
5. Save the project.
6. Run `setupZemenAcademy()` once from the master spreadsheet.
7. Reload the master spreadsheet.

The **Zemen Content** menu now includes:

- **Open content manager (large)** for the recommended responsive dialog;
- **Open content manager (sidebar)** for the compact sidebar.

Apps Script requires every project file to have a unique base name, even when the
file types are different. Do not name both files `QuestionImporter`. The server
loads the page with `createHtmlOutputFromFile('QuestionImporterPage')`, so the HTML
file must use that exact name.

If you already created an older `QuestionImporter` file, copy its correct contents
into the matching uniquely named file above. The old file may remain temporarily,
but only `QuestionImporterServer` and `QuestionImporterPage` are used by this
version.

The importer can prepare an unprovisioned subject itself. The older
**Provision selected subject file** spreadsheet-menu command remains available as an
administrative alternative.

## CSV columns

Required:

```text
question,optionA,optionB,optionC,optionD,correctAnswer,explanation
```

Optional:

```text
grade,stream,subjectName,externalId,unitNumber,unitTitle,topic,difficulty,sourceReference
```

The importer accepts common header variations such as `Question ID`, `Prompt`,
`Correct Answer`, and `Source Reference`. Extra columns are ignored.

Use `unitNumber` and `unitTitle` in every generated CSV. They allow the importer to
match an existing unit or create a missing unit automatically. Every row in one CSV
must use the same unit number and title. A file without these columns can still be
used when an existing unit is selected manually.

Use `grade`, `stream`, and `subjectName` in new CSV files so the recommended native
sheet importer can resolve or create the subject without asking questions. For
Grades 9–10, leave `stream` blank. A legacy CSV without these three columns remains
supported through native Grade and Subject prompts.

## Recommended native Google Sheets workflow

This is the reliable production workflow and does not use HTML dropdowns or an HTML
file picker:

1. In the master spreadsheet, choose **File -> Import -> Upload**.
2. Upload the CSV and choose **Insert new sheet(s)**.
3. Select the newly imported CSV tab.
4. Choose **Zemen Content -> CSV import (recommended) -> Import active CSV sheet as Draft**.
5. Confirm the validation summary and destination. Legacy files without Grade and
   Subject columns ask for them through native Google Sheets prompts.
6. Wait for **Draft import completed**. This message is shown only after question
   rows were actually written.
7. Review the subject content file.
8. Return to the same CSV tab and choose **Publish active imported unit**.

The menu can also create a formatted blank import sheet with validation lists. The
HTML Content Manager remains available as an optional convenience interface, not as
the primary bulk-ingestion path.

Use `A`, `B`, `C`, or `D` for `correctAnswer`. Difficulty defaults to `medium` and,
when provided, must be `easy`, `medium`, or `hard`.

Use `$...$` for inline LaTeX and `$$...$$` for displayed LaTeX. The importer rejects
unmatched dollar-sign delimiters before writing any rows.

## Optional HTML Content Manager workflow

1. Open **Zemen Content -> Open content manager (large)**. Use the sidebar option
   only when you prefer a narrow layout.
2. Select the destination subject. Use **Add another subject** if it does not exist.
3. Choose a UTF-8 `.csv` file containing no more than 5,000 rows. The manager shows
   the detected question count, unit, and A-D answer distribution.
4. Leave **Existing unit** blank when the CSV contains `unitNumber` and `unitTitle`.
   The manager prepares the subject content file and matches or creates the unit.
5. Select **Import as Draft**.
6. If any row is invalid, nothing is imported and an automatically created unit is
   rolled back. Correct the reported CSV rows and retry.
7. Review the new Draft rows in the subject content spreadsheet.
8. Return to the content manager, select the unit, and choose
   **Publish selected unit**.

Publishing validates the stored rows again, changes valid Draft questions to `active`,
updates the unit's active question count, increases its version when content changed,
rebuilds `QuestionIndex`, and clears the catalog cache.

## Validation and safety

Every import checks:

- required fields;
- exactly four non-empty, distinct options;
- a valid A-D answer;
- non-empty explanation;
- supported difficulty;
- unique external IDs;
- duplicate question text within the unit;
- balanced LaTeX delimiters;
- cell-length limits;
- maximum batch size.

The complete file is validated before any question is written. Writes happen in
500-row batches. If a write fails partway through, rows created by that import are
removed and the question index is rebuilt.

Every accepted, rejected, failed, and published batch is recorded in the subject
file's `ImportHistory` tab.

## Troubleshooting controls

- If a unit appears unusable, check its row in the subject file's `Units` tab.
  Every visible unit requires a non-empty, unique `id`, the matching `subjectId`,
  and a `status` of `active` or `draft`.
- Import requires a subject and CSV file. An existing unit selection is optional
  when `unitNumber` and `unitTitle` are present.
- Publish reports a missing subject or unit instead of silently ignoring the click.
- If the spreadsheet is narrow or displayed beside another window, use the large
  importer dialog. The sidebar remains available as an optional compact view.

## Current scope

The content manager can create subjects in the master `Subjects` tab, prepare their
separate content files, match or create units from CSV metadata, import Draft
questions, and publish reviewed units. The subject files are storage partitions for
scale; the Android app still presents one unified catalog. Equation rendering in the
Android app remains a separate implementation phase.
