# Announcements

The `Announcements` sheet powers the Home notification bell, unread badge, announcement
center, and in-app new-update banner. It does not require a paid push-notification service.

## Columns

| Column | Example | Rule |
| --- | --- | --- |
| `id` | `g9-physics-u3-available` | Required, unique, and never reused. |
| `title` | `New Physics unit` | Short heading shown in the notification center. |
| `body` | `Grade 9 Physics Unit 3 is now available.` | A clear student-facing message. |
| `audienceGrade` | `9` | Leave blank to send to every grade. |
| `audienceStream` | `Natural` | Leave blank for every stream; use only `Natural` or `Social`. |
| `publishedAt` | `2026-08-01T09:00:00+03:00` | ISO-8601 date/time. Future dates stay hidden until their time arrives. |
| `status` | `active` | Only `active` rows are published. Use `draft` while preparing a message. |

## Publishing workflow

1. Add a row with a new stable `id`.
2. Write a short title and body.
3. Set the optional grade and stream audience.
4. Set `publishedAt` and change `status` to `active`.
5. Students receive the update during the next automatic check. Manual Refresh remains
   available as a fallback.

The application stores read IDs on each device. Editing an existing row does not make it
unread again. Use a new announcement ID when students must receive a new unread update.

Publishing a unit through the question importer now creates this row automatically. Its
ID contains the unit ID and published version, so retrying the same publish cannot create
a duplicate. A new announcement is created when later Draft questions are published and
the unit version increases. Manual rows remain supported for academy-wide messages.

The publish confirmation displays the generated announcement ID and its exact grade/stream
audience. Importing a CSV as Draft never announces it because Draft questions are not visible
to students. Re-publishing an active imported unit safely creates a missing announcement and
does not duplicate one that already exists.

For a unit that was published before this automation was deployed, open its original CSV
import tab and choose **Zemen Content -> CSV import -> Repair active unit announcement**.
This reads only the unit metadata, creates the missing row if necessary, and clears the
announcement caches; it does not scan the question bank or rebuild indexes.

After a newly registered student completes setup, the app adds a one-time personalized welcome
message to that student's announcement center and shows a welcome animation on the first Home
visit. The message remains in the center after the animation is dismissed and is never shared
with another account on the device.

The app checks automatically when it starts, reconnects, returns to the foreground, and
every two minutes while it is active. A new ID is announced only once on that device;
read/unread status remains separate. In Expo Go, new items use the in-app banner and bell
badge. Development and production builds can also show an Android system notification
when the student already granted notification permission. Tapping it opens the
Announcements page.

The automatic checker uses a self-rescheduling worker so requests cannot overlap. A failed
check retries after 30 seconds, then 60 seconds, before returning to the normal two-minute
interval. Opening the Announcements page triggers an immediate silent check, and automatic
errors are displayed there instead of being silently ignored.

This polling design deliberately stops while the app is inactive to protect battery,
mobile data, and Apps Script quotas. Guaranteed delivery while the app is completely
closed requires a later remote-push service; Android does not reliably run a three-minute
background timer for a closed application.

## Permissions and remote push

The onboarding reminder step explains why notifications are useful before Android or iOS
shows its system prompt. Notification channels are created before requesting permission,
which is required for the Android 13 prompt. Students can review the current status or open
system settings from **Profile -> Settings -> Notifications**.

Quiz and paper downloads use application-private storage, so Zemen Academy must not request
broad photo, media, or file access. Notification permission allows the installed app to show
alerts, but permission alone does not send remote messages. Closed-app delivery additionally
requires a development/production build, an Expo project ID and Android FCM credentials,
device Expo push tokens stored by the backend, and a publishing job that calls the Expo Push
Service. Expo Go cannot test Android remote push notifications.
