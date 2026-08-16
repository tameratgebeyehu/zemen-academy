import { expect, test } from '@jest/globals';

import {
  calculateScore,
  countdownSeconds,
  formatDuration,
  formatDurationWords,
  quizDurationSeconds,
  steadyNowMs,
} from '../src/utils/quiz';
import type { Question } from '../src/types';

const questions: Question[] = [
  { id: '1', unitId: 'u', prompt: 'One?', options: ['1', '2', '3', '4'], correctAnswer: 0, explanation: '', order: 1 },
  { id: '2', unitId: 'u', prompt: 'Two?', options: ['1', '2', '3', '4'], correctAnswer: 1, explanation: '', order: 2 },
  { id: '3', unitId: 'u', prompt: 'Three?', options: ['1', '2', '3', '4'], correctAnswer: 2, explanation: '', order: 3 },
];

test('calculates correct, wrong, skipped, and percentage', () => {
  expect(calculateScore(questions, [0, 0, null])).toEqual({
    total: 3, correct: 1, wrong: 1, skipped: 1, percentage: 33,
  });
});

test('formats elapsed time', () => {
  expect(formatDuration(125)).toBe('2:05');
  expect(formatDuration(9_000)).toBe('2:30:00');
  expect(formatDurationWords(9_000)).toBe('2 hours 30 minutes');
  expect(formatDurationWords(3_600)).toBe('1 hour');
});

test('allocates exactly one minute per question', () => {
  expect(quizDurationSeconds(1)).toBe(60);
  expect(quizDurationSeconds(100)).toBe(6_000);
  expect(quizDurationSeconds(150)).toBe(9_000);
  expect(quizDurationSeconds(0)).toBe(60);
});

test('counts down from a fixed deadline without extending the attempt', () => {
  const deadline = 1_000_000;
  expect(countdownSeconds(deadline, deadline - 60_000)).toBe(60);
  expect(countdownSeconds(deadline, deadline - 59_001)).toBe(60);
  expect(countdownSeconds(deadline, deadline - 59_000)).toBe(59);
  expect(countdownSeconds(deadline, deadline - 1)).toBe(1);
  expect(countdownSeconds(deadline, deadline)).toBe(0);
  expect(countdownSeconds(deadline, deadline + 30_000)).toBe(0);
});

test('uses a finite monotonic runtime clock for attempt deadlines', () => {
  const first = steadyNowMs();
  const second = steadyNowMs();
  expect(Number.isFinite(first)).toBe(true);
  expect(second).toBeGreaterThanOrEqual(first);
});
