import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BenefitPill, BrandMark, DecorativeBackdrop } from '@/components/FirstRun';
import { Reveal } from '@/components/Motion';
import { heroPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const hero = heroPalette(theme.dark);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <DecorativeBackdrop />
      <Reveal style={styles.content}>
        <BrandMark />

        <View style={styles.hero}>
          <View style={[styles.eyebrow, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Icon source="star-four-points-outline" size={16} color={theme.colors.secondary} />
            <Text variant="labelLarge" style={{ color: theme.colors.onSecondaryContainer }}>
              Built for Ethiopian students
            </Text>
          </View>
          <Text variant="displayMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            Your next chapter starts here.
          </Text>
          <Text variant="bodyLarge" style={styles.body}>
            Prepare with focused quizzes, clear explanations, and study tools that keep working offline.
          </Text>
          <View style={styles.benefits}>
            <BenefitPill icon="wifi-off" label="Offline ready" />
            <BenefitPill icon="target" label="Exam focused" />
            <BenefitPill icon="chart-line" label="Track progress" />
          </View>
        </View>

        <View style={styles.preview}>
          <View style={[styles.previewCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: hero.background }]}>
            <View style={styles.previewTop}>
              <Text variant="labelLarge" style={[styles.previewLabel, { color: hero.muted }]}>TODAY&apos;S FOCUS</Text>
              <View style={[styles.streak, { backgroundColor: hero.accent }]}>
                <Icon source="fire" size={16} color={hero.background} />
                <Text variant="labelMedium" style={{ color: hero.background }}>7 days</Text>
              </View>
            </View>
            <Text variant="headlineSmall" style={[styles.previewTitle, { color: hero.foreground }]}>Small steps. Real progress.</Text>
            <View style={styles.subjectRow}>
              {['calculator-variant-outline', 'atom', 'flask-outline'].map((icon) => (
                <View key={icon} style={[styles.subjectIcon, { backgroundColor: hero.overlay }]}>
                  <Icon source={icon} size={22} color={hero.foreground} />
                </View>
              ))}
              <Text variant="bodyMedium" style={[styles.subjectText, { color: hero.foreground }]}>Your subjects, one clear plan</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            icon="arrow-right"
            contentStyle={styles.button}
            labelStyle={styles.buttonLabel}
            onPress={() => navigation.navigate('Intro')}
          >
            Start learning
          </Button>
          <Text variant="bodySmall" style={styles.note}>Free to start • No payment required</Text>
        </View>
      </Reveal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  hero: { gap: 15, paddingTop: 24 },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: ui.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: { fontWeight: '900', letterSpacing: -1.6, lineHeight: 51, maxWidth: 430 },
  body: { opacity: 0.72, lineHeight: 25, maxWidth: 450 },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 3 },
  preview: { paddingVertical: 18 },
  previewCard: {
    minHeight: 154,
    borderRadius: ui.radius.xl,
    padding: 20,
    justifyContent: 'space-between',
    transform: [{ rotate: '-1.5deg' }],
  },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewLabel: { letterSpacing: 1.2, fontSize: 11, fontWeight: '800' },
  previewTitle: { fontWeight: '900', letterSpacing: -0.5 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: ui.radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  subjectRow: { flexDirection: 'row', alignItems: 'center' },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  subjectText: { opacity: 0.9, marginLeft: 6, flex: 1 },
  footer: { gap: 10 },
  button: { minHeight: 56, flexDirection: 'row-reverse' },
  buttonLabel: { fontSize: 16, fontWeight: '800' },
  note: { textAlign: 'center', opacity: 0.58 },
});
