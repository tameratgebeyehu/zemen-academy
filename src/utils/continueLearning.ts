import type { Grade, QuizAttempt, Stream, Subject, Unit, UnitDownload } from '@/types';

interface ContinueLearningInput {
  grade: Grade;
  stream?: Stream;
  subjects: Subject[];
  units: Unit[];
  attempts: QuizAttempt[];
  downloads: UnitDownload[];
  lastViewedSubjectId?: string;
  lastViewedUnitId?: string;
}

export interface ContinueLearningSelection {
  subject?: Subject;
  unit?: Unit;
  attempt?: QuizAttempt;
  hasHistory: boolean;
}

export function selectContinueLearning(input: ContinueLearningInput): ContinueLearningSelection {
  const matchingSubjects = input.subjects.filter((subject) => (
    subject.grade === input.grade
    && (input.grade < 11 || subject.stream === input.stream)
  ));
  const subjectIds = new Set(matchingSubjects.map((subject) => subject.id));
  const matchingUnits = input.units.filter((unit) => subjectIds.has(unit.subjectId));
  const matchingDownloads = input.downloads.filter((download) => (
    subjectIds.has(download.subject.id)
    && download.subject.grade === input.grade
    && (input.grade < 11 || download.subject.stream === input.stream)
  ));
  const unitsById = new Map(matchingUnits.map((unit) => [unit.id, unit]));
  matchingDownloads.forEach((download) => {
    if (!unitsById.has(download.unit.id)) unitsById.set(download.unit.id, download.unit);
  });

  const latestAttempt = input.attempts.find((attempt) => (
    (attempt.contentType ?? 'unit') === 'unit' && unitsById.has(attempt.unitId)
  ));
  const latestDownload = matchingDownloads[0];
  const lastViewedUnit = input.lastViewedUnitId ? unitsById.get(input.lastViewedUnitId) : undefined;
  const unit = lastViewedUnit
    ?? (latestAttempt ? unitsById.get(latestAttempt.unitId) : undefined)
    ?? latestDownload?.unit;
  const subject = matchingSubjects.find((item) => item.id === unit?.subjectId)
    ?? matchingSubjects.find((item) => item.id === input.lastViewedSubjectId)
    ?? (latestDownload && matchingSubjects.find((item) => item.id === latestDownload.subject.id))
    ?? matchingSubjects[0];
  const attempt = unit
    ? input.attempts.find((item) => (item.contentType ?? 'unit') === 'unit' && item.unitId === unit.id)
    : undefined;
  const hasHistory = Boolean(
    lastViewedUnit
    || latestAttempt
    || latestDownload
    || (input.lastViewedSubjectId && subject?.id === input.lastViewedSubjectId),
  );

  return { subject, unit, attempt, hasHistory };
}
