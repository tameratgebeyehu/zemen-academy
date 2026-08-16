import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Icon, Text, useTheme } from 'react-native-paper';

import { PressableScale } from '@/components/Motion';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen, SectionTitle } from '@/components/Screen';
import { PREMIUM_ACCESS_BUTTON_LABEL } from '@/config';
import { useApp } from '@/context/AppContext';
import { userFacingError } from '@/utils/userFacingError';
import { heroPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { QuizMode } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuizDetails'>;

export function QuizDetailsScreen({ route, navigation }: Props) {
  const { state, isUnitUnlocked, questionsForUnit, prepareOnlineQuiz, downloadUnit, rememberLearningPosition, t } = useApp();
  const theme = useTheme();
  const hero = heroPalette(theme.dark);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [startingMode, setStartingMode] = useState<QuizMode | null>(null);
  const [error, setError] = useState('');
  const unit = state.catalog.units.find((item) => item.id === route.params.unitId);
  const subject = unit ? state.catalog.subjects.find((item) => item.id === unit.subjectId) : undefined;
  const downloaded = state.unitDownloads.find((item) => item.unit.id === route.params.unitId);
  const loadedQuestions = questionsForUnit(route.params.unitId);

  useEffect(() => {
    if (unit) rememberLearningPosition(unit.subjectId, unit.id);
  }, [rememberLearningPosition, unit?.id, unit?.subjectId]);

  if (!unit || !subject) return <Screen><Text>This quiz is unavailable.</Text></Screen>;
  if (!isUnitUnlocked(unit)) {
    return (
      <Screen style={styles.lockedScreen}>
        <View style={[styles.lockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source="crown-outline" size={42} color={theme.colors.primary} />
        </View>
        <Text variant="headlineSmall" style={[styles.bold, styles.center]}>Unlock this unit with Premium</Text>
        <Text variant="bodyLarge" style={[styles.muted, styles.center]}>Unit 1 in every subject stays free. Premium unlocks later units, exam practice, and offline downloads.</Text>
        <Button mode="contained" icon="crown-outline" contentStyle={styles.upgradeButton} onPress={() => navigation.navigate('Premium')}>{PREMIUM_ACCESS_BUTTON_LABEL}</Button>
        <Button mode="text" onPress={() => navigation.goBack()}>Back to units</Button>
      </Screen>
    );
  }

  const download = async () => {
    if (downloadBusy || startingMode !== null) return;
    setDownloadBusy(true);
    setError('');
    try {
      await downloadUnit(unit.id);
    } catch (caught) {
      setError(userFacingError(caught, 'quiz'));
    } finally {
      setDownloadBusy(false);
    }
  };

  const startQuiz = async (mode: QuizMode) => {
    if (startingMode !== null || downloadBusy) return;
    setStartingMode(mode);
    setError('');
    try {
      await prepareOnlineQuiz(unit.id);
      navigation.navigate('ExamRules', { unitId: unit.id, mode });
    } catch (caught) {
      setError(userFacingError(caught, 'quiz'));
    } finally {
      setStartingMode(null);
    }
  };

  const questionCount = loadedQuestions.length || unit.questionCount;
  const accessLabel = downloaded ? 'Ready offline' : loadedQuestions.length ? 'Loaded for this session' : 'Online access available';

  return (
    <Screen>
      <Card mode="contained" style={[styles.heroCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: hero.background }]}>
        <Card.Content style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: hero.overlay }]}>
            <Icon source={subject.icon} size={38} color={hero.foreground} />
          </View>
          <View style={styles.grow}>
            <Text variant="labelMedium" style={[styles.heroEyebrow, { color: hero.muted }]}>{subject.name.toUpperCase()}</Text>
            <Text variant="headlineSmall" style={[styles.heroTitle, { color: hero.foreground }]}>{unit.title}</Text>
            <Text variant="bodySmall" style={{ color: hero.muted }}>
              Grade {subject.grade} • {questionCount} questions
            </Text>
          </View>
        </Card.Content>
        <View style={[styles.accessRow, { backgroundColor: hero.overlay }]}>
          <Icon source={downloaded ? 'wifi-off' : 'cloud-outline'} size={18} color={hero.foreground} />
          <Text variant="labelMedium" style={{ color: hero.foreground }}>{accessLabel}</Text>
        </View>
      </Card>

      <Card mode="outlined" style={[styles.offlineCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.downloadBox}>
          <View style={[styles.downloadIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source={downloaded ? 'check-circle' : 'download-outline'} size={27} color={theme.colors.primary} />
          </View>
          <View style={styles.downloadCopy}>
            <Text variant="titleSmall" style={[styles.bold, styles.downloadTitle]}>
              {downloaded ? 'Saved for offline study' : 'Want to study without internet?'}
            </Text>
            <Text variant="bodySmall" style={[styles.muted, styles.downloadSubtitle]}>
              {downloaded
                ? 'This quiz can be opened anywhere, even without mobile data.'
                : 'Downloading is optional. You can start online below without saving the quiz.'}
            </Text>
          </View>
        </Card.Content>
        {!downloaded ? (
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              icon="download"
              loading={downloadBusy}
              disabled={downloadBusy || startingMode !== null}
              onPress={() => void download()}
            >
              {downloadBusy ? 'Downloading…' : `${t('download')} for offline`}
            </Button>
          </Card.Actions>
        ) : downloaded.unit.version < unit.version ? (
          <Card.Actions style={styles.cardActions}>
            <Button icon="update" loading={downloadBusy} disabled={downloadBusy} onPress={() => void download()}>
              {downloadBusy ? 'Updating…' : 'Update offline copy'}
            </Button>
          </Card.Actions>
        ) : null}
      </Card>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
          <Icon source="alert-circle-outline" size={19} color={theme.colors.error} />
          <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      <NetworkActivity
        visible={downloadBusy || startingMode !== null}
        label={downloadBusy ? 'Downloading this quiz…' : `Loading ${startingMode === 'exam' ? t('examMode') : t('instantMode')}…`}
        detail={downloadBusy ? 'Questions are being saved for offline study.' : 'Preparing the questions for this attempt.'}
      />

      <View style={styles.modeHeading}>
        <SectionTitle>Choose how to practise</SectionTitle>
        {!downloaded ? (
          <View style={[styles.onlinePill, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="wifi" size={14} color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Internet required</Text>
          </View>
        ) : null}
      </View>
      <ModeCard
        icon="message-check-outline"
        title={t('instantMode')}
        body="See the correct answer and explanation after each question."
        badge={startingMode === 'instant' ? 'LOADING QUESTIONS…' : downloaded ? 'OFFLINE' : 'PLAY ONLINE'}
        loading={startingMode === 'instant'}
        disabled={startingMode !== null || downloadBusy}
        onPress={() => void startQuiz('instant')}
      />
      <ModeCard
        icon="timer-outline"
        title={t('examMode')}
        body="Take a timed attempt, then review every answer after submission."
        badge={startingMode === 'exam' ? 'LOADING QUESTIONS…' : downloaded ? 'OFFLINE' : 'PLAY ONLINE'}
        loading={startingMode === 'exam'}
        disabled={startingMode !== null || downloadBusy}
        onPress={() => void startQuiz('exam')}
      />

      {!downloaded ? (
        <View style={styles.dataNote}>
          <Icon source="information-outline" size={17} color={theme.colors.outline} />
          <Text variant="bodySmall" style={[styles.muted, styles.noteText]}>
            Online mode loads the questions for this attempt only. It does not add anything to Downloads.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

function ModeCard({ icon, title, body, badge, loading, disabled, onPress }: {
  icon: string;
  title: string;
  body: string;
  badge: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={title} style={styles.modeCard}>
      <Card mode="outlined" style={[styles.modeCardSurface, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.modeRow}>
          <View style={[styles.modeIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source={icon} size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.grow}>
            <Text variant="labelSmall" style={[styles.badge, { color: theme.colors.primary }]}>{badge}</Text>
            <Text variant="titleMedium" style={styles.bold}>{title}</Text>
            <Text variant="bodySmall" style={styles.muted}>{body}</Text>
          </View>
          {loading
            ? <ActivityIndicator size={23} color={theme.colors.primary} />
            : <Icon source="arrow-right" size={23} color={theme.colors.primary} />}
        </Card.Content>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: ui.radius.lg, overflow: 'hidden' },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 17 },
  icon: { width: 66, height: 66, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 3 },
  heroEyebrow: { fontWeight: '900', letterSpacing: 1, fontSize: 10 },
  heroTitle: { fontWeight: '900' },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11 },
  offlineCard: { borderRadius: ui.radius.md, overflow: 'hidden' },
  downloadBox: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 15 },
  downloadIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  downloadCopy: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 4, paddingRight: 2 },
  downloadTitle: { lineHeight: 21 },
  downloadSubtitle: { lineHeight: 18, flexShrink: 1 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.67 },
  cardActions: { paddingHorizontal: 14, paddingBottom: 10 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: ui.radius.sm },
  modeHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: ui.radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  modeCard: { borderRadius: ui.radius.md },
  modeCardSurface: { borderRadius: ui.radius.md },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 92 },
  modeIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badge: { fontWeight: '900', letterSpacing: 0.8, fontSize: 9 },
  dataNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 5 },
  noteText: { flex: 1, lineHeight: 18 },
  lockedScreen: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  lockIcon: { width: 88, height: 88, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  upgradeButton: { minHeight: 52, paddingHorizontal: 12 },
});
