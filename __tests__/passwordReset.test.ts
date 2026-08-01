import { expect, test } from '@jest/globals';

import { normalizeRecoveryCode, passwordResetValidationError } from '@/utils/passwordReset';

test('normalizes a pasted recovery code to six digits', () => {
  expect(normalizeRecoveryCode(' 12-34 56 extra 78')).toBe('123456');
});

test('validates password length and confirmation', () => {
  expect(passwordResetValidationError('short', 'short')).toContain('8 characters');
  expect(passwordResetValidationError('long-enough', 'different')).toContain('do not match');
  expect(passwordResetValidationError('long-enough', 'long-enough')).toBe('');
});
