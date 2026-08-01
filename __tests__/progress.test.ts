import { expect, test } from '@jest/globals';

import type { QuizAttempt, Question, Subject, Unit } from '@/types';
import { activityForLastSevenDays, currentStudyStreak, progressBySubject, summarizeProgress } from '@/utils/progress';

const questions: Question[] = [
  { id: 'q1', unitId: 'unit-1', prompt: 'One', options: ['A', 'B', 'C', 'D'], correctAnswer: 0, explanation: '', order: 1 },
  { id: 'q2', unitId: 'unit-1', prompt: 'Two', options: ['A', 'B', 'C', 'D'], correctAnswer: 1, explanation: '', order: 2 },
];

function attempt(id: string, completedAt: Date, answers: QuizAttempt['answers'] = [0, 1], endReason: QuizAttempt['endReason'] = 'submitted'): QuizAttempt {
  return {
    id,
    unitId: 'unit-1',
    mode: 'instant',
    questions,
    answers,
    startedAt: completedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationSeconds: 120,
    endReason,
    synced: true,
  };
}

test('summarizes completed attempts and ignores abandoned attempts', () => {
  const attempts = [
    attempt('perfect', new Date(2026, 7, 5, 8), [0, 1]),
    attempt('half', new Date(2026, 7, 5, 9), [0, 0]),
    attempt('quit', new Date(2026, 7, 5, 10), [0, 1], 'quit'),
  ];
  expect(summarizeProgress(attempts)).toEqual({
    completedAttempts: 2,
    averageScore: 75,
    bestScore: 100,
    totalSeconds: 240,
    correct: 3,
    wrong: 1,
    skipped: 0,
    accuracy: 75,
  });
});

test('uses a synced score snapshot when question detail lives on another device', () => {
  const remote = attempt('remote', new Date('2026-08-02T10:00:00.000Z'), [], 'submitted');
  remote.questions = [];
  remote.remoteOnly = true;
  remote.scoreSnapshot = { total: 20, correct: 15, wrong: 3, skipped: 2, percentage: 75 };

  expect(summarizeProgress([remote])).toMatchObject({
    completedAttempts: 1,
    averageScore: 75,
    bestScore: 75,
    correct: 15,
    wrong: 3,
    skipped: 2,
  });
});

test('builds seven-day activity and a continuing streak', () => {
  const now = new Date(2026, 7, 5, 12);
  const attempts = [
    attempt('today', new Date(2026, 7, 5, 8)),
    attempt('yesterday', new Date(2026, 7, 4, 8)),
    attempt('two-days', new Date(2026, 7, 3, 8)),
  ];
  expect(activityForLastSevenDays(attempts, now).map((day) => day.count)).toEqual([0, 0, 0, 0, 1, 1, 1]);
  expect(currentStudyStreak(attempts, now)).toBe(3);
});

test('groups scores by the catalog subject', () => {
  const units: Unit[] = [{ id: 'unit-1', subjectId: 'physics', number: 1, title: 'Motion', titleAm: 'Motion', questionCount: 2, version: 1, updatedAt: '' }];
  const subjects: Subject[] = [{ id: 'physics', grade: 9, name: 'Physics', nameAm: 'Physics', icon: 'atom', order: 1, updatedAt: '' }];
  const progress = progressBySubject([
    attempt('perfect', new Date(2026, 7, 5, 8), [0, 1]),
    attempt('half', new Date(2026, 7, 5, 9), [0, 0]),
  ], units, subjects);
  expect(progress).toEqual([{ subjectId: 'physics', name: 'Physics', icon: 'atom', attempts: 2, averageScore: 75, bestScore: 100 }]);
});
