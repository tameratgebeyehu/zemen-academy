import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Banner, Button, Card, Divider, Icon, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { BrandMark } from '@/components/FirstRun';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import { api } from '@/services/api';
import type { RootStackParamList } from '@/navigation/types';
import { userFacingError } from '@/utils/userFacingError';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export function AuthScreen({ navigation }: Props) {
  const { login, signup, continueAsGuest, t } = useApp();
  const theme = useTheme();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isLogin = mode === 'login';

  const submit = async () => {
    if (busy) return;
    setError('');
    if (!isLogin && name.trim().length < 2) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    const phoneDigits = phone.replace(/\D/g, '');
    if (!isLogin && phone.trim() && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      return setError('Enter a valid phone number or leave it empty.');
    }
    setBusy(true);
    try {
      if (isLogin) await login(email, password);
      else await signup(name, email, password, phone);
    } catch (caught) {
      setError(userFacingError(caught, isLogin ? 'login' : 'signup'));
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (value: string) => {
    setMode(value as 'login' | 'signup');
    setError('');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen safeTop style={styles.screen}>
        <BrandMark />

        <View style={styles.heading}>
          <Text variant="displaySmall" style={styles.title}>
            {isLogin ? 'Welcome back.' : 'Create your study space.'}
          </Text>
          <Text variant="bodyLarge" style={styles.muted}>
            {isLogin
              ? 'Pick up where you left off and keep your progress together.'
              : 'A few details now, then we will personalize your learning plan.'}
          </Text>
        </View>

        {!api.isConfigured ? (
          <Banner visible icon="information-outline" style={styles.banner}>
            Account access needs the Apps Script URL. You can continue as a guest now.
          </Banner>
        ) : null}

        <Card mode="contained" style={[styles.formCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.form}>
            <SegmentedButtons
              value={mode}
              onValueChange={changeMode}
              buttons={[
                { value: 'login', label: t('login'), icon: 'login-variant' },
                { value: 'signup', label: t('signUp'), icon: 'account-plus-outline' },
              ]}
              style={styles.segmented}
            />

            <View style={styles.formHeading}>
              <Text variant="titleLarge" style={styles.formTitle}>
                {isLogin ? 'Sign in to Zemen' : 'Start your account'}
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                {isLogin ? 'Use the email you registered with.' : 'Your progress can follow you across sessions.'}
              </Text>
            </View>

            {!isLogin ? (
              <TextInput
                label={t('name')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                mode="outlined"
                left={<TextInput.Icon icon="account-outline" />}
                outlineStyle={styles.inputOutline}
              />
            ) : null}
            <TextInput
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              mode="outlined"
              left={<TextInput.Icon icon="email-outline" />}
              outlineStyle={styles.inputOutline}
            />
            {!isLogin ? (
              <>
                <TextInput
                  label="Phone number (optional)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  mode="outlined"
                  left={<TextInput.Icon icon="phone-outline" />}
                  outlineStyle={styles.inputOutline}
                />
                <Text variant="bodySmall" style={styles.passwordHint}>Useful for payment matching and account support.</Text>
              </>
            ) : null}
            <TextInput
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              autoCapitalize="none"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              mode="outlined"
              left={<TextInput.Icon icon="lock-outline" />}
              right={<TextInput.Icon icon={secure ? 'eye-outline' : 'eye-off-outline'} onPress={() => setSecure((value) => !value)} />}
              outlineStyle={styles.inputOutline}
              onSubmitEditing={() => void submit()}
            />
            {isLogin ? (
              <Button
                compact
                mode="text"
                icon="lock-reset"
                style={styles.forgotButton}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                Forgot password?
              </Button>
            ) : null}
            {!isLogin ? (
              <Text variant="bodySmall" style={styles.passwordHint}>Use at least 8 characters.</Text>
            ) : null}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                <Icon source="alert-circle-outline" size={19} color={theme.colors.error} />
                <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.onErrorContainer }]}>{error}</Text>
              </View>
            ) : null}

            <NetworkActivity
              visible={busy}
              label={isLogin ? 'Signing you in…' : 'Creating your account…'}
              detail="Securely contacting Zemen Academy."
            />

            <Button
              mode="contained"
              icon={isLogin ? 'arrow-right' : 'account-check-outline'}
              loading={busy}
              disabled={busy || !api.isConfigured}
              contentStyle={styles.button}
              labelStyle={styles.buttonLabel}
              onPress={() => void submit()}
            >
              {busy ? (isLogin ? 'Signing in…' : 'Creating account…') : isLogin ? 'Continue to learning' : 'Create my account'}
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.dividerRow}>
          <Divider style={styles.divider} />
          <Text variant="labelMedium" style={styles.muted}>OR START QUICKLY</Text>
          <Divider style={styles.divider} />
        </View>
        <Button
          mode="outlined"
          icon="account-arrow-right-outline"
          contentStyle={styles.guestButton}
          labelStyle={styles.buttonLabel}
          disabled={busy}
          onPress={continueAsGuest}
        >
          {t('continueAsGuest')}
        </Button>
        <View style={styles.privacy}>
          <Icon source="shield-check-outline" size={17} color={theme.colors.primary} />
          <Text variant="bodySmall" style={[styles.muted, styles.privacyText]}>
            Guest access includes Unit 1. Your password is sent only to the secure account service.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { justifyContent: 'center', gap: 20, paddingHorizontal: 22, paddingVertical: 20 },
  heading: { gap: 9, marginTop: 8 },
  title: { fontWeight: '900', letterSpacing: -1.1 },
  muted: { opacity: 0.68 },
  banner: { borderRadius: ui.radius.md, overflow: 'hidden' },
  formCard: { borderRadius: ui.radius.lg },
  form: { gap: 14, paddingVertical: 20 },
  segmented: { marginBottom: 4 },
  formHeading: { gap: 4, marginBottom: 2 },
  formTitle: { fontWeight: '900', letterSpacing: -0.4 },
  inputOutline: { borderRadius: ui.radius.sm },
  passwordHint: { marginTop: -8, marginLeft: 4, opacity: 0.58 },
  forgotButton: { alignSelf: 'flex-end', marginTop: -8 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: ui.radius.sm },
  errorText: { flex: 1, lineHeight: 18 },
  button: { minHeight: 54, flexDirection: 'row-reverse' },
  guestButton: { minHeight: 52 },
  buttonLabel: { fontWeight: '800', fontSize: 15 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  privacyText: { textAlign: 'center', lineHeight: 18, flexShrink: 1 },
});
