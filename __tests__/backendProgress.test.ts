import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@jest/globals';

function progressHarness() {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  const utilities = {
    formatDate: (date: Date) => date.toISOString().slice(0, 10),
  };
  return new Function(
    'Utilities',
    `${source}; return { progressSummaryFromAttempts_ };`,
  )(utilities) as {
    progressSummaryFromAttempts_: (
      attempts: Array<Record<string, unknown>>,
      nowMs: number,
    ) => Record<string, number | string>;
  };
}

test('builds a durable progress summary and ignores abandoned attempts', () => {
  const { progressSummaryFromAttempts_ } = progressHarness();
  const summary = progressSummaryFromAttempts_([
    {
      endReason: 'submitted',
      correct: 2,
      wrong: 0,
      skipped: 0,
      durationSeconds: 120,
      completedAt: '2026-08-14T12:00:00.000Z',
    },
    {
      endReason: 'time-expired',
      correct: 1,
      wrong: 1,
      skipped: 0,
      durationSeconds: 60,
      completedAt: '2026-08-15T12:00:00.000Z',
    },
    {
      endReason: 'quit',
      correct: 50,
      wrong: 0,
      skipped: 0,
      durationSeconds: 900,
      completedAt: '2026-08-15T13:00:00.000Z',
    },
  ], new Date('2026-08-15T15:00:00.000Z').getTime());

  expect(summary).toMatchObject({
    completedAttempts: 2,
    totalSeconds: 180,
    currentStreak: 2,
    averageScore: 75,
    bestScore: 100,
    correct: 3,
    wrong: 1,
    skipped: 0,
    lastCompletedAt: '2026-08-15T12:00:00.000Z',
  });
});
