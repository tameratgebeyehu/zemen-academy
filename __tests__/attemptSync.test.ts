import { expect, test } from '@jest/globals';

import type { QuizAttempt } from '@/types';
import { mergeSyncedAttempts } from '@/utils/attemptSync';

function attempt(id: string, remoteOnly = false): QuizAttempt {
  return {
    id,
    unitId: 'physics-1',
    mode: 'instant',
    questions: [],
    answers: [],
    startedAt: '2026-08-01T10:00:00.000Z',
    completedAt: id === 'newer' ? '2026-08-02T10:00:00.000Z' : '2026-08-01T10:05:00.000Z',
    durationSeconds: 300,
    endReason: 'submitted',
    synced: remoteOnly,
    remoteOnly,
    scoreSnapshot: remoteOnly
      ? { total: 10, correct: 8, wrong: 1, skipped: 1, percentage: 80 }
      : undefined,
  };
}

test('adds cloud attempts, de-duplicates IDs, and keeps newest first', () => {
  const local = [attempt('older')];
  const merged = mergeSyncedAttempts(local, [attempt('older', true), attempt('newer', true)]);

  expect(merged.map((item) => item.id)).toEqual(['newer', 'older']);
  expect(merged.find((item) => item.id === 'older')).toMatchObject({ synced: true, remoteOnly: true });
});

test('preserves local question detail after the same result reaches the cloud', () => {
  const local = attempt('older');
  local.questions = [{
    id: 'q1', unitId: 'physics-1', prompt: 'Question',
    options: ['A', 'B', 'C', 'D'], correctAnswer: 0, explanation: 'Because', order: 1,
  }];
  local.answers = [0];

  const merged = mergeSyncedAttempts([local], [attempt('older', true)])[0]!;
  expect(merged.questions).toHaveLength(1);
  expect(merged).toMatchObject({ synced: true, remoteOnly: false });
});

test('returns the existing array when an identical cloud snapshot is merged again', () => {
  const local = [attempt('older', true)];
  expect(mergeSyncedAttempts(local, [attempt('older', true)])).toBe(local);
});
