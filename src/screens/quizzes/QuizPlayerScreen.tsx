import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { formatDuration } from '@/utils/quiz';
import { QUESTION_REPORT_OPTIONS } from '@/utils/questionReports';

type Props = NativeStackScreenProps<RootStackParamList, 'QuizPlayer'>;

export function QuizPlayerScreen({ route, navigation }: Props) {
  const { questionsForUnit, recordAttempt, reportQuestion, t } = useApp();
  const { showDialog } = useAppDialog();
  const theme = useTheme();
  const questions = questionsForUnit(route.params.unitId);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<AnswerIndex | null>>(() => questions.map(() => null));
  const [secondsLeft, setSecondsLeft] = useState(questions.length * 60);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<QuestionReportCategory | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState('');
  const startedAt = useRef(new Date().toISOString());
  const startedMs = useRef(Date.now());
  const finished = useRef(false);
  const exitPromptVisible = useRef(false);
  const isExam = route.params.mode === 'exam';
  const question = questions[current];
  const selected = answers[current] ?? null;

  const saveAttempt = useCallback((endReason: AttemptEndReason) => recordAttempt({
      unitId: route.params.unitId,
      mode: route.params.mode,
      questions,
      answers,
      startedAt: startedAt.current,
      durationSeconds: Math.max(1, Math.round((Date.now() - startedMs.current) / 1000)),
      endReason,
    }), [answers, questions, recordAttempt, route.params.mode, route.params.unitId]);

  const finish = useCallback((endReason: AttemptEndReason) => {
    if (finished.current || !questions.length) return;
    finished.current = true;
    const attemptId = saveAttempt(endReason);
    navigation.replace('Results', { attemptId });
  }, [navigation, questions.length, saveAttempt]);

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

  useEffect(() => {
    if (finished.current) return;
    const timer = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          clearInterval(timer);
          setTimeout(() => finish('time-expired'), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finish]);

  if (!question) {
    return (
      <Screen safeTop>
        <Text variant="titleMedium">This quiz could not be loaded.</Text>
        <Text variant="bodyMedium">Go back and load it online, or download it for offline study.</Text>
        <Button onPress={() => navigation.goBack()}>Go back</Button>
      </Screen>
    );
  }

  const select = (answer: AnswerIndex) => {
    if (!isExam && selected !== null) return;
    setAnswers((currentAnswers) => currentAnswers.map((value, index) => index === current ? answer : value));
  };

  const submitExam = () => {
    const skipped = answers.filter((answer) => answer === null).length;
    showDialog({
      title: 'Submit exam?',
      body: skipped
        ? `${skipped} question${skipped === 1 ? '' : 's'} will be marked as skipped.`
        : 'You have answered every question. Your result is ready to calculate.',
      icon: 'clipboard-check-outline',
      tone: skipped ? 'warning' : 'primary',
      actions: [
        { label: 'Keep working', tone: 'neutral' },
        { label: 'Submit exam', tone: 'primary', onPress: () => finish('submitted') },
      ],
    });
  };

  const advanceInstant = () => {
    if (current === questions.length - 1) finish('submitted');
    else setCurrent((value) => value + 1);
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
          <View style={[styles.timer, secondsLeft < 60 ? { backgroundColor: theme.colors.errorContainer } : { backgroundColor: theme.colors.secondaryContainer }]}>
            <Icon source="timer-outline" size={18} />
            <Text variant="labelLarge">{formatDuration(secondsLeft)}</Text>
          </View>
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

      {isExam ? (
        <View style={styles.footerRow}>
          <Button mode="outlined" disabled={current === 0} onPress={() => setCurrent((value) => value - 1)}>{t('previous')}</Button>
          {current < questions.length - 1
            ? <Button mode="contained" onPress={() => setCurrent((value) => value + 1)}>{t('next')}</Button>
            : <Button mode="contained" buttonColor={theme.colors.error} onPress={submitExam}>{t('submit')}</Button>}
        </View>
      ) : (
        <Button mode="contained" contentStyle={styles.nextButton} disabled={selected === null} onPress={advanceInstant}>
          {current === questions.length - 1 ? 'Finish' : t('next')}
        </Button>
      )}

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

const styles = StyleSheet.create({
  screen: { padding: 16 },
  top: { gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  attemptMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accessLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reportButton: { minHeight: 34 },
  questionPanel: { flex: 1, minHeight: 0, marginVertical: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextButton: { minHeight: 50 },
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
