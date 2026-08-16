# Zemen Academy distribution and Premium access

## Non-negotiable release boundary

Zemen Academy now has one Android distribution policy: every Android build is a Google Play-compatible, consumption-only app. Premium enrollment and manual Ethiopian bank-transfer verification happen independently on the official website, `https://zemenacademy.com/premium`.

| EAS profile | Artifact | Channel | Premium behavior |
| --- | --- | --- | --- |
| `development` | Development client | `play` | Existing Premium entitlement only; no plan prices, bank details, or enrollment form. |
| `preview` | Internal test APK | `play` | Same payment boundary as production. |
| `production` | Google Play AAB | `play` | Existing Premium entitlement only; no plan prices, bank details, or enrollment form. |

`EXPO_PUBLIC_DISTRIBUTION_CHANNEL` is normalized to `play`. Missing, legacy, or unknown values fail closed. There is no payment-enabled APK profile and no remote switch that can reveal bank-transfer controls inside the Android app.

## Website activation flow

The official website uses this transparent manual verification flow:

1. The student opens the Premium page independently in a browser.
2. The student signs in with the same Zemen Academy email and password used by the app.
3. The student chooses Monthly, 90 Days, or Annual.
4. The student chooses an available Ethiopian bank and transfers the exact displayed amount.
5. The student enters only the sender/account-holder name and submits the request.
6. The backend records the authenticated account, selected plan, bank, amount, sender name, request code, and submission time.
7. An administrator matches the transfer and approves the spreadsheet request.
8. The app learns the server-side entitlement during its normal Premium refresh; notification and celebration behavior then run automatically.

The website form does not ask for a payment date, transaction reference, receipt, or additional note. The browser session token is stored in a secure HttpOnly cookie and does not consume a phone or tablet device slot.

## Google Play behavior

Premium educational content is digital in-app content. The Google Play app does not accept manual bank payments, show plan prices or bank details, submit payment requests, or link/direct students to another payment method. Its Premium screen only:

- shows an active entitlement already linked to the signed-in account;
- shows start and expiration dates for active access;
- lets a guest sign in to check an existing entitlement; and
- neutrally explains that access may be managed independently on Zemen Academy's website, without a clickable purchase link or call to action.

Do not disguise a transaction by replacing words such as “pay,” “price,” or “buy” with “activate.” Policy evaluation is based on behavior, not vocabulary. The website must describe its manual verification accurately.

## Safe feature flags

A backend flag may be used as a global emergency off switch for website enrollment. It must never add enrollment or payment behavior to an Android build. Do not detect reviewers, hide a feature only during review, or remotely change the reviewed Play behavior after approval.

## Build command

```powershell
npx.cmd eas-cli@latest build --platform android --profile production
```

Only the `production` AAB is eligible for Google Play. Development and preview builds preserve the same payment boundary so a test build cannot accidentally ship bank-transfer UI.

Official policy references must be re-checked before every release:

- https://support.google.com/googleplay/android-developer/answer/9858738
- https://support.google.com/googleplay/android-developer/answer/17006354
- https://support.google.com/googleplay/android-developer/answer/13821247

## Future billing

If Zemen Academy becomes able and eligible to use Google Play Billing or an enrolled alternative-billing program, implement server-verified purchase events in a new reviewed release. Never activate Premium solely from a client-side success screen.
