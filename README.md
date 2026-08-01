# Zemen Academy V1

An Android-first, offline-first quiz application for Ethiopian high school students preparing for entrance examinations.

## What is implemented

- Five-page introduction, login, sign-up, and guest access
- English and Amharic UI selection
- Grades 9–12 with Natural/Social streams for Grades 11–12
- Four-tab navigation: Home, Quizzes, Downloads, Profile
- Grade → Subject → Unit → Quiz content hierarchy
- Guest restriction to Unit 1 of every subject
- Downloaded quiz units stored as local JSON and usable without internet
- Online quiz attempts without requiring an offline download
- Instant Mode with immediate answers and explanations
- Mandatory rules acceptance before both Instant and Exam attempts
- One minute per question, screenshot/recording blocking, background-exit termination, protected text, and no resume in both modes
- Exam Mode with editable answers until final submission
- Score, percentage, correct/wrong/skipped counts, time used, and full answer review
- Search for subjects, units, and past paper titles
- In-app offline past-paper viewing without export/share actions
- Download storage estimates and deletion controls
- Daily local study reminder
- Light, dark, and system themes
- Offline attempt queue with connection-triggered synchronization
- Google Apps Script authentication/content API and separated Google Sheets schema
- Email verification-code password recovery without storing readable codes

No quiz questions or past papers are bundled into the production client. Publish
curriculum-reviewed content through the protected Google Sheets workflow described in
[docs/QUIZ_CONTENT_GUIDE.md](docs/QUIZ_CONTENT_GUIDE.md).

The cache-first client and Apps Script performance model, response targets, and content
versioning rules are documented in [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Run locally

Requirements: Node.js, npm, Android Studio or an Android phone with Expo Go.

```bash
npm install
cp .env.example .env
npm run typecheck
npm test
npm run android
```

Guest mode works without a backend. Login, sign-up, remote content, and progress sync require a deployed Apps Script URL in `.env`:

```dotenv
EXPO_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

## Project structure

```text
src/
  components/       Shared Material UI
  context/          Persisted application state and offline operations
  data/             First-run content, translations, and themes
  navigation/       Root stack and four bottom tabs
  screens/          Onboarding, home, quizzes, downloads, content, profile
  services/         Apps Script API, AsyncStorage, SecureStore, notifications
  types/            Domain and persistence types
  utils/            Pure quiz scoring and formatting
backend/             Google Apps Script API and sheet setup
docs/                Deployment, schema, architecture, and release checklist
```

## Backend setup

Follow [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md). The backend stores only a keyed password hash and per-user salt—not a plain-text password—and stores only hashed session tokens in Sheets. The raw session token stays in Android secure storage.

## Android builds

After completing the release checklist:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
```

The preview profile produces an installable APK. The production profile produces an Android App Bundle for Play Console submission.

## Verification

The checked-in source passes:

- `npm run typecheck`
- `npm test`
- `npx expo export --platform android`

The app deliberately leaves premium payments, AI, analytics, gamification, flashcards, notes, and social features out of Version 1.
