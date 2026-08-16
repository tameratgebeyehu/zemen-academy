import * as SecureStore from 'expo-secure-store';

const CELEBRATED_REQUEST_KEY_PREFIX = 'zemen-premium-celebrated-v1-';

function keyForUser(userId: string): string {
  return `${CELEBRATED_REQUEST_KEY_PREFIX}${userId.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export function acknowledgedPremiumRequest(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(keyForUser(userId));
}

export function acknowledgePremiumRequest(userId: string, requestId: string): Promise<void> {
  return SecureStore.setItemAsync(keyForUser(userId), requestId);
}
