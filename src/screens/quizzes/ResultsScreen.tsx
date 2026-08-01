import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { Banner, Button, Card, Chip, Divider, Icon, Text, useTheme } from 'react-native-paper';

import { StatCard } from '@/components/Cards';
import { LoadingScreen, Screen, SectionTitle } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import type { RootStackParamList } from '@/navigation/types';
import { toReadableMathText } from '@/utils/math';
import { formatDuration, scoreForAttempt } from '@/utils/quiz';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;
type ReviewFilter = 'all' | 'wrong' | 'skipped';
const letters = ['A', 'B', 'C', 'D'] as const;

export function ResultsScreen({ route, navigation }: Props) {
  const { state, t } = useApp();
  const theme = useTheme();
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const attempt = state.attempts.find((item) => item.id === route.params.attemptId);
  if (!attempt) return <LoadingScreen />;

  const score = scoreForAttempt(attempt);
  const subject = state.catalog.subjects.find((item) => item.id === state.catalog.units.find((unit) => unit.id === attempt.unitId)?.subjectId);
  const reviewItems = attempt.questions.map((question, index) => {
    const answer = attempt.answers[index] ?? null;
    return { question, index, answer, correct: answer === question.correctAnswer };
  }).filter((item) => (
    reviewFilter === 'all'
    || (reviewFilter === 'wrong' && item.answer !== null && !item.correct)
    || (reviewFilter === 'skipped' && item.answer === null)
  ));

  const header = (
    <View style={styles.headerContent}>
      {attempt.endReason === 'left-app' ? (
        <Banner visible icon="alert-circle-outline" style={{ backgroundColor: theme.colors.errorContainer }}>
          This attempt ended because the quiz screen was left. It cannot be resumed.
        </Banner>
      ) : null}
      <View style={styles.hero}>
        <View style={[styles.scoreCircle, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="displaySmall" style={[styles.bold, { color: theme.colors.primary }]}>{score.percentage}%</Text>
        </View>
        <Text variant="headlineSmall" style={styles.bold}>{t('score')}: {score.correct}/{score.total}</Text>
        <Text variant="bodyMedium" style={styles.muted}>{subject?.name ?? 'Quiz'} · {attempt.mode === 'exam' ? t('examMode') : t('instantMode')}</Text>
        <View style={styles.timeRow}>
          <Icon source="clock-outline" size={18} />
          <Text variant="bodyMedium">Time used: {formatDuration(attempt.durationSeconds)}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <StatCard value={score.correct} label={t('correct')} color={theme.colors.primary} />
        <StatCard value={score.wrong} label={t('wrong')} color={theme.colors.error} />
        <StatCard value={score.skipped} label={t('skipped')} />
      </View>
      <View style={styles.actions}>
        <Button mode="contained" style={styles.grow} onPress={() => navigation.navigate('QuizDetails', { unitId: attempt.unitId })}>Try again</Button>
        <Button mode="outlined" style={styles.grow} onPress={() => navigation.navigate('Main', { screen: 'HomeTab' })}>Home</Button>
      </View>
      {attempt.remoteOnly ? (
        <Card mode="contained" style={{ backgroundColor: theme.colors.primaryContainer }}>
          <Card.Content style={styles.cloudSummary}>
            <Icon source="cloud-check-outline" size={27} color={theme.colors.primary} />
            <View style={styles.grow}>
              <Text variant="titleSmall" style={styles.bold}>Synced result</Text>
              <Text variant="bodySmall" style={styles.muted}>
                Your score and study activity are available on this device. Detailed answer review remains on the device where you completed the quiz.
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <>
          <SectionTitle>{t('reviewAnswers')}</SectionTitle>
          <Text variant="bodyMedium" style={styles.reviewHelp}>
            Every question, answer, correction, and explanation is shown below.
          </Text>
          <View style={styles.filters}>
            <Chip selected={reviewFilter === 'all'} onPress={() => setReviewFilter('all')}>All ({score.total})</Chip>
            <Chip selected={reviewFilter === 'wrong'} onPress={() => setReviewFilter('wrong')}>Wrong ({score.wrong})</Chip>
            <Chip selected={reviewFilter === 'skipped'} onPress={() => setReviewFilter('skipped')}>Skipped ({score.skipped})</Chip>
          </View>
        </>
      )}
    </View>
  );

  return (
    <Screen scroll={false} style={styles.screen}>
      <FlatList
        data={reviewItems}
        keyExtractor={(item) => item.question.id}
        ListHeaderComponent={header}
        ListEmptyComponent={attempt.remoteOnly ? null : <Text variant="bodyMedium" style={styles.emptyReview}>No answers in this category.</Text>}
        ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item: { question, index, answer, correct } }) => (
          <Card mode="outlined" style={styles.reviewCard}>
            <Card.Content style={styles.reviewSummary}>
              <View style={styles.questionHeader}>
                <View style={styles.questionTitle}>
                  <Text variant="labelLarge">Question {index + 1}</Text>
                  <Text
                    variant="labelSmall"
                    style={{ color: correct ? theme.colors.primary : answer === null ? theme.colors.outline : theme.colors.error }}
                  >
                    {correct ? t('correct') : answer === null ? t('skipped') : t('wrong')}
                  </Text>
                </View>
                <Icon
                  source={correct ? 'check-circle' : answer === null ? 'minus-circle-outline' : 'close-circle'}
                  size={22}
                  color={correct ? theme.colors.primary : answer === null ? theme.colors.outline : theme.colors.error}
                />
              </View>
              <Text variant="bodyMedium" style={styles.promptPreview}>
                {toReadableMathText(question.prompt)}
              </Text>
              <Divider />
              <Text variant="bodySmall">
                <Text variant="labelMedium">Your answer: </Text>
                {answer === null ? 'Skipped' : `${letters[answer]}. ${toReadableMathText(question.options[answer])}`}
              </Text>
              {!correct ? (
                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                  <Text variant="labelMedium">Correct answer: </Text>
                  {`${letters[question.correctAnswer]}. ${toReadableMathText(question.options[question.correctAnswer])}`}
                </Text>
              ) : null}
              <View style={[styles.explanationBlock, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelMedium" style={styles.explanationLabel}>Explanation</Text>
                <Text variant="bodySmall" style={styles.explanationCopy}>
                  {toReadableMathText(question.explanation)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingVertical: 0 },
  listContent: { paddingVertical: 16, paddingBottom: 28 },
  headerContent: { gap: 16, marginBottom: 14 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  scoreCircle: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  bold: { fontWeight: '900' },
  muted: { opacity: 0.68 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stats: { flexDirection: 'row', gap: 9 },
  actions: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
  reviewHelp: { opacity: 0.7, marginTop: -8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cloudSummary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewCard: { overflow: 'hidden' },
  reviewSummary: { gap: 9 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promptPreview: { lineHeight: 21 },
  explanationBlock: { gap: 4, borderRadius: 12, padding: 11 },
  explanationLabel: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.68 },
  explanationCopy: { lineHeight: 20 },
  itemGap: { height: 10 },
  emptyReview: { opacity: 0.7, textAlign: 'center', paddingVertical: 24 },
});
