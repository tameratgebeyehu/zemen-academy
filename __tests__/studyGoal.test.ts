import { expect, test } from '@jest/globals';

import type { QuizAttempt } from '@/types';
import {
  attemptsCompletedThisWeek,
  attemptsCompletedToday,
  normalizeDailyQuizGoal,
} from '@/utils/studyGoal';

function attempt(id: string, completedAt: Date): QuizAttempt {
  return {
    id,
    unitId: 'unit-1',
    mode: 'instant',
    questions: [],
    answers: [],
    startedAt: completedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationSeconds: 60,
    endReason: 'submitted',
    synced: true,
  };
}

function abandonedAttempt(id: string, completedAt: Date): QuizAttempt {
  return { ...attempt(id, completedAt), endReason: 'quit' };
}

test('normalizes a daily goal to one through five quizzes', () => {
  expect(normalizeDailyQuizGoal(undefined)).toBe(1);
  expect(normalizeDailyQuizGoal(0)).toBe(1);
  expect(normalizeDailyQuizGoal(2.4)).toBe(2);
  expect(normalizeDailyQuizGoal('4')).toBe(4);
  expect(normalizeDailyQuizGoal(20)).toBe(5);
});

test('counts only attempts completed on the current local day', () => {
  const now = new Date(2026, 7, 5, 12, 0, 0);
  const attempts = [
    attempt('today-1', new Date(2026, 7, 5, 8, 0, 0)),
    attempt('today-2', new Date(2026, 7, 5, 23, 59, 0)),
    abandonedAttempt('quit-today', new Date(2026, 7, 5, 10, 0, 0)),
    attempt('yesterday', new Date(2026, 7, 4, 23, 59, 0)),
    attempt('tomorrow', new Date(2026, 7, 6, 0, 0, 0)),
  ];

  expect(attemptsCompletedToday(attempts, now)).toBe(2);
});

test('counts the current Monday-to-Sunday study week', () => {
  const now = new Date(2026, 7, 5, 12, 0, 0);
  const attempts = [
    attempt('monday', new Date(2026, 7, 3, 0, 0, 0)),
    attempt('wednesday', new Date(2026, 7, 5, 10, 0, 0)),
    attempt('previous-sunday', new Date(2026, 7, 2, 23, 59, 0)),
    attempt('next-monday', new Date(2026, 7, 10, 0, 0, 0)),
  ];

  expect(attemptsCompletedThisWeek(attempts, now)).toBe(2);
});
