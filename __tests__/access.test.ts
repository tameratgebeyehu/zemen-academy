import { expect, test } from '@jest/globals';

import type { PastPaper, Unit, User } from '@/types';
import { canAccessPaper, canAccessUnit, paperAccessTier, unitAccessTier } from '@/utils/access';

const unit = (number: number, accessTier?: 'free' | 'premium'): Unit => ({
  id: `unit-${number}`, subjectId: 'physics', number, title: `Unit ${number}`, titleAm: `Unit ${number}`,
  questionCount: 10, version: 1, accessTier, updatedAt: '2026-08-01T00:00:00.000Z',
});
const paper: PastPaper = { id: 'paper-1', title: 'Paper', grade: 9, subjectId: 'physics', year: 2025, version: 1, updatedAt: '2026-08-01T00:00:00.000Z' };
const freeUser: User = { id: 'free', name: 'Free', isGuest: false, isPremium: false };
const premiumUser: User = { ...freeUser, id: 'premium', isPremium: true };

test('defaults Unit 1 to free and later units to premium', () => {
  expect(unitAccessTier(unit(1))).toBe('free');
  expect(unitAccessTier(unit(2))).toBe('premium');
  expect(unitAccessTier(unit(3, 'free'))).toBe('free');
});

test('allows premium content only with an active premium entitlement', () => {
  expect(canAccessUnit(freeUser, unit(1))).toBe(true);
  expect(canAccessUnit(freeUser, unit(2))).toBe(false);
  expect(canAccessUnit(premiumUser, unit(2))).toBe(true);
  expect(paperAccessTier(paper)).toBe('premium');
  expect(canAccessPaper(freeUser, paper)).toBe(false);
  expect(canAccessPaper(premiumUser, paper)).toBe(true);
});
