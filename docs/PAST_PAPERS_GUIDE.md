# Ethiopian entrance-exam question banks

Entrance papers are interactive multiple-choice banks. They use the same Instant mode, Exam mode, one-minute-per-question timer, explanations, results, reporting, progress sync, and optional offline download as normal quizzes.

## One-time installation

1. Add the latest `Setup.gs`, `Code.gs`, `QuestionImporterServer.gs`, `PastPaperImporter.gs`, and `NotesImporter.gs` to the existing Apps Script project.
2. Run `setupZemenAcademy` once.
3. Deploy a new Web App version using the existing URL.
4. Reload the master spreadsheet. Confirm the `Zemen Past Papers` menu and the `PastPaperQuestions` sheet exist.

## Access rules

- Grade 9 and Grade 10 students see Natural, Social, and shared entrance papers.
- Grade 11 and Grade 12 students see papers for their selected Natural or Social stream.
- Leave `stream` blank for a paper shared by both streams, such as English or Mathematics.
- Access level is controlled separately by `accessTier`: `free` or `premium`.

One paper is imported once. Do not create four grade copies.

## CSV columns

Use exactly this order:

```text
stream,subjectName,externalId,year,paperTitle,topic,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,difficulty,sourceReference,accessTier
```

- `stream`: `Natural`, `Social`, or blank for shared.
- `subjectName`: a clear stable name, such as `Physics`, `History`, or `English`.
- `externalId`: globally unique and permanent, for example `ENT-2018-NAT-PHY-001`.
- `year`: the four-digit Ethiopian entrance-exam year shown to students.
- `paperTitle`: identical on every row in one file.
- `correctAnswer`: `A`, `B`, `C`, or `D`.
- `difficulty`: `easy`, `medium`, or `hard`.
- `accessTier`: `free` or `premium`.

Every row in one CSV must have the same `stream`, `subjectName`, `year`, and `paperTitle`. Questions, four choices, and explanations are required. Duplicate IDs, duplicate question text, repeated choices, and malformed answers block the complete import.

## Safe mathematics

Write KaTeX inside dollar delimiters:

- Fraction: `$\frac{3}{4}$`
- Radical: `$\sqrt{x+1}$`
- Power: `$x^{2}$`
- Subscript: `$a_{1}$`
- Repeating decimal: `$0.\overline{36}$`

The generated blank sheet formats every content cell as Text. If a CSV was opened before import and Google Sheets converted `3/11` to a date, the importer recovers date-valued cells as `3/11`; KaTeX remains the recommended format.

## Daily publishing flow

1. Import the UTF-8 CSV into a new Google Sheets tab, or choose **Zemen Past Papers → Create blank entrance-exam import sheet** and paste the rows.
2. Keep the imported tab selected.
3. Choose **Import active entrance-exam sheet as Draft**.
4. Read the validation summary. The draft remains private.
5. Review the staged rows in `PastPaperQuestions` where `status` is `draft`.
6. Return to the same imported tab and choose **Publish active imported entrance exam**.

Publishing promotes the staged questions, replaces the previous active version of the same year/stream/subject paper, increments its version, refreshes the catalog, and leaves unrelated papers untouched.

## Student flow

1. Choose year.
2. Choose subject.
3. Open the entrance paper.
4. Optionally download it for offline use.
5. Choose Instant mode or Exam mode.

Instant mode reveals the correction and explanation after each choice. Exam mode reveals them in the final review.
