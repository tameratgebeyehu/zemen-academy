# Google Play reviewer note — Premium access

Paste and adapt this disclosure in Play Console review notes. Keep it consistent with the exact submitted AAB.

## Suggested reviewer disclosure

Zemen Academy is an educational application for Ethiopian secondary-school students. This Google Play build is consumption-only for Premium access: it does not sell Premium, display plan prices or bank details, accept payment information, submit manual payment requests, or direct users to another payment method.

Students can use the published free learning content without Premium. A signed-in account that already has an active Premium entitlement can access the content associated with that entitlement. The server is the authority for activation, start date, expiration date, renewal, revocation, and device limits.

Manual Ethiopian bank-transfer verification is operated independently on Zemen Academy's official website. The Android app does not link or direct students to that flow. All Android build profiles use the same payment-free boundary, which cannot be enabled remotely.

## Reviewer test path

1. Use the free review account supplied under **App access**.
2. Open Profile → Premium access.
3. Confirm that no plan, amount, bank account, transfer instruction, or payment-submission control is present.
4. Open a Unit 1 free quiz and complete both practice modes.
5. If a Premium review account is supplied, sign in with it and confirm that the existing entitlement and expiration date appear without a purchase flow.

## Submission checklist

- Provide working free and, if useful, pre-entitled Premium review accounts under **Policy and programs → App content → App access**.
- Explain how reviewers reach free and Premium-locked quizzes and notes.
- Complete the Payments declaration and Data safety form truthfully.
- Confirm privacy, terms, support, and account-deletion URLs are live.
- Build only with `eas build --platform android --profile production`.
- Do not enable, reveal, or remotely add manual payment behavior after review.
