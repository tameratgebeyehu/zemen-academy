const pages = [
  ['https://zemenacademy.com/privacy', ['Zemen Academy', 'Privacy']],
  ['https://zemenacademy.com/terms', ['Zemen Academy', 'Terms']],
  ['https://zemenacademy.com/help', ['Zemen Academy', 'Help']],
  ['https://zemenacademy.com/account-deletion', ['Zemen Academy', 'Delete', 'mailto:']],
];

let failed = false;

async function responseText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

for (const [url, markers] of pages) {
  try {
    const body = await responseText(url);
    const missing = markers.filter((marker) => !body.toLowerCase().includes(marker.toLowerCase()));
    if (missing.length) throw new Error(`missing ${missing.join(', ')}`);
    process.stdout.write(`PASS  ${url}\n`);
  } catch (error) {
    failed = true;
    process.stderr.write(`FAIL  ${url}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

try {
  const body = await responseText('https://zemenacademy.com/.well-known/assetlinks.json');
  const statements = JSON.parse(body);
  const androidTarget = statements.find((statement) => (
    statement?.target?.namespace === 'android_app'
    && statement?.target?.package_name === 'com.zemenacademy.app'
    && Array.isArray(statement?.target?.sha256_cert_fingerprints)
    && statement.target.sha256_cert_fingerprints.length > 0
  ));
  if (!androidTarget) throw new Error('production package or SHA-256 fingerprint is missing');
  process.stdout.write('PASS  Android App Links association\n');
} catch (error) {
  failed = true;
  process.stderr.write(`FAIL  Android App Links association: ${error instanceof Error ? error.message : String(error)}\n`);
}

if (failed) process.exitCode = 1;
