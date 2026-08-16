import { isValidLocalTime } from '@/utils/ethiopianTime';

export type TimetableStatus = 'planned' | 'completed' | 'skipped';
export type TimetableFocus = 'foundation' | 'practice' | 'exam' | 'review';
export type StudyDuration = 30 | 45 | 60;

export type TimetableEntry = {
  id: string;
  subjectId: string;
  subjectName: string;
  /** JavaScript/Expo weekday: Sunday = 1, Monday = 2, ... Saturday = 7. */
  weekday: number;
  /** Device-local 24-hour time. It is displayed to students using the Ethiopian clock. */
  time: string;
  date: string;
  weekIndex: 1 | 2 | 3 | 4;
  durationMinutes: StudyDuration;
  focus: TimetableFocus;
  status: TimetableStatus;
  reminderEnabled: boolean;
  completedAt?: string;
};

export type TimetableSubject = {
  id: string;
  name: string;
};

export type StudyPlan = {
  schemaVersion: 2;
  startDate: string;
  updatedAt: string;
  sessionsPerWeek: number;
  studyDays: number[];
  weekdayTime: string;
  weekendTime: string;
  durationMinutes: StudyDuration;
  remindersEnabled: boolean;
  subjects: TimetableSubject[];
  entries: TimetableEntry[];
};

export type GenerateFourWeekPlanInput = {
  subjects: TimetableSubject[];
  sessionsPerWeek: number;
  weekdayTime: string;
  weekendTime?: string;
  durationMinutes?: StudyDuration;
  studyDays?: number[];
  remindersEnabled?: boolean;
  startDate?: string;
  now?: Date;
};

type LegacyTimetableEntry = {
  subjectId?: string;
  subjectName?: string;
  weekday?: number;
  time?: string;
  reminderEnabled?: boolean;
};

const BALANCED_DAYS = [2, 4, 6, 1, 3, 5, 7] as const;
const FOCUS_BY_WEEK: Record<1 | 2 | 3 | 4, TimetableFocus> = {
  1: 'foundation',
  2: 'practice',
  3: 'exam',
  4: 'review',
};

export const TIMETABLE_FOCUS_LABEL: Record<TimetableFocus, string> = {
  foundation: 'Build the foundation',
  practice: 'Strengthen with practice',
  exam: 'Prepare under exam conditions',
  review: 'Review and close the gaps',
};

export function isValidStudyTime(value: string): boolean {
  return isValidLocalTime(value);
}

export function localDateKey(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromLocalKey(value: string, time = '12:00'): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || !isValidStudyTime(time)) return null;
  const [, yearText = '', monthText = '', dayText = ''] = match;
  const [hourText = '12', minuteText = '00'] = time.split(':');
  const result = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    0,
    0,
  );
  return localDateKey(result) === value ? result : null;
}

export function addLocalDays(value: string, days: number): string {
  const date = dateFromLocalKey(value);
  if (!date) throw new Error('INVALID_DATE');
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function studyWeekForDate(plan: Pick<StudyPlan, 'startDate'>, date = localDateKey()): 1 | 2 | 3 | 4 {
  const start = dateFromLocalKey(plan.startDate);
  const target = dateFromLocalKey(date);
  if (!start || !target) return 1;
  const elapsed = Math.floor((target.getTime() - start.getTime()) / 86_400_000);
  return Math.min(4, Math.max(1, Math.floor(Math.max(0, elapsed) / 7) + 1)) as 1 | 2 | 3 | 4;
}

export function studyWeekDates(plan: Pick<StudyPlan, 'startDate'>, weekIndex: 1 | 2 | 3 | 4): string[] {
  const firstDate = addLocalDays(plan.startDate, (weekIndex - 1) * 7);
  return Array.from({ length: 7 }, (_, index) => addLocalDays(firstDate, index));
}

function weekdayForDate(value: string): number {
  const date = dateFromLocalKey(value);
  if (!date) throw new Error('INVALID_DATE');
  return date.getDay() + 1;
}

function addMinutes(value: string, minutes: number): string {
  const [hourText = '18', minuteText = '00'] = value.split(':');
  const total = (Number(hourText) * 60 + Number(minuteText) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function uniqueSubjects(subjects: TimetableSubject[]): TimetableSubject[] {
  return subjects
    .map((subject) => ({ id: subject.id.trim(), name: subject.name.trim() }))
    .filter((subject, index, all) => (
      Boolean(subject.id && subject.name)
      && all.findIndex((candidate) => candidate.id === subject.id) === index
    ));
}

function normalizedDays(days: number[] | undefined): number[] {
  const selected = new Set((days ?? BALANCED_DAYS).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7));
  const balanced = BALANCED_DAYS.filter((day) => selected.has(day));
  return balanced.length ? [...balanced] : [...BALANCED_DAYS];
}

function sessionDate(startDate: string, weekOffset: number, weekday: number): string {
  const startWeekday = weekdayForDate(startDate);
  const offsetWithinWeek = (weekday - startWeekday + 7) % 7;
  return addLocalDays(startDate, weekOffset * 7 + offsetWithinWeek);
}

export function generateFourWeekStudyPlan({
  subjects,
  sessionsPerWeek,
  weekdayTime,
  weekendTime = weekdayTime,
  durationMinutes = 45,
  studyDays,
  remindersEnabled = true,
  startDate,
  now = new Date(),
}: GenerateFourWeekPlanInput): StudyPlan {
  if (!isValidStudyTime(weekdayTime) || !isValidStudyTime(weekendTime)) throw new Error('INVALID_TIME');
  if (![30, 45, 60].includes(durationMinutes)) throw new Error('INVALID_DURATION');

  const cleanSubjects = uniqueSubjects(subjects);
  const planStart = startDate ?? localDateKey(now);
  if (!dateFromLocalKey(planStart)) throw new Error('INVALID_DATE');
  const days = normalizedDays(studyDays);
  if (!cleanSubjects.length) {
    return {
      schemaVersion: 2,
      startDate: planStart,
      updatedAt: now.toISOString(),
      sessionsPerWeek: 0,
      studyDays: days,
      weekdayTime,
      weekendTime,
      durationMinutes,
      remindersEnabled,
      subjects: [],
      entries: [],
    };
  }

  const weeklyCount = Math.max(cleanSubjects.length, Math.min(14, Math.max(1, Math.round(sessionsPerWeek))));
  const entries: TimetableEntry[] = [];
  for (let weekOffset = 0; weekOffset < 4; weekOffset += 1) {
    const weekIndex = (weekOffset + 1) as 1 | 2 | 3 | 4;
    for (let slot = 0; slot < weeklyCount; slot += 1) {
      const subjectIndex = (weekOffset * weeklyCount + slot) % cleanSubjects.length;
      const subject = cleanSubjects[subjectIndex]!;
      const weekday = days[slot % days.length]!;
      const date = sessionDate(planStart, weekOffset, weekday);
      const sameDayRound = Math.floor(slot / days.length);
      const baseTime = weekday === 1 || weekday === 7 ? weekendTime : weekdayTime;
      entries.push({
        id: `plan-${date}-${slot}-${subject.id}`,
        subjectId: subject.id,
        subjectName: subject.name,
        weekday,
        time: addMinutes(baseTime, sameDayRound * 90),
        date,
        weekIndex,
        durationMinutes,
        focus: FOCUS_BY_WEEK[weekIndex],
        status: 'planned',
        reminderEnabled: remindersEnabled,
      });
    }
  }

  return {
    schemaVersion: 2,
    startDate: planStart,
    updatedAt: now.toISOString(),
    sessionsPerWeek: weeklyCount,
    studyDays: days,
    weekdayTime,
    weekendTime,
    durationMinutes,
    remindersEnabled,
    subjects: cleanSubjects,
    entries: entries.sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`)),
  };
}

export function isStudyPlan(value: unknown): value is StudyPlan {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StudyPlan>;
  return candidate.schemaVersion === 2
    && typeof candidate.startDate === 'string'
    && typeof candidate.updatedAt === 'string'
    && Array.isArray(candidate.entries)
    && Array.isArray(candidate.subjects);
}

export function migrateLegacyTimetable(value: unknown, now = new Date()): StudyPlan | null {
  if (isStudyPlan(value)) return value;
  if (!Array.isArray(value) || value.length === 0) return null;
  const legacy = value as LegacyTimetableEntry[];
  const subjects = uniqueSubjects(legacy.map((entry) => ({
    id: String(entry.subjectId ?? ''),
    name: String(entry.subjectName ?? ''),
  })));
  if (!subjects.length) return null;
  const firstValidTime = legacy.find((entry) => isValidStudyTime(String(entry.time ?? '')))?.time ?? '18:00';
  const studyDays = legacy.map((entry) => Number(entry.weekday)).filter((day) => day >= 1 && day <= 7);
  return generateFourWeekStudyPlan({
    subjects,
    sessionsPerWeek: legacy.length,
    weekdayTime: firstValidTime,
    weekendTime: firstValidTime,
    studyDays,
    remindersEnabled: legacy.some((entry) => entry.reminderEnabled !== false),
    now,
  });
}

export function updateTimetableEntry(
  plan: StudyPlan,
  id: string,
  update: Pick<TimetableEntry, 'status'> | { moveToDate: string },
  now = new Date(),
): StudyPlan {
  const entries = plan.entries.map((entry) => {
    if (entry.id !== id) return entry;
    if ('moveToDate' in update) {
      const targetDate = dateFromLocalKey(update.moveToDate);
      const planStart = dateFromLocalKey(plan.startDate);
      if (!targetDate || !planStart) return entry;
      const daysFromStart = Math.max(0, Math.round((targetDate.getTime() - planStart.getTime()) / 86_400_000));
      const weekIndex = Math.min(4, Math.floor(daysFromStart / 7) + 1) as 1 | 2 | 3 | 4;
      return {
        ...entry,
        date: update.moveToDate,
        weekday: targetDate.getDay() + 1,
        weekIndex,
        status: 'planned' as const,
        completedAt: undefined,
      };
    }
    return {
      ...entry,
      status: update.status,
      completedAt: update.status === 'completed' ? now.toISOString() : undefined,
    };
  });
  return { ...plan, entries, updatedAt: now.toISOString() };
}

export function rescheduleTimetableEntry(
  plan: StudyPlan,
  id: string,
  date: string,
  time: string,
  now = new Date(),
): StudyPlan {
  if (!dateFromLocalKey(date) || !isValidStudyTime(time)) throw new Error('INVALID_SCHEDULE');
  const lastPlanDate = addLocalDays(plan.startDate, 27);
  if (date < plan.startDate || date > lastPlanDate) throw new Error('DATE_OUTSIDE_PLAN');
  const weekIndex = studyWeekForDate(plan, date);
  const target = dateFromLocalKey(date)!;
  const entries = plan.entries.map((entry) => entry.id === id ? {
    ...entry,
    date,
    time,
    weekday: target.getDay() + 1,
    weekIndex,
    status: 'planned' as const,
    completedAt: undefined,
  } : entry);
  return { ...plan, entries, updatedAt: now.toISOString() };
}

export function timetableReminderCandidates(
  entries: TimetableEntry[],
  now = new Date(),
  horizonDays = 14,
): Array<TimetableEntry & { triggerAt: Date }> {
  const horizon = new Date(now.getTime() + Math.max(1, horizonDays) * 86_400_000);
  return entries
    .filter((entry) => entry.reminderEnabled && entry.status === 'planned')
    .map((entry) => ({ entry, triggerAt: dateFromLocalKey(entry.date, entry.time) }))
    .filter((candidate): candidate is { entry: TimetableEntry; triggerAt: Date } => Boolean(candidate.triggerAt))
    .filter(({ triggerAt }) => triggerAt.getTime() > now.getTime() && triggerAt.getTime() <= horizon.getTime())
    .sort((left, right) => left.triggerAt.getTime() - right.triggerAt.getTime())
    .map(({ entry, triggerAt }) => ({ ...entry, triggerAt }));
}

/** Kept for older callers. New timetable surfaces should use generateFourWeekStudyPlan. */
export function generateStudyTimetable({
  subjects,
  sessionsPerWeek,
  preferredTime,
  remindersEnabled = true,
}: {
  subjects: TimetableSubject[];
  sessionsPerWeek: number;
  preferredTime: string;
  remindersEnabled?: boolean;
}): TimetableEntry[] {
  if (!isValidStudyTime(preferredTime)) throw new Error('INVALID_TIME');
  const cleanSubjects = uniqueSubjects(subjects);
  if (!cleanSubjects.length) return [];
  const sessionCount = Math.max(cleanSubjects.length, Math.min(14, Math.max(1, Math.round(sessionsPerWeek))));
  const startDate = localDateKey();
  return Array.from({ length: sessionCount }, (_, index) => {
    const subject = cleanSubjects[index % cleanSubjects.length]!;
    const round = Math.floor(index / BALANCED_DAYS.length);
    const weekday = BALANCED_DAYS[index % BALANCED_DAYS.length]!;
    return {
      id: `generated-${weekday}-${round}-${subject.id}`,
      subjectId: subject.id,
      subjectName: subject.name,
      weekday,
      time: addMinutes(preferredTime, round * 90),
      date: sessionDate(startDate, 0, weekday),
      weekIndex: 1,
      durationMinutes: 45,
      focus: 'foundation',
      status: 'planned',
      reminderEnabled: remindersEnabled,
    };
  });
}
