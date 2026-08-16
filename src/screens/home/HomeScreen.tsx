import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Badge, Button, Card, Icon, IconButton, Modal, Portal, ProgressBar, Searchbar, Snackbar, Text, useTheme } from 'react-native-paper';

import { IconTile, PressableScale, Reveal, type IconTone } from '@/components/Motion';
import { Screen, SectionTitle } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { heroPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { selectContinueLearning } from '@/utils/continueLearning';
import { scoreForAttempt } from '@/utils/quiz';
import { attemptsCompletedThisWeek, attemptsCompletedToday, normalizeDailyQuizGoal } from '@/utils/studyGoal';
import { userFacingError } from '@/utils/userFacingError';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    state,
    subjects,
    announcementNotice,
    dismissAnnouncementNotice,
    dismissWelcomeAnimation,
    updateDailyQuizGoal,
  } = useApp();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const wideExploreGrid = windowWidth >= 700;
  const hero = heroPalette(theme.dark);
  const [goalEditorVisible, setGoalEditorVisible] = useState(false);
  const [goalDraft, setGoalDraft] = useState(() => normalizeDailyQuizGoal(state.preferences.dailyQuizGoal));
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState('');
  const continueSelection = useMemo(() => selectContinueLearning({
    grade: state.preferences.grade,
    stream: state.preferences.stream,
    subjects: state.catalog.subjects,
    units: state.catalog.units,
    attempts: state.attempts,
    downloads: state.unitDownloads,
    lastViewedSubjectId: state.lastViewedSubjectId,
    lastViewedUnitId: state.lastViewedUnitId,
  }), [
    state.attempts,
    state.catalog.subjects,
    state.catalog.units,
    state.lastViewedSubjectId,
    state.lastViewedUnitId,
    state.preferences.grade,
    state.preferences.stream,
    state.unitDownloads,
  ]);
  const continueUnit = continueSelection.unit;
  const continueSubject = continueSelection.subject;
  const continueAttempt = continueSelection.attempt;
  const hasLearningHistory = continueSelection.hasHistory;
  const recentScore = useMemo(
    () => continueAttempt ? scoreForAttempt(continueAttempt) : null,
    [continueAttempt],
  );
  const firstName = (state.user?.name ?? 'Student').trim().split(/\s+/)[0] || 'Student';
  const stream = state.preferences.grade >= 11 ? ` • ${state.preferences.stream}` : '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dailyGoal = normalizeDailyQuizGoal(state.preferences.dailyQuizGoal);
  const attemptsToday = useMemo(() => attemptsCompletedToday(state.attempts), [state.attempts]);
  const attemptsThisWeek = useMemo(() => attemptsCompletedThisWeek(state.attempts), [state.attempts]);
  const goalProgress = Math.min(attemptsToday / dailyGoal, 1);
  const quizzesRemaining = Math.max(dailyGoal - attemptsToday, 0);
  const continueScore = continueAttempt
    ? scoreForAttempt(continueAttempt)
    : null;
  const unreadAnnouncements = useMemo(() => {
    const readIds = new Set(state.readAnnouncementIds);
    return state.announcements.filter((item) => !readIds.has(item.id)).length;
  }, [state.announcements, state.readAnnouncementIds]);
  const showWelcome = Boolean(
    state.user
    && !state.user.isGuest
    && state.pendingWelcomeUserId === state.user.id,
  );

  const openContinue = () => {
    if (continueUnit) navigation.navigate('QuizDetails', { unitId: continueUnit.id });
    else if (continueSubject) navigation.navigate('Units', { subjectId: continueSubject.id });
    else navigation.navigate('Main', { screen: 'QuizzesTab' });
  };

  const openGoalEditor = () => {
    setGoalDraft(dailyGoal);
    setGoalError('');
    setGoalEditorVisible(true);
  };

  const saveDailyGoal = async () => {
    if (goalSaving) return;
    setGoalSaving(true);
    setGoalError('');
    try {
      await updateDailyQuizGoal(goalDraft);
      setGoalEditorVisible(false);
    } catch (error) {
      setGoalError(userFacingError(error, 'profile'));
    } finally {
      setGoalSaving(false);
    }
  };

  return (
    <Screen safeTop safeBottom={false}>
      <View style={styles.welcomeRow}>
        <View style={styles.grow}>
          <Text variant="bodyMedium" style={styles.muted}>{greeting},</Text>
          <Text variant="headlineMedium" style={styles.name}>{firstName}</Text>
          <View style={styles.gradeRow}>
            <Icon source="school-outline" size={16} color={theme.colors.primary} />
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Grade {state.preferences.grade}{stream}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.bellWrap}>
            <IconButton
              icon={unreadAnnouncements ? 'bell' : 'bell-outline'}
              size={23}
              containerColor={theme.colors.surface}
              accessibilityLabel={`${unreadAnnouncements} unread announcements`}
              onPress={() => navigation.navigate('Announcements')}
            />
            {unreadAnnouncements ? (
              <Badge style={styles.notificationBadge}>{unreadAnnouncements > 99 ? '99+' : unreadAnnouncements}</Badge>
            ) : null}
          </View>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="headlineSmall" style={[styles.avatarText, { color: theme.colors.onPrimaryContainer }]}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <Searchbar
        placeholder="Search subjects or quiz units"
        value=""
        onChangeText={() => undefined}
        onPressIn={() => navigation.navigate('Search')}
        accessibilityLabel="Open search"
        style={[styles.search, { backgroundColor: theme.colors.surface }]}
        inputStyle={styles.searchInput}
      />

      <Reveal key={`daily-goal-${dailyGoal}-${attemptsToday}`} distance={12}>
        <Card mode="contained" style={[styles.goalCard, { backgroundColor: hero.background }]}>
          <Card.Content style={styles.goalContent}>
            <View style={styles.goalTop}>
              <View style={[styles.goalIcon, { backgroundColor: hero.overlay }]}>
                <Icon source={quizzesRemaining === 0 ? 'check-bold' : 'target'} size={24} color={hero.accent} />
              </View>
              <View style={styles.grow}>
                <Text variant="labelSmall" style={[styles.eyebrow, { color: hero.muted }]}>TODAY'S GOAL</Text>
                <View style={styles.goalCountRow}>
                  <Text variant="headlineMedium" style={[styles.goalValue, { color: hero.foreground }]}>{attemptsToday}</Text>
                  <Text variant="titleMedium" style={[styles.goalUnit, { color: hero.muted }]}>of {dailyGoal} quizzes</Text>
                </View>
              </View>
              <Button compact icon="pencil-outline" mode="text" textColor={hero.foreground} onPress={openGoalEditor}>
                Edit
              </Button>
            </View>
            <ProgressBar progress={goalProgress} color={hero.accent} style={[styles.goalProgress, { backgroundColor: hero.overlay }]} />
            <View style={styles.goalFooter}>
              <Text variant="bodySmall" style={{ color: hero.foreground }}>
                {quizzesRemaining === 0
                  ? 'Goal complete. Nice work!'
                  : `${quizzesRemaining} ${quizzesRemaining === 1 ? 'quiz' : 'quizzes'} left today`}
              </Text>
              <Text variant="labelSmall" style={{ color: hero.muted }}>{attemptsThisWeek} this week</Text>
            </View>
          </Card.Content>
        </Card>
      </Reveal>

      <Reveal delay={70} distance={10}>
        <PressableScale onPress={openContinue} accessibilityLabel={continueUnit ? 'Continue your latest quiz' : 'Choose a subject'}>
          <Card mode="outlined" style={[styles.continueCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.continueContent}>
              <IconTile source={continueSubject?.icon ?? 'book-open-page-variant-outline'} size={24} tone="primary" style={styles.continueIcon} />
              <View style={styles.continueCopy}>
                <Text variant="labelSmall" style={[styles.eyebrow, { color: theme.colors.primary }]}>
                  {hasLearningHistory ? 'CONTINUE LEARNING' : 'START HERE'}
                </Text>
                <Text variant="titleMedium" style={styles.continueTitle} numberOfLines={1}>
                  {continueUnit
                    ? `${continueSubject?.name ?? 'Subject'} · ${continueUnit.title}`
                    : continueSubject
                      ? `${continueSubject.name} · Choose a unit`
                      : 'Choose your first subject'}
                </Text>
                <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
                  {continueScore
                    ? `Last score ${continueScore.percentage}% · Pick up where you stopped`
                    : continueUnit
                      ? 'Ready for your next attempt'
                      : `Recommended for Grade ${state.preferences.grade}`}
                </Text>
              </View>
              <View style={[styles.continueArrow, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="arrow-right" size={20} color={theme.colors.primary} />
              </View>
            </Card.Content>
          </Card>
        </PressableScale>
      </Reveal>

      <View style={styles.sectionHeader}>
        <SectionTitle>Explore</SectionTitle>
        <Text variant="bodySmall" style={styles.muted}>{subjects.length} subjects available</Text>
      </View>
      <View style={styles.quickGrid}>
        <QuickButton wide={wideExploreGrid} tone="primary" icon="clipboard-text-outline" label="Quizzes" detail="Practice by subject" onPress={() => navigation.navigate('Main', { screen: 'QuizzesTab' })} />
        <QuickButton wide={wideExploreGrid} tone="secondary" icon="calendar-clock-outline" label="Timetable" detail="Plan your week" onPress={() => navigation.navigate('Timetable')} />
        <QuickButton wide={wideExploreGrid} tone="warm" icon="notebook-outline" label="Notes" detail="Revision library" onPress={() => navigation.navigate('Notes')} />
        <QuickButton wide={wideExploreGrid} tone="success" icon="chart-box-outline" label="Progress" detail={recentScore ? `Last score ${recentScore.percentage}%` : 'Start a quiz'} onPress={() => navigation.navigate('Progress')} />
      </View>

      <Portal>
        <Modal
          visible={goalEditorVisible}
          onDismiss={() => !goalSaving && setGoalEditorVisible(false)}
          contentContainerStyle={styles.goalModalWrap}
        >
          <Reveal distance={12}>
            <Card
              mode="elevated"
              style={[
                styles.goalModal,
                theme.dark ? ui.shadow.dark : ui.shadow.light,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
            >
              <Card.Content style={styles.goalModalContent}>
                <View style={styles.goalModalHeader}>
                  <View style={[styles.goalModalIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Icon source="target" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.grow}>
                    <Text variant="labelSmall" style={[styles.eyebrow, { color: theme.colors.primary }]}>STUDY PLAN</Text>
                    <Text variant="headlineSmall" style={styles.goalModalTitle}>Set your daily goal</Text>
                  </View>
                  <IconButton
                    icon="close"
                    size={21}
                    accessibilityLabel="Close daily goal editor"
                    disabled={goalSaving}
                    onPress={() => setGoalEditorVisible(false)}
                    style={styles.goalModalClose}
                  />
                </View>
                <Text variant="bodyMedium" style={[styles.muted, styles.goalModalBody]}>
                  Choose a realistic target. You can change it whenever your study routine changes.
                </Text>
                <View style={[styles.goalStepper, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <PressableScale
                    disabled={goalDraft <= 1 || goalSaving}
                    onPress={() => setGoalDraft((current) => Math.max(1, current - 1))}
                    accessibilityLabel="Decrease daily quiz goal"
                  >
                    <View style={[styles.goalStepButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                      <Icon source="minus" size={25} color={theme.colors.primary} />
                    </View>
                  </PressableScale>
                  <View style={styles.goalStepValue}>
                    <Reveal key={`goal-draft-${goalDraft}`} distance={6}>
                      <Text variant="displaySmall" style={[styles.goalChoiceNumber, { color: theme.colors.onSurface }]}>{goalDraft}</Text>
                    </Reveal>
                    <Text variant="labelMedium" style={styles.muted}>{goalDraft === 1 ? 'quiz per day' : 'quizzes per day'}</Text>
                  </View>
                  <PressableScale
                    disabled={goalDraft >= 5 || goalSaving}
                    onPress={() => setGoalDraft((current) => Math.min(5, current + 1))}
                    accessibilityLabel="Increase daily quiz goal"
                  >
                    <View style={[styles.goalStepButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                      <Icon source="plus" size={25} color={theme.colors.primary} />
                    </View>
                  </PressableScale>
                </View>
                <View style={[styles.goalHint, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Icon source="calendar-check-outline" size={18} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={[styles.grow, { color: theme.colors.onPrimaryContainer }]}>
                    Complete {goalDraft} {goalDraft === 1 ? 'quiz' : 'quizzes'} each day to reach this goal.
                  </Text>
                </View>
                {goalError ? (
                  <View style={[styles.goalError, { backgroundColor: theme.colors.errorContainer }]}>
                    <Icon source="alert-circle-outline" size={18} color={theme.colors.error} />
                    <Text variant="bodySmall" style={[styles.grow, { color: theme.colors.onErrorContainer }]}>{goalError}</Text>
                  </View>
                ) : null}
                <View style={styles.goalModalActions}>
                  <Button
                    mode="outlined"
                    disabled={goalSaving}
                    contentStyle={styles.goalActionButton}
                    style={styles.goalAction}
                    onPress={() => setGoalEditorVisible(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    icon="check"
                    loading={goalSaving}
                    disabled={goalSaving}
                    contentStyle={styles.goalActionButton}
                    style={styles.goalAction}
                    onPress={() => void saveDailyGoal()}
                  >
                    Save goal
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Reveal>
        </Modal>
        <Modal visible={showWelcome} dismissable={false} contentContainerStyle={styles.welcomeModalWrap}>
          <Reveal distance={18}>
            <Card mode="elevated" style={[styles.welcomeModal, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.welcomeModalContent}>
                <View style={[styles.welcomeIcon, { backgroundColor: theme.colors.primary }]}>
                  <Icon source="school" size={36} color={theme.colors.onPrimary} />
                </View>
                <Text variant="headlineSmall" style={styles.welcomeTitle}>Welcome, {firstName}!</Text>
                <Text variant="bodyMedium" style={styles.welcomeBody}>
                  Your Grade {state.preferences.grade} learning plan is ready. New lessons and academy updates will appear under the notification bell.
                </Text>
                <Button mode="contained" icon="arrow-right" contentStyle={styles.welcomeButton} onPress={dismissWelcomeAnimation}>
                  Start learning
                </Button>
              </Card.Content>
            </Card>
          </Reveal>
        </Modal>
        <Snackbar
          visible={Boolean(announcementNotice)}
          duration={5000}
          onDismiss={dismissAnnouncementNotice}
          action={{
            label: 'View',
            onPress: () => {
              const announcementId = announcementNotice?.id;
              dismissAnnouncementNotice();
              if (announcementId) navigation.navigate('AnnouncementDetail', { announcementId });
              else navigation.navigate('Announcements');
            },
          }}
        >
          {announcementNotice ? `New update: ${announcementNotice.title}` : ''}
        </Snackbar>
      </Portal>
    </Screen>
  );
}

function QuickButton({ icon, label, detail, tone, wide, onPress }: {
  icon: string;
  label: string;
  detail: string;
  tone: IconTone;
  wide: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={[styles.quickCard, wide && styles.quickCardWide]}>
      <Card mode="outlined" style={[styles.quickCardSurface, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.quickContent}>
          <View style={styles.quickTop}>
            <IconTile source={icon} size={25} tone={tone} style={styles.quickIcon} />
            <View style={[styles.quickArrow, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="arrow-top-right" size={17} color={theme.colors.primary} />
            </View>
          </View>
          <View style={styles.quickCopy}>
            <Text variant="titleMedium" style={styles.quickTitle} numberOfLines={1}>{label}</Text>
            <Text variant="bodySmall" style={styles.muted} numberOfLines={2}>{detail}</Text>
          </View>
        </Card.Content>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bellWrap: { position: 'relative' },
  notificationBadge: { position: 'absolute', top: 0, right: 0, minWidth: 18 },
  grow: { flex: 1 },
  muted: { opacity: 0.65 },
  bold: { fontWeight: '800' },
  name: { fontWeight: '900', letterSpacing: -0.7 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  avatar: { width: 56, height: 56, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '900' },
  search: { borderRadius: ui.radius.md, elevation: 0 },
  searchInput: { fontSize: 15 },
  eyebrow: { fontWeight: '900', letterSpacing: 1.2, fontSize: 10 },
  goalCard: { borderRadius: ui.radius.lg, overflow: 'hidden' },
  goalContent: { gap: 14, paddingVertical: 18 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  goalIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  goalCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 1 },
  goalValue: { fontWeight: '900', letterSpacing: -1 },
  goalUnit: { fontWeight: '700' },
  goalProgress: { height: 9, borderRadius: ui.radius.pill },
  goalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  continueCard: { borderRadius: ui.radius.md },
  continueContent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88 },
  continueIcon: { width: 48, height: 48, borderRadius: 16 },
  continueCopy: { flex: 1, gap: 2 },
  continueTitle: { fontWeight: '900', letterSpacing: -0.2 },
  continueArrow: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  quickCard: { width: '48%', minWidth: 0 },
  quickCardWide: { width: '23.5%' },
  quickCardSurface: { width: '100%', borderRadius: ui.radius.md },
  quickContent: { minHeight: 132, justifyContent: 'space-between', gap: 14, paddingHorizontal: 15, paddingVertical: 15 },
  quickTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  quickCopy: { minWidth: 0, gap: 3 },
  quickTitle: { fontWeight: '900', letterSpacing: -0.25 },
  quickIcon: { width: 48, height: 48, borderRadius: 16 },
  quickArrow: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalModalWrap: { width: '100%', maxWidth: 460, paddingHorizontal: 18, alignSelf: 'center' },
  goalModal: { borderRadius: ui.radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  goalModalContent: { gap: 16, paddingHorizontal: 20, paddingVertical: 20 },
  goalModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalModalIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  goalModalClose: { margin: 0 },
  goalModalTitle: { fontWeight: '900', letterSpacing: -0.55, marginTop: 1 },
  goalModalBody: { lineHeight: 21, marginTop: -4 },
  goalStepper: { minHeight: 124, borderRadius: ui.radius.md, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  goalStepButton: { width: 52, height: 52, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  goalStepValue: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  goalChoiceNumber: { fontWeight: '900' },
  goalHint: { minHeight: 48, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalError: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  goalModalActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalAction: { flex: 1, borderRadius: ui.radius.sm },
  goalActionButton: { minHeight: 48 },
  welcomeModalWrap: { paddingHorizontal: 22 },
  welcomeModal: { borderRadius: ui.radius.lg, overflow: 'hidden' },
  welcomeModalContent: { alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 30 },
  welcomeIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  welcomeTitle: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  welcomeBody: { textAlign: 'center', lineHeight: 22, opacity: 0.72 },
  welcomeButton: { minHeight: 48, paddingHorizontal: 18 },
});
