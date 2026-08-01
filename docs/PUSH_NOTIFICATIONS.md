# Remote push notifications

Zemen Academy uses Expo Push Service to deliver announcement notifications while the app is
backgrounded or closed. The existing in-app announcement center and automatic polling remain
the fallback when remote push is unavailable.

## Data flow and privacy

The private master spreadsheet stores an Expo push token, internal user ID, platform, status,
and delivery timestamps for each registered installation. A push request sends only the Expo
token, announcement title, body, ID, and delivery options to Expo Push Service, which forwards
the message through FCM or APNs. It never includes a student's name, email, password, quiz
answers, or scores.

Tokens are registered only for authenticated, non-guest users with notification permission.
The backend derives grade and stream from the authenticated `Users` row rather than trusting
client-supplied audience data. Logout disables the current installation's token. Immediate
`DeviceNotRegistered` errors mark stale tokens invalid.

## 1. Apps Script installation

1. Add `PushNotifications.gs` to the existing Apps Script project.
2. Replace `Code.gs`, `Setup.gs`, and `QuestionImporterServer.gs` with their current versions.
3. Save the project.
4. Run `installPushNotifications()` once from the Apps Script editor.
5. Approve spreadsheet, trigger, and external-request permissions.
6. Confirm the `DeviceTokens` and `PushQueue` sheets were created.
7. Confirm a `processPushQueue` time-driven trigger runs every minute.
8. Update the existing web-app deployment to a new version.

Do not put Firebase service-account JSON, an Expo access token, or other credentials in a
spreadsheet cell or the source repository. If Expo push security is enabled, store its access
token as the Apps Script property `EXPO_ACCESS_TOKEN`.

## 2. Expo and Android configuration

Remote push requires an Expo project ID and Android FCM V1 credentials. From the project folder:

```powershell
npx.cmd eas-cli login
npx.cmd eas-cli init
npx.cmd eas-cli credentials --platform android
```

`eas init` writes the project ID under `expo.extra.eas.projectId`. Keep that generated value in
the app configuration. Configure the Android FCM V1 service-account credential through EAS; do
not commit the downloaded JSON key.

Create a development APK for testing:

```powershell
npx.cmd eas-cli build --profile development --platform android
```

Install that build on a physical Android device. Expo Go cannot register or receive Android
remote push notifications on SDK 53 and later.

## 3. End-to-end test

1. Sign in with a test student and finish profile setup.
2. Allow notifications when Android asks.
3. Open **Profile -> Settings -> Notifications** and confirm it says Allowed.
4. Confirm an active row appears in `DeviceTokens`.
5. Publish a new unit for the student's grade, or add a new active announcement with a unique ID.
6. Wait up to one minute for `processPushQueue`, or run it manually from **Zemen Content**.
7. Confirm `PushQueue.status` becomes `sent` and `DeviceTokens.lastSuccessAt` is populated.
8. Repeat with the app backgrounded, then fully closed.

Draft question imports never push. Grade-specific announcements target only matching active
users. Grade 11 and 12 stream-specific announcements also require the matching stream. Blank
grade and stream fields target every registered active student.

## Failure behavior

The queue processes at most three announcements per run and sends token batches of at most 100.
Transient failures retry up to five times with increasing delays. Publishing is never blocked
by Expo or FCM downtime. Students can still see the announcement through automatic polling and
the in-app notification center.
