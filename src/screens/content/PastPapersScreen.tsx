import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Icon, Searchbar, Text, useTheme } from 'react-native-paper';

import { IconTile } from '@/components/Motion';
import { EmptyState, Screen, SectionTitle } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { canAccessPaper } from '@/utils/access';
import { filterPastPapers, pastPapersForProfile, pastPaperYears } from '@/utils/pastPapers';
import { runWhenIdle } from '@/utils/idleTask';

type Props = NativeStackScreenProps<RootStackParamList, 'PastPapers'>;

export function PastPapersScreen({ navigation }: Props) {
  const { state, subjects, refreshCatalog, t } = useApp();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const profilePapers = useMemo(() => pastPapersForProfile(
    state.catalog.pastPapers,
    state.preferences.grade,
    state.preferences.stream,
  ), [state.catalog.pastPapers, state.preferences.grade, state.preferences.stream]);
  const years = useMemo(() => pastPaperYears(profilePapers), [profilePapers]);

  useEffect(() => {
    if (!years.length) setSelectedYear(null);
    else if (selectedYear === null || !years.includes(selectedYear)) setSelectedYear(years[0]!);
  }, [selectedYear, years]);

  useEffect(() => { setSelectedSubjectId(null); }, [selectedYear]);

  useFocusEffect(useCallback(() => {
    const task = runWhenIdle(() => {
      void refreshCatalog(false).catch(() => undefined);
    });
    return () => task.cancel();
  }, [refreshCatalog]));

  const yearPapers = useMemo(
    () => profilePapers.filter((paper) => selectedYear === null || paper.year === selectedYear),
    [profilePapers, selectedYear],
  );
  const paperSubjects = useMemo(() => [...new Map(yearPapers.map((paper) => [paper.subjectId, {
    id: paper.subjectId,
    name: paper.subjectName ?? subjects.find((subject) => subject.id === paper.subjectId)?.name ?? paper.subjectId,
  }])).values()].sort((left, right) => left.name.localeCompare(right.name)), [subjects, yearPapers]);
  const visiblePapers = useMemo(() => filterPastPapers(
    profilePapers,
    subjects,
    selectedYear,
    selectedSubjectId,
    query,
  ), [profilePapers, query, selectedSubjectId, selectedYear, subjects]);

  const streamLabel = state.preferences.grade >= 11 ? state.preferences.stream : null;

  return (
    <Screen>
      <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
        <Card.Content style={styles.heroContent}>
          <IconTile source="file-document-multiple-outline" size={31} tone="primary" style={styles.heroIcon} />
          <View style={styles.grow}>
            <Text variant="headlineSmall" style={styles.bold}>Entrance exams</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              Past questions with answers and explanations.
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={styles.bold}>{profilePapers.length}</Text>
            <Text variant="labelSmall" style={styles.muted}>exams</Text>
          </View>
        </Card.Content>
      </Card>

      {state.preferences.grade >= 11 ? (
        <Card mode="outlined" style={styles.streamCard}>
          <Card.Content style={styles.streamRow}>
            <Icon source={streamLabel === 'Natural' ? 'flask-outline' : 'earth'} size={24} color={theme.colors.primary} />
            <View style={styles.grow}>
              <Text variant="titleSmall" style={styles.bold}>{streamLabel} subjects</Text>
            </View>
            <Button compact onPress={() => navigation.navigate('Main', { screen: 'ProfileTab' })}>Change</Button>
          </Card.Content>
        </Card>
      ) : null}

      {years.length ? (
        <>
          <SectionTitle>Year</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {years.map((year) => (
              <Chip
                key={year}
                selected={selectedYear === year}
                showSelectedCheck
                style={styles.yearChip}
                textStyle={styles.chipText}
                onPress={() => setSelectedYear(year)}
              >
                {year}
              </Chip>
            ))}
          </ScrollView>

          <SectionTitle>Subject</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip selected={!selectedSubjectId} onPress={() => setSelectedSubjectId(null)}>All</Chip>
            {paperSubjects.map((subject) => (
              <Chip
                key={subject.id}
                selected={selectedSubjectId === subject.id}
                onPress={() => setSelectedSubjectId(subject.id)}
              >
                {subject.name}
              </Chip>
            ))}
          </ScrollView>

          <Searchbar
            placeholder="Search exams"
            value={query}
            onChangeText={setQuery}
            style={styles.search}
          />
        </>
      ) : null}

      {visiblePapers.map((paper) => {
        const saved = state.paperDownloads.some((item) => item.paper.id === paper.id && item.questions.length > 0);
        const unlocked = canAccessPaper(state.user, paper);
        const subject = subjects.find((item) => item.id === paper.subjectId);
        return (
          <Card key={paper.id} mode="outlined" style={[styles.paperCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.paperContent}>
              <View style={[styles.paperIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Icon source={paper.subjectIcon || subject?.icon || 'file-document-outline'} size={27} color={theme.colors.onSecondaryContainer} />
              </View>
              <View style={styles.grow}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>{paper.subjectName ?? subject?.name ?? 'Entrance exam'}</Text>
                <Text variant="titleMedium" style={styles.bold}>{paper.title}</Text>
                <View style={styles.metaRow}>
                  <Text variant="bodySmall" style={styles.muted}>{paper.year}</Text>
                  {paper.stream ? <Text variant="bodySmall" style={styles.muted}>· {paper.stream}</Text> : null}
                  {paper.questionCount ? <Text variant="bodySmall" style={styles.muted}>· {paper.questionCount} questions</Text> : null}
                  {saved ? <Text variant="bodySmall" style={{ color: theme.colors.primary }}>· Ready offline</Text> : null}
                </View>
              </View>
            </Card.Content>
            <Card.Actions style={styles.actions}>
              {!unlocked ? (
                <Button icon="crown-outline" mode="contained-tonal" onPress={() => navigation.navigate('Premium')}>Unlock with Premium</Button>
              ) : (
                <Button
                  icon="arrow-right"
                  mode="contained"
                  onPress={() => navigation.navigate('PastPaperDetails', { paperId: paper.id })}
                >
                  {saved ? 'Open' : 'Start'}
                </Button>
              )}
            </Card.Actions>
          </Card>
        );
      })}

      {!profilePapers.length ? (
        <EmptyState icon="archive-clock-outline" title="No entrance exams yet" body="Published exams will appear here." />
      ) : years.length && !visiblePapers.length ? (
        <EmptyState icon="file-search-outline" title={t('noResults')} body="Choose All or clear the search." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: ui.radius.lg },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 18 },
  heroIcon: { width: 58, height: 58, borderRadius: 19 },
  grow: { flex: 1, gap: 3 },
  bold: { fontWeight: '900' },
  muted: { opacity: 0.68 },
  countBadge: { minWidth: 58, minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  streamCard: { borderRadius: ui.radius.md },
  streamRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  chipRow: { gap: 8, paddingRight: 20 },
  yearChip: { minWidth: 78 },
  chipText: { fontWeight: '800' },
  search: { borderRadius: ui.radius.md, elevation: 0 },
  paperCard: { borderRadius: ui.radius.md, overflow: 'hidden' },
  paperContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  paperIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  actions: { justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 12 },
});
