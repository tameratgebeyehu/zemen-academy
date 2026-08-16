import { expect, test } from '@jest/globals';

import { compactStoredAttempts, MAX_DETAILED_ATTEMPTS } from '@/utils/attemptRetention';
import type { QuizAttempt } from '@/types';

function attempt(index: number, synced = true): QuizAttempt {
  return {
    id: `attempt-${index}`,
    unitId: 'unit-1',
    mode: 'instant',
    questions: [{
      id: `question-${index}`,
      unitId: 'unit-1',
      prompt: 'Question',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
      explanation: 'Explanation',
      order: 1,
    }],
    answers: [0],
    startedAt: new Date(2_000_000 - index * 1_000).toISOString(),
    completedAt: new Date(2_000_500 - index * 1_000).toISOString(),
    durationSeconds: 30,
    endReason: 'submitted',
    synced,
  };
}

test('keeps recent detailed results and compacts older synced attempts', () => {
  const compacted = compactStoredAttempts(Array.from({ length: 25 }, (_, index) => attempt(index)));
  expect(compacted).toHaveLength(25);
  expect(compacted.slice(0, MAX_DETAILED_ATTEMPTS).every((item) => item.questions.length === 1)).toBe(true);
  expect(compacted.slice(MAX_DETAILED_ATTEMPTS).every((item) => (
    item.questions.length === 0 && item.remoteOnly && item.scoreSnapshot?.correct === 1
  ))).toBe(true);
});

test('never removes question data required by an unsynced attempt', () => {
  const attempts = Array.from({ length: 25 }, (_, index) => attempt(index));
  attempts.push(attempt(100, false));
  const compacted = compactStoredAttempts(attempts);
  const pending = compacted.find((item) => item.id === 'attempt-100');
  expect(pending).toMatchObject({ synced: false });
  expect(pending?.remoteOnly).toBeUndefined();
  expect(pending?.questions).toHaveLength(1);
});
