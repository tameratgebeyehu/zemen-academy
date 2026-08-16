import type { PastPaper, QuizAttempt, Subject, Unit } from '@/types';
import { scoreForAttempt } from '@/utils/quiz';

export interface ProgressSummary {
  completedAttempts: number;
  averageScore: number;
  bestScore: number;
  totalSeconds: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
}

export interface DayActivity {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
}

export interface SubjectProgress {
  subjectId: string;
  name: string;
  icon: string;
  attempts: number;
  averageScore: number;
  bestScore: number;
}

export function countsAsCompletedAttempt(attempt: QuizAttempt): boolean {
  return attempt.endReason === 'submitted' || attempt.endReason === 'time-expired';
}

export function summarizeProgress(attempts: QuizAttempt[]): ProgressSummary {
  const completed = attempts.filter(countsAsCompletedAttempt);
  const scores = completed.map(scoreForAttempt);
  const correct = scores.reduce((total, score) => total + score.correct, 0);
  const wrong = scores.reduce((total, score) => total + score.wrong, 0);
  const skipped = scores.reduce((total, score) => total + score.skipped, 0);
  const answered = correct + wrong;

  return {
    completedAttempts: completed.length,
    averageScore: completed.length
      ? Math.round(scores.reduce((total, score) => total + score.percentage, 0) / completed.length)
      : 0,
    bestScore: scores.reduce((best, score) => Math.max(best, score.percentage), 0),
    totalSeconds: completed.reduce((total, attempt) => total + Math.max(0, attempt.durationSeconds), 0),
    correct,
    wrong,
    skipped,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
  };
}

export function activityForLastSevenDays(attempts: QuizAttempt[], now = new Date()): DayActivity[] {
  const completed = attempts.filter(countsAsCompletedAttempt);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const start = date.getTime();
    const end = next.getTime();
    return {
      key: localDateKey(date),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
      count: completed.filter((attempt) => {
        const completedAt = new Date(attempt.completedAt).getTime();
        return Number.isFinite(completedAt) && completedAt >= start && completedAt < end;
      }).length,
      isToday: index === 6,
    };
  });
}

export function currentStudyStreak(attempts: QuizAttempt[], now = new Date()): number {
  const activeDates = new Set(
    attempts
      .filter(countsAsCompletedAttempt)
      .map((attempt) => new Date(attempt.completedAt))
      .filter((date) => Number.isFinite(date.getTime()))
      .map(localDateKey),
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cursor = activeDates.has(localDateKey(today))
    ? today
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  let streak = 0;
  while (activeDates.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function progressBySubject(
  attempts: QuizAttempt[],
  units: Unit[],
  subjects: Subject[],
  pastPapers: PastPaper[] = [],
): SubjectProgress[] {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const papersById = new Map(pastPapers.map((paper) => [paper.id, paper]));
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  const paperSubjectsById = new Map(pastPapers.map((paper) => [paper.subjectId, paper]));
  const grouped = new Map<string, number[]>();

  attempts.filter(countsAsCompletedAttempt).forEach((attempt) => {
    const subjectId = unitsById.get(attempt.unitId)?.subjectId ?? papersById.get(attempt.unitId)?.subjectId;
    if (!subjectId || (!subjectsById.has(subjectId) && !paperSubjectsById.has(subjectId))) return;
    const scores = grouped.get(subjectId) ?? [];
    scores.push(scoreForAttempt(attempt).percentage);
    grouped.set(subjectId, scores);
  });

  return [...grouped.entries()].map(([subjectId, scores]) => {
    const subject = subjectsById.get(subjectId);
    const paperSubject = paperSubjectsById.get(subjectId);
    return {
      subjectId,
      name: subject?.name ?? paperSubject?.subjectName ?? 'Entrance exam',
      icon: subject?.icon ?? paperSubject?.subjectIcon ?? 'clipboard-text-outline',
      attempts: scores.length,
      averageScore: Math.round(scores.reduce((total, score) => total + score, 0) / scores.length),
      bestScore: Math.max(...scores),
    };
  }).sort((left, right) => right.attempts - left.attempts || right.averageScore - left.averageScore);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
