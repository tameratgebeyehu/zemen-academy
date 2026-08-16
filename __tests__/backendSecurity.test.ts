import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@jest/globals';

function securityHarness() {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  return new Function(`${source}; return { validEmail_, validatedIdentifier_, publicApiError_ };`)() as {
    validEmail_: (value: string) => boolean;
    validatedIdentifier_: (value: string, label: string) => string;
    publicApiError_: (error: Error, action: string) => string;
  };
}

test('rejects spreadsheet-formula prefixes in account emails and identifiers', () => {
  const backend = securityHarness();
  expect(backend.validEmail_('student@example.com')).toBe(true);
  expect(backend.validEmail_('student+math@example.com')).toBe(true);
  expect(backend.validEmail_('=IMPORTXML@example.com')).toBe(false);
  expect(() => backend.validatedIdentifier_('=IMPORTXML("https://example.com")', 'report')).toThrow('Invalid report identifier');
});

test('never returns backend diagnostics through the public error envelope', () => {
  const backend = securityHarness();
  const message = backend.publicApiError_(
    new Error('PASSWORD_PEPPER missing in PropertiesService at Code.gs:123'),
    'login',
  );
  expect(message).toBe('Sign-in could not be completed. Check your email and password, then try again.');
  expect(message).not.toMatch(/pepper|properties|code\.gs|123/i);
});

test('web sign-in uses a safe public error and never consumes a phone or tablet slot', () => {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  const backend = securityHarness();
  const message = backend.publicApiError_(
    new Error('PASSWORD_PEPPER missing in PropertiesService at Code.gs:456'),
    'webLogin',
  );
  const webAuthBody = source.match(/function webAuthResult_\(user\) \{([\s\S]*?)\n\}/)?.[1] ?? '';

  expect(message).toBe('Sign-in could not be completed. Check your email and password, then try again.');
  expect(message).not.toMatch(/pepper|properties|code\.gs|456/i);
  expect(webAuthBody).toContain("installationId: 'web'");
  expect(webAuthBody).not.toMatch(/registerDevice_|deviceType|phoneSlot|tabletSlot/);
});

test('returns actionable but non-sensitive signup failure reasons', () => {
  const backend = securityHarness();

  expect(backend.publicApiError_(new Error('Invalid installation identifier.'), 'signup'))
    .toBe('This app installation could not be verified. Update Zemen Academy or reinstall the app, then try again.');
  expect(backend.publicApiError_(new Error('Device security is not installed. Run setupZemenAcademy first.'), 'signup'))
    .toBe('Account registration is temporarily unavailable because the server setup is incomplete. Please contact Zemen Academy support.');
  expect(backend.publicApiError_(new Error('Could not obtain lock after 10000ms.'), 'signup'))
    .toBe('Account registration is busy right now. Wait a minute and try again.');
  expect(backend.publicApiError_(new Error('Too many signup attempts.'), 'signup'))
    .toBe('Too many account creation attempts. Wait 15 minutes, then try again.');
  expect(backend.publicApiError_(new Error('SIGNUP-STORAGE: Account record could not be saved.'), 'signup'))
    .toContain('SIGNUP-STORAGE');
  expect(backend.publicApiError_(new Error('SIGNUP-DEVICE: Account device session could not be created.'), 'signup'))
    .toContain('SIGNUP-DEVICE');
});

test('login never invokes the incomplete-signup rollback', () => {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  const signupStart = source.indexOf('function signup_(payload)');
  const loginStart = source.indexOf('function login_(payload)');
  const webLoginStart = source.indexOf('function webLogin_(payload)');
  const signupBody = source.slice(signupStart, loginStart);
  const loginBody = source.slice(loginStart, webLoginStart);

  expect(loginBody).not.toContain('rollbackIncompleteSignup_');
  expect(signupBody).toContain('rollbackIncompleteSignup_');
});

test('backend exposes a deployable release marker and release security operations', () => {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  const setupSource = readFileSync(resolve(process.cwd(), 'backend', 'Setup.gs'), 'utf8');

  expect(source).toContain("var ZEMEN_BACKEND_RELEASE = '2026-08-16-timetable-v2';");
  expect(source).toContain('backendRelease: ZEMEN_BACKEND_RELEASE');
  expect(setupSource).toContain('function diagnoseV1AccountAndDeviceGate()');
  expect(setupSource).toContain("removeSignupRowsForUser_(userId, ['Sessions', 'UserDevices', 'Attempts', 'Progress'])");
  expect(setupSource).toContain('function diagnoseReleaseSecurity()');
  expect(setupSource).toContain('function protectSensitiveSecuritySheets()');
  expect(setupSource).toContain('function createPrivateProductionBackup()');
  expect(setupSource).toContain(".addItem('Install daily security cleanup', 'installSecurityMaintenance')");
});
