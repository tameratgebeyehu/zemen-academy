import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Icon, Text, useTheme } from 'react-native-paper';

import { useAppDialog } from '@/components/AppDialog';
import { PressableScale } from '@/components/Motion';
import { EmptyState, Screen } from '@/components/Screen';
import { PREMIUM_ACCESS_BUTTON_LABEL } from '@/config';
import { useApp } from '@/context/AppContext';
import { subjectPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Units'>;

export function UnitsScreen({ route, navigation }: Props) {
  const { state, unitsForSubject, isUnitUnlocked, rememberLearningPosition, t } = useApp();
  const { showDialog } = useAppDialog();
  const theme = useTheme();
  const subject = state.catalog.subjects.find((item) => item.id === route.params.subjectId);
  const units = unitsForSubject(route.params.subjectId);
  const tone = subjectPalette(subject?.id ?? route.params.subjectId, theme.dark);
  const downloadedUnitIds = useMemo(
    () => new Set(state.unitDownloads.map((item) => item.unit.id)),
    [state.unitDownloads],
  );

  useEffect(() => {
    rememberLearningPosition(route.params.subjectId);
  }, [rememberLearningPosition, route.params.subjectId]);

  if (!subject) return <EmptyState icon="help-circle-outline" title="Subject unavailable" body="Refresh the catalog and try again." />;

  return (
    <Screen>
      <View style={styles.heading}>
        <Text variant="headlineSmall" style={styles.bold}>{subject.name}</Text>
        <Text variant="bodyMedium" style={styles.muted}>{t('units')}</Text>
      </View>
      {units.map((unit) => {
        const unlocked = isUnitUnlocked(unit);
        const downloaded = downloadedUnitIds.has(unit.id);
        return (
          <PressableScale
            key={unit.id}
            accessibilityLabel={`Open ${unit.title}`}
            onPress={() => unlocked
                ? navigation.navigate('QuizDetails', { unitId: unit.id })
                : showDialog({
                  title: 'Premium unit',
                  body: 'Unit 1 stays free. Premium unlocks this unit for online practice and offline study.',
                  icon: 'crown-outline',
                  actions: [
                    { label: 'Not now', tone: 'neutral' },
                    { label: PREMIUM_ACCESS_BUTTON_LABEL, tone: 'primary', onPress: () => navigation.navigate('Premium') },
                  ],
                })}
          >
            <Card mode="outlined" style={[styles.card, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: tone.soft, borderColor: tone.container }]}>
              <View style={styles.row}>
                <View style={[styles.number, { backgroundColor: tone.container }]}>
                  <Text variant="titleLarge" style={{ color: tone.color, fontWeight: '900' }}>{unit.number}</Text>
                </View>
                <View style={styles.grow}>
                  <Text variant="titleMedium" style={styles.bold}>{unit.title}</Text>
                  <Text variant="bodySmall" style={styles.muted}>{unit.questionCount} {t('questions')}</Text>
                </View>
                {!unlocked ? <Chip compact icon="crown-outline">Premium</Chip> : downloaded ? <Chip compact icon="check">Offline</Chip> : null}
                <Icon source={unlocked ? 'chevron-right' : 'lock-outline'} size={22} color={unlocked ? undefined : theme.colors.outline} />
              </View>
            </Card>
          </PressableScale>
        );
      })}
      {!units.length ? <EmptyState icon="tray-alert" title="No units published" body="New units will appear after the next content update." /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 3, marginBottom: 4 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.68 },
  card: { overflow: 'hidden', borderRadius: ui.radius.md },
  row: { minHeight: 80, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 2 },
});
