import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, useTheme } from 'react-native-paper';
import * as ScreenCapture from 'expo-screen-capture';

import { PaperContent } from '@/components/PaperContent';
import { Screen } from '@/components/Screen';
import { PREMIUM_ACCESS_BUTTON_LABEL } from '@/config';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { canAccessPaper } from '@/utils/access';

type Props = NativeStackScreenProps<RootStackParamList, 'PaperViewer'>;

export function PaperViewerScreen({ route, navigation }: Props) {
  const { state } = useApp();
  const theme = useTheme();
  const download = state.paperDownloads.find((item) => item.paper.id === route.params.paperId);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => { void ScreenCapture.allowScreenCaptureAsync(); };
  }, []);

  if (!download) {
    return <Screen><Text variant="titleMedium">Download this paper before opening it.</Text><Button onPress={() => navigation.goBack()}>Go back</Button></Screen>;
  }
  if (!canAccessPaper(state.user, download.paper)) {
    return <Screen><Text variant="headlineSmall" style={styles.bold}>Premium past paper</Text><Text>This saved paper requires active Premium access.</Text><Button mode="contained" icon="crown-outline" onPress={() => navigation.navigate('Premium')}>{PREMIUM_ACCESS_BUTTON_LABEL}</Button></Screen>;
  }
  if (!download.content) {
    return (
      <Screen style={styles.legacyMessage}>
        <Icon source="clipboard-text-outline" size={46} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={styles.bold}>This is now interactive</Text>
        <Text variant="bodyLarge" style={styles.muted}>Entrance papers now open in Instant or Exam mode with answer explanations.</Text>
        <Button mode="contained" icon="arrow-right" onPress={() => navigation.replace('PastPaperDetails', { paperId: download.paper.id })}>Choose practice mode</Button>
      </Screen>
    );
  }

  const subject = state.catalog.subjects.find((item) => item.id === download.paper.subjectId);
  return (
    <Screen scroll={false} style={styles.screen}>
      <Card mode="contained" style={[styles.header, { backgroundColor: theme.colors.primaryContainer }]}>
        <Card.Content style={styles.headerContent}>
          <View style={[styles.icon, { backgroundColor: theme.colors.surface }]}>
            <Icon source="file-lock-outline" size={26} color={theme.colors.primary} />
          </View>
          <View style={styles.grow}>
            <Text variant="titleMedium" style={styles.bold} numberOfLines={2}>{download.paper.title}</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {subject?.name ?? `Grade ${download.paper.grade}`} · {download.paper.year}{download.paper.stream ? ` · ${download.paper.stream}` : ''} · Offline
            </Text>
          </View>
        </Card.Content>
      </Card>
      <View style={styles.reader}><PaperContent content={download.content} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 12, gap: 10 },
  header: { borderRadius: ui.radius.md },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 2 },
  bold: { fontWeight: '900' },
  muted: { opacity: 0.68 },
  reader: { flex: 1, minHeight: 0, borderRadius: ui.radius.md, overflow: 'hidden' },
  legacyMessage: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
});
