import { expect, test } from '@jest/globals';

import type { PremiumRequestInput } from '@/types';
import { premiumRequestIsOpen, premiumRequestValidationError } from '@/utils/premiumRequest';

const valid: PremiumRequestInput = {
  planId: 'premium-90',
  paymentMethodId: 'cbe',
  senderName: 'Abel Student',
};

test('recognizes only reviewable premium requests as open', () => {
  expect(premiumRequestIsOpen('pending')).toBe(true);
  expect(premiumRequestIsOpen('under-review')).toBe(true);
  expect(premiumRequestIsOpen('approved')).toBe(false);
  expect(premiumRequestIsOpen('cancelled')).toBe(false);
});

test('validates manual payment evidence before submission', () => {
  expect(premiumRequestValidationError(valid, true)).toBe('');
  expect(premiumRequestValidationError({ ...valid, senderName: 'A' }, true)).toContain('name used');
  expect(premiumRequestValidationError(valid, false)).toContain('Confirm');
});
