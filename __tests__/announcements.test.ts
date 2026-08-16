import { expect, test } from '@jest/globals';

import {
  ANNOUNCEMENT_REFRESH_INTERVAL_MS,
  announcementRefreshDelay,
  announcementQuizUnitId,
  announcementsEqual,
  createWelcomeAnnouncement,
  findNewAnnouncements,
  mergeKnownAnnouncementIds,
  personalAnnouncementsFor,
  sortAnnouncements,
} from '@/utils/announcements';
import type { Announcement } from '@/types';

const older: Announcement = {
  id: 'older',
  title: 'Older update',
  body: 'Older body',
  publishedAt: '2026-07-01T09:00:00.000Z',
};

const newer: Announcement = {
  id: 'newer',
  title: 'Newer update',
  body: 'Newer body',
  publishedAt: '2026-07-02T09:00:00.000Z',
};

test('sorts announcements newest first and identifies unseen IDs', () => {
  const sorted = sortAnnouncements([older, newer]);
  expect(sorted.map((item) => item.id)).toEqual(['newer', 'older']);
  expect(findNewAnnouncements(sorted, new Set(['older']))).toEqual([newer]);
});

test('keeps newly discovered IDs first and enforces the history limit', () => {
  expect(mergeKnownAnnouncementIds(['older', 'previous'], [newer], 2)).toEqual(['newer', 'older']);
});

test('detects unchanged announcement content', () => {
  expect(announcementsEqual([newer, older], [newer, older])).toBe(true);
  expect(announcementsEqual([newer], [{ ...newer, body: 'Edited' }])).toBe(false);
});

test('creates and scopes a personal welcome announcement', () => {
  const welcome = createWelcomeAnnouncement(
    { id: 'student-1', name: 'Abel Tesfaye', isGuest: false, isPremium: false },
    10,
    '2026-08-01T10:00:00.000Z',
  );
  expect(welcome).toMatchObject({
    id: 'welcome-student-1',
    kind: 'welcome',
    ownerUserId: 'student-1',
    title: 'Welcome to Zemen Academy, Abel!',
    actionType: 'quizzes',
  });
  expect(welcome.body).toContain('Grade 10');
  expect(personalAnnouncementsFor([welcome, newer], 'student-1')).toEqual([welcome]);
  expect(personalAnnouncementsFor([welcome], 'student-2')).toEqual([]);
});

test('resolves a quiz destination from new metadata and legacy publication IDs', () => {
  expect(announcementQuizUnitId({
    ...newer,
    actionType: 'quiz',
    targetId: 'g10-math-u1',
  })).toBe('g10-math-u1');
  expect(announcementQuizUnitId({
    ...newer,
    id: 'unit-published-grade-10-math-unit-2-v3',
  })).toBe('grade-10-math-unit-2');
  expect(announcementQuizUnitId(newer)).toBeNull();
});

test('retries announcement refresh quickly and returns to the normal interval', () => {
  expect(announcementRefreshDelay(0)).toBe(ANNOUNCEMENT_REFRESH_INTERVAL_MS);
  expect(announcementRefreshDelay(1)).toBe(30_000);
  expect(announcementRefreshDelay(2)).toBe(60_000);
  expect(announcementRefreshDelay(3)).toBe(ANNOUNCEMENT_REFRESH_INTERVAL_MS);
  expect(announcementRefreshDelay(20)).toBe(ANNOUNCEMENT_REFRESH_INTERVAL_MS);
});
