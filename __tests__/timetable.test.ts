import { expect, test } from '@jest/globals';

import {
  addLocalDays,
  generateFourWeekStudyPlan,
  generateStudyTimetable,
  isValidStudyTime,
  migrateLegacyTimetable,
  rescheduleTimetableEntry,
  studyWeekDates,
  studyWeekForDate,
  timetableReminderCandidates,
  updateTimetableEntry,
} from '@/utils/timetable';

test('generates at least one balanced session for every selected subject', () => {
  const result = generateStudyTimetable({
    subjects: [
      { id: 'math', name: 'Mathematics' },
      { id: 'physics', name: 'Physics' },
      { id: 'chemistry', name: 'Chemistry' },
      { id: 'biology', name: 'Biology' },
    ],
    sessionsPerWeek: 3,
    preferredTime: '18:00',
  });

  expect(result).toHaveLength(4);
  expect(new Set(result.map((entry) => entry.subjectId))).toEqual(new Set(['math', 'physics', 'chemistry', 'biology']));
  expect(new Set(result.map((entry) => entry.weekday)).size).toBe(4);
});

test('adds a later second session when the plan has more than seven sessions', () => {
  const result = generateStudyTimetable({
    subjects: Array.from({ length: 9 }, (_, index) => ({ id: `s${index}`, name: `Subject ${index}` })),
    sessionsPerWeek: 7,
    preferredTime: '17:30',
  });

  expect(result).toHaveLength(9);
  expect(result[7]?.time).toBe('19:00');
  expect(result[8]?.time).toBe('19:00');
});

test('validates 24-hour study times', () => {
  expect(isValidStudyTime('07:30')).toBe(true);
  expect(isValidStudyTime('24:00')).toBe(false);
  expect(isValidStudyTime('7:30')).toBe(false);
});

test('generates four dated weeks with a different learning focus in each week', () => {
  const plan = generateFourWeekStudyPlan({
    subjects: [{ id: 'math', name: 'Mathematics' }, { id: 'physics', name: 'Physics' }],
    sessionsPerWeek: 3,
    weekdayTime: '18:00',
    weekendTime: '08:00',
    durationMinutes: 45,
    studyDays: [2, 4, 7],
    startDate: '2026-08-16',
    now: new Date('2026-08-16T09:00:00.000Z'),
  });

  expect(plan.entries).toHaveLength(12);
  expect(new Set(plan.entries.map((entry) => entry.weekIndex))).toEqual(new Set([1, 2, 3, 4]));
  expect(new Set(plan.entries.map((entry) => entry.focus))).toEqual(new Set(['foundation', 'practice', 'exam', 'review']));
  expect(plan.entries.filter((entry) => entry.weekIndex === 1).every((entry) => entry.date >= plan.startDate)).toBe(true);
  expect(plan.entries.find((entry) => entry.weekday === 7)?.time).toBe('08:00');
});

test('migrates a saved weekly timetable without losing its subjects', () => {
  const plan = migrateLegacyTimetable([
    { id: 'a', subjectId: 'math', subjectName: 'Mathematics', weekday: 2, time: '18:00', reminderEnabled: true },
    { id: 'b', subjectId: 'physics', subjectName: 'Physics', weekday: 4, time: '18:00', reminderEnabled: true },
  ], new Date('2026-08-16T09:00:00.000Z'));

  expect(plan?.schemaVersion).toBe(2);
  expect(plan?.entries).toHaveLength(8);
  expect(plan?.subjects.map((subject) => subject.id)).toEqual(['math', 'physics']);
});

test('completes and moves sessions without changing the rest of the plan', () => {
  const now = new Date('2026-08-16T09:00:00.000Z');
  const plan = generateFourWeekStudyPlan({
    subjects: [{ id: 'math', name: 'Mathematics' }],
    sessionsPerWeek: 1,
    weekdayTime: '18:00',
    startDate: '2026-08-16',
    now,
  });
  const first = plan.entries[0]!;
  const completed = updateTimetableEntry(plan, first.id, { status: 'completed' }, now);
  expect(completed.entries[0]?.status).toBe('completed');

  const tomorrow = addLocalDays(first.date, 1);
  const moved = updateTimetableEntry(completed, first.id, { moveToDate: tomorrow }, now);
  expect(moved.entries[0]).toMatchObject({ date: tomorrow, status: 'planned' });
});

test('selects only planned reminders inside the rolling fourteen-day window', () => {
  const now = new Date(2026, 7, 16, 9, 0, 0);
  const plan = generateFourWeekStudyPlan({
    subjects: [{ id: 'math', name: 'Mathematics' }],
    sessionsPerWeek: 3,
    weekdayTime: '18:00',
    startDate: '2026-08-16',
    now,
  });
  const completed = updateTimetableEntry(plan, plan.entries[0]!.id, { status: 'completed' }, now);
  const candidates = timetableReminderCandidates(completed.entries, now, 14);

  expect(candidates.length).toBeGreaterThan(0);
  expect(candidates.every((entry) => entry.status === 'planned')).toBe(true);
  expect(candidates.every((entry) => entry.triggerAt.getTime() <= now.getTime() + 14 * 86_400_000)).toBe(true);
  expect(candidates.some((entry) => entry.id === plan.entries[0]!.id)).toBe(false);
});

test('advances automatically through seven-day plan blocks', () => {
  const plan = generateFourWeekStudyPlan({
    subjects: [{ id: 'math', name: 'Mathematics' }],
    sessionsPerWeek: 1,
    weekdayTime: '18:00',
    startDate: '2026-08-16',
    now: new Date('2026-08-16T09:00:00.000Z'),
  });

  expect(studyWeekForDate(plan, '2026-08-16')).toBe(1);
  expect(studyWeekForDate(plan, '2026-08-22')).toBe(1);
  expect(studyWeekForDate(plan, '2026-08-23')).toBe(2);
  expect(studyWeekForDate(plan, '2026-08-30')).toBe(3);
  expect(studyWeekDates(plan, 2)).toEqual([
    '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29',
  ]);
});

test('reschedules one session without changing the plan defaults', () => {
  const plan = generateFourWeekStudyPlan({
    subjects: [{ id: 'math', name: 'Mathematics' }],
    sessionsPerWeek: 1,
    weekdayTime: '18:00',
    startDate: '2026-08-16',
    now: new Date('2026-08-16T09:00:00.000Z'),
  });
  const first = plan.entries[0]!;
  const changed = rescheduleTimetableEntry(plan, first.id, '2026-08-19', '19:00', new Date('2026-08-16T10:00:00.000Z'));

  expect(changed.entries.find((entry) => entry.id === first.id)).toMatchObject({
    date: '2026-08-19', time: '19:00', weekIndex: 1, status: 'planned',
  });
  expect(changed.weekdayTime).toBe('18:00');
  expect(() => rescheduleTimetableEntry(plan, first.id, '2026-09-20', '19:00')).toThrow('DATE_OUTSIDE_PLAN');
});
