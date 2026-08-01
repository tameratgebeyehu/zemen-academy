import type { PremiumEntitlement, User } from '@/types';

export function applyPremiumEntitlement(user: User, entitlement: PremiumEntitlement): User {
  const unchanged = user.isPremium === entitlement.isPremium
    && user.premiumStatus === entitlement.status
    && (user.premiumPlanId ?? null) === entitlement.planId
    && (user.premiumStartedAt ?? null) === entitlement.startedAt
    && (user.premiumUntil ?? null) === entitlement.until;

  if (unchanged) return user;
  return {
    ...user,
    isPremium: entitlement.isPremium,
    premiumStatus: entitlement.status,
    premiumPlanId: entitlement.planId,
    premiumStartedAt: entitlement.startedAt,
    premiumUntil: entitlement.until,
  };
}

export function projectedPremiumUntil(
  currentUntil: string | null | undefined,
  durationDays: number,
  now = Date.now(),
): string {
  const currentUntilTime = currentUntil ? new Date(currentUntil).getTime() : Number.NaN;
  const base = Number.isFinite(currentUntilTime) && currentUntilTime > now ? currentUntilTime : now;
  return new Date(base + Math.max(1, Math.floor(durationDays)) * 24 * 60 * 60_000).toISOString();
}
