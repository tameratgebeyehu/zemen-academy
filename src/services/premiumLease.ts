import * as SecureStore from 'expo-secure-store';

import {
  evaluatePremiumOfflineLease,
  type PremiumLeaseEvaluation,
  type PremiumOfflineLease,
} from '@/utils/premiumLease';

const PREMIUM_LEASE_KEY = 'zemen-premium-offline-lease-v1';

export async function readPremiumOfflineLease(
  userId: string,
  now = Date.now(),
): Promise<PremiumLeaseEvaluation> {
  const raw = await SecureStore.getItemAsync(PREMIUM_LEASE_KEY);
  if (!raw) return { valid: false, reason: 'missing' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await SecureStore.deleteItemAsync(PREMIUM_LEASE_KEY).catch(() => undefined);
    return { valid: false, reason: 'invalid' };
  }

  const result = evaluatePremiumOfflineLease(parsed, userId, now);
  if (result.valid) {
    const checkedLease = { ...result.lease, lastCheckedAt: new Date(now).toISOString() };
    await SecureStore.setItemAsync(PREMIUM_LEASE_KEY, JSON.stringify(checkedLease));
    return { valid: true, lease: checkedLease };
  }
  return result;
}

export async function writePremiumOfflineLease(lease: PremiumOfflineLease): Promise<void> {
  await SecureStore.setItemAsync(PREMIUM_LEASE_KEY, JSON.stringify(lease));
}

export async function clearPremiumOfflineLease(): Promise<void> {
  await SecureStore.deleteItemAsync(PREMIUM_LEASE_KEY);
}
