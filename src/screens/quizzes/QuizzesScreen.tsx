import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, ProgressBar, Text, useTheme } from 'react-native-paper';

import { PressableScale } from '@/components/Motion';
import { NetworkActivity } from '@/components/NetworkActivity';
import { EmptyState, Screen } from '@/components/Screen';
import { V1_AMHARIC_UI_ENABLED } from '@/config';
import { useApp } from '@/context/AppContext';
import { userFacingError } from '@/utils/userFacingError';
import { subjectPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { runWhenIdle } from '@/utils/idleTask';

export function QuizzesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, subjects, refreshCatalog, t } = useApp();
  const theme = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const gradeLabel = `Grade ${state.preferences.grade}${state.preferences.grade >= 11 ? ` • ${state.preferences.stream}` : ''}`;
  const subjectRows = useMemo(() => {
    const unitCountBySubject = new Map<string, number>();
    const downloadCountBySubject = new Map<string, number>();

    state.catalog.units.forEach((unit) => {
      unitCountBySubject.set(unit.subjectId, (unitCountBySubject.get(unit.subjectId) ?? 0) + 1);
    });
    state.unitDownloads.forEach((item) => {
      const subjectId = item.subject.id;
      downloadCountBySubject.set(subjectId, (downloadCountBySubject.get(subjectId) ?? 0) + 1);
    });

    return subjects.map((subject) => ({
      subject,
      unitCount: unitCountBySubject.get(subject.id) ?? 0,
      downloadCount: downloadCountBySubject.get(subject.id) ?? 0,
    }));
  }, [state.catalog.units, state.unitDownloads, subjects]);
  const totalDownloads = useMemo(
    () => subjectRows.reduce((total, row) => total + row.downloadCount, 0),
    [subjectRows],
  );

  useFocusEffect(useCallback(() => {
    const task = runWhenIdle(() => {
      void refreshCatalog(false).catch(() => undefined);
    });
    return () => task.cancel();
  }, [refreshCatalog]));

  const syncContent = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError('');
    try {
      await refreshCatalog(true);
    } catch (caught) {
      setSyncError(userFacingError(caught, 'catalog'));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen safeTop safeBottom={false}>
      <View style={styles.heading}>
        <Text variant="labelLarge" style={[styles.eyebrow, { color: theme.colors.primary }]}>PRACTICE LIBRARY</Text>
        <Text variant="headlineMedium" style={styles.title}>{t('subjects')}</Text>
        <Text variant="bodyMedium" style={styles.muted}>Choose a subject, download a unit, and learn at your pace.</Text>
      </View>

      <Card mode="contained" style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <Card.Content style={styles.summaryContent}>
          <View style={[styles.gradeIcon, { backgroundColor: theme.colors.primary }]}>
            <Icon source="school-outline" size={28} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.grow}>
            <Text variant="labelMedium" style={styles.muted}>YOUR CURRENT PLAN</Text>
            <Text variant="titleLarge" style={styles.bold}>{gradeLabel}</Text>
            <Text variant="bodySmall" style={styles.muted}>{subjects.length} subjects • {totalDownloads} units offline</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.listHeading}>
        <Text variant="titleMedium" style={styles.bold}>All subjects</Text>
        <Button compact icon="cloud-sync-outline" loading={syncing} disabled={syncing} onPress={() => void syncContent()}>
          {syncing ? 'Updating…' : 'Sync content'}
        </Button>
      </View>
      {syncError ? <Text variant="bodySmall" style={{ color: theme.colors.error }}>{syncError}</Text> : null}
      <NetworkActivity
        visible={syncing}
        label="Updating your content library…"
        detail="Your current subjects remain available while we check for changes."
      />

      {subjectRows.map(({ subject, unitCount, downloadCount }) => {
        const progress = unitCount ? downloadCount / unitCount : 0;
        const tone = subjectPalette(subject.id, theme.dark);

        return (
          <PressableScale
            key={subject.id}
            onPress={() => navigation.navigate('Units', { subjectId: subject.id })}
            accessibilityLabel={`Open ${subject.name}`}
          >
            <Card mode="outlined" style={[styles.card, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: tone.soft, borderColor: tone.container }]}>
              <View style={styles.cardContent}>
                <View style={[styles.icon, { backgroundColor: tone.container }]}>
                  <Icon source={subject.icon} size={29} color={tone.color} />
                </View>
                <View style={styles.subjectCopy}>
                  <View style={styles.subjectTop}>
                    <View style={styles.grow}>
                      <Text variant="titleMedium" style={styles.bold}>
                        {V1_AMHARIC_UI_ENABLED && state.preferences.language === 'am' ? subject.nameAm : subject.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.muted}>{unitCount} learning units</Text>
                    </View>
                    <View style={[styles.arrow, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Icon source="arrow-right" size={18} color={theme.colors.primary} />
                    </View>
                  </View>
                  <View style={styles.progressRow}>
                    <ProgressBar progress={progress} color={tone.color} style={styles.progress} />
                    <Text variant="labelSmall" style={styles.muted}>{downloadCount}/{unitCount} offline</Text>
                  </View>
                </View>
              </View>
            </Card>
          </PressableScale>
        );
      })}
      {!subjects.length ? (
        <EmptyState icon="bookshelf" title="No subjects found" body="Check your grade and stream in Profile, then refresh." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6, marginTop: 3, marginBottom: 4 },
  eyebrow: { fontWeight: '900', letterSpacing: 1.2, fontSize: 11 },
  title: { fontWeight: '900', letterSpacing: -0.7 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.65 },
  summaryCard: { borderRadius: ui.radius.lg },
  summaryContent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  gradeIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 2 },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  card: { overflow: 'hidden', borderRadius: ui.radius.md },
  cardContent: { minHeight: 98, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  subjectCopy: { flex: 1, gap: 11 },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  arrow: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  progress: { flex: 1, height: 6, borderRadius: ui.radius.pill },
});
