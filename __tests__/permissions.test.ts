import { expect, test } from '@jest/globals';

import {
  notificationPermissionDescription,
  notificationPermissionState,
} from '@/utils/permissions';

test('normalizes notification permission responses', () => {
  expect(notificationPermissionState({ granted: true, status: 'granted' })).toBe('granted');
  expect(notificationPermissionState({ granted: false, status: 'undetermined' })).toBe('undetermined');
  expect(notificationPermissionState({ granted: false, status: 'denied' })).toBe('denied');
});

test('provides actionable permission descriptions', () => {
  expect(notificationPermissionDescription('granted')).toContain('Allowed');
  expect(notificationPermissionDescription('denied')).toContain('settings');
  expect(notificationPermissionDescription('unavailable')).toContain('Play Store');
});
