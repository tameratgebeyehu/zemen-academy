import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, ProgressBar, Text, useTheme } from 'react-native-paper';

import { IconTile, PressableScale, Reveal } from '@/components/Motion';
import { EmptyState, Screen, SectionTitle } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { heroPalette, subjectPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import {
  activityForLastSevenDays,
  countsAsCompletedAttempt,
  currentStudyStreak,
  progressBySubject,
  summarizeProgress,
} from '@/utils/progress';
import { formatDuration, scoreForAttempt } from '@/utils/quiz';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export function ProgressScreen({ navigation }: Props) {
  const { state } = useApp();
  const theme = useTheme();
  const hero = heroPalette(theme.dark);
  const summary = useMemo(() => summarizeProgress(state.attempts), [state.attempts]);
  const weeklyActivity = useMemo(() => activityForLastSevenDays(state.attempts), [state.attempts]);
  const streak = useMemo(() => currentStudyStreak(state.attempts), [state.attempts]);
  const subjects = useMemo(
    () => progressBySubject(state.attempts, state.catalog.units, state.catalog.subjects),
    [state.attempts, state.catalog.subjects, state.catalog.units],
  );
  const completedAttempts = useMemo(
    () => state.attempts.filter(countsAsCompletedAttempt).slice(0, 6),
    [state.attempts],
  );
  const maxDayCount = Math.max(1, ...weeklyActivity.map((day) => day.count));
  const totalAnswers = summary.correct + summary.wrong + summary.skipped;

  return (
    <Screen>
      <View style={styles.heading}>
        <Text variant="labelLarge" style={[styles.eyebrow, { color: theme.colors.primary }]}>YOUR LEARNING</Text>
        <Text variant="headlineMedium" style={styles.pageTitle}>Progress</Text>
        <Text variant="bodyMedium" style={styles.muted}>See what you have completed and where to focus next.</Text>
      </View>

      <Reveal distance={12}>
        <Card mode="contained" style={[styles.heroCard, { backgroundColor: hero.background }]}>
          <Card.Content style={styles.heroContent}>
            <View style={styles.heroTop}>
              <View style={[styles.scoreCircle, { backgroundColor: hero.overlay }]}>
                <Text variant="displaySmall" style={[styles.scoreValue, { color: hero.foreground }]}>{summary.averageScore}%</Text>
                <Text variant="labelSmall" style={{ color: hero.muted }}>AVERAGE</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text variant="labelSmall" style={[styles.heroEyebrow, { color: hero.muted }]}>OVERALL PERFORMANCE</Text>
                <Text variant="headlineSmall" style={[styles.heroTitle, { color: hero.foreground }]}>
                  {summary.completedAttempts
                    ? summary.averageScore >= 80
                      ? 'Excellent momentum.'
                      : summary.averageScore >= 60
                        ? 'You are making progress.'
                        : 'Every attempt builds skill.'
                    : 'Your journey starts here.'}
                </Text>
                <Text variant="bodySmall" style={{ color: hero.muted }}>
                  {summary.completedAttempts
                    ? `${summary.completedAttempts} completed ${summary.completedAttempts === 1 ? 'quiz' : 'quizzes'} · Best score ${summary.bestScore}%`
                    : 'Complete your first quiz to begin tracking progress.'}
                </Text>
              </View>
            </View>
            <View style={[styles.heroStats, { borderTopColor: hero.divider }]}>
              <HeroStat icon="clipboard-check-outline" value={String(summary.completedAttempts)} label="Completed" color={hero.accent} textColor={hero.foreground} mutedColor={hero.muted} />
              <HeroStat icon="fire" value={String(streak)} label="Day streak" color={hero.accent} textColor={hero.foreground} mutedColor={hero.muted} />
              <HeroStat icon="clock-outline" value={studyTimeLabel(summary.totalSeconds)} label="Study time" color={hero.accent} textColor={hero.foreground} mutedColor={hero.muted} />
            </View>
          </Card.Content>
        </Card>
      </Reveal>

      <Reveal delay={60} distance={10}>
        <Card mode="outlined" style={[styles.card, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionTop}>
              <View>
                <Text variant="titleMedium" style={styles.bold}>Last 7 days</Text>
                <Text variant="bodySmall" style={styles.muted}>Completed quizzes by day</Text>
              </View>
              <View style={[styles.weekBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="calendar-week-outline" size={17} color={theme.colors.primary} />
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  {weeklyActivity.reduce((total, day) => total + day.count, 0)} total
                </Text>
              </View>
            </View>
            <View style={styles.chart}>
              {weeklyActivity.map((day) => (
                <View key={day.key} style={styles.dayColumn}>
                  <Text variant="labelSmall" style={[styles.dayCount, day.isToday && { color: theme.colors.primary }]}>{day.count || ''}</Text>
                  <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: day.count ? Math.max(12, (day.count / maxDayCount) * 72) : 4,
                          backgroundColor: day.isToday ? theme.colors.primary : theme.colors.secondary,
                        },
                      ]}
                    />
                  </View>
                  <Text variant="labelSmall" style={[styles.dayLabel, day.isToday && { color: theme.colors.primary }]}>{day.label}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      </Reveal>

      <View style={styles.summaryGrid}>
        <SummaryCard icon="target" label="Accuracy" value={`${summary.accuracy}%`} tone="primary" />
        <SummaryCard icon="trophy-outline" label="Best score" value={`${summary.bestScore}%`} tone="warm" />
      </View>

      <Card mode="outlined" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionTop}>
            <View>
              <Text variant="titleMedium" style={styles.bold}>Answer overview</Text>
              <Text variant="bodySmall" style={styles.muted}>{totalAnswers} questions reviewed</Text>
            </View>
            <Text variant="titleMedium" style={[styles.bold, { color: theme.colors.primary }]}>{summary.correct} correct</Text>
          </View>
          <ProgressBar
            progress={totalAnswers ? summary.correct / totalAnswers : 0}
            color={theme.colors.primary}
            style={[styles.answerProgress, { backgroundColor: theme.colors.surfaceVariant }]}
          />
          <View style={styles.answerLegend}>
            <LegendDot color={theme.colors.primary} label={`${summary.correct} Correct`} />
            <LegendDot color={theme.colors.error} label={`${summary.wrong} Wrong`} />
            <LegendDot color={theme.colors.outline} label={`${summary.skipped} Skipped`} />
          </View>
        </Card.Content>
      </Card>

      <SectionTitle>Subjects</SectionTitle>
      {subjects.map((subject, index) => {
        const tone = subjectPalette(subject.subjectId, theme.dark);
        return (
          <Reveal key={subject.subjectId} delay={Math.min(index * 45, 180)} distance={8}>
            <PressableScale onPress={() => navigation.navigate('Units', { subjectId: subject.subjectId })} accessibilityLabel={`Open ${subject.name}`}>
              <Card mode="outlined" style={[styles.subjectCard, { backgroundColor: tone.soft, borderColor: tone.container }]}>
                <Card.Content style={styles.subjectContent}>
                  <View style={[styles.subjectIcon, { backgroundColor: tone.container }]}><Icon source={subject.icon} size={25} color={tone.color} /></View>
                  <View style={styles.grow}>
                    <View style={styles.subjectTitleRow}>
                      <Text variant="titleMedium" style={styles.bold}>{subject.name}</Text>
                      <Text variant="titleSmall" style={[styles.bold, { color: tone.color }]}>{subject.averageScore}%</Text>
                    </View>
                    <Text variant="bodySmall" style={styles.muted}>{subject.attempts} {subject.attempts === 1 ? 'attempt' : 'attempts'} · Best {subject.bestScore}%</Text>
                    <ProgressBar progress={subject.averageScore / 100} color={tone.color} style={[styles.subjectProgress, { backgroundColor: tone.container }]} />
                  </View>
                  <Icon source="chevron-right" size={22} color={tone.color} />
                </Card.Content>
              </Card>
            </PressableScale>
          </Reveal>
        );
      })}
      {!subjects.length ? (
        <EmptyState icon="chart-line" title="No subject progress yet" body="Complete a quiz and its subject performance will appear here." />
      ) : null}

      <View style={styles.sectionTop}>
        <SectionTitle>Recent results</SectionTitle>
        {completedAttempts.length ? <Text variant="bodySmall" style={styles.muted}>Synced across your devices</Text> : null}
      </View>
      {completedAttempts.map((attempt) => {
        const unit = state.catalog.units.find((item) => item.id === attempt.unitId);
        const subject = state.catalog.subjects.find((item) => item.id === unit?.subjectId);
        const score = scoreForAttempt(attempt);
        const tone = subjectPalette(subject?.id ?? attempt.unitId, theme.dark);
        return (
          <PressableScale key={attempt.id} onPress={() => navigation.navigate('Results', { attemptId: attempt.id })} accessibilityLabel="Review quiz result">
            <Card mode="outlined" style={[styles.resultCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.resultContent}>
                <View style={[styles.resultScore, { backgroundColor: tone.container }]}>
                  <Text variant="titleMedium" style={[styles.bold, { color: tone.color }]}>{score.percentage}%</Text>
                </View>
                <View style={styles.grow}>
                  <Text variant="titleSmall" style={styles.bold} numberOfLines={1}>{subject?.name ?? 'Quiz'} · {unit?.title ?? 'Practice'}</Text>
                  <Text variant="bodySmall" style={styles.muted}>{resultDate(attempt.completedAt)} · {formatDuration(attempt.durationSeconds)}</Text>
                </View>
                <Icon source={attempt.remoteOnly ? 'cloud-check-outline' : 'arrow-right'} size={21} color={theme.colors.primary} />
              </Card.Content>
            </Card>
          </PressableScale>
        );
      })}
      {!completedAttempts.length ? (
        <Button mode="contained" icon="clipboard-text-outline" contentStyle={styles.startButton} onPress={() => navigation.navigate('Main', { screen: 'QuizzesTab' })}>
          Start your first quiz
        </Button>
      ) : null}
    </Screen>
  );
}

function HeroStat({ icon, value, label, color, textColor, mutedColor }: { icon: string; value: string; label: string; color: string; textColor: string; mutedColor: string }) {
  return (
    <View style={styles.heroStat}>
      <Icon source={icon} size={18} color={color} />
      <Text variant="titleMedium" style={[styles.bold, { color: textColor }]} numberOfLines={1}>{value}</Text>
      <Text
        variant="labelSmall"
        style={[styles.heroStatLabel, { color: mutedColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'primary' | 'warm' }) {
  const theme = useTheme();
  return (
    <Card mode="outlined" style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content style={styles.summaryContent}>
        <IconTile source={icon} size={22} tone={tone} style={styles.summaryIcon} />
        <View><Text variant="headlineSmall" style={styles.bold}>{value}</Text><Text variant="bodySmall" style={styles.muted}>{label}</Text></View>
      </Card.Content>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text variant="labelSmall">{label}</Text></View>;
}

function studyTimeLabel(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function resultDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  heading: { gap: 3, marginBottom: 1 },
  eyebrow: { fontWeight: '900', letterSpacing: 1.2, fontSize: 10 },
  pageTitle: { fontWeight: '900', letterSpacing: -0.8 },
  muted: { opacity: 0.66 },
  bold: { fontWeight: '900' },
  grow: { flex: 1, gap: 3 },
  heroCard: { borderRadius: ui.radius.lg, overflow: 'hidden' },
  heroContent: { gap: 18, paddingVertical: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontWeight: '900', letterSpacing: -1.5 },
  heroCopy: { flex: 1, gap: 4 },
  heroEyebrow: { fontWeight: '900', letterSpacing: 1, fontSize: 9 },
  heroTitle: { fontWeight: '900', letterSpacing: -0.5 },
  heroStats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 4 },
  heroStat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3 },
  heroStatLabel: { width: '100%', textAlign: 'center', fontSize: 10, lineHeight: 14 },
  card: { borderRadius: ui.radius.md },
  cardContent: { gap: 16, paddingVertical: 17 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  weekBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: ui.radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  chart: { height: 118, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7 },
  dayColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  dayCount: { minHeight: 14, fontWeight: '800', opacity: 0.65 },
  barTrack: { width: 18, height: 74, borderRadius: 9, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 9 },
  dayLabel: { fontWeight: '800', opacity: 0.65 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: ui.radius.md },
  summaryContent: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 11 },
  summaryIcon: { width: 43, height: 43, borderRadius: 14 },
  answerProgress: { height: 11, borderRadius: ui.radius.pill },
  answerLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  subjectCard: { borderRadius: ui.radius.md },
  subjectContent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88 },
  subjectIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  subjectTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectProgress: { height: 6, borderRadius: ui.radius.pill, marginTop: 5 },
  resultCard: { borderRadius: ui.radius.md },
  resultContent: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultScore: { width: 54, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  startButton: { minHeight: 50 },
});
