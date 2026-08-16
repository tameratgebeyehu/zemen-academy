import { expect, test } from '@jest/globals';

import type { PremiumEntitlement, User } from '@/types';
import { applyPremiumEntitlement, premiumDaysRemaining, projectedPremiumUntil } from '@/utils/premium';

const freeUser: User = {
  id: 'student-1',
  name: 'Student',
  isGuest: false,
  isPremium: false,
};

const active: PremiumEntitlement = {
  isPremium: true,
  status: 'active',
  planId: 'premium-90',
  startedAt: '2026-08-01T00:00:00.000Z',
  until: '2026-10-30T00:00:00.000Z',
};

test('applies a server premium entitlement to the signed-in user', () => {
  expect(applyPremiumEntitlement(freeUser, active)).toEqual({
    ...freeUser,
    isPremium: true,
    premiumStatus: 'active',
    premiumPlanId: 'premium-90',
    premiumStartedAt: active.startedAt,
    premiumUntil: active.until,
  });
});

test('keeps the same user object when the entitlement has not changed', () => {
  const premiumUser = applyPremiumEntitlement(freeUser, active);
  expect(applyPremiumEntitlement(premiumUser, active)).toBe(premiumUser);
});

test('removes premium access when the server reports expiry', () => {
  const premiumUser = applyPremiumEntitlement(freeUser, active);
  const expired: PremiumEntitlement = { ...active, isPremium: false, status: 'expired' };
  expect(applyPremiumEntitlement(premiumUser, expired)).toMatchObject({
    isPremium: false,
    premiumStatus: 'expired',
  });
});

test('projects renewals from an unexpired membership instead of losing remaining days', () => {
  const now = Date.parse('2026-08-01T00:00:00.000Z');
  expect(projectedPremiumUntil('2026-08-21T00:00:00.000Z', 90, now)).toBe('2026-11-19T00:00:00.000Z');
  expect(projectedPremiumUntil('2026-07-01T00:00:00.000Z', 30, now)).toBe('2026-08-31T00:00:00.000Z');
});

test('reports remaining subscription days and clamps expired access to zero', () => {
  const now = Date.parse('2026-08-01T00:00:00.000Z');
  expect(premiumDaysRemaining('2026-08-01T12:00:00.000Z', now)).toBe(1);
  expect(premiumDaysRemaining('2026-08-04T00:00:00.000Z', now)).toBe(3);
  expect(premiumDaysRemaining('2026-07-31T00:00:00.000Z', now)).toBe(0);
  expect(premiumDaysRemaining(null, now)).toBeNull();
});
