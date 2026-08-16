import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Icon,
  Portal,
  ProgressBar,
  RadioButton,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import * as ScreenCapture from 'expo-screen-capture';

import { useAppDialog } from '@/components/AppDialog';
import { QuizQuestionContent } from '@/components/QuizQuestionContent';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import type { RootStackParamList } from '@/navigation/types';
import type { AnswerIndex, AttemptEndReason, QuestionReportCategory } from '@/types';
import { countdownSeconds, formatDuration, quizDurationSeconds, steadyNowMs } from '@/utils/quiz';
import { QUESTION_REPORT_OPTIONS } from '@/utils/questionReports';

type Props = NativeStackScreenProps<RootStackParamList, 'QuizPlayer'>;

export function QuizPlayerScreen({ route, navigation }: Props) {
  const { questionsForUnit, recordAttempt, reportQuestion, t } = useApp();
  const { showDialog } = useAppDialog();
  const theme = useTheme();
  const questions = questionsForUnit(route.params.unitId);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<AnswerIndex | null>>(() => questions.map(() => null));
  const answersRef = useRef(answers);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<QuestionReportCategory | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState('');
  const startedAt = useRef(new Date().toISOString());
  const startedMs = useRef(steadyNowMs());
  const finished = useRef(false);
  const exitPromptVisible = useRef(false);
  const isExam = route.params.mode === 'exam';
  const question = questions[current];
  const selected = answers[current] ?? null;

  const select = useCallback((answer: AnswerIndex) => {
    if (!isExam && selected !== null) return;
    setAnswers((currentAnswers) => {
      const next = currentAnswers.map((value, index) => index === current ? answer : value);
      answersRef.current = next;
      return next;
    });
  }, [current, isExam, selected]);

  const saveAttempt = useCallback((endReason: AttemptEndReason) => recordAttempt({
      unitId: route.params.unitId,
      contentType: route.params.contentType ?? 'unit',
      mode: route.params.mode,
      questions,
      answers: answersRef.current,
      startedAt: startedAt.current,
      durationSeconds: Math.max(1, Math.round((steadyNowMs() - startedMs.current) / 1000)),
      endReason,
    }), [questions, recordAttempt, route.params.contentType, route.params.mode, route.params.unitId]);

  const finish = useCallback((endReason: AttemptEndReason) => {
    if (finished.current || !questions.length) return;
    finished.current = true;
    const attemptId = saveAttempt(endReason);
    navigation.replace('Results', { attemptId });
  }, [navigation, questions.length, saveAttempt]);
  const expireAttempt = useCallback(() => finish('time-expired'), [finish]);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => { void ScreenCapture.allowScreenCaptureAsync(); };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && !finished.current) {
        finish('left-app');
        setTimeout(() => showDialog({
          title: 'Attempt ended',
          body: 'This attempt ended because the quiz screen was left. Start a new attempt when you are ready.',
          icon: 'timer-alert-outline',
          tone: 'warning',
          actions: [{ label: 'View result', tone: 'primary' }],
        }), 250);
      }
    });
    return () => subscription.remove();
  }, [finish, showDialog]);

  useEffect(() => {
    const remove = navigation.addListener('beforeRemove', (event) => {
      if (finished.current) return;
      event.preventDefault();
      if (exitPromptVisible.current) return;
      exitPromptVisible.current = true;
      showDialog({
        title: 'Exit this quiz?',
        body: 'Your current attempt will end and cannot be resumed. Your answered questions will be saved in this result.',
        icon: 'door-open',
        tone: 'danger',
        onDismiss: () => { exitPromptVisible.current = false; },
        actions: [
          { label: 'Keep studying', tone: 'neutral' },
          {
            label: 'Exit quiz',
            tone: 'danger',
            onPress: () => {
              exitPromptVisible.current = false;
              if (finished.current) return;
              finished.current = true;
              saveAttempt('quit');
              navigation.dispatch(event.data.action);
            },
          },
        ],
      });
    });
    return remove;
  }, [navigation, saveAttempt, showDialog]);

  if (!question) {
    return (
      <Screen safeTop>
        <Text variant="titleMedium">This quiz could not be loaded.</Text>
        <Text variant="bodyMedium">Go back and load it online, or download it for offline study.</Text>
        <Button onPress={() => navigation.goBack()}>Go back</Button>
      </Screen>
    );
  }

  const submitAttempt = () => {
    const skipped = answers.filter((answer) => answer === null).length;
    const answered = questions.length - skipped;
    showDialog({
      title: 'Submit this quiz?',
      body: skipped
        ? `You answered ${answered} of ${questions.length}. ${skipped} question${skipped === 1 ? '' : 's'} will be marked as skipped.`
        : 'You have answered every question. Your result is ready.',
      icon: 'clipboard-check-outline',
      tone: skipped ? 'warning' : 'primary',
      actions: [
        { label: 'Keep working', tone: 'neutral' },
        { label: 'Submit quiz', tone: 'primary', onPress: () => finish('submitted') },
      ],
    });
  };

  const goNext = () => {
    if (current >= questions.length - 1 || (!isExam && selected === null)) return;
    setCurrent((value) => value + 1);
  };

  const openReport = () => {
    setReportCategory(null);
    setReportNote('');
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!reportCategory || reporting || (reportCategory === 'other' && reportNote.trim().length < 3)) return;
    setReporting(true);
    try {
      const delivery = await reportQuestion({
        question,
        mode: route.params.mode,
        category: reportCategory,
        note: reportNote,
        questionNumber: current + 1,
        selectedAnswer: selected,
      });
      setReportedQuestionIds((currentIds) => new Set(currentIds).add(question.id));
      setReportOpen(false);
      setNotice(delivery === 'sent'
        ? 'Thank you. Your report was sent for review.'
        : 'Report saved. It will be sent when you are online.');
    } finally {
      setReporting(false);
    }
  };

  const chooseReportCategory = (category: QuestionReportCategory) => {
    setReportCategory(category);
    if (category !== 'other') setReportNote('');
  };

  return (
    <Screen scroll={false} safeTop style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.rowBetween}>
          <Text variant="labelLarge">Question {current + 1} of {questions.length}</Text>
          <QuizTimer totalSeconds={quizDurationSeconds(questions.length)} onExpire={expireAttempt} />
        </View>
        <View style={styles.attemptMeta}>
          <View style={styles.accessLabel}>
            <Icon source={isExam ? 'clipboard-clock-outline' : 'message-check-outline'} size={16} color={theme.colors.primary} />
            <Text variant="labelMedium">{isExam ? t('examMode') : t('instantMode')}</Text>
          </View>
          <Button
            compact
            mode="text"
            icon={reportedQuestionIds.has(question.id) ? 'check-circle-outline' : 'flag-outline'}
            disabled={reportedQuestionIds.has(question.id)}
            contentStyle={styles.reportButton}
            onPress={openReport}
          >
            {reportedQuestionIds.has(question.id) ? 'Reported' : 'Report issue'}
          </Button>
        </View>
        <ProgressBar progress={(current + 1) / questions.length} />
      </View>

      <View style={styles.questionPanel}>
        <QuizQuestionContent
          variant="player"
          question={question}
          answer={selected}
          revealAnswer={!isExam && selected !== null}
          locked={!isExam && selected !== null}
          onSelect={select}
        />
      </View>

      <View style={styles.footerRow}>
        <Button
          compact
          mode="outlined"
          style={styles.footerAction}
          contentStyle={styles.footerButtonContent}
          disabled={current === 0}
          onPress={() => setCurrent((value) => value - 1)}
        >
          {t('previous')}
        </Button>
        <Button
          compact
          mode="outlined"
          style={styles.footerAction}
          contentStyle={styles.footerButtonContent}
          textColor={theme.colors.error}
          onPress={submitAttempt}
        >
          {t('submit')}
        </Button>
        <Button
          compact
          mode="contained"
          style={styles.footerAction}
          contentStyle={styles.footerButtonContent}
          disabled={current === questions.length - 1 || (!isExam && selected === null)}
          onPress={goNext}
        >
          {t('next')}
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={reportOpen}
          dismissable={!reporting}
          style={styles.reportDialog}
          onDismiss={() => setReportOpen(false)}
        >
          <Dialog.Content style={styles.reportContent}>
            <View style={styles.reportHeader}>
              <View style={[styles.reportIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="flag-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.reportHeaderText}>
                <Text variant="titleLarge" style={styles.reportTitle}>Report an issue</Text>
                <Text variant="labelMedium" style={styles.reportQuestionNumber}>Question {current + 1} of {questions.length}</Text>
              </View>
            </View>
            <Text variant="bodyMedium" style={styles.reportHelp}>
              Choose the problem you noticed. The timer will continue while this window is open.
            </Text>
            <Text variant="labelLarge" style={styles.reportPrompt}>What needs attention?</Text>
            <ScrollView
              style={styles.reportOptions}
              contentContainerStyle={styles.reportOptionsContent}
              keyboardShouldPersistTaps="handled"
            >
              {QUESTION_REPORT_OPTIONS.map((option) => {
                const active = reportCategory === option.value;
                return (
                  <TouchableRipple
                    key={option.value}
                    borderless={false}
                    style={[
                      styles.reportOption,
                      {
                        borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surface,
                      },
                    ]}
                    disabled={reporting}
                    onPress={() => chooseReportCategory(option.value)}
                  >
                    <View style={styles.reportOptionInner}>
                      <View pointerEvents="none">
                        <RadioButton.Android
                          value={option.value}
                          status={active ? 'checked' : 'unchecked'}
                          color={theme.colors.primary}
                          uncheckedColor={theme.colors.outline}
                        />
                      </View>
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.reportOptionLabel,
                          active && { color: theme.colors.onPrimaryContainer, fontWeight: '700' },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </TouchableRipple>
                );
              })}
              {reportCategory === 'other' ? (
                <View style={styles.reportNoteGroup}>
                  <TextInput
                    mode="outlined"
                    label="Describe the issue"
                    placeholder="Tell us what should be checked"
                    value={reportNote}
                    onChangeText={setReportNote}
                    maxLength={500}
                    multiline
                    numberOfLines={3}
                    disabled={reporting}
                    style={styles.reportNote}
                  />
                  <HelperText type="info" visible>Required for Other issue</HelperText>
                </View>
              ) : null}
            </ScrollView>
            <NetworkActivity
              visible={reporting}
              label="Sending your report…"
              detail="Keep this window open for a moment."
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.reportActions}>
            <Button disabled={reporting} onPress={() => setReportOpen(false)}>Cancel</Button>
            <Button
              mode="contained"
              icon="send-outline"
              loading={reporting}
              disabled={!reportCategory || reporting || (reportCategory === 'other' && reportNote.trim().length < 3)}
              onPress={() => void submitReport()}
            >
              {reporting ? 'Sending…' : 'Submit report'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={Boolean(notice)} duration={3500} onDismiss={() => setNotice('')}>
        {notice}
      </Snackbar>
    </Screen>
  );
}

const QuizTimer = memo(function QuizTimer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const theme = useTheme();
  const deadlineMs = useRef(steadyNowMs() + totalSeconds * 1000);
  const onExpireRef = useRef(onExpire);
  const expired = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(() => countdownSeconds(deadlineMs.current, steadyNowMs()));

  // Updating the callback must never restart the countdown. The deadline belongs to
  // this mounted attempt and remains fixed even when catalog or answer state rerenders.
  onExpireRef.current = onExpire;

  useEffect(() => {
    const tick = () => {
      const next = countdownSeconds(deadlineMs.current, steadyNowMs());
      // A countdown must never gain time, even if a platform clock source behaves oddly.
      setSecondsLeft((current) => Math.min(current, next));
      if (next === 0 && !expired.current) {
        expired.current = true;
        clearInterval(timer);
        onExpireRef.current();
      }
    };
    const timer = setInterval(tick, 250);
    tick();
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={[styles.timer, secondsLeft < 60 ? { backgroundColor: theme.colors.errorContainer } : { backgroundColor: theme.colors.secondaryContainer }]}>
      <Icon source="timer-outline" size={18} />
      <Text variant="labelLarge">{formatDuration(secondsLeft)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { padding: 16 },
  top: { gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  attemptMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accessLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reportButton: { minHeight: 48 },
  questionPanel: { flex: 1, minHeight: 0, marginVertical: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerAction: { flex: 1 },
  footerButtonContent: { minHeight: 48 },
  reportDialog: { borderRadius: 24, marginHorizontal: 18 },
  reportContent: { gap: 12, paddingTop: 24 },
  reportHeader: { flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: 12 },
  reportIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reportHeaderText: { flex: 1, alignItems: 'flex-start' },
  reportTitle: { fontWeight: '900', letterSpacing: -0.4, textAlign: 'left', writingDirection: 'ltr' },
  reportQuestionNumber: { opacity: 0.6, textAlign: 'left', writingDirection: 'ltr' },
  reportHelp: { opacity: 0.7, lineHeight: 20, textAlign: 'left', writingDirection: 'ltr' },
  reportPrompt: { fontWeight: '800', marginTop: 2, textAlign: 'left', writingDirection: 'ltr' },
  reportOptions: { maxHeight: 390 },
  reportOptionsContent: { gap: 8, paddingBottom: 2 },
  reportOption: { minHeight: 50, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  reportOptionInner: { minHeight: 50, flexDirection: 'row', direction: 'ltr', alignItems: 'center', paddingLeft: 6, paddingRight: 12 },
  reportOptionLabel: { flex: 1, fontSize: 14, lineHeight: 19, textAlign: 'left', writingDirection: 'ltr' },
  reportNoteGroup: { gap: 0 },
  reportNote: { marginTop: 2, textAlign: 'left', writingDirection: 'ltr' },
  reportActions: { paddingHorizontal: 18, paddingBottom: 18, paddingTop: 8 },
});
