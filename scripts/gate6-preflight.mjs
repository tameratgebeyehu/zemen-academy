import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const app = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf8')).expo;
const eas = JSON.parse(readFileSync(resolve(root, 'eas.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const failures = [];
let passed = 0;

function check(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL  ${message}`);
  }
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

check(app.version === pkg.version, `app.json and package.json share version ${app.version}`);
check(app.android?.package === 'com.zemenacademy.app', 'Android production package is fixed');
check(Number.isInteger(app.android?.versionCode) && app.android.versionCode > 0,
  'Android versionCode is a positive integer');
check(Boolean(app.owner) && Boolean(app.extra?.eas?.projectId),
  'EAS owner and project ID are configured');
check(app.android?.allowBackup === false, 'Android backup remains disabled');
check(Array.isArray(app.android?.permissions)
  && app.android.permissions.length === 1
  && app.android.permissions[0] === 'POST_NOTIFICATIONS',
  'Only the notification runtime permission is declared explicitly');

const profiles = eas.build || {};
check(profiles.preview?.distribution === 'internal'
  && profiles.preview?.android?.buildType === 'apk',
  'Gate 6 preview profile produces an internal APK');
check(profiles.production?.android?.buildType === 'app-bundle',
  'Gate 7 production profile produces an Android App Bundle');
check(Object.values(profiles).every((profile) =>
  profile?.env?.EXPO_PUBLIC_DISTRIBUTION_CHANNEL === 'play'),
  'Every Android build profile is consumption-only');

const status = git('status', '--porcelain');
const dirtyCount = status ? status.split(/\r?\n/).length : 0;
check(dirtyCount === 0,
  dirtyCount === 0
    ? 'Git worktree is clean'
    : `Git worktree must be clean before Gate 6 (${dirtyCount} changed paths remain)`);

const branch = git('branch', '--show-current');
check(Boolean(branch), 'Release source is on a named Git branch');

let remoteMatches = false;
try {
  const localHead = git('rev-parse', 'HEAD');
  const remoteHead = git('rev-parse', `origin/${branch}`);
  remoteMatches = localHead === remoteHead;
} catch {
  remoteMatches = false;
}
check(remoteMatches, `HEAD is pushed to origin/${branch}`);

console.log(`\n${passed} passed, ${failures.length} failed.`);
if (failures.length) {
  console.error('\nGate 6 is intentionally blocked until every failure is resolved.');
  process.exitCode = 1;
}
