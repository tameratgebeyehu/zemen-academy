import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const timeoutMs = 35_000;
const failures = [];
const passes = [];

function check(condition, message) {
  (condition ? passes : failures).push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function envValue(source, name) {
  const match = source.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm'));
  return (match?.[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
}

const backendSource = read('backend/Code.gs');
const expectedRelease = backendSource.match(/ZEMEN_BACKEND_RELEASE\s*=\s*'([^']+)'/)?.[1] ?? '';
const apiUrl = envValue(read('.env'), 'EXPO_PUBLIC_APPS_SCRIPT_URL');

check(Boolean(expectedRelease), 'The local backend declares a release marker.');
check(
  /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl),
  'The production endpoint is a valid Apps Script HTTPS deployment.',
);

async function request(action) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const url = new URL(apiUrl);
    url.searchParams.set('action', action);
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { action, status: response.status, elapsedMs: Date.now() - startedAt, body };
  } catch (error) {
    return {
      action,
      status: 0,
      elapsedMs: Date.now() - startedAt,
      error: error?.name === 'AbortError' ? 'timed out' : 'request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

if (!failures.length) {
  for (const action of ['health', 'version']) {
    const result = await request(action);
    const data = result.body?.data;
    check(
      result.status === 200 && result.body?.ok === true,
      `Production ${action} responds successfully within ${timeoutMs / 1000} seconds (${result.elapsedMs} ms).`,
    );
    if (action === 'health') {
      check(data?.status === 'ok', 'Production health reports an OK service state.');
    } else {
      check(
        Boolean(data?.latestVersion) && Boolean(data?.minimumVersion),
        'Production version returns latest and minimum Android versions.',
      );
    }
    check(
      data?.backendRelease === expectedRelease,
      `Production ${action} release matches local ${expectedRelease}; received ${data?.backendRelease ?? 'unavailable'}.`,
    );
  }

  const protectedGet = await request('catalog');
  const protectedError = String(protectedGet.body?.error ?? '');
  check(
    protectedGet.status === 200 && protectedGet.body?.ok === false,
    'Production rejects a protected catalog action sent through GET.',
  );
  check(
    protectedGet.body?.data === undefined,
    'A rejected protected GET returns no catalog data.',
  );
  check(
    protectedError.length > 0
      && !/(SpreadsheetApp|DriveApp|ScriptApp|\.gs:|stack|passwordHash|passwordSalt|tokenHash)/i.test(protectedError),
    'The protected-GET error is useful without exposing backend internals.',
  );
}

passes.forEach((message) => process.stdout.write(`PASS  ${message}\n`));
failures.forEach((message) => process.stderr.write(`FAIL  ${message}\n`));
process.stdout.write(`\n${passes.length} passed, ${failures.length} failed.\n`);
if (failures.length) process.exitCode = 1;
