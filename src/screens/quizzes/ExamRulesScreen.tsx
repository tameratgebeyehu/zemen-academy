import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Checkbox, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { heroPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ExamRules'>;

const rules = [
  {
    icon: 'timer-outline',
    title: 'One minute per question',
    body: 'Your total time is calculated as one minute for every question in this attempt.',
  },
  {
    icon: 'wifi-check',
    title: 'Connection after loading',
    body: 'Internet is not needed after the questions load. A download is needed only to start completely offline.',
  },
  {
    icon: 'cellphone-off',
    title: 'Stay in the attempt',
    body: 'Using Back asks for confirmation. Switching apps or sending the app to the background ends the attempt immediately.',
  },
  {
    icon: 'shield-lock-outline',
    title: 'Protected assessment content',
    body: 'Screenshots, screen recording, copying, pasting, sharing, and printing are not allowed.',
  },
  {
    icon: 'backup-restore',
    title: 'Attempts cannot be resumed',
    body: 'Once an attempt ends or is left, it cannot be reopened from the same point.',
  },
  {
    icon: 'account-check-outline',
    title: 'Work independently',
    body: 'Answer from your own knowledge and do not use unauthorized help during the attempt.',
  },
] as const;

export function ExamRulesScreen({ route, navigation }: Props) {
  const { state, isUnitUnlocked, questionsForUnit, t } = useApp();
  const theme = useTheme();
  const hero = heroPalette(theme.dark);
  const [accepted, setAccepted] = useState(false);
  const questions = questionsForUnit(route.params.unitId);
  const downloaded = state.unitDownloads.some((item) => item.unit.id === route.params.unitId);
  const isExam = route.params.mode === 'exam';
  const modeName = isExam ? t('examMode') : t('instantMode');
  const questionCount = questions.length;
  const unit = state.catalog.units.find((item) => item.id === route.params.unitId);

  if (unit && !isUnitUnlocked(unit)) {
    return <Screen><Text variant="headlineSmall" style={styles.title}>Premium required</Text><Text variant="bodyLarge" style={styles.centerMuted}>Your Premium access is required before this attempt can start.</Text><Button mode="contained" icon="crown-outline" contentStyle={styles.button} onPress={() => navigation.navigate('Premium')}>View Premium plans</Button></Screen>;
  }

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source="shield-check-outline" size={38} color={theme.colors.primary} />
        </View>
        <Text variant="labelLarge" style={[styles.eyebrow, { color: theme.colors.primary }]}>BEFORE YOU BEGIN</Text>
        <Text variant="headlineMedium" style={styles.title}>Attempt rules</Text>
        <Text variant="bodyMedium" style={styles.centerMuted}>
          These rules protect fair assessment and apply to the entire attempt.
        </Text>
      </View>

      <Card mode="contained" style={[styles.summaryCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: hero.background }]}>
        <Card.Content style={styles.summary}>
          <View style={styles.summaryMain}>
            <Text variant="labelMedium" style={[styles.summaryEyebrow, { color: hero.muted }]}>SELECTED MODE</Text>
            <Text variant="titleLarge" style={[styles.summaryTitle, { color: hero.foreground }]}>{modeName}</Text>
            <Text variant="bodySmall" style={{ color: hero.muted }}>
              {questionCount} questions • {questionCount} minutes total
            </Text>
          </View>
          <View style={[styles.accessBadge, { backgroundColor: hero.overlay }]}>
            <Icon source={downloaded ? 'wifi-off' : 'wifi'} size={17} color={hero.foreground} />
            <Text variant="labelMedium" style={{ color: hero.foreground }}>{downloaded ? 'Offline' : 'Online'}</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.ruleList}>
        {rules.map((rule, index) => (
          <View key={rule.title} style={[styles.rule, { borderBottomColor: theme.colors.outlineVariant }]}>
            <View style={[styles.ruleNumber, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>{index + 1}</Text>
            </View>
            <View style={[styles.ruleIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source={rule.icon} size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.grow}>
              <Text variant="titleSmall" style={styles.bold}>{rule.title}</Text>
              <Text variant="bodySmall" style={styles.ruleBody}>{rule.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Card
        mode="outlined"
        style={[
          styles.acceptCard,
          {
            borderColor: accepted ? theme.colors.primary : theme.colors.outlineVariant,
            backgroundColor: accepted ? theme.colors.primaryContainer : theme.colors.surface,
          },
        ]}
      >
        <TouchableRipple onPress={() => setAccepted((value) => !value)} borderless>
          <View style={styles.accept}>
            <Checkbox status={accepted ? 'checked' : 'unchecked'} />
            <View style={styles.grow}>
              <Text variant="titleSmall" style={styles.bold}>I understand and accept the attempt rules.</Text>
              <Text variant="bodySmall" style={styles.ruleBody}>You must accept before starting.</Text>
            </View>
          </View>
        </TouchableRipple>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="close"
          contentStyle={styles.button}
          onPress={() => navigation.goBack()}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          icon="play"
          style={styles.startAction}
          contentStyle={styles.button}
          labelStyle={styles.startLabel}
          disabled={!accepted || !questionCount}
          onPress={() => navigation.replace('QuizPlayer', route.params)}
        >
          Start {isExam ? 'exam' : 'quiz'}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 6 },
  icon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  eyebrow: { fontWeight: '900', letterSpacing: 1.2, fontSize: 11 },
  title: { fontWeight: '900', letterSpacing: -0.7 },
  centerMuted: { textAlign: 'center', opacity: 0.68, lineHeight: 21, maxWidth: 390 },
  summaryCard: { borderRadius: ui.radius.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryMain: { flex: 1, gap: 2 },
  summaryEyebrow: { fontWeight: '900', letterSpacing: 1, fontSize: 10 },
  summaryTitle: { fontWeight: '900' },
  accessBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: ui.radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  ruleList: { gap: 0 },
  rule: { minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  ruleNumber: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  ruleIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 3 },
  bold: { fontWeight: '800' },
  ruleBody: { opacity: 0.65, lineHeight: 18 },
  acceptCard: { borderRadius: ui.radius.md, overflow: 'hidden', borderWidth: 1.5 },
  accept: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13 },
  actions: { flexDirection: 'row', gap: 10 },
  startAction: { flex: 1 },
  button: { minHeight: 54 },
  startLabel: { fontWeight: '800' },
});
