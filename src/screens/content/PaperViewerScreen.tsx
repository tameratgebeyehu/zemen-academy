import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { Banner, Button, Text } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import type { RootStackParamList } from '@/navigation/types';
import { canAccessPaper } from '@/utils/access';

type Props = NativeStackScreenProps<RootStackParamList, 'PaperViewer'>;

export function PaperViewerScreen({ route, navigation }: Props) {
  const { state } = useApp();
  const download = state.paperDownloads.find((item) => item.paper.id === route.params.paperId);
  if (!download) return <Screen><Text>This paper must be downloaded before it can be viewed.</Text></Screen>;
  if (!canAccessPaper(state.user, download.paper)) {
    return <Screen><Text variant="headlineSmall" style={styles.title}>Premium past paper</Text><Text>This saved paper requires active Premium access.</Text><Button mode="contained" icon="crown-outline" onPress={() => navigation.navigate('Premium')}>View Premium plans</Button></Screen>;
  }

  return (
    <Screen>
      <Banner visible icon="lock-outline">This paper is stored for in-app offline viewing. Export and sharing are not available.</Banner>
      <Text variant="headlineSmall" style={styles.title}>{download.paper.title}</Text>
      <Text variant="labelMedium" style={styles.muted}>Grade {download.paper.grade} · {download.paper.year}</Text>
      <Text variant="bodyLarge" style={styles.paper} selectable={false}>{download.content}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800' },
  muted: { opacity: 0.65 },
  paper: { lineHeight: 27, paddingVertical: 12 },
});
