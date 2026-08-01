import type { QuizAttempt } from '@/types';

export const MIN_DAILY_QUIZ_GOAL = 1;
export const MAX_DAILY_QUIZ_GOAL = 5;
export const DEFAULT_DAILY_QUIZ_GOAL = 1;

export function normalizeDailyQuizGoal(value: unknown): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return DEFAULT_DAILY_QUIZ_GOAL;
  return Math.min(MAX_DAILY_QUIZ_GOAL, Math.max(MIN_DAILY_QUIZ_GOAL, parsed));
}

export function attemptsCompletedToday(attempts: QuizAttempt[], now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + (24 * 60 * 60 * 1000);
  return attempts.filter((attempt) => {
    const completedAt = new Date(attempt.completedAt).getTime();
    return countsTowardGoal(attempt) && Number.isFinite(completedAt) && completedAt >= start && completedAt < end;
  }).length;
}

export function attemptsCompletedThisWeek(attempts: QuizAttempt[], now = new Date()): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayFromMonday = (startOfToday.getDay() + 6) % 7;
  const start = startOfToday.getTime() - (dayFromMonday * 24 * 60 * 60 * 1000);
  const end = start + (7 * 24 * 60 * 60 * 1000);
  return attempts.filter((attempt) => {
    const completedAt = new Date(attempt.completedAt).getTime();
    return countsTowardGoal(attempt) && Number.isFinite(completedAt) && completedAt >= start && completedAt < end;
  }).length;
}

function countsTowardGoal(attempt: QuizAttempt): boolean {
  return attempt.endReason === 'submitted' || attempt.endReason === 'time-expired';
}
