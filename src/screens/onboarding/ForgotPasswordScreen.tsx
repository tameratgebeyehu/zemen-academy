import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, TextInput, useTheme } from 'react-native-paper';

import { BrandMark } from '@/components/FirstRun';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen } from '@/components/Screen';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { userFacingError } from '@/utils/userFacingError';
import { api } from '@/services/api';
import { normalizeRecoveryCode, passwordResetValidationError } from '@/utils/passwordReset';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;
type Stage = 'email' | 'verify' | 'complete';

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const requestCode = async () => {
    if (busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setStage('verify');
    } catch (caught) {
      setError(userFacingError(caught, 'password-reset'));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (busy) return;
    if (code.length !== 6) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    const validationError = passwordResetValidationError(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.confirmPasswordReset(email, code, password);
      setPassword('');
      setConfirmation('');
      setCode('');
      setStage('complete');
    } catch (caught) {
      setError(userFacingError(caught, 'password-reset'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen safeTop style={styles.screen}>
        <View style={styles.topBar}>
          <Button compact icon="arrow-left" onPress={() => navigation.goBack()}>Back</Button>
          <BrandMark compact />
        </View>

        <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source={stage === 'complete' ? 'check-bold' : 'lock-reset'} size={34} color={theme.colors.primary} />
        </View>
        <View style={styles.heading}>
          <Text variant="headlineMedium" style={styles.title}>
            {stage === 'email' ? 'Reset your password' : stage === 'verify' ? 'Check your email' : 'Password updated'}
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            {stage === 'email'
              ? 'Secure email recovery is available for active Zemen Premium accounts.'
              : stage === 'verify'
                ? `If ${email} belongs to an active Premium account, a six-digit code was sent. It expires in 15 minutes.`
                : 'Your old sessions have been signed out. You can now log in with the new password.'}
          </Text>
        </View>

        {stage !== 'complete' ? (
          <Card mode="contained" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.form}>
              {stage === 'email' ? (
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="username"
                  importantForAutofill="yes"
                  keyboardType="email-address"
                  mode="outlined"
                  left={<TextInput.Icon icon="email-outline" />}
                  outlineStyle={styles.inputOutline}
                  onSubmitEditing={() => void requestCode()}
                />
              ) : (
                <>
                  <TextInput
                    label="Six-digit code"
                    value={code}
                    onChangeText={(value) => setCode(normalizeRecoveryCode(value))}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    importantForAutofill="yes"
                    maxLength={6}
                    mode="outlined"
                    left={<TextInput.Icon icon="numeric" />}
                    outlineStyle={styles.inputOutline}
                  />
                  <TextInput
                    label="New password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    importantForAutofill="yes"
                    mode="outlined"
                    left={<TextInput.Icon icon="lock-outline" />}
                    right={<TextInput.Icon icon={secure ? 'eye-outline' : 'eye-off-outline'} onPress={() => setSecure((value) => !value)} />}
                    outlineStyle={styles.inputOutline}
                  />
                  <TextInput
                    label="Confirm new password"
                    value={confirmation}
                    onChangeText={setConfirmation}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    importantForAutofill="yes"
                    mode="outlined"
                    left={<TextInput.Icon icon="lock-check-outline" />}
                    outlineStyle={styles.inputOutline}
                    onSubmitEditing={() => void resetPassword()}
                  />
                </>
              )}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                  <Icon source="alert-circle-outline" size={19} color={theme.colors.error} />
                  <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.onErrorContainer }]}>{error}</Text>
                </View>
              ) : null}

              <NetworkActivity
                visible={busy}
                label={stage === 'email' ? 'Sending a verification code…' : 'Updating your password…'}
                detail="This may take a few seconds."
              />
              <Button
                mode="contained"
                icon={stage === 'email' ? 'email-fast-outline' : 'shield-check-outline'}
                loading={busy}
                disabled={busy || !api.isConfigured}
                contentStyle={styles.action}
                onPress={() => void (stage === 'email' ? requestCode() : resetPassword())}
              >
                {stage === 'email' ? 'Send verification code' : 'Set new password'}
              </Button>
              {stage === 'verify' ? (
                <Button mode="text" disabled={busy} onPress={() => { setStage('email'); setError(''); }}>
                  Change email or request another code
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        ) : (
          <Button mode="contained" icon="login-variant" contentStyle={styles.action} onPress={() => navigation.popTo('Auth')}>
            Return to sign in
          </Button>
        )}

        <View style={styles.securityNote}>
          <Icon source="shield-lock-outline" size={18} color={theme.colors.primary} />
          <Text variant="bodySmall" style={[styles.muted, styles.securityCopy]}>
            Zemen Academy never emails your password. Only a one-time verification code is sent.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { justifyContent: 'center', gap: 18, paddingHorizontal: 22, paddingVertical: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  heading: { gap: 7, alignItems: 'center' },
  title: { fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
  muted: { opacity: 0.68 },
  card: { borderRadius: ui.radius.lg },
  form: { gap: 14, paddingVertical: 20 },
  inputOutline: { borderRadius: ui.radius.sm },
  action: { minHeight: 52, flexDirection: 'row-reverse' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: ui.radius.sm },
  errorText: { flex: 1, lineHeight: 18 },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  securityCopy: { flex: 1, lineHeight: 18, textAlign: 'center' },
});
