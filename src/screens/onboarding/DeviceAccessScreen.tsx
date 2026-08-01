import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Icon, Text, useTheme } from 'react-native-paper';

import { useAppDialog } from '@/components/AppDialog';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen } from '@/components/Screen';
import { CONTACTS } from '@/config';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import { userFacingError } from '@/utils/userFacingError';

export function DeviceAccessScreen() {
  const {
    devicePolicyObservation: policy,
    syncDeviceObservation,
    replaceCurrentDevice,
    logout,
  } = useApp();
  const { showDialog } = useAppDialog();
  const theme = useTheme();
  const [busy, setBusy] = useState(!policy);
  const [error, setError] = useState('');

  const check = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await syncDeviceObservation(true);
    } catch (caught) {
      setError(userFacingError(caught, 'device'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (policy) return;
    setBusy(true);
    void syncDeviceObservation(true)
      .catch((caught) => setError(userFacingError(caught, 'device')))
      .finally(() => setBusy(false));
  }, [policy, syncDeviceObservation]);

  const replace = () => showDialog({
    title: 'Replace the old device?',
    body: `Your existing ${policy?.currentDeviceType === 'tablet' ? 'tablet' : 'phone'} will lose access. Another self-service replacement will not be available for 30 days.`,
    icon: 'devices',
    tone: 'danger',
    actions: [
      { label: 'Keep old device', tone: 'neutral' },
      {
        label: 'Replace device',
        tone: 'danger',
        onPress: () => {
          setBusy(true);
          setError('');
          void replaceCurrentDevice()
            .catch((caught) => setError(userFacingError(caught, 'device')))
            .finally(() => setBusy(false));
        },
      },
    ],
  });

  const checking = !policy;
  const linkedToAnotherAccount = policy?.blockedReason === 'device-linked';
  const availableDate = policy?.replacementAvailableAt?.slice(0, 10);

  return (
    <Screen safeTop style={styles.screen}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
        {checking ? (
          <ActivityIndicator size="large" />
        ) : (
          <Icon source="devices" size={42} color={theme.colors.primary} />
        )}
      </View>

      <View style={styles.heading}>
        <Text variant="headlineMedium" style={styles.title}>
          {checking ? 'Checking this device…' : linkedToAnotherAccount ? 'Device already linked' : 'Device limit reached'}
        </Text>
        <Text variant="bodyLarge" style={styles.muted}>
          {checking
            ? 'Zemen Academy is securely confirming this installation before opening the account.'
            : linkedToAnotherAccount
              ? 'This installation is already connected to another student account.'
              : `This account already has an active ${policy?.currentDeviceType === 'tablet' ? 'tablet' : 'phone'}.`}
        </Text>
      </View>

      {!checking ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.ruleRow}>
              <Icon source="cellphone" size={23} color={theme.colors.primary} />
              <View style={styles.grow}><Text variant="titleSmall" style={styles.bold}>One phone</Text><Text variant="bodySmall" style={styles.muted}>One active phone per account.</Text></View>
              <Text variant="labelLarge">{policy?.phoneCount ?? 0}/1</Text>
            </View>
            <View style={styles.ruleRow}>
              <Icon source="tablet" size={23} color={theme.colors.primary} />
              <View style={styles.grow}><Text variant="titleSmall" style={styles.bold}>One tablet</Text><Text variant="bodySmall" style={styles.muted}>One active tablet per account.</Text></View>
              <Text variant="labelLarge">{policy?.tabletCount ?? 0}/1</Text>
            </View>
            {policy?.conflictingDeviceName ? (
              <View style={[styles.conflictBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Icon source="shield-lock-outline" size={20} color={theme.colors.onSurfaceVariant} />
                <View style={styles.grow}>
                  <Text variant="labelLarge">Current active device</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {policy.conflictingDeviceName}{policy.conflictingLastSeenAt ? ` · Seen ${policy.conflictingLastSeenAt.slice(0, 10)}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
          <Icon source="alert-circle-outline" size={20} color={theme.colors.error} />
          <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <NetworkActivity visible={busy} label={checking ? 'Verifying device…' : 'Updating device access…'} />

      {!checking && policy?.canReplace ? (
        <Button mode="contained" icon="cellphone-arrow-down" contentStyle={styles.action} disabled={busy} onPress={replace}>
          Replace old {policy.currentDeviceType === 'tablet' ? 'tablet' : 'phone'}
        </Button>
      ) : null}
      {!checking && availableDate ? (
        <Text variant="bodySmall" style={styles.centerMuted}>Self-service replacement will be available after {availableDate}. Support can help if the old device was lost.</Text>
      ) : null}
      <Button mode="outlined" icon="refresh" contentStyle={styles.action} loading={busy} disabled={busy} onPress={() => void check()}>
        Check again
      </Button>
      {!checking ? (
        <Button mode="text" icon="send-outline" onPress={() => void Linking.openURL(CONTACTS.telegram)}>
          Contact Telegram support
        </Button>
      ) : null}
      <Button mode="text" textColor={theme.colors.error} icon="logout-variant" disabled={busy} onPress={() => void logout()}>
        Sign out
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560, gap: 18 },
  iconBox: { width: 82, height: 82, borderRadius: 27, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  heading: { alignItems: 'center', gap: 8 },
  title: { fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
  muted: { opacity: 0.68, lineHeight: 22, textAlign: 'center' },
  centerMuted: { opacity: 0.68, lineHeight: 19, textAlign: 'center', paddingHorizontal: 10 },
  card: { borderRadius: ui.radius.lg },
  cardContent: { gap: 15, paddingVertical: 18 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, gap: 2 },
  bold: { fontWeight: '800' },
  conflictBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: ui.radius.md },
  errorBox: { flexDirection: 'row', gap: 9, alignItems: 'center', padding: 12, borderRadius: ui.radius.md },
  errorText: { flex: 1, lineHeight: 18 },
  action: { minHeight: 52 },
});
