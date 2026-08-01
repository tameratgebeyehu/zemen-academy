import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, TextInput, useTheme } from 'react-native-paper';

import { BrandMark, SelectionCard, StepProgress } from '@/components/FirstRun';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import { scheduleDailyReminder } from '@/services/notifications';
import type { Grade, Language, Stream } from '@/types';
import { userFacingError } from '@/utils/userFacingError';

type SetupStep = 'language' | 'grade' | 'stream' | 'reminder';

const gradeOptions: Array<{ value: Grade; icon: string; detail: string }> = [
  { value: 9, icon: 'numeric-9-box-outline', detail: 'Build your foundation' },
  { value: 10, icon: 'numeric-1-box-multiple-outline', detail: 'Strengthen core skills' },
  { value: 11, icon: 'bookshelf', detail: 'Choose your study path' },
  { value: 12, icon: 'school-outline', detail: 'Prepare for university' },
];

const reminderPresets = [
  { value: '06:30', title: 'Before school', detail: '6:30 AM', icon: 'weather-sunset-up' },
  { value: '17:00', title: 'After school', detail: '5:00 PM', icon: 'book-clock-outline' },
  { value: '19:00', title: 'Evening focus', detail: '7:00 PM', icon: 'weather-sunset-down' },
  { value: '20:30', title: 'Night review', detail: '8:30 PM', icon: 'weather-night' },
] as const;

const stepCopy: Record<SetupStep, { eyebrow: string; title: string; body: string }> = {
  language: {
    eyebrow: 'YOUR EXPERIENCE',
    title: 'Choose your language',
    body: 'Select the language you want to use across lessons, quizzes, and navigation.',
  },
  grade: {
    eyebrow: 'YOUR LEARNING LEVEL',
    title: 'Which grade are you in?',
    body: 'We will use this to show the right subjects and practice material.',
  },
  stream: {
    eyebrow: 'YOUR STUDY PATH',
    title: 'Choose your stream',
    body: 'Your stream determines the subjects and entrance preparation we recommend.',
  },
  reminder: {
    eyebrow: 'YOUR STUDY ROUTINE',
    title: 'When should we remind you?',
    body: 'A consistent study time makes it easier to build momentum. You can change this later.',
  },
};

export function SetupScreen() {
  const { state, completeProfile } = useApp();
  const theme = useTheme();
  const [language, setLanguage] = useState<Language>(state.preferences.language);
  const [grade, setGrade] = useState<Grade>(state.preferences.grade);
  const [stream, setStream] = useState<Stream>(state.preferences.stream ?? 'Natural');
  const [reminderTime, setReminderTime] = useState(state.preferences.reminderTime);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const steps = useMemo<SetupStep[]>(
    () => grade >= 11 ? ['language', 'grade', 'stream', 'reminder'] : ['language', 'grade', 'reminder'],
    [grade],
  );
  const step = steps[stepIndex] ?? 'language';
  const copy = stepCopy[step];
  const finalStep = stepIndex === steps.length - 1;
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime);

  const next = async () => {
    if (busy) return;
    setError('');
    if (!finalStep) {
      setStepIndex((current) => current + 1);
      return;
    }
    if (!validTime) {
      setError('Enter a valid 24-hour time, for example 19:00.');
      return;
    }
    setBusy(true);
    try {
      await scheduleDailyReminder(reminderTime).catch(() => false);
      await completeProfile({ grade, stream: grade >= 11 ? stream : undefined, language, reminderTime });
    } catch (caught) {
      setError(userFacingError(caught, 'profile'));
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError('');
    setStepIndex((current) => Math.max(0, current - 1));
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen safeTop style={styles.screen}>
        <View style={styles.topBar}>
          <BrandMark compact />
          <View style={[styles.savedBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="cloud-check-outline" size={16} color={theme.colors.primary} />
            <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>Saved securely</Text>
          </View>
        </View>

        <StepProgress current={stepIndex + 1} total={steps.length} />

        <View style={styles.heading}>
          <Text variant="labelLarge" style={[styles.eyebrow, { color: theme.colors.primary }]}>{copy.eyebrow}</Text>
          <Text variant="headlineLarge" style={styles.title}>{copy.title}</Text>
          <Text variant="bodyLarge" style={styles.body}>{copy.body}</Text>
        </View>

        <View style={styles.choices}>
          {step === 'language' ? (
            <>
              <SelectionCard
                icon="alphabetical-variant"
                title="English"
                description="Use the app in English"
                selected={language === 'en'}
                onPress={() => setLanguage('en')}
              />
              <SelectionCard
                icon="translate"
                title="አማርኛ"
                description="መተግበሪያውን በአማርኛ ይጠቀሙ"
                selected={language === 'am'}
                onPress={() => setLanguage('am')}
              />
            </>
          ) : null}

          {step === 'grade' ? (
            <View style={styles.gradeGrid}>
              {gradeOptions.map((option) => (
                <SelectionCard
                  key={option.value}
                  icon={option.icon}
                  title={`Grade ${option.value}`}
                  description={option.detail}
                  selected={grade === option.value}
                  onPress={() => setGrade(option.value)}
                  style={styles.gradeCard}
                />
              ))}
            </View>
          ) : null}

          {step === 'stream' ? (
            <>
              <SelectionCard
                icon="atom"
                title="Natural Science"
                description="Physics, Chemistry, Biology, Mathematics, English, and SAT"
                selected={stream === 'Natural'}
                onPress={() => setStream('Natural')}
              />
              <SelectionCard
                icon="earth"
                title="Social Science"
                description="Geography, History, Economics, Mathematics, English, and SAT"
                selected={stream === 'Social'}
                onPress={() => setStream('Social')}
              />
            </>
          ) : null}

          {step === 'reminder' ? (
            <>
              <View style={[styles.permissionCard, { backgroundColor: theme.colors.primaryContainer }]}> 
                <View style={[styles.permissionIcon, { backgroundColor: theme.colors.primary }]}> 
                  <Icon source="bell-ring-outline" size={24} color={theme.colors.onPrimary} />
                </View>
                <View style={styles.permissionCopy}>
                  <Text variant="titleSmall" style={styles.bold}>Stay informed</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    Allow notifications for new-content announcements and your study reminder. You can change this later.
                  </Text>
                </View>
              </View>
              <View style={styles.reminderGrid}>
                {reminderPresets.map((option) => (
                  <SelectionCard
                    key={option.value}
                    icon={option.icon}
                    title={option.title}
                    description={option.detail}
                    selected={reminderTime === option.value}
                    onPress={() => setReminderTime(option.value)}
                    style={styles.reminderCard}
                  />
                ))}
              </View>
              <View style={styles.customTime}>
                <View style={styles.customHeading}>
                  <Text variant="titleSmall" style={styles.bold}>Prefer another time?</Text>
                  <Text variant="bodySmall" style={styles.muted}>Use 24-hour format</Text>
                </View>
                <TextInput
                  mode="outlined"
                  label="Custom time (HH:MM)"
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  left={<TextInput.Icon icon="clock-edit-outline" />}
                  outlineStyle={styles.inputOutline}
                  error={!validTime}
                />
              </View>
            </>
          ) : null}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
            <Icon source="alert-circle-outline" size={19} color={theme.colors.error} />
            <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <NetworkActivity
          visible={busy}
          label="Saving your learning plan…"
          detail="Your choices are safe while we update your account."
        />

        <View style={styles.actions}>
          {stepIndex > 0 ? (
            <Button mode="outlined" icon="arrow-left" contentStyle={styles.secondaryButton} onPress={back}>
              Back
            </Button>
          ) : null}
          <Button
            mode="contained"
            icon={finalStep ? 'check' : 'arrow-right'}
            contentStyle={styles.primaryButton}
            labelStyle={styles.buttonLabel}
            style={styles.primaryAction}
            loading={busy}
            disabled={busy || (finalStep && !validTime)}
            onPress={() => void next()}
          >
            {busy ? 'Saving setup…' : finalStep ? 'Enable notifications & finish' : 'Continue'}
          </Button>
        </View>
        <Text variant="bodySmall" style={styles.footerNote}>You can change every choice later in Profile.</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { gap: 22, paddingTop: 14, paddingBottom: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: ui.radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  heading: { gap: 9, marginTop: 2 },
  eyebrow: { fontWeight: '900', letterSpacing: 1.2, fontSize: 11 },
  title: { fontWeight: '900', letterSpacing: -0.8 },
  body: { opacity: 0.68, lineHeight: 25 },
  choices: { gap: 12 },
  gradeGrid: { gap: 10 },
  gradeCard: { width: '100%' },
  reminderGrid: { gap: 10 },
  reminderCard: { width: '100%' },
  permissionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: ui.radius.md, padding: 14 },
  permissionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  permissionCopy: { flex: 1, gap: 3 },
  customTime: { gap: 10, marginTop: 8 },
  customHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.62 },
  inputOutline: { borderRadius: ui.radius.sm },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: ui.radius.sm },
  actions: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  secondaryButton: { minHeight: 54 },
  primaryAction: { flex: 1 },
  primaryButton: { minHeight: 54, flexDirection: 'row-reverse' },
  buttonLabel: { fontWeight: '800', fontSize: 15 },
  footerNote: { textAlign: 'center', opacity: 0.56 },
});
