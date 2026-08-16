import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Icon, Text, useTheme } from 'react-native-paper';

import { PressableScale } from '@/components/Motion';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen, SectionTitle } from '@/components/Screen';
import { PREMIUM_ACCESS_BUTTON_LABEL } from '@/config';
import { useApp } from '@/context/AppContext';
import { heroPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { QuizMode } from '@/types';
import { canAccessPaper } from '@/utils/access';
import { userFacingError } from '@/utils/userFacingError';

type Props = NativeStackScreenProps<RootStackParamList, 'PastPaperDetails'>;

export function PastPaperDetailsScreen({ route, navigation }: Props) {
  const { state, downloadPaper, prepareOnlineQuiz, questionsForUnit } = useApp();
  const theme = useTheme();
  const hero = heroPalette(theme.dark);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [startingMode, setStartingMode] = useState<QuizMode | null>(null);
  const [error, setError] = useState('');
  const paper = state.catalog.pastPapers.find((item) => item.id === route.params.paperId);
  const subject = paper ? state.catalog.subjects.find((item) => item.id === paper.subjectId) : undefined;
  const download = state.paperDownloads.find((item) => item.paper.id === route.params.paperId && item.questions.length > 0);
  const loadedQuestions = questionsForUnit(route.params.paperId);

  if (!paper) return <Screen><Text>This exam is unavailable.</Text></Screen>;
  if (!canAccessPaper(state.user, paper)) {
    return (
      <Screen style={styles.locked}>
        <View style={[styles.lockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source="crown-outline" size={42} color={theme.colors.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.centerTitle}>Unlock exam practice</Text>
        <Text variant="bodyLarge" style={styles.centerMuted}>Premium includes answers, explanations, results, and offline practice.</Text>
        <Button mode="contained" icon="crown-outline" onPress={() => navigation.navigate('Premium')}>{PREMIUM_ACCESS_BUTTON_LABEL}</Button>
      </Screen>
    );
  }

  const saveOffline = async () => {
    if (downloadBusy || startingMode) return;
    setDownloadBusy(true);
    setError('');
    try { await downloadPaper(paper.id); }
    catch (caught) { setError(userFacingError(caught, 'paper')); }
    finally { setDownloadBusy(false); }
  };

  const start = async (mode: QuizMode) => {
    if (downloadBusy || startingMode) return;
    setStartingMode(mode);
    setError('');
    try {
      await prepareOnlineQuiz(paper.id, 'past-paper');
      navigation.navigate('ExamRules', { unitId: paper.id, mode, contentType: 'past-paper' });
    } catch (caught) {
      setError(userFacingError(caught, 'paper'));
    } finally {
      setStartingMode(null);
    }
  };

  const count = loadedQuestions.length || paper.questionCount || 0;
  return (
    <Screen>
      <Card mode="contained" style={[styles.hero, { backgroundColor: hero.background }]}>
        <Card.Content style={styles.heroContent}>
          <View style={[styles.heroIcon, { backgroundColor: hero.overlay }]}>
            <Icon source={paper.subjectIcon || subject?.icon || 'clipboard-text-outline'} size={38} color={hero.foreground} />
          </View>
          <View style={styles.grow}>
            <Text variant="labelMedium" style={[styles.eyebrow, { color: hero.muted }]}>PAST EXAM · {paper.year}</Text>
            <Text variant="headlineSmall" style={[styles.bold, { color: hero.foreground }]}>{paper.title}</Text>
            <Text variant="bodySmall" style={{ color: hero.muted }}>{paper.subjectName ?? subject?.name ?? 'Entrance exam'}{paper.stream ? ` · ${paper.stream}` : ' · Shared'} · {count} questions</Text>
          </View>
        </Card.Content>
        <View style={[styles.accessRow, { backgroundColor: hero.overlay }]}>
          <Icon source={download ? 'wifi-off' : 'cloud-outline'} size={18} color={hero.foreground} />
          <Text variant="labelMedium" style={{ color: hero.foreground }}>{download ? 'Ready offline' : 'Online attempt available'}</Text>
        </View>
      </Card>

      <Card mode="outlined" style={styles.offlineCard}>
        <Card.Content style={styles.offlineRow}>
          <View style={[styles.smallIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source={download ? 'check-circle' : 'download-outline'} size={27} color={theme.colors.primary} />
          </View>
          <View style={styles.grow}>
            <Text variant="titleSmall" style={styles.bold}>{download ? 'Ready offline' : 'Save for offline'}</Text>
            <Text variant="bodySmall" style={styles.muted}>{download ? 'Practice without mobile data.' : 'Start online or download it.'}</Text>
          </View>
        </Card.Content>
        {!download || download.paper.version < paper.version ? (
          <Card.Actions style={styles.cardActions}>
            <Button mode="outlined" icon={download ? 'update' : 'download'} loading={downloadBusy} disabled={Boolean(startingMode)} onPress={() => void saveOffline()}>
              {download ? 'Update offline copy' : 'Download for offline'}
            </Button>
          </Card.Actions>
        ) : null}
      </Card>

      {error ? <Card mode="contained" style={{ backgroundColor: theme.colors.errorContainer }}><Card.Content><Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text></Card.Content></Card> : null}
      <NetworkActivity visible={downloadBusy || Boolean(startingMode)} label={downloadBusy ? 'Saving entrance paper…' : 'Preparing questions…'} detail="This will open automatically when ready." />

      <SectionTitle>Practice mode</SectionTitle>
      <ModeCard icon="message-check-outline" title="Instant mode" body="See the answer after each question." loading={startingMode === 'instant'} disabled={downloadBusy || Boolean(startingMode)} onPress={() => void start('instant')} />
      <ModeCard icon="timer-outline" title="Exam mode" body="Finish first, then review your answers." loading={startingMode === 'exam'} disabled={downloadBusy || Boolean(startingMode)} onPress={() => void start('exam')} />
    </Screen>
  );
}

function ModeCard({ icon, title, body, loading, disabled, onPress }: { icon: string; title: string; body: string; loading: boolean; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={styles.modePressable}>
      <Card mode="outlined" style={styles.modeCard}>
        <Card.Content style={styles.modeRow}>
          <View style={[styles.modeIcon, { backgroundColor: theme.colors.primaryContainer }]}><Icon source={icon} size={28} color={theme.colors.primary} /></View>
          <View style={styles.grow}><Text variant="titleMedium" style={styles.bold}>{title}</Text><Text variant="bodySmall" style={styles.muted}>{body}</Text></View>
          {loading ? <ActivityIndicator size={23} /> : <Icon source="arrow-right" size={23} color={theme.colors.primary} />}
        </Card.Content>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: ui.radius.lg, overflow: 'hidden' }, heroContent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 },
  heroIcon: { width: 66, height: 66, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, grow: { flex: 1, gap: 3 },
  eyebrow: { fontWeight: '900', letterSpacing: 0.8, fontSize: 10 }, bold: { fontWeight: '900' }, muted: { opacity: 0.68, lineHeight: 19 },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11 },
  offlineCard: { borderRadius: ui.radius.md, overflow: 'hidden' }, offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 16 },
  smallIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, cardActions: { paddingHorizontal: 14, paddingBottom: 10 },
  modePressable: { borderRadius: ui.radius.md }, modeCard: { borderRadius: ui.radius.md }, modeRow: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 92 },
  modeIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  locked: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }, lockIcon: { width: 88, height: 88, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  centerTitle: { fontWeight: '900', textAlign: 'center' }, centerMuted: { opacity: 0.7, textAlign: 'center', lineHeight: 23 },
});
