import type { QuizAttempt } from '@/types';

export function mergeSyncedAttempts(local: QuizAttempt[], remote: QuizAttempt[]): QuizAttempt[] {
  const merged = new Map(remote.map((attempt) => [attempt.id, attempt]));

  local.forEach((attempt) => {
    const cloudAttempt = merged.get(attempt.id);
    if (!cloudAttempt) {
      merged.set(attempt.id, attempt);
      return;
    }

    if (attempt.questions.length) {
      merged.set(attempt.id, {
        ...cloudAttempt,
        ...attempt,
        synced: true,
        remoteOnly: false,
        scoreSnapshot: cloudAttempt.scoreSnapshot ?? attempt.scoreSnapshot,
      });
    }
  });

  const result = [...merged.values()].sort((left, right) => (
    new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime()
  ));
  if (result.length === local.length && result.every((attempt, index) => sameAttempt(local[index], attempt))) {
    return local;
  }
  return result;
}

function sameAttempt(left: QuizAttempt | undefined, right: QuizAttempt): boolean {
  if (!left) return false;
  const leftScore = left.scoreSnapshot;
  const rightScore = right.scoreSnapshot;
  return left.id === right.id
    && left.unitId === right.unitId
    && left.mode === right.mode
    && left.startedAt === right.startedAt
    && left.completedAt === right.completedAt
    && left.durationSeconds === right.durationSeconds
    && left.endReason === right.endReason
    && left.synced === right.synced
    && Boolean(left.remoteOnly) === Boolean(right.remoteOnly)
    && (left.remoteOnly && right.remoteOnly ? left.questions.length === right.questions.length : left.questions === right.questions)
    && (left.remoteOnly && right.remoteOnly ? left.answers.length === right.answers.length : left.answers === right.answers)
    && leftScore?.correct === rightScore?.correct
    && leftScore?.wrong === rightScore?.wrong
    && leftScore?.skipped === rightScore?.skipped;
}
