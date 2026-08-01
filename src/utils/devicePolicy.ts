import type { DeviceCategory } from '@/types';

export function deviceCategoryFromExpoType(value: number | null | undefined): DeviceCategory {
  if (value === 1) return 'phone';
  if (value === 2) return 'tablet';
  return 'unknown';
}

export function deviceRegistrationIsFresh(
  registeredAt: string | undefined,
  registeredUserId: string | undefined,
  currentUserId: string,
  now = Date.now(),
  maximumAgeMs = 12 * 60 * 60_000,
): boolean {
  if (!registeredAt || registeredUserId !== currentUserId) return false;
  const registeredTime = new Date(registeredAt).getTime();
  return Number.isFinite(registeredTime) && now - registeredTime >= 0 && now - registeredTime < maximumAgeMs;
}

export function devicePolicyRequiresAttention(
  isGuest: boolean,
  userId: string,
  registeredUserId: string | undefined,
  observation: { accessAllowed?: boolean } | null | undefined,
): boolean {
  if (isGuest) return false;
  return registeredUserId !== userId || !observation || observation.accessAllowed === false;
}
