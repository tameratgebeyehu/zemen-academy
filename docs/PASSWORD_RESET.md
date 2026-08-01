# Password recovery

Zemen Academy resets forgotten passwords by sending a one-time six-digit code to the
student's registered email. The original password cannot be recovered because only its
salted, peppered hash is stored.

## Security behavior

- The request endpoint always returns the same response, whether the email exists or not.
- A code expires after 15 minutes and becomes invalid after one successful use.
- Only an HMAC of the code is stored in `PasswordResets`; the email contains the readable code.
- A reset row locks after five incorrect code attempts.
- Confirmation attempts and email requests are rate-limited.
- A successful reset creates a new password salt and hash and revokes every existing session.
- Requesting another code invalidates previous unused codes for that account.

## Backend activation

1. Add the current `Code.gs` and `Setup.gs` to the existing Apps Script project.
2. Run `installPasswordRecovery()` once. This lightweight installer creates only the
   `PasswordResets` sheet and does not scan questions or rebuild indexes.
3. Run `authorizePasswordResetEmail()` once from the Apps Script editor and approve the
   requested email permission. The same action is available after reloading the spreadsheet
   under **Zemen Content -> Authorize password recovery email**.
4. Update the existing web-app deployment to a new version.

Both setup functions should complete within seconds. Email authorization reports the
remaining quota in the execution log and returns immediately; it does not open a blocking
spreadsheet dialog. If the Apps Script function selector
shows `rebuildAllQuestionIndexes`, do not run it for password recovery; that separate
maintenance function can take a long time on a large content library. The execution log
for `installPasswordRecovery` includes three progress messages so a failure point is clear.

The email is sent by the Google account that owns and deploys the Apps Script web app.
Use the academy-owned account for deployment.

The recovery message includes a branded HTML layout and a plain-text fallback. Email apps
do not reliably permit clipboard JavaScript, so the code is presented in a large selectable
block for tap-and-hold copying. The mobile input also requests the operating system's
one-time-code autofill when it is available.

## Quota

Before sending, the backend checks `MailApp.getRemainingDailyQuota()`. Google currently
documents different daily recipient limits for consumer Gmail and Workspace accounts;
these quotas can change. Monitor Apps Script executions and remaining quota during launch.

## Student workflow

1. Tap **Forgot password?** on the sign-in screen.
2. Enter the registered email.
3. Enter the six-digit email code and a new password.
4. Return to sign-in and use the new password.

Do not manually place passwords or reset codes in the spreadsheet. Do not ask students to
send passwords to support. Production support should help students regain access to their
registered email rather than bypassing ownership verification.
