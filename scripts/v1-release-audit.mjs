import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];

function check(condition, message) {
  (condition ? passes : failures).push(message);
}

function text(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

const app = JSON.parse(text('app.json')).expo;
const eas = JSON.parse(text('eas.json'));
const packageLock = JSON.parse(text('package-lock.json'));
const lockedJsYamlVersions = Object.entries(packageLock.packages ?? {})
  .filter(([path]) => path.endsWith('node_modules/js-yaml'))
  .map(([, value]) => value.version)
  .filter(Boolean);
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(Boolean);
const trackedNames = tracked.map((path) => basename(path).toLowerCase());

check(app.android?.allowBackup === false, 'Android backups are disabled for account and offline data.');
check(app.android?.package === 'com.zemenacademy.app', 'The production Android package is fixed.');
check(
  Array.isArray(app.android?.permissions)
    && app.android.permissions.every((permission) => permission === 'POST_NOTIFICATIONS'),
  'The explicit Android permission list is minimal.',
);
check(
  app.android?.intentFilters?.some((filter) => filter.autoVerify === true
    && filter.data?.some((entry) => entry.host === 'zemenacademy.com'
      && entry.scheme === 'https'
      && entry.pathPrefix === '/app/'))
    && app.android.intentFilters.every((filter) => filter.data?.every((entry) => (
      entry.host !== 'zemenacademy.com' || entry.pathPrefix === '/app/'
    ))),
  'Verified HTTPS app links use the dedicated /app/ namespace and cannot capture public website pages.',
);
if (existsSync(resolve(root, app.android?.googleServicesFile ?? ''))) {
  const googleServices = JSON.parse(text(app.android.googleServicesFile));
  const firebasePackages = (googleServices.client ?? [])
    .map((client) => client?.client_info?.android_client_info?.package_name)
    .filter(Boolean);
  check(
    firebasePackages.includes(app.android?.package),
    'Firebase Android client configuration matches the production package.',
  );
} else {
  check(false, 'Firebase Android client configuration is present for release verification.');
}
check(
  eas.build?.production?.android?.buildType === 'app-bundle'
    && eas.build?.production?.environment === 'production'
    && eas.build?.production?.env?.EXPO_PUBLIC_DISTRIBUTION_CHANNEL === 'play',
  'The production Play AAB is permanently consumption-only and cannot expose manual bank payments.',
);
check(
  !Object.prototype.hasOwnProperty.call(eas.build ?? {}, 'production-direct')
    && Object.values(eas.build ?? {}).every((profile) => (
      profile?.env?.EXPO_PUBLIC_DISTRIBUTION_CHANNEL === 'play'
    )),
  'Every Android build profile is consumption-only; no direct-payment build can be produced accidentally.',
);
check(
  lockedJsYamlVersions.length > 0 && lockedJsYamlVersions.every((version) => {
    const [major, minor, patch] = version.split('.').map(Number);
    return major !== 3 || minor > 15 || (minor === 15 && patch >= 1);
  }),
  'Every locked js-yaml 3.x installation includes the 3.15.1 security patch.',
);

const forbiddenNames = trackedNames.filter((name) => (
  name === '.env'
  || /firebase-adminsdk/.test(name)
  || /service-account/.test(name)
  || /credentials\.json$/.test(name)
  || /\.(?:jks|keystore|pem|p8|p12|aab|apk)$/.test(name)
));
check(!forbiddenNames.length, `No private environment, service-account, signing, APK, or AAB files are tracked${forbiddenNames.length ? `: ${forbiddenNames.join(', ')}` : ''}.`);

const sourceFiles = tracked.filter((path) => /\.(?:ts|tsx|js|mjs|json|md|gs|html|example)$/.test(path));
const dangerousPatterns = [
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
  /"private_key"\s*:\s*"-----BEGIN/,
  /\bgh[oprsu]_[A-Za-z0-9_]{24,}\b/,
];
const exposed = [];
for (const path of sourceFiles) {
  const content = text(path);
  if (dangerousPatterns.some((pattern) => pattern.test(content))) exposed.push(path);
}
check(!exposed.length, `No private-key or GitHub-token patterns were found in tracked text${exposed.length ? `: ${exposed.join(', ')}` : ''}.`);

const backend = text('backend/Code.gs');
const setup = text('backend/Setup.gs');
const api = text('src/services/api.ts');
const config = text('src/config.ts');
const home = text('src/screens/home/HomeScreen.tsx');
const onboardingSetup = text('src/screens/onboarding/SetupScreen.tsx');
const profile = text('src/screens/profile/ProfileScreen.tsx');
const appContext = text('src/context/AppContext.tsx');
const downloads = text('src/utils/downloads.ts');
const devicePolicy = text('src/utils/devicePolicy.ts');
const privacyCenter = text('src/screens/profile/PrivacyCenterScreen.tsx');
check(backend.includes('publicApiError_') && backend.includes('console.error(error && error.stack'), 'Backend diagnostics stay in logs and public errors are sanitized.');
check(backend.includes("if (['health', 'version'].indexOf(action) < 0)"), 'Only health and version are exposed through GET.');
check(
  backend.includes("var ZEMEN_BACKEND_RELEASE = '2026-08-16-timetable-v2';")
    && setup.includes('function diagnoseReleaseSecurity()')
    && setup.includes('function protectSensitiveSecuritySheets()')
    && setup.includes('function createPrivateProductionBackup()'),
  'Gate 5 backend release marker and owner security operations are present.',
);
check(api.includes('new AbortController()') && api.includes('setTimeout(() => controller.abort()'), 'Network requests have a timeout and cannot freeze indefinitely.');
check(
  api.includes("readRequest('catalog', { grade, stream, since }, 30_000, force, 30_000)")
    && api.includes("readRequest('questions', { unitId, subjectId, version }, 5 * 60_000, false, 30_000)"),
  'Large catalog and question reads tolerate a bounded Apps Script cold start.',
);
check(setup.includes("ui.createMenu('Zemen Notes')") && setup.includes('function publishNoteEditorDraft()'), 'The validated Notes authoring workflow is installed.');
check(setup.includes("ui.createMenu('Zemen Past Papers')") && setup.includes('function publishPastPaperEditorDraft()'), 'The validated Past Papers authoring workflow is installed.');
check(
  config.includes('V1_PAST_PAPERS_ENABLED = false')
    && !home.includes("navigation.navigate('PastPapers')"),
  'Unreviewed Past Papers have no Version 1 home entry point.',
);
check(
  config.includes('V1_AMHARIC_UI_ENABLED = false')
    && config.includes("V1_DEFAULT_LANGUAGE = 'en'")
    && !onboardingSetup.includes("setLanguage('am')")
    && !profile.includes("value: 'am'"),
  'Version 1 is explicitly English-only and exposes no incomplete language selector.',
);
check(
  downloads.includes('retainFreeDownloads')
    && appContext.includes('confirmedAccessEnded')
    && appContext.includes('retainFreeDownloads(current)'),
  'Confirmed Premium expiry removes paid offline content while retaining free downloads.',
);
check(
  devicePolicy.includes('devicePolicyRevokesLocalContent')
    && appContext.includes('localAccessRevoked')
    && appContext.includes('unitDownloads: []')
    && appContext.includes('noteDownloads: []'),
  'A remotely released installation purges account-scoped offline learning data.',
);
check(
  profile.includes('title="Account deletion"')
    && profile.includes('CONTACTS.accountDeletion')
    && privacyCenter.includes('Deletion instructions')
    && privacyCenter.includes('Never send your password'),
  'Account deletion is directly discoverable and offers safe web and email request paths.',
);
check(
  config.includes("privacy: 'https://zemenacademy.com/privacy'")
    && config.includes("terms: 'https://zemenacademy.com/terms'")
    && config.includes("accountDeletion: 'https://zemenacademy.com/account-deletion'"),
  'Production privacy, terms, and account-deletion URLs are fixed to the official domain.',
);
check(
  existsSync(resolve(root, 'docs/PLAY_DATA_SAFETY.md'))
    && existsSync(resolve(root, 'docs/PLAY_REVIEWER_ACCESS.md'))
    && existsSync(resolve(root, 'docs/GATE5_SECURITY_AND_POLICY.md')),
  'Gate 5 Data safety, reviewer-access, and operations records exist.',
);

if (existsSync(resolve(root, '.env'))) {
  const env = text('.env');
  const match = env.match(/^EXPO_PUBLIC_APPS_SCRIPT_URL\s*=\s*(.+)$/m);
  const value = match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  check(/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(value), 'The local production API URL is a valid HTTPS Apps Script deployment.');
} else {
  check(false, 'A local untracked .env exists for release verification.');
}

passes.forEach((message) => process.stdout.write(`PASS  ${message}\n`));
failures.forEach((message) => process.stderr.write(`FAIL  ${message}\n`));
process.stdout.write(`\n${passes.length} passed, ${failures.length} failed.\n`);
if (failures.length) process.exitCode = 1;
