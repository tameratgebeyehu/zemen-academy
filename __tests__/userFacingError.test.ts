import { expect, test } from '@jest/globals';

import { userFacingError } from '@/utils/userFacingError';

test('preserves safe actionable signup reasons from the backend', () => {
  expect(userFacingError(
    new Error('Account registration is temporarily unavailable because the server setup is incomplete. Please contact Zemen Academy support.'),
    'signup',
  )).toBe('Account registration is temporarily unavailable because the server setup is incomplete. Please contact Zemen Academy support.');

  expect(userFacingError(
    new Error('This app installation could not be verified. Update Zemen Academy or reinstall the app, then try again.'),
    'signup',
  )).toBe('This app installation could not be verified. Update Zemen Academy or reinstall the app, then try again.');

  expect(userFacingError(new Error('Could not obtain lock after 10000ms.'), 'signup'))
    .toBe('Account registration is busy right now. Wait a minute and try again.');

  expect(userFacingError(new Error('Too many account creation attempts. Wait 15 minutes, then try again.'), 'signup'))
    .toBe('Too many account creation attempts. Wait 15 minutes, then try again.');

  expect(userFacingError(new Error('SIGNUP-STORAGE: Account record could not be saved.'), 'signup'))
    .toContain('SIGNUP-STORAGE');
  expect(userFacingError(new Error('SIGNUP-DEVICE: Account device session could not be created.'), 'signup'))
    .toContain('SIGNUP-DEVICE');

  expect(userFacingError(new Error('DEVICE-IDENTITY-SAVE: secure identity failed.'), 'signup'))
    .toContain('DEVICE-IDENTITY-SAVE');
  expect(userFacingError(new Error('SESSION-SAVE: secure session failed.'), 'signup'))
    .toContain('SESSION-SAVE');
});
