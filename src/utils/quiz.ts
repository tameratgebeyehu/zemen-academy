import type { AnswerIndex, Question, QuizAttempt, QuizScore } from '@/types';

export function calculateScore(
  questions: Question[],
  answers: Array<AnswerIndex | null>,
): QuizScore {
  let correct = 0;
  let skipped = 0;

  questions.forEach((question, index) => {
    const answer = answers[index];
    if (answer === null || answer === undefined) skipped += 1;
    else if (answer === question.correctAnswer) correct += 1;
  });

  const total = questions.length;
  const wrong = total - correct - skipped;
  return {
    total,
    correct,
    wrong,
    skipped,
    percentage: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}

export function scoreForAttempt(attempt: QuizAttempt): QuizScore {
  if (!attempt.scoreSnapshot) return calculateScore(attempt.questions, attempt.answers);
  const correct = Math.max(0, Number(attempt.scoreSnapshot.correct) || 0);
  const wrong = Math.max(0, Number(attempt.scoreSnapshot.wrong) || 0);
  const skipped = Math.max(0, Number(attempt.scoreSnapshot.skipped) || 0);
  const total = correct + wrong + skipped;
  return {
    total,
    correct,
    wrong,
    skipped,
    percentage: total ? Math.round((correct / total) * 100) : 0,
  };
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDurationWords(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.ceil(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes || !hours) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ');
}

export function quizDurationSeconds(questionCount: number): number {
  return Math.max(1, Math.floor(Number(questionCount) || 0)) * 60;
}

export function steadyNowMs(): number {
  const monotonic = globalThis.performance?.now?.();
  return Number.isFinite(monotonic) ? Number(monotonic) : Date.now();
}

export function countdownSeconds(deadlineMs: number, nowMs = Date.now()): number {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}
