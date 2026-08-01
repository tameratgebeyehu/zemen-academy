import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, Searchbar, Text, useTheme } from 'react-native-paper';

import { IconTile, PressableScale } from '@/components/Motion';
import { EmptyState, Screen, SectionTitle } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

export function SearchScreen({ navigation }: Props) {
  const { state, subjects, unitsForSubject, t } = useApp();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const subjectResults = useMemo(() => normalized ? subjects.filter((item) => `${item.name} ${item.nameAm}`.toLowerCase().includes(normalized)) : [], [normalized, subjects]);
  const unitResults = useMemo(() => normalized ? subjects.flatMap((subject) => unitsForSubject(subject.id).map((unit) => ({ unit, subject })))
    .filter(({ unit, subject }) => `${subject.name} ${unit.title}`.toLowerCase().includes(normalized)) : [], [normalized, subjects, unitsForSubject]);
  const paperResults = useMemo(() => normalized ? state.catalog.pastPapers.filter((paper) => paper.grade === state.preferences.grade && paper.title.toLowerCase().includes(normalized)) : [], [normalized, state.catalog.pastPapers, state.preferences.grade]);
  const noResults = normalized && !subjectResults.length && !unitResults.length && !paperResults.length;

  return (
    <Screen>
      <Searchbar autoFocus placeholder={t('search')} value={query} onChangeText={setQuery} />
      {!normalized ? <EmptyState icon="magnify" title="Search Zemen Academy" body="Find a subject, unit, or past paper by title." /> : null}
      {subjectResults.length ? <SectionTitle>{t('subjects')}</SectionTitle> : null}
      {subjectResults.map((subject) => (
        <SearchResult key={subject.id} icon={subject.icon} title={subject.name} description={`Grade ${subject.grade}`} onPress={() => navigation.navigate('Units', { subjectId: subject.id })} />
      ))}
      {unitResults.length ? <SectionTitle>{t('units')}</SectionTitle> : null}
      {unitResults.slice(0, 12).map(({ unit, subject }) => (
        <SearchResult key={unit.id} icon="clipboard-text-outline" title={`${subject.name} • ${unit.title}`} description={`${unit.questionCount} questions`} onPress={() => navigation.navigate('QuizDetails', { unitId: unit.id })} />
      ))}
      {paperResults.length ? <SectionTitle>{t('pastPapers')}</SectionTitle> : null}
      {paperResults.map((paper) => (
        <SearchResult key={paper.id} icon="file-document-outline" title={paper.title} description={`${paper.year}`} onPress={() => navigation.navigate('PastPapers')} />
      ))}
      {noResults ? <EmptyState icon="magnify-close" title={t('noResults')} body="Check the spelling or try a broader word." /> : null}
    </Screen>
  );
}

function SearchResult({ icon, title, description, onPress }: { icon: string; title: string; description: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={title}>
      <Card mode="outlined" style={[styles.item, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.itemContent}>
          <IconTile source={icon} size={22} />
          <View style={styles.grow}>
            <Text variant="titleSmall" style={styles.bold}>{title}</Text>
            <Text variant="bodySmall" style={styles.muted}>{description}</Text>
          </View>
          <Icon source="arrow-right" size={20} color={theme.colors.primary} />
        </Card.Content>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  item: { borderRadius: ui.radius.md },
  itemContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, gap: 2 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.65 },
});
