# Dependency risk record

Audit date: 2026-08-09

`npm audit --omit=dev` currently reports 20 inherited advisories: 12 high, 8 moderate, 0 critical. The reported paths are inside Expo CLI, Metro, React Native build tooling, `image-size`, `js-yaml`, Xcode configuration parsing, and UUID tooling.

The automatic npm remediation is not accepted because it proposes incompatible framework changes such as Expo 57 → Expo 53 and React Native 0.86 → 0.72. Applying `npm audit fix --force` would create a less supportable application and is prohibited for this release.

Release decision:

- Expo reports every installed package as aligned through `npx expo install --check`.
- No critical advisory is present.
- The audited dependency paths are build/development tooling; no known password, session, payment, or Apps Script secret is bundled from this repository.
- Re-run the audit before the signed APK and AAB. Upgrade to the next compatible Expo 57 patch immediately when Expo publishes patched transitive versions.
- If a runtime-reachable critical issue appears, stop the release rather than overriding it.
