import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Modal,
  Portal,
  ProgressBar,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { Reveal } from '@/components/Motion';
import { Screen, SectionTitle } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import { api } from '@/services/api';
import { syncTimetableReminders, type TimetableReminderSyncResult } from '@/services/notifications';
import { ETHIOPIAN_STUDY_TIME_OPTIONS, formatEthiopianTime } from '@/utils/ethiopianTime';
import {
  TIMETABLE_FOCUS_LABEL,
  addLocalDays,
  dateFromLocalKey,
  generateFourWeekStudyPlan,
  isStudyPlan,
  isValidStudyTime,
  localDateKey,
  migrateLegacyTimetable,
  rescheduleTimetableEntry,
  studyWeekDates,
  studyWeekForDate,
  updateTimetableEntry,
  type StudyDuration,
  type StudyPlan,
  type TimetableEntry,
  type TimetableSubject,
} from '@/utils/timetable';

const DAYS = [
  { value: 2, short: 'Mon', label: 'Monday' },
  { value: 3, short: 'Tue', label: 'Tuesday' },
  { value: 4, short: 'Wed', label: 'Wednesday' },
  { value: 5, short: 'Thu', label: 'Thursday' },
  { value: 6, short: 'Fri', label: 'Friday' },
  { value: 7, short: 'Sat', label: 'Saturday' },
  { value: 1, short: 'Sun', label: 'Sunday' },
] as const;

const COMMON_SUBJECTS: TimetableSubject[] = [
  { id: 'study-mathematics', name: 'Mathematics' },
  { id: 'study-physics', name: 'Physics' },
  { id: 'study-chemistry', name: 'Chemistry' },
  { id: 'study-biology', name: 'Biology' },
  { id: 'study-english', name: 'English' },
  { id: 'study-economics', name: 'Economics' },
  { id: 'study-geography', name: 'Geography' },
  { id: 'study-history', name: 'History' },
  { id: 'study-sat', name: 'SAT' },
];

const PACES = [
  { value: 3, label: 'Light', detail: '3 per week' },
  { value: 5, label: 'Balanced', detail: '5 per week' },
  { value: 7, label: 'Focused', detail: '7 per week' },
] as const;

const DURATIONS: StudyDuration[] = [30, 45, 60];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function subjectKey(name: string): string {
  return name.trim().toLowerCase();
}

function customSubjectId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `study-custom-${slug || Date.now()}`;
}

function friendlyDate(value: string, includeWeekday = true): string {
  const date = dateFromLocalKey(value);
  if (!date) return value;
  const weekday = DAYS.find((item) => item.value === date.getDay() + 1)?.label ?? '';
  const dateLabel = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return includeWeekday ? `${weekday}, ${dateLabel}` : dateLabel;
}

function statusCopy(status: TimetableEntry['status']): string {
  if (status === 'completed') return 'Completed';
  if (status === 'skipped') return 'Skipped';
  return 'Planned';
}

export function TimetableScreen() {
  const { state, subjects } = useApp();
  const theme = useTheme();
  const ownerId = state.user?.id ?? 'guest';
  const syncWithAccount = Boolean(state.user && !state.user.isGuest && api.isConfigured);
  const storageKey = `@zemen-academy/timetable-v2:${ownerId}`;
  const legacyStorageKey = `@zemen-academy/timetable-v1:${ownerId}`;
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const planRef = useRef<StudyPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<1 | 2 | 3 | 4>(1);
  const [today, setToday] = useState(() => localDateKey());
  const [generatorVisible, setGeneratorVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<TimetableEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('18:00');
  const [extraSubjects, setExtraSubjects] = useState<TimetableSubject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(5);
  const [studyDays, setStudyDays] = useState<number[]>([2, 4, 6, 7, 1]);
  const [weekdayTime, setWeekdayTime] = useState('18:00');
  const [weekendTime, setWeekendTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState<StudyDuration>(45);
  const [customSubject, setCustomSubject] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [reminderState, setReminderState] = useState<TimetableReminderSyncResult | null>(null);

  const subjectOptions = useMemo(() => {
    const combined: TimetableSubject[] = [
      ...subjects.map((subject) => ({ id: subject.id, name: subject.name })),
      ...COMMON_SUBJECTS,
      ...extraSubjects,
    ];
    return combined.filter((subject, index, all) => (
      all.findIndex((candidate) => subjectKey(candidate.name) === subjectKey(subject.name)) === index
    ));
  }, [extraSubjects, subjects]);

  const applyPlanToEditor = useCallback((next: StudyPlan) => {
    setSelectedIds(next.subjects.map((subject) => subject.id));
    setExtraSubjects(next.subjects);
    setSessionsPerWeek(next.sessionsPerWeek);
    setStudyDays(next.studyDays);
    setWeekdayTime(next.weekdayTime);
    setWeekendTime(next.weekendTime);
    setDurationMinutes(next.durationMinutes);
  }, []);

  const refreshReminders = useCallback((next: StudyPlan) => {
    if (state.preferences.notificationsEnabled === false || !next.remindersEnabled) return;
    void syncTimetableReminders(next.entries)
      .then(setReminderState)
      .catch(() => setReminderState(null));
  }, [state.preferences.notificationsEnabled]);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    void Promise.all([AsyncStorage.getItem(storageKey), AsyncStorage.getItem(legacyStorageKey)])
      .then(async ([savedRaw, legacyRaw]) => {
        if (!active) return;
        const saved = savedRaw ? JSON.parse(savedRaw) as unknown : null;
        const legacy = legacyRaw ? JSON.parse(legacyRaw) as unknown : null;
        const next = isStudyPlan(saved) ? saved : migrateLegacyTimetable(legacy);
        planRef.current = next;
        setPlan(next);
        if (next) {
          setSelectedWeek(studyWeekForDate(next));
          applyPlanToEditor(next);
          if (!isStudyPlan(saved)) await AsyncStorage.setItem(storageKey, JSON.stringify(next));
          refreshReminders(next);
        }

        if (syncWithAccount) {
          void api.studyPlan(true).then((remote) => {
            if (!active) return;
            const current = planRef.current;
            const remoteTime = remote.plan ? new Date(remote.plan.updatedAt).getTime() : 0;
            const currentTime = current ? new Date(current.updatedAt).getTime() : 0;
            if (remote.plan && remoteTime > currentTime) {
              planRef.current = remote.plan;
              setPlan(remote.plan);
              applyPlanToEditor(remote.plan);
              setSelectedWeek(studyWeekForDate(remote.plan));
              void AsyncStorage.setItem(storageKey, JSON.stringify(remote.plan));
              refreshReminders(remote.plan);
            } else if (current && currentTime > remoteTime) {
              void api.syncStudyPlan(current).catch(() => undefined);
            }
          }).catch(() => undefined);
        }
      })
      .catch(() => active && setPlan(null))
      .finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, [applyPlanToEditor, legacyStorageKey, refreshReminders, storageKey, syncWithAccount]);

  useEffect(() => {
    const refreshForCurrentDate = (force = false) => {
      const nextToday = localDateKey();
      const dateChanged = nextToday !== today;
      if (dateChanged) setToday(nextToday);
      const currentPlan = planRef.current;
      if (currentPlan && (dateChanged || force)) {
        setSelectedWeek(studyWeekForDate(currentPlan, nextToday));
        refreshReminders(currentPlan);
      }
    };
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refreshForCurrentDate(true);
    });
    const interval = setInterval(() => refreshForCurrentDate(false), 60_000);
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshReminders, today]);

  const persistPlan = useCallback(async (next: StudyPlan, toast?: string) => {
    planRef.current = next;
    setPlan(next);
    if (toast) setMessage(toast);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    refreshReminders(next);
    if (syncWithAccount) {
      void api.syncStudyPlan(next).then((remote) => {
        const current = planRef.current;
        if (!current || new Date(remote.updatedAt).getTime() <= new Date(current.updatedAt).getTime()) return;
        planRef.current = remote.plan;
        setPlan(remote.plan);
        applyPlanToEditor(remote.plan);
        void AsyncStorage.setItem(storageKey, JSON.stringify(remote.plan));
        refreshReminders(remote.plan);
      }).catch(() => undefined);
    }
  }, [applyPlanToEditor, refreshReminders, storageKey, syncWithAccount]);

  const todayEntries = useMemo(() => plan?.entries.filter((entry) => entry.date === today) ?? [], [plan, today]);
  const nextEntry = useMemo(() => plan?.entries.find((entry) => (
    entry.status === 'planned' && `${entry.date}T${entry.time}` > `${today}T00:00`
  )) ?? null, [plan, today]);
  const weekEntries = useMemo(() => plan?.entries.filter((entry) => entry.weekIndex === selectedWeek) ?? [], [plan, selectedWeek]);
  const grouped = useMemo(() => {
    const dates = [...new Set(weekEntries.map((entry) => entry.date))].sort();
    return dates.map((date) => ({
      date,
      entries: weekEntries.filter((entry) => entry.date === date).sort((left, right) => left.time.localeCompare(right.time)),
    }));
  }, [weekEntries]);
  const completedCount = weekEntries.filter((entry) => entry.status === 'completed').length;
  const progress = weekEntries.length ? completedCount / weekEntries.length : 0;
  const plannedSessionCount = Math.max(selectedIds.length, sessionsPerWeek);
  const activeWeek = plan ? studyWeekForDate(plan, today) : 1;
  const nextReminderLabel = useMemo(() => {
    if (!reminderState?.nextTriggerAt) return '';
    const trigger = new Date(reminderState.nextTriggerAt);
    if (!Number.isFinite(trigger.getTime())) return '';
    const localTime = `${String(trigger.getHours()).padStart(2, '0')}:${String(trigger.getMinutes()).padStart(2, '0')}`;
    return `${friendlyDate(localDateKey(trigger))} at ${formatEthiopianTime(localTime)}`;
  }, [reminderState?.nextTriggerAt]);
  const editableDates = useMemo(() => (
    plan && editingSession ? studyWeekDates(plan, editingSession.weekIndex) : []
  ), [editingSession, plan]);

  const timeOptions = (selected: string) => (
    ETHIOPIAN_STUDY_TIME_OPTIONS.some((option) => option.value === selected)
      ? ETHIOPIAN_STUDY_TIME_OPTIONS
      : [{ value: selected, label: formatEthiopianTime(selected) }, ...ETHIOPIAN_STUDY_TIME_OPTIONS]
  );

  const toggleSubject = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setError('');
  };

  const toggleDay = (day: number) => {
    setStudyDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
    setError('');
  };

  const addCustomSubject = () => {
    const name = customSubject.trim();
    if (!name) return;
    const existing = subjectOptions.find((subject) => subjectKey(subject.name) === subjectKey(name));
    if (existing) {
      setSelectedIds((current) => current.includes(existing.id) ? current : [...current, existing.id]);
    } else {
      const next = { id: customSubjectId(name), name };
      setExtraSubjects((current) => [...current, next]);
      setSelectedIds((current) => [...current, next.id]);
    }
    setCustomSubject('');
    setError('');
  };

  const generatePlan = async () => {
    const selected = subjectOptions.filter((subject) => selectedIds.includes(subject.id));
    if (!selected.length) return setError('Choose at least one subject.');
    if (!studyDays.length) return setError('Choose at least one study day.');
    if (!isValidStudyTime(weekdayTime) || !isValidStudyTime(weekendTime)) return setError('Choose valid Ethiopian study times.');

    setSaving(true);
    setError('');
    try {
      const next = generateFourWeekStudyPlan({
        subjects: selected,
        sessionsPerWeek,
        weekdayTime,
        weekendTime,
        durationMinutes,
        studyDays,
        remindersEnabled: state.preferences.notificationsEnabled !== false,
      });
      await persistPlan(next, 'Your new four-week plan is ready.');
      setSelectedWeek(1);
      setGeneratorVisible(false);
    } catch {
      setError('Your timetable could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (entry: TimetableEntry, status: TimetableEntry['status']) => {
    if (!plan) return;
    const next = updateTimetableEntry(plan, entry.id, { status });
    void persistPlan(next, status === 'completed' ? 'Session completed. Nice work!' : status === 'skipped' ? 'Session skipped.' : 'Session restored.');
  };

  const openSessionEditor = (entry: TimetableEntry) => {
    setEditingSession(entry);
    setEditDate(entry.date);
    setEditTime(entry.time);
    setError('');
  };

  const saveSessionEdit = () => {
    if (!plan || !editingSession) return;
    try {
      const next = rescheduleTimetableEntry(plan, editingSession.id, editDate, editTime);
      void persistPlan(next, `${editingSession.subjectName} was rescheduled.`);
      setSelectedWeek(studyWeekForDate(next, editDate));
      setEditingSession(null);
    } catch {
      setError('Choose a valid day and time inside this four-week plan.');
    }
  };

  const openGenerator = () => {
    if (plan) applyPlanToEditor(plan);
    setError('');
    setGeneratorVisible(true);
  };

  return (
    <Screen>
      <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
        <Card.Content style={styles.heroContent}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.surface }]}>
            <Icon source="calendar-clock-outline" size={32} color={theme.colors.primary} />
          </View>
          <View style={styles.grow}>
            <Text variant="headlineSmall" style={styles.bold}>My four-week plan</Text>
            <Text variant="bodyMedium" style={styles.muted}>Plan less. Study with a clear rhythm.</Text>
            {plan ? <Text variant="labelSmall" style={styles.planRange}>{friendlyDate(plan.startDate, false)} – {friendlyDate(addLocalDays(plan.startDate, 27), false)}</Text> : null}
          </View>
          {plan ? <IconButton icon="pencil-outline" mode="contained-tonal" onPress={openGenerator} /> : null}
        </Card.Content>
      </Card>

      {!loaded ? <Text style={styles.muted}>Preparing your timetable…</Text> : null}
      {loaded && !plan ? (
        <Card mode="outlined" style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Icon source="calendar-star" size={38} color={theme.colors.secondary} />
            </View>
            <Text variant="titleLarge" style={styles.bold}>Build a plan that fits your week</Text>
            <Text variant="bodyMedium" style={styles.emptyCopy}>Choose your subjects, available days, and preferred Ethiopian times. Zemen will arrange the next four weeks.</Text>
            <Button mode="contained" icon="creation-outline" contentStyle={styles.primaryAction} onPress={openGenerator}>
              Create my plan
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {plan ? (
        <>
          <SectionTitle>Today</SectionTitle>
          <Card mode="contained" style={[styles.todayCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content style={styles.todayContent}>
              <View style={styles.todayHeader}>
                <View>
                  <Text variant="labelLarge" style={{ color: theme.colors.primary }}>TODAY · {friendlyDate(today, false).toUpperCase()}</Text>
                  <Text variant="titleLarge" style={styles.bold}>
                    {todayEntries.length ? `${todayEntries.length} ${todayEntries.length === 1 ? 'session' : 'sessions'} planned` : 'No session today'}
                  </Text>
                </View>
                <View style={[styles.todayBadge, { backgroundColor: theme.colors.surface }]}>
                  <Icon source={todayEntries.length ? 'weather-sunny' : 'coffee-outline'} size={24} color={theme.colors.primary} />
                </View>
              </View>
              {todayEntries.length ? todayEntries.map((entry) => (
                <SessionRow key={entry.id} entry={entry} onStatus={changeStatus} onEdit={openSessionEditor} />
              )) : nextEntry ? (
                <View style={styles.nextRow}>
                  <Icon source="calendar-arrow-right" size={21} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={styles.grow}>Next: {nextEntry.subjectName} · {friendlyDate(nextEntry.date)} at {formatEthiopianTime(nextEntry.time)}</Text>
                </View>
              ) : <Text variant="bodyMedium" style={styles.muted}>Your four-week plan is complete. Create the next one whenever you are ready.</Text>}
            </Card.Content>
          </Card>

          <View style={styles.weekHeading}>
            <SectionTitle>Four-week journey</SectionTitle>
            <Text variant="bodySmall" style={styles.muted}>{completedCount}/{weekEntries.length} complete</Text>
          </View>
          <View style={[styles.weekTabs, { backgroundColor: theme.colors.surfaceVariant }]}>
            {([1, 2, 3, 4] as const).map((week) => (
              <Pressable
                key={week}
                accessibilityRole="button"
                accessibilityLabel={`Open week ${week}`}
                onPress={() => setSelectedWeek(week)}
                style={({ pressed }) => [
                  styles.weekTab,
                  selectedWeek === week && { backgroundColor: theme.colors.primary },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[
                  styles.weekDot,
                  { backgroundColor: selectedWeek === week ? theme.colors.onPrimary : theme.colors.surface },
                ]}>
                  <Text variant="labelMedium" style={{ color: selectedWeek === week ? theme.colors.primary : theme.colors.onSurface }}>{week}</Text>
                </View>
                <Text variant="labelSmall" style={{ color: selectedWeek === week ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
                  {activeWeek === week ? 'Now' : `Week ${week}`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Card mode="contained" style={[styles.weekSummary, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Card.Content style={styles.weekSummaryContent}>
              <View style={[styles.weekNumber, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleLarge" style={[styles.bold, { color: theme.colors.secondary }]}>{selectedWeek}</Text>
              </View>
              <View style={styles.grow}>
                <Text variant="titleMedium" style={styles.bold}>{TIMETABLE_FOCUS_LABEL[weekEntries[0]?.focus ?? 'foundation']}</Text>
                <Text variant="bodySmall" style={styles.muted}>{completedCount} of {weekEntries.length} sessions completed</Text>
                <ProgressBar progress={progress} style={styles.progress} color={theme.colors.secondary} />
              </View>
            </Card.Content>
          </Card>

          {grouped.map((group) => (
            <Reveal key={group.date} distance={7}>
              <Card mode="outlined" style={styles.dayCard}>
                <Card.Content style={styles.dayContent}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dateTitleRow}>
                      <View style={[styles.dateBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Text variant="titleMedium" style={[styles.bold, { color: theme.colors.primary }]}>{dateFromLocalKey(group.date)?.getDate()}</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>{MONTHS[dateFromLocalKey(group.date)?.getMonth() ?? 0]}</Text>
                      </View>
                      <Text variant="titleMedium" style={styles.bold}>{DAYS.find((day) => day.value === (dateFromLocalKey(group.date)?.getDay() ?? 0) + 1)?.label}</Text>
                    </View>
                    <Text variant="labelSmall" style={styles.muted}>{group.entries.length} {group.entries.length === 1 ? 'session' : 'sessions'}</Text>
                  </View>
                  {group.entries.map((entry) => (
                    <SessionRow key={entry.id} entry={entry} onStatus={changeStatus} onEdit={openSessionEditor} />
                  ))}
                </Card.Content>
              </Card>
            </Reveal>
          ))}

          <View style={[styles.reminderStatus, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon source="bell-check-outline" size={21} color={theme.colors.primary} />
            <Text variant="bodySmall" style={styles.grow}>
              {reminderState?.permission === 'granted'
                ? nextReminderLabel
                  ? `Next reminder: ${nextReminderLabel}. ${reminderState.scheduledCount} upcoming sessions are ready.`
                  : 'Your reminder schedule is up to date. There are no sessions due in the next 14 days.'
                : 'Enable notifications to receive your study reminders.'}
            </Text>
          </View>
        </>
      ) : null}

      <Portal>
        <Modal visible={generatorVisible} onDismiss={() => !saving && setGeneratorVisible(false)} contentContainerStyle={styles.modalWrap}>
          <Card mode="elevated" style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={[styles.smallIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Icon source="creation-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.grow}>
                  <Text variant="headlineSmall" style={styles.bold}>Build my plan</Text>
                  <Text variant="bodySmall" style={styles.muted}>Four weeks, arranged around your real routine.</Text>
                </View>
                <IconButton icon="close" disabled={saving} onPress={() => setGeneratorVisible(false)} />
              </View>

              <Text variant="labelLarge" style={styles.bold}>1. Subjects</Text>
              <View style={styles.chips}>
                {subjectOptions.map((subject) => (
                  <Chip key={subject.id} selected={selectedIds.includes(subject.id)} showSelectedCheck onPress={() => toggleSubject(subject.id)}>
                    {subject.name}
                  </Chip>
                ))}
              </View>
              <View style={styles.customRow}>
                <TextInput mode="outlined" label="Another subject" value={customSubject} maxLength={40} style={styles.customInput} onChangeText={setCustomSubject} onSubmitEditing={addCustomSubject} />
                <Button mode="outlined" disabled={!customSubject.trim()} onPress={addCustomSubject}>Add</Button>
              </View>

              <Text variant="labelLarge" style={styles.bold}>2. Weekly pace</Text>
              <View style={styles.chips}>
                {PACES.map((pace) => (
                  <Chip key={pace.value} selected={sessionsPerWeek === pace.value} showSelectedCheck onPress={() => setSessionsPerWeek(pace.value)}>
                    {pace.label} · {pace.detail}
                  </Chip>
                ))}
              </View>

              <Text variant="labelLarge" style={styles.bold}>3. Available days</Text>
              <View style={styles.chips}>
                {DAYS.map((day) => (
                  <Chip key={day.value} selected={studyDays.includes(day.value)} showSelectedCheck onPress={() => toggleDay(day.value)}>
                    {day.short}
                  </Chip>
                ))}
              </View>

              <View style={styles.timeHeading}>
                <Text variant="labelLarge" style={styles.bold}>4. Weekday time</Text>
                <Text variant="bodySmall" style={styles.muted}>Ethiopian clock</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeOptions}>
                {timeOptions(weekdayTime).map((option) => (
                  <Chip key={option.value} selected={weekdayTime === option.value} showSelectedCheck onPress={() => setWeekdayTime(option.value)}>{option.label}</Chip>
                ))}
              </ScrollView>

              <View style={styles.timeHeading}>
                <Text variant="labelLarge" style={styles.bold}>5. Weekend time</Text>
                <Text variant="bodySmall" style={styles.muted}>Ethiopian clock</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeOptions}>
                {timeOptions(weekendTime).map((option) => (
                  <Chip key={option.value} selected={weekendTime === option.value} showSelectedCheck onPress={() => setWeekendTime(option.value)}>{option.label}</Chip>
                ))}
              </ScrollView>

              <Text variant="labelLarge" style={styles.bold}>6. Session length</Text>
              <View style={styles.chips}>
                {DURATIONS.map((duration) => (
                  <Chip key={duration} selected={durationMinutes === duration} showSelectedCheck onPress={() => setDurationMinutes(duration)}>{duration} minutes</Chip>
                ))}
              </View>

              <View style={[styles.planPreview, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="calendar-check-outline" size={21} color={theme.colors.primary} />
                <Text variant="bodySmall" style={styles.grow}>Your plan will include {plannedSessionCount} sessions each week for four weeks. You can complete, skip, or move any session.</Text>
              </View>
              {error ? <Text style={{ color: theme.colors.error }}>{error}</Text> : null}
              <Button mode="contained" icon="auto-fix" loading={saving} disabled={saving} contentStyle={styles.primaryAction} onPress={() => void generatePlan()}>
                Generate four-week plan
              </Button>
            </ScrollView>
          </Card>
        </Modal>
        <Modal visible={Boolean(editingSession)} onDismiss={() => setEditingSession(null)} contentContainerStyle={styles.editModalWrap}>
          <Card mode="elevated" style={styles.modalCard}>
            <Card.Content style={styles.editModalContent}>
              <View style={styles.modalHeader}>
                <View style={[styles.smallIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Icon source="calendar-edit" size={24} color={theme.colors.secondary} />
                </View>
                <View style={styles.grow}>
                  <Text variant="titleLarge" style={styles.bold}>Edit one session</Text>
                  <Text variant="bodySmall" style={styles.muted}>{editingSession?.subjectName}</Text>
                </View>
                <IconButton icon="close" onPress={() => setEditingSession(null)} />
              </View>

              <Text variant="labelLarge" style={styles.bold}>Choose a day</Text>
              <View style={styles.editDateGrid}>
                {editableDates.map((date) => {
                  const parsed = dateFromLocalKey(date);
                  const label = DAYS.find((day) => day.value === (parsed?.getDay() ?? 0) + 1)?.short;
                  return (
                    <Chip key={date} selected={editDate === date} showSelectedCheck onPress={() => setEditDate(date)}>
                      {label} {parsed?.getDate()}
                    </Chip>
                  );
                })}
              </View>

              <View style={styles.timeHeading}>
                <Text variant="labelLarge" style={styles.bold}>Choose a time</Text>
                <Text variant="bodySmall" style={styles.muted}>Ethiopian clock</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeOptions}>
                {timeOptions(editTime).map((option) => (
                  <Chip key={option.value} selected={editTime === option.value} showSelectedCheck onPress={() => setEditTime(option.value)}>{option.label}</Chip>
                ))}
              </ScrollView>

              <View style={[styles.editPreview, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Icon source="bell-ring-outline" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.grow}>{friendlyDate(editDate)} · {formatEthiopianTime(editTime)}</Text>
              </View>
              {error ? <Text style={{ color: theme.colors.error }}>{error}</Text> : null}
              <Button mode="contained" icon="check" contentStyle={styles.primaryAction} onPress={saveSessionEdit}>Save this session</Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={2600}>{message}</Snackbar>
    </Screen>
  );
}

function SessionRow({
  entry,
  onStatus,
  onEdit,
}: {
  entry: TimetableEntry;
  onStatus: (entry: TimetableEntry, status: TimetableEntry['status']) => void;
  onEdit: (entry: TimetableEntry) => void;
}) {
  const theme = useTheme();
  const complete = entry.status === 'completed';
  const skipped = entry.status === 'skipped';
  return (
    <View style={[
      styles.entry,
      { backgroundColor: theme.colors.surface, borderColor: complete ? theme.colors.primary : theme.colors.outlineVariant },
      skipped && styles.dimmed,
    ]}>
      <View style={styles.sessionMain}>
        <View style={[styles.sessionIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source="book-open-page-variant-outline" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.sessionCopy}>
          <Text variant="titleSmall" style={styles.bold}>{entry.subjectName}</Text>
          <Text variant="bodySmall" style={styles.sessionTime}>{formatEthiopianTime(entry.time)} · {entry.durationMinutes} min</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: complete ? theme.colors.primaryContainer : theme.colors.surfaceVariant }]}>
          <Icon source={complete ? 'check-circle' : skipped ? 'minus-circle-outline' : 'clock-outline'} size={14} color={complete ? theme.colors.primary : theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: complete ? theme.colors.primary : theme.colors.onSurfaceVariant }}>{statusCopy(entry.status)}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <Button compact mode={complete ? 'outlined' : 'contained-tonal'} onPress={() => onStatus(entry, complete ? 'planned' : 'completed')}>
          {complete ? 'Undo' : 'Done'}
        </Button>
        {!complete ? (
          <>
            <Button compact mode="text" onPress={() => onStatus(entry, skipped ? 'planned' : 'skipped')}>{skipped ? 'Restore' : 'Skip'}</Button>
            <Button compact mode="text" icon="pencil-outline" onPress={() => onEdit(entry)}>Edit day & time</Button>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.67, lineHeight: 20 },
  hero: { borderRadius: ui.radius.lg },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 18 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planRange: { marginTop: 5, opacity: 0.72, fontWeight: '700' },
  primaryAction: { minHeight: 50 },
  emptyCard: { borderRadius: ui.radius.lg },
  emptyContent: { alignItems: 'center', gap: 11, paddingVertical: 29 },
  emptyIcon: { width: 72, height: 72, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { textAlign: 'center', opacity: 0.67, lineHeight: 21, maxWidth: 380 },
  todayCard: { borderRadius: ui.radius.lg },
  todayContent: { gap: 12 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  todayBadge: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 4 },
  weekHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  weekTabs: { flexDirection: 'row', padding: 5, borderRadius: 20, gap: 4 },
  weekTab: { flex: 1, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3 },
  weekDot: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  weekSummary: { borderRadius: ui.radius.md },
  weekSummaryContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weekNumber: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progress: { marginTop: 8, height: 7, borderRadius: 4 },
  dayCard: { borderRadius: ui.radius.md },
  dayContent: { gap: 10 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBadge: { width: 46, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  entry: { minHeight: 96, borderRadius: 19, borderWidth: 1, padding: 11, gap: 8, elevation: 1 },
  dimmed: { opacity: 0.64 },
  sessionMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sessionCopy: { flex: 1, minWidth: 80, gap: 2 },
  sessionTime: { opacity: 0.72, lineHeight: 18 },
  statusPill: { minHeight: 28, borderRadius: 14, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' },
  reminderStatus: { minHeight: 54, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalWrap: { width: '100%', maxWidth: 600, maxHeight: '94%', paddingHorizontal: 12, alignSelf: 'center' },
  modalCard: { borderRadius: ui.radius.lg, overflow: 'hidden' },
  modalContent: { gap: 14, padding: 18, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  customInput: { flex: 1 },
  timeHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeOptions: { gap: 8, paddingRight: 18 },
  planPreview: { minHeight: 56, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  editModalWrap: { width: '100%', maxWidth: 540, paddingHorizontal: 14, alignSelf: 'center' },
  editModalContent: { gap: 15, paddingVertical: 18 },
  editDateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  editPreview: { minHeight: 54, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
});
