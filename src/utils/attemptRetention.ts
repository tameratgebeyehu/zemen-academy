import type { QuizAttempt } from '@/types';
import { calculateScore } from '@/utils/quiz';

export const MAX_DETAILED_ATTEMPTS = 20;
export const MAX_STORED_ATTEMPTS = 1000;

export function compactStoredAttempts(attempts: QuizAttempt[]): QuizAttempt[] {
  const sorted = [...attempts].sort((left, right) => (
    new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime()
  ));
  let detailed = 0;
  const compacted = sorted.map((attempt) => {
    if (!attempt.synced || !attempt.questions.length) return attempt;
    detailed += 1;
    if (detailed <= MAX_DETAILED_ATTEMPTS) return attempt;
    return {
      ...attempt,
      questions: [],
      answers: [],
      remoteOnly: true,
      scoreSnapshot: attempt.scoreSnapshot ?? calculateScore(attempt.questions, attempt.answers),
    };
  });

  const retained = compacted.slice(0, MAX_STORED_ATTEMPTS);
  const retainedIds = new Set(retained.map((attempt) => attempt.id));
  compacted.forEach((attempt) => {
    if (!attempt.synced && !retainedIds.has(attempt.id)) retained.push(attempt);
  });
  return retained;
}
