import { describe, expect, it } from '@jest/globals';

import {
  createPremiumOfflineLease,
  evaluatePremiumOfflineLease,
  PREMIUM_OFFLINE_LEASE_MS,
} from '@/utils/premiumLease';
import type { PremiumEntitlement } from '@/types';

const NOW = Date.parse('2026-08-01T12:00:00.000Z');
const entitlement = (until: string | null = '2026-09-01T12:00:00.000Z'): PremiumEntitlement => ({
  isPremium: true,
  status: 'active',
  planId: 'premium-90',
  startedAt: '2026-07-01T12:00:00.000Z',
  until,
});

describe('premium offline lease', () => {
  it('allows the same user during the seven-day verification window', () => {
    const lease = createPremiumOfflineLease('user-1', entitlement(), new Date(NOW).toISOString(), NOW);
    expect(lease).not.toBeNull();
    expect(evaluatePremiumOfflineLease(lease, 'user-1', NOW + 6 * 24 * 60 * 60_000).valid).toBe(true);
  });

  it('ends at the subscription expiry when it is sooner than seven days', () => {
    const until = new Date(NOW + 2 * 24 * 60 * 60_000).toISOString();
    const lease = createPremiumOfflineLease('user-1', entitlement(until), new Date(NOW).toISOString(), NOW);
    expect(lease?.accessUntil).toBe(until);
    expect(evaluatePremiumOfflineLease(lease, 'user-1', NOW + 2 * 24 * 60 * 60_000)).toMatchObject({
      valid: false,
      reason: 'subscription-expired',
    });
  });

  it('requires server verification after seven days', () => {
    const lease = createPremiumOfflineLease('user-1', entitlement(), new Date(NOW).toISOString(), NOW);
    expect(evaluatePremiumOfflineLease(lease, 'user-1', NOW + PREMIUM_OFFLINE_LEASE_MS)).toMatchObject({
      valid: false,
      reason: 'verification-expired',
    });
  });

  it('does not transfer a lease to another account', () => {
    const lease = createPremiumOfflineLease('user-1', entitlement(), new Date(NOW).toISOString(), NOW);
    expect(evaluatePremiumOfflineLease(lease, 'user-2', NOW)).toMatchObject({
      valid: false,
      reason: 'wrong-user',
    });
  });

  it('detects a device clock moving backward', () => {
    const lease = createPremiumOfflineLease('user-1', entitlement(), new Date(NOW).toISOString(), NOW);
    expect(evaluatePremiumOfflineLease(lease, 'user-1', NOW - 6 * 60_000)).toMatchObject({
      valid: false,
      reason: 'clock-rollback',
    });
  });
});
