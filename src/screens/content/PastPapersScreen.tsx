import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Searchbar, Text, useTheme } from 'react-native-paper';

import { IconTile } from '@/components/Motion';
import { NetworkActivity } from '@/components/NetworkActivity';
import { EmptyState, Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { userFacingError } from '@/utils/userFacingError';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { canAccessPaper } from '@/utils/access';

type Props = NativeStackScreenProps<RootStackParamList, 'PastPapers'>;

export function PastPapersScreen({ navigation }: Props) {
  const { state, downloadPaper, t } = useApp();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState('');
  const papers = useMemo(() => state.catalog.pastPapers
    .filter((paper) => paper.grade === state.preferences.grade)
    .filter((paper) => state.preferences.grade < 11 || paper.stream === state.preferences.stream)
    .filter((paper) => paper.title.toLowerCase().includes(query.trim().toLowerCase())), [query, state.catalog.pastPapers, state.preferences.grade, state.preferences.stream]);

  const download = async (paperId: string) => {
    if (busyId) return;
    setBusyId(paperId);
    setError('');
    try { await downloadPaper(paperId); }
    catch (caught) { setError(userFacingError(caught, 'paper')); }
    finally { setBusyId(undefined); }
  };

  return (
    <Screen>
      <Searchbar placeholder="Search paper title" value={query} onChangeText={setQuery} />
      {error ? <Text style={{ color: theme.colors.error }}>{error}</Text> : null}
      <NetworkActivity
        visible={Boolean(busyId)}
        label="Downloading past paper…"
        detail="The paper will open from Downloads when it is ready."
      />
      {papers.map((paper) => {
        const saved = state.paperDownloads.some((item) => item.paper.id === paper.id);
        const unlocked = canAccessPaper(state.user, paper);
        const subject = state.catalog.subjects.find((item) => item.id === paper.subjectId);
        return (
          <Card key={paper.id} mode="outlined" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.row}>
              <IconTile source="file-document-outline" size={29} tone="secondary" style={styles.icon} />
              <View style={styles.grow}>
                <Text variant="titleMedium" style={styles.bold}>{paper.title}</Text>
                <Text variant="bodySmall" style={styles.muted}>{subject?.name ?? 'Past paper'} · {paper.year}</Text>
              </View>
            </Card.Content>
            <Card.Actions>
              {!unlocked
                ? <Button icon="crown-outline" mode="contained-tonal" onPress={() => navigation.navigate('Premium')}>Premium</Button>
                : saved
                ? <Button icon="check" mode="contained-tonal" onPress={() => navigation.navigate('PaperViewer', { paperId: paper.id })}>View offline</Button>
                : <Button icon="download" loading={busyId === paper.id} disabled={Boolean(busyId)} onPress={() => void download(paper.id)}>{busyId === paper.id ? 'Downloading…' : t('download')}</Button>}
            </Card.Actions>
          </Card>
        );
      })}
      {!papers.length ? <EmptyState icon="file-search-outline" title={t('noResults')} body="Try a different paper title or check again after a content update." /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: ui.radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  icon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 4 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.68 },
});
