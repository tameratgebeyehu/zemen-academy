# Performance model

Zemen Academy uses an offline-first, cache-first request path. A screen should render
persisted content immediately and refresh remote content without blocking navigation.

## Response targets

- Local navigation, persisted state, and fresh client-cache reads: target 80–100 ms.
- Warm Apps Script reads: target under 1 second on a healthy connection.
- Cold Apps Script starts and Google Sheets reads: variable; they cannot be guaranteed
  at 100 ms. Every network action must therefore show progress and time out safely.

The development build logs `[api] <action> completed in <milliseconds>ms` for each
backend request. These logs are disabled in production builds.

## Cache layers

| Data | Client TTL | Apps Script TTL | Invalidation |
|---|---:|---:|---|
| Catalog | 30 seconds | 5 minutes | Content publishing and setup helpers clear server catalog caches |
| Announcements | 30 seconds | 1 minute | Announcement changes clear announcement caches |
| Unit questions | 5 minutes | 5 minutes | Unit `version` is part of both cache keys |
| Past-paper content | 5 minutes | 5 minutes | Paper `version` is part of both cache keys |
| Content-source routing | — | 5 minutes | Content-source setup clears the routing cache |
| Authenticated session lookup | In memory until logout | 6 hours | Logout revokes the sheet row and removes the cached session |

Concurrent identical client reads share one in-flight request. This prevents repeated
taps, screen remounts, or multiple consumers from sending duplicate backend work.

Apps Script cache entries have a size limit. Large quiz responses are split into safe
chunks and reconstructed on a warm read; an exceptionally large single question is
skipped safely and continues to work through the normal Sheets path.

## Publishing rule

Whenever published questions or a past paper change, increment that unit or paper's
`version`. This creates a new cache key immediately, so students do not receive the old
content while the previous five-minute cache entry expires. The question importer does
this automatically when it publishes a unit. Manual spreadsheet edits must update the
version manually.

After changing `backend/Code.gs`, create a new Apps Script deployment version. Editing
the script without updating the deployment leaves the mobile app on the previous code.

## What 80–100 ms means

The 80–100 ms goal applies to touch feedback, local navigation, and cached/offline
content—not an internet round trip to Google Apps Script. For a strict 100 ms backend
service-level target, the backend would need to move from Apps Script/Sheets to a
regional database and API service. The current design keeps Sheets while making the
common client path immediate and the warm server path substantially cheaper.
