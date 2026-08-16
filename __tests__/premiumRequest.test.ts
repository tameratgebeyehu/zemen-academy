import { expect, test } from '@jest/globals';

import type { PremiumRequestInput } from '@/types';
import { canStartPremiumPurchase, formatPremiumRequestDate, premiumRequestIsOpen, premiumRequestValidationError } from '@/utils/premiumRequest';

test('shows payment request dates without time-zone noise', () => {
  expect(formatPremiumRequestDate('2026-08-09')).toBe('9 Aug 2026');
  expect(formatPremiumRequestDate('Sun Aug 09 2026 00:00:00 GMT+0300 (East Africa Time)')).toBe('9 Aug 2026');
});

const valid: PremiumRequestInput = {
  planId: 'premium-90',
  paymentMethodId: 'cbe',
  senderName: 'Abel Student',
};

test('recognizes only reviewable premium requests as open', () => {
  expect(premiumRequestIsOpen('pending')).toBe(true);
  expect(premiumRequestIsOpen('under-review')).toBe(true);
  expect(premiumRequestIsOpen('approved')).toBe(false);
  expect(premiumRequestIsOpen('rejected')).toBe(false);
  expect(premiumRequestIsOpen('cancelled')).toBe(false);
});

test('validates manual payment evidence before submission', () => {
  expect(premiumRequestValidationError(valid, true)).toBe('');
  expect(premiumRequestValidationError({ ...valid, senderName: 'A' }, true)).toContain('name used');
  expect(premiumRequestValidationError(valid, false)).toContain('Confirm');
});

test('shows renewal only after access expires and no request is open', () => {
  const base = {
    manualPaymentsEnabled: true,
    isGuest: false,
    isPremium: false,
    verificationRequired: false,
  };
  expect(canStartPremiumPurchase(base)).toBe(true);
  expect(canStartPremiumPurchase({ ...base, isPremium: true })).toBe(false);
  expect(canStartPremiumPurchase({ ...base, requestStatus: 'pending' })).toBe(false);
  expect(canStartPremiumPurchase({ ...base, verificationRequired: true })).toBe(false);
  expect(canStartPremiumPurchase({ ...base, manualPaymentsEnabled: false })).toBe(false);
});
