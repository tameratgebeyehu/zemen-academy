import { expect, test } from '@jest/globals';

import { zemenNotificationEvent } from '@/utils/notificationEvents';

test('recognizes an announcement notification with its identifier', () => {
  expect(zemenNotificationEvent({ kind: 'announcement', announcementId: 'announcement-42' })).toEqual({
    kind: 'announcement',
    announcementId: 'announcement-42',
  });
});

test('recognizes premium activation without trusting extra push data', () => {
  expect(zemenNotificationEvent({ kind: 'premium-activation', userId: 'private-value' })).toEqual({
    kind: 'premium-activation',
  });
});

test('recognizes a timetable reminder without exposing other notification data', () => {
  expect(zemenNotificationEvent({ kind: 'timetable', timetableId: 'plan-2026-08-17-0-math' })).toEqual({
    kind: 'timetable',
    timetableId: 'plan-2026-08-17-0-math',
  });
});

test('ignores malformed and unrelated notification data', () => {
  expect(zemenNotificationEvent({ kind: 'announcement' })).toBeNull();
  expect(zemenNotificationEvent({ kind: 'unknown' })).toBeNull();
  expect(zemenNotificationEvent(undefined)).toBeNull();
});
