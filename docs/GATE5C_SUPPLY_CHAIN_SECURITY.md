# Gate 5C — dependency and release-artifact security

Updated: 16 August 2026

## Decision

**CONDITIONAL LOCAL PASS — TWO UPSTREAM RISKS RECORDED**

The installed Expo/React Native dependency tree is valid, the compatible security patch has been
applied, no critical advisory is reported, and no private release artifact or credential pattern
is tracked. Two advisories remain in Expo/Metro configuration and build-tool dependency paths.
Npm offers only framework-breaking fixes for those paths, so they must be monitored and accepted
explicitly rather than hidden or force-fixed.

## Verified evidence

| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| C01 | Expo dependency alignment | PASS | `npx expo install --check`: dependencies are up to date |
| C02 | Installed direct runtime tree | PASS | `npm ls --omit=dev --depth=0` completed without invalid or missing packages |
| C03 | Compatible advisory remediation | PASS | Vulnerable `js-yaml` 3.15.0 removed; locked versions are 3.15.1 and 4.3.1 |
| C04 | Critical registry advisories | PASS | 0 critical |
| C05 | Private release files tracked | PASS | No `.env`, Admin JSON, service account, keystore, APK, AAB, or private key is tracked |
| C06 | Private-key/GitHub-token patterns | PASS | No matching private key or GitHub token pattern found outside dependencies |
| C07 | Android backup and permission controls | PASS | Backups disabled; explicit permission list contains only notifications |
| C08 | Release audit regression check | PASS | Release audit rejects any locked vulnerable `js-yaml` 3.x version |

`.env.example` is an intentionally tracked placeholder template and contains no production
secret. `google-services.json` is Firebase Android client configuration, not a Firebase Admin
credential; its API key is restricted separately in Google Cloud.

## Residual advisory register

After the compatible patch, npm expands the two underlying advisories through the Expo dependency
graph as **19 affected nodes: 11 high, 8 moderate, 0 critical**. This count does not mean there
are nineteen independent vulnerabilities.

### R01 — image-size parser denial of service

- Severity reported by npm: high.
- Advisory paths: Expo Metro and React Native Metro configuration/build tooling.
- Behavior: crafted ICNS, JXL, or HEIF image input can cause an infinite parser loop.
- Current mitigation: application users cannot upload arbitrary images; release assets are local,
  reviewed repository files; untrusted images must never be added to the build workspace.
- Npm's offered automatic resolution: downgrade Expo 57 to Expo 53, which is incompatible with
  the current React Native and application configuration.
- Required action: adopt the first Expo 57-compatible Metro/image-size patch, then rerun all gates.

### R02 — uuid supplied-buffer bounds check

- Severity reported by npm: moderate.
- Advisory path: `uuid` through `xcode` and Expo config plugins.
- Behavior: affected UUID versions omit a buffer bounds check for selected UUID functions when a
  caller supplies a buffer.
- Current mitigation: this path belongs to native configuration tooling; the app does not expose
  a user-controlled UUID buffer operation.
- Npm's offered automatic resolution: downgrade Expo 57/React Native 0.86 to incompatible older
  framework versions.
- Required action: adopt the first Expo-compatible config-plugin/xcode/uuid patch.

These mitigations reduce practical exposure but do not erase the advisories. The release owner
must accept the temporary residual risk or delay release until compatible upstream patches exist.

## Prohibited remediation

- Do not run `npm audit fix --force`.
- Do not accept Expo 57 → 53, React Native 0.86 → 0.72, or unrelated canary upgrades as an audit
  fix.
- Do not add broad package overrides without building and testing the complete native artifact.
- Do not remove or regenerate the lockfile merely to make the advisory count disappear.

## Before the signed APK and AAB

| Owner action | Status | Evidence |
| --- | --- | --- |
| Re-run `npm audit --omit=dev` on the final commit and compare advisory IDs. | PASS — CURRENT WORKTREE | 16 August 2026: same two underlying advisories; 11 high/8 moderate expanded paths, 0 critical |
| Check Expo release notes for compatible `image-size` and `uuid` dependency updates. | PENDING | |
| Record release-owner acceptance or defer release because of R01/R02. | PENDING | |
| Confirm EAS builds only from the reviewed lockfile and production repository revision. | PENDING | |
| Inspect Play Console SDK/dependency warnings after AAB upload. | PENDING | |
| Preserve the final audit output and artifact SHA-256 outside Git. | PENDING | |

## Gate exit rule

Gate 5C passes when C01–C08 remain green on the final commit, the signed artifact is built from the
reviewed lockfile, no critical or directly exploitable application-runtime advisory exists, and
R01/R02 are either patched compatibly or accepted by the release owner with the stated
mitigations. Any new SDK, dependency, permission, native plugin, or build-profile change reopens
this gate.
