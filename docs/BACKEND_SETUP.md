# Apps Script and Google Sheets setup

## 1. Create the database spreadsheet

1. Create a new Google Sheet owned by the project account.
2. Open **Extensions → Apps Script**.
3. Add the files from `backend/Code.gs` and `backend/Setup.gs`.
4. Enable the manifest in Project Settings and replace it with `backend/appsscript.json` if you manage the project with `clasp`.
5. Select `setupZemenAcademy` and run it once. Approve the spreadsheet permission.
6. Add reviewed production content using the workflow in `QUIZ_CONTENT_GUIDE.md`.

The setup function creates separate Users, Grades, Subjects, ContentSources, Units,
Questions, PastPapers, Announcements, Versions, Sessions, PasswordResets, Attempts, and QuestionReports tabs. It also
creates a private server pepper in Apps Script Properties. Do not copy that property
into the mobile app or the spreadsheet.

`PASSWORD_PEPPER` belongs to the Apps Script project, not the spreadsheet. If the
backend is moved to a different Apps Script project, copy this property securely from
the original project's **Project Settings -> Script properties** before running setup.
Changing or losing it makes existing password hashes unverifiable. Setup intentionally
refuses to generate a replacement when user rows already exist.

Quiz content can be routed to one spreadsheet per grade and subject. Follow
[MULTI_SPREADSHEET_CONTENT.md](MULTI_SPREADSHEET_CONTENT.md) after completing the
master setup.

## 2. Deploy the API

1. Choose **Deploy → New deployment → Web app**.
2. Set **Execute as** to the account that owns the Sheet.
3. Set access to **Anyone**. Authentication is enforced inside the API for protected actions.
4. Deploy and copy the URL ending in `/exec`.
5. Put that URL in the app’s `.env` as `EXPO_PUBLIC_APPS_SCRIPT_URL`.

Test the deployment in a browser:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health
```

The response should contain `"ok":true`.

## 3. Provision subject content files

After updating an existing backend, run `setupZemenAcademy()` again in the master
spreadsheet and reload it. Select a row in `Subjects`, then use:

**Zemen Content -> Provision selected subject file**

This creates the subject's `Units`, `Questions`, `QuestionIndex`, and `ImportHistory`
tabs in a separate spreadsheet and records the file in `ContentSources`. Existing
master rows are copied but retained as a fallback backup.

See [MULTI_SPREADSHEET_CONTENT.md](MULTI_SPREADSHEET_CONTENT.md) for migration,
index rebuilding, fallback, and recovery instructions.

Install and use the private CSV importer described in
[QUESTION_IMPORTER.md](QUESTION_IMPORTER.md). It can provision a selected subject
and create units directly. Its Apps Script files must have the unique names
`QuestionImporterServer` (Script) and `QuestionImporterPage` (HTML).

Password recovery uses the app-managed `PasswordResets` sheet and Apps Script `MailApp`.
Follow [PASSWORD_RESET.md](PASSWORD_RESET.md), including the one-time email authorization
step, before testing **Forgot password?**.

## 4. Publish content

- Add the subject in the master file, then add units and questions in its provisioned subject file.
- Add stable IDs; changing an ID creates a different downloadable item.
- Use only integer unit numbers in V1.
- Enter A, B, C, or D in `Questions.correctAnswer`.
- Every question needs exactly four text options and an explanation.
- Set content rows to `active` only after editorial review.
- Increase `Units.version` or `PastPapers.version` whenever downloadable content changes.
- Use ISO timestamps such as `2026-07-17T12:00:00.000Z`.
- Keep new rows as `draft` during review, then change them to `active` when ready to publish.

If an earlier setup added the legacy mathematics sample, update `Setup.gs` and run
`removeLegacySampleContent()` once. It removes only the exact legacy sample IDs.

For the exact columns, see [SHEETS_SCHEMA.md](SHEETS_SCHEMA.md).

## 5. Maintain the backend

- Redeploy the web app after Apps Script code changes. Existing deployment URLs can be retained by editing the deployment.
- Create a daily time-driven trigger for `cleanupExpiredSessions`.
- Protect the Users, Sessions, Attempts, and QuestionReports tabs from untrusted editors.
- Limit spreadsheet access to trusted administrators.
- Back up the master and affected subject spreadsheet before bulk imports.
- Monitor Apps Script executions and quota failures during launch.

For login diagnosis, reload the master spreadsheet and use **Zemen Content -> Diagnose
authentication**. It reports configuration and row problems without displaying
passwords, salts, hashes, or the pepper. If all old accounts fail after moving to a new
Apps Script project, restore the original `PASSWORD_PEPPER`; generating another value
cannot recover those hashes.

The subject router and `QuestionIndex` prevent quiz requests from scanning the full
cross-grade question bank. Keep units grouped where practical and rebuild indexes
after manual question changes.
