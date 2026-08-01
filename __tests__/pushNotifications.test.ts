import { expect, test } from '@jest/globals';

import { isExpoPushToken } from '@/utils/pushNotifications';

test('accepts Expo push-token formats and rejects unrelated values', () => {
  expect(isExpoPushToken('ExponentPushToken[abc_123-XYZ]')).toBe(true);
  expect(isExpoPushToken('ExpoPushToken[abc_123-XYZ]')).toBe(true);
  expect(isExpoPushToken('not-a-push-token')).toBe(false);
  expect(isExpoPushToken('ExpoPushToken[]')).toBe(false);
});
