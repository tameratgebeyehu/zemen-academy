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
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
