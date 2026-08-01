import { expect, test } from '@jest/globals';

import { apiErrorContext, userFacingError } from '@/utils/userFacingError';

test('removes native Android and hostname diagnostics from network failures', () => {
  const message = userFacingError(
    new Error('fetch failed: java.net.UnknownHostException: Unable to resolve host script.google.com'),
    'announcements',
  );
  expect(message).toBe('No internet connection. Check Wi-Fi or mobile data and try again.');
  expect(message).not.toMatch(/java|google|hostname|exception/i);
});

test('turns HTTP and malformed-response failures into a safe service message', () => {
  expect(userFacingError(new Error('Server returned 404.'), 'login')).toContain('temporarily unavailable');
  expect(userFacingError(new Error('Unexpected token < in JSON'), 'catalog')).toContain('temporarily unavailable');
});

test('keeps useful authentication corrections without exposing implementation details', () => {
  expect(userFacingError(new Error('Email or password is incorrect.'), 'login')).toBe(
    'Email or password is incorrect. Check both and try again.',
  );
  expect(userFacingError(new Error('PASSWORD_PEPPER continuity failed at line 99'), 'login')).toBe(
    'Sign-in could not be completed. Check your email and password, then try again.',
  );
});

test('uses an action-specific fallback for unknown server failures', () => {
  expect(userFacingError(new Error('Internal feature 87 failed'), 'announcements')).toBe(
    'Announcements could not be updated. Please try again shortly.',
  );
  expect(apiErrorContext('createPremiumRequest')).toBe('premium');
  expect(apiErrorContext('registerDevice')).toBe('device');
});
