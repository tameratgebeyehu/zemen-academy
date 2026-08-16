import { expect, test } from '@jest/globals';

import type { QuizAttempt, Subject, Unit, UnitDownload } from '@/types';
import { selectContinueLearning } from '@/utils/continueLearning';

const grade9Subject: Subject = {
  id: 'g9-math', grade: 9, name: 'Mathematics 9', nameAm: '', icon: 'calculator', order: 1, updatedAt: '',
};
const grade10Subject: Subject = {
  id: 'g10-math', grade: 10, name: 'Mathematics 10', nameAm: '', icon: 'calculator', order: 1, updatedAt: '',
};
const grade9Unit: Unit = {
  id: 'g9-math-u1', subjectId: grade9Subject.id, number: 1, title: 'Grade 9 unit', titleAm: '', questionCount: 10, version: 1, updatedAt: '',
};
const grade10Unit: Unit = {
  id: 'g10-math-u1', subjectId: grade10Subject.id, number: 1, title: 'Grade 10 unit', titleAm: '', questionCount: 10, version: 1, updatedAt: '',
};

function attempt(unitId: string): QuizAttempt {
  return {
    id: `attempt-${unitId}`,
    unitId,
    mode: 'instant',
    questions: [],
    answers: [],
    startedAt: '2026-08-15T10:00:00.000Z',
    completedAt: '2026-08-15T10:10:00.000Z',
    durationSeconds: 600,
    endReason: 'submitted',
    synced: true,
  };
}

test('never carries Grade 9 continuation into a Grade 10 home screen', () => {
  const grade9Download: UnitDownload = {
    subject: grade9Subject,
    unit: grade9Unit,
    questions: [],
    downloadedAt: '2026-08-15T10:00:00.000Z',
    byteSize: 100,
  };
  const selection = selectContinueLearning({
    grade: 10,
    subjects: [grade9Subject, grade10Subject],
    units: [grade9Unit, grade10Unit],
    attempts: [attempt(grade9Unit.id)],
    downloads: [grade9Download],
    lastViewedSubjectId: grade9Subject.id,
    lastViewedUnitId: grade9Unit.id,
  });

  expect(selection.subject?.id).toBe(grade10Subject.id);
  expect(selection.unit).toBeUndefined();
  expect(selection.attempt).toBeUndefined();
  expect(selection.hasHistory).toBe(false);
});

test('continues the newest matching unit inside the active grade', () => {
  const selection = selectContinueLearning({
    grade: 10,
    subjects: [grade9Subject, grade10Subject],
    units: [grade9Unit, grade10Unit],
    attempts: [attempt(grade9Unit.id), attempt(grade10Unit.id)],
    downloads: [],
    lastViewedUnitId: grade9Unit.id,
  });

  expect(selection.unit?.id).toBe(grade10Unit.id);
  expect(selection.attempt?.unitId).toBe(grade10Unit.id);
  expect(selection.hasHistory).toBe(true);
});
