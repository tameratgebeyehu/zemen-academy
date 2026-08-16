import { expect, jest, test } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  },
}));

import { normalizePersistedState } from '@/services/storage';

test('repairs malformed persisted collections instead of crashing the app', () => {
  const repaired = normalizePersistedState({
    schemaVersion: 1,
    user: { id: 'user-1', name: 'Student', isGuest: false, isPremium: false },
    unitDownloads: 'broken' as never,
    paperDownloads: null as never,
    attempts: {} as never,
    pendingQuestionReports: 'broken' as never,
    catalog: { subjects: null, units: 'broken', pastPapers: [] } as never,
  });
  expect(repaired.localDataOwnerId).toBe('user-1');
  expect(repaired.unitDownloads).toEqual([]);
  expect(repaired.noteDownloads).toEqual([]);
  expect(repaired.paperDownloads).toEqual([]);
  expect(repaired.attempts).toEqual([]);
  expect(repaired.pendingQuestionReports).toEqual([]);
  expect(Array.isArray(repaired.catalog.subjects)).toBe(true);
  expect(Array.isArray(repaired.catalog.units)).toBe(true);
});

test('rejects unsupported state schemas safely', () => {
  const repaired = normalizePersistedState({ schemaVersion: 99 as never });
  expect(repaired.schemaVersion).toBe(1);
  expect(repaired.user).toBeNull();
});

test('migrates an old Amharic preference to the English-only Version 1 interface', () => {
  const repaired = normalizePersistedState({
    schemaVersion: 1,
    preferences: {
      grade: 10,
      language: 'am',
      theme: 'dark',
      reminderTime: '19:00',
      dailyQuizGoal: 2,
      notificationsEnabled: true,
    },
  });
  expect(repaired.preferences.language).toBe('en');
});

test('restores complete downloaded quiz questions and note bodies after an offline restart', () => {
  const repaired = normalizePersistedState({
    schemaVersion: 1,
    unitDownloads: [{
      unit: { id: 'unit-1' },
      subject: { id: 'subject-1' },
      questions: [{ id: 'question-1', prompt: 'Offline question' }],
      downloadedAt: '2026-08-15T00:00:00.000Z',
      byteSize: 100,
    }] as never,
    noteDownloads: [{
      note: { id: 'note-1', body: '## Offline note' },
      downloadedAt: '2026-08-15T00:00:00.000Z',
      byteSize: 100,
    }] as never,
  });
  expect(repaired.unitDownloads[0]?.questions[0]?.prompt).toBe('Offline question');
  expect(repaired.noteDownloads[0]?.note.body).toBe('## Offline note');
});
