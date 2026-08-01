import { expect, test } from '@jest/globals';

import { calculateScore, formatDuration } from '../src/utils/quiz';
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
});
