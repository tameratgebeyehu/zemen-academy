# Google Play Data safety — Version 1 declaration map

Use this document while completing **Play Console → App content → Data safety**. It describes the shipped Google Play build, not future features. Re-audit it whenever SDKs or data flows change.

## Top-level answers

- **Does the app collect or share required user data types?** Yes — signed-in use transmits account, device-security, learning-progress, notification, and question-report data off the device.
- **Is all collected data encrypted in transit?** Yes — the app uses HTTPS endpoints and Expo/Google notification transport.
- **Can users request deletion?** Yes.
- **Account-deletion URL:** `https://zemenacademy.com/account-deletion`
- **Data sold:** No.
- **Data used for third-party advertising:** No.
- **Data shared with third parties:** No, provided Google Workspace/Apps Script, Expo notification delivery, and email infrastructure remain service providers acting only on Zemen Academy's behalf. Revisit this answer before release if another SDK receives data for its own purposes.

## Data types to select

| Play data type | Collected | Required or optional | Purposes |
| --- | --- | --- | --- |
| Personal info → Name | Yes for accounts | Optional because guest use is available; required to create an account | App functionality; Account management |
| Personal info → Email address | Yes for accounts | Optional because guest use is available; required to create an account | App functionality; Account management |
| Personal info → Phone number | Optional | Optional | Account management; Fraud prevention, security and compliance |
| Personal info → User IDs | Yes for accounts | Optional because guest use is available | App functionality; Account management; Fraud prevention, security and compliance |
| App activity → App interactions | Yes for signed-in quiz attempts, progress sync, and study-plan completion | Optional because the student chooses whether to sign in and use synchronized learning | App functionality. Do not select Analytics, advertising, or marketing for the current build |
| User-generated content → Other user-generated content | Yes when a student submits a question report or optional report note | Optional | App functionality; Developer communications |
| Device or other IDs | Yes — installation identity and, when enabled, Expo push token | Installation identity is required for signed-in device security; push token is optional | App functionality; Fraud prevention, security and compliance; Developer communications for notifications |

## Do not select for the current Play build

- Financial information or purchase history: the submitted Android build does not show bank details, collect transfers, or submit payment requests. It only reads an existing Premium entitlement.
- Location, contacts, photos, videos, audio, files/documents, calendar, health, web browsing, SMS/call data, or advertising ID: the app does not request or transmit these.
- Crash logs, diagnostics, or performance telemetry: no analytics/crash-reporting SDK currently uploads them. Revisit this if Sentry, Firebase Analytics/Crashlytics, PostHog, or another telemetry SDK is added.

## Handling details

- Password plaintext is used only to authenticate over HTTPS. The server stores a salted, peppered hash—not the password.
- Raw session tokens are stored in Android SecureStore; the spreadsheet stores token hashes.
- Offline quizzes and notes remain on the device and are cleared on logout/account switch, remote device release, or confirmed loss of Premium access as applicable.
- Account deletion removes or anonymizes associated server-side account/profile, progress, push-token, and device-association data. Limited security, fraud-prevention, dispute, or content-report records may be retained only as described in the public policy.

## Before pressing Submit

1. Compare this list with the final AAB's SDKs and Android permissions.
2. Confirm all four public policy/support URLs pass `npm run audit:public`.
3. Confirm the in-app path **Profile → Account deletion** opens the official deletion resource.
4. Save the exported Play Data safety CSV with the release evidence, but do not commit reviewer credentials or student data.
