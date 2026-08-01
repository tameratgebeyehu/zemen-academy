import type { PremiumEntitlement } from '@/types';

export const PREMIUM_OFFLINE_LEASE_MS = 7 * 24 * 60 * 60_000;
export const PREMIUM_CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60_000;

export interface PremiumOfflineLease {
  version: 1;
  userId: string;
  entitlement: PremiumEntitlement;
  verifiedAt: string;
  accessUntil: string;
  lastCheckedAt: string;
}

export type PremiumLeaseFailureReason =
  | 'missing'
  | 'invalid'
  | 'wrong-user'
  | 'clock-rollback'
  | 'verification-expired'
  | 'subscription-expired';

export type PremiumLeaseEvaluation =
  | { valid: true; lease: PremiumOfflineLease }
  | { valid: false; reason: PremiumLeaseFailureReason; lease?: PremiumOfflineLease };

function timestamp(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function isPremiumStatus(status: PremiumEntitlement['status']): status is 'active' | 'legacy' {
  return status === 'active' || status === 'legacy';
}

export function createPremiumOfflineLease(
  userId: string,
  entitlement: PremiumEntitlement,
  verifiedAt: string,
  checkedAt = Date.now(),
): PremiumOfflineLease | null {
  const verifiedTime = timestamp(verifiedAt);
  if (!userId || !entitlement.isPremium || !isPremiumStatus(entitlement.status) || !Number.isFinite(verifiedTime)) {
    return null;
  }

  const subscriptionUntil = timestamp(entitlement.until);
  const verificationUntil = verifiedTime + PREMIUM_OFFLINE_LEASE_MS;
  const accessUntil = Number.isFinite(subscriptionUntil)
    ? Math.min(verificationUntil, subscriptionUntil)
    : verificationUntil;

  return {
    version: 1,
    userId,
    entitlement,
    verifiedAt: new Date(verifiedTime).toISOString(),
    accessUntil: new Date(accessUntil).toISOString(),
    lastCheckedAt: new Date(checkedAt).toISOString(),
  };
}

export function evaluatePremiumOfflineLease(
  value: unknown,
  userId: string,
  now = Date.now(),
): PremiumLeaseEvaluation {
  if (!value) return { valid: false, reason: 'missing' };
  if (typeof value !== 'object') return { valid: false, reason: 'invalid' };

  const lease = value as PremiumOfflineLease;
  const verifiedAt = timestamp(lease.verifiedAt);
  const accessUntil = timestamp(lease.accessUntil);
  const lastCheckedAt = timestamp(lease.lastCheckedAt);
  const entitlementUntil = timestamp(lease.entitlement?.until);
  if (
    lease.version !== 1
    || typeof lease.userId !== 'string'
    || !lease.entitlement
    || !lease.entitlement.isPremium
    || !isPremiumStatus(lease.entitlement.status)
    || !Number.isFinite(verifiedAt)
    || !Number.isFinite(accessUntil)
    || !Number.isFinite(lastCheckedAt)
  ) return { valid: false, reason: 'invalid' };

  if (lease.userId !== userId) return { valid: false, reason: 'wrong-user', lease };
  if (
    now + PREMIUM_CLOCK_ROLLBACK_TOLERANCE_MS < verifiedAt
    || now + PREMIUM_CLOCK_ROLLBACK_TOLERANCE_MS < lastCheckedAt
  ) return { valid: false, reason: 'clock-rollback', lease };
  if (Number.isFinite(entitlementUntil) && now >= entitlementUntil) {
    return { valid: false, reason: 'subscription-expired', lease };
  }
  if (now >= accessUntil) return { valid: false, reason: 'verification-expired', lease };
  return { valid: true, lease };
}

export function premiumClaimNeedsVerification(
  entitlement: Pick<PremiumEntitlement, 'isPremium' | 'status' | 'until'>,
  now = Date.now(),
): boolean {
  const claimedPremium = entitlement.isPremium || isPremiumStatus(entitlement.status);
  if (!claimedPremium) return false;
  const until = timestamp(entitlement.until);
  return !Number.isFinite(until) || until > now;
}
