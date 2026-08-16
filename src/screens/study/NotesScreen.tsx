import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Icon, List, Searchbar, Text, useTheme } from 'react-native-paper';

import { PressableScale } from '@/components/Motion';
import { EmptyState, Screen } from '@/components/Screen';
import { V1_AMHARIC_UI_ENABLED } from '@/config';
import { useApp } from '@/context/AppContext';
import { subjectPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { api } from '@/services/api';
import type { StudyNote } from '@/types';
import { groupStudyNotesByUnit, resolveStudyNoteUnit } from '@/utils/notes';
import { userFacingError } from '@/utils/userFacingError';

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;

export function NotesScreen({ navigation }: Props) {
  const { state, subjects } = useApp();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const cacheKey = `@zemen-academy/notes-index-v1:${state.preferences.grade}:${state.preferences.stream ?? ''}`;

  const refresh = async (force = false) => {
    setError('');
    try {
      const response = await api.notes(state.preferences.grade, state.preferences.stream, force);
      setNotes(response.notes);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(response.notes));
    } catch (caught) {
      setError(userFacingError(caught, 'notes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    void AsyncStorage.getItem(cacheKey)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setNotes(parsed);
      })
      .catch(() => undefined)
      .finally(() => { if (active) void refresh(true); });
    return () => { active = false; };
    // The grade/stream-specific cache key intentionally starts a new load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const grouped = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return subjects.map((subject) => {
      const subjectUnits = state.catalog.units.filter((unit) => unit.subjectId === subject.id);
      const subjectNotes = notes.filter((note) => {
        if (note.subjectId !== subject.id) return false;
        if (!normalizedQuery) return true;
        const unit = resolveStudyNoteUnit(note, subjectUnits);
        return note.title.toLowerCase().includes(normalizedQuery)
          || note.summary.toLowerCase().includes(normalizedQuery)
          || subject.name.toLowerCase().includes(normalizedQuery)
          || Boolean(unit?.title.toLowerCase().includes(normalizedQuery))
          || Boolean(unit && `unit ${unit.number}`.includes(normalizedQuery));
      });
      return { subject, unitGroups: groupStudyNotesByUnit(subjectNotes, subjectUnits) };
    }).filter((group) => group.unitGroups.length);
  }, [notes, query, state.catalog.units, subjects]);

  const openNote = (note: StudyNote) => {
    if (note.accessTier === 'premium' && !state.user?.isPremium) {
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('NoteViewer', { noteId: note.id, version: note.version });
  };

  return (
    <Screen>
      <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
        <Card.Content style={styles.heroContent}>
          <View style={[styles.icon, { backgroundColor: theme.colors.surface }]}>
            <Icon source="notebook-outline" size={34} color={theme.colors.primary} />
          </View>
          <View style={styles.grow}>
            <Text variant="headlineSmall" style={styles.bold}>Grade {state.preferences.grade} notes</Text>
            <Text variant="bodyMedium" style={styles.muted}>One complete study note for every published textbook unit.</Text>
          </View>
        </Card.Content>
      </Card>

      <Searchbar placeholder="Search subjects or units" value={query} onChangeText={setQuery} style={styles.search} />

      {loading && !notes.length ? <ActivityIndicator /> : null}
      {error ? (
        <Card mode="contained" style={{ backgroundColor: theme.colors.errorContainer }}>
          <Card.Content style={styles.errorRow}>
            <Text style={[styles.grow, { color: theme.colors.onErrorContainer }]}>{error}</Text>
            <Button compact onPress={() => void refresh(true)}>Retry</Button>
          </Card.Content>
        </Card>
      ) : null}

      {!loading && !notes.length ? (
        <EmptyState icon="book-clock-outline" title="Notes are being prepared" body="Complete unit notes will appear automatically after publishing." />
      ) : null}

      {notes.length && !grouped.length ? (
        <EmptyState icon="text-search" title="No matching unit notes" body="Try another subject, unit number, or unit title." />
      ) : null}

      {grouped.map(({ subject, unitGroups }) => {
        const tone = subjectPalette(subject.id, theme.dark);
        return (
          <Card key={subject.id} mode="outlined" style={styles.subjectCard}>
            <List.Accordion
              id={subject.id}
              title={V1_AMHARIC_UI_ENABLED && state.preferences.language === 'am' && subject.nameAm ? subject.nameAm : subject.name}
              description={`${unitGroups.length} published ${unitGroups.length === 1 ? 'unit note' : 'unit notes'}`}
              titleStyle={styles.bold}
              left={(props) => <List.Icon {...props} icon={subject.icon || 'book-open-page-variant-outline'} />}
            >
              <View style={styles.units}>
                {unitGroups.map((unitGroup) => {
                  const note = [...unitGroup.notes].sort((left, right) => (
                    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
                  ))[0]!;
                  const summary = V1_AMHARIC_UI_ENABLED && state.preferences.language === 'am' && note.summaryAm ? note.summaryAm : note.summary;
                  const locked = note.accessTier === 'premium' && !state.user?.isPremium;
                  return (
                    <PressableScale
                      key={unitGroup.key}
                      accessibilityLabel={`Open Unit ${unitGroup.number ?? ''} ${unitGroup.title}`}
                      onPress={() => openNote(note)}
                    >
                      <Card
                        mode="outlined"
                        style={[
                          styles.unitCard,
                          theme.dark ? ui.shadow.dark : ui.shadow.light,
                          { borderColor: tone.container, backgroundColor: tone.soft },
                        ]}
                      >
                        <View style={styles.unitRow}>
                          <View style={[styles.unitNumber, { backgroundColor: tone.container }]}>
                            <Text variant="titleLarge" style={{ color: tone.color, fontWeight: '900' }}>{unitGroup.number ?? '•'}</Text>
                          </View>
                          <View style={styles.grow}>
                            <Text variant="labelSmall" style={[styles.unitLabel, { color: tone.color }]}>
                              {unitGroup.number ? `UNIT ${unitGroup.number}` : 'STUDY NOTE'}
                            </Text>
                            <Text variant="titleMedium" style={styles.unitTitle}>{unitGroup.title}</Text>
                            <Text variant="bodySmall" numberOfLines={2} style={styles.muted}>
                              {summary || 'Definitions, explanations, examples, and revision points.'}
                            </Text>
                          </View>
                          {locked
                            ? <Chip compact icon="crown-outline">Premium</Chip>
                            : unitGroup.number === 1 ? <Chip compact icon="lock-open-outline">Free</Chip> : null}
                          <Icon source={locked ? 'lock-outline' : 'chevron-right'} size={22} color={locked ? theme.colors.outline : tone.color} />
                        </View>
                      </Card>
                    </PressableScale>
                  );
                })}
              </View>
            </List.Accordion>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 }, bold: { fontWeight: '800' }, muted: { opacity: 0.68, lineHeight: 20 },
  hero: { borderRadius: ui.radius.lg },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20 },
  icon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  search: { borderRadius: ui.radius.md, elevation: 0 }, subjectCard: { borderRadius: ui.radius.md, overflow: 'hidden' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  units: { gap: 12, paddingHorizontal: 12, paddingBottom: 14 }, unitCard: { borderRadius: ui.radius.md, overflow: 'hidden' },
  unitRow: { minHeight: 92, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  unitNumber: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  unitLabel: { fontWeight: '900', letterSpacing: 0.8 }, unitTitle: { fontWeight: '900', marginBottom: 2 },
});
