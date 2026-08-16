import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, useTheme } from 'react-native-paper';

import { Screen, SectionTitle } from '@/components/Screen';
import { CONTACTS, MANUAL_PREMIUM_PAYMENTS_ENABLED } from '@/config';
import { ui } from '@/data/theme';
import { openExternalBrowser } from '@/utils/externalBrowser';

const privacySections = [
  ['Information we use', MANUAL_PREMIUM_PAYMENTS_ENABLED ? 'Account name and email, optional Ethiopian phone number, grade, stream, language, learning activity, device-installation identity, notification token, question reports, and manually submitted Premium payment details.' : 'Account name and email, optional Ethiopian phone number, grade, stream, language, learning activity, device-installation identity, notification token, question reports, and Premium entitlement status.'],
  ['Why we use it', MANUAL_PREMIUM_PAYMENTS_ENABLED ? 'To provide account access, synchronize progress, deliver the correct curriculum, support offline study, enforce the one-phone/one-tablet policy, verify Premium payments, send requested notifications, and investigate reported questions.' : 'To provide account access, synchronize progress, deliver the correct curriculum, support offline study, enforce the one-phone/one-tablet policy, verify existing Premium entitlement, send requested notifications, and investigate reported questions.'],
  ['How it is protected', 'Passwords are stored only as salted hashes. Session credentials are kept in protected device storage. Raw passwords and bank login credentials are never stored in the Zemen Academy spreadsheet.'],
  ['Sharing and advertising', 'Zemen Academy does not sell student information and does not use personal information for third-party advertising. Service providers are used only where needed to operate email, notifications, hosting, and the application.'],
  ['Your choices', 'Phone number and notifications are optional. You can sign out, remove downloads, disable notifications, and contact Zemen Academy to request account correction or deletion. Some security and transaction records may be retained when required to prevent fraud or resolve disputes.'],
] as const;

const termSections = [
  ['Educational use', 'The app supports study and examination preparation. Questions and explanations may contain mistakes, so students should report questionable content and consult their official textbook or teacher when necessary.'],
  ['Account responsibility', 'Keep your account credentials private. One account is intended for one student and may be linked to one phone and one tablet. Attempts to share, resell, scrape, or bypass access controls are not allowed.'],
  ['Premium service', MANUAL_PREMIUM_PAYMENTS_ENABLED ? 'Premium begins only after Zemen Academy verifies the submitted transfer. Plans do not renew automatically. Access ends on the displayed expiration date unless another plan is approved.' : 'This Google Play build does not sell Premium inside the app. It only recognizes Premium entitlement already linked to the signed-in Zemen Academy account. Access ends on the displayed expiration date.'],
  ['Offline content', 'Downloads are for the student’s personal educational use. Republishing, selling, or distributing Zemen Academy question banks or past-paper content is prohibited.'],
  ['Service availability', 'Internet, Google services, Apps Script, or device conditions may temporarily affect online features. Locally downloaded content remains available according to its access rules.'],
] as const;

function PolicySection({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <Card mode="outlined" style={styles.sectionCard}>
      <Card.Content style={styles.sectionContent}>
        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
        <View style={styles.grow}>
          <Text variant="titleSmall" style={styles.bold}>{title}</Text>
          <Text variant="bodyMedium" style={styles.copy}>{body}</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export function PrivacyCenterScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
        <Card.Content style={styles.heroContent}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.surface }]}>
            <Icon source="shield-lock-outline" size={35} color={theme.colors.primary} />
          </View>
          <Text variant="headlineSmall" style={styles.heroTitle}>Privacy & terms center</Text>
          <Text variant="bodyMedium" style={styles.heroBody}>A clear summary of how Zemen Academy handles student information and the rules for using the service.</Text>
          <Text variant="labelSmall" style={styles.muted}>Effective 8 August 2026</Text>
        </Card.Content>
      </Card>

      <SectionTitle>Privacy policy</SectionTitle>
      {privacySections.map(([title, body]) => <PolicySection key={title} title={title} body={body} />)}

      <SectionTitle>Terms of use</SectionTitle>
      {termSections.map(([title, body]) => <PolicySection key={title} title={title} body={body} />)}

      <Card mode="outlined" style={styles.contactCard}>
        <Card.Content style={styles.contactContent}>
          <Icon source="account-question-outline" size={25} color={theme.colors.primary} />
          <View style={styles.grow}>
            <Text variant="titleSmall" style={styles.bold}>Privacy request or account deletion</Text>
            <Text variant="bodySmall" style={styles.muted}>Open the official instructions or email us from the address connected to your account. Never send your password.</Text>
          </View>
          <View style={styles.deletionActions}>
            <Button mode="contained" icon="open-in-new" onPress={() => void openExternalBrowser(CONTACTS.accountDeletion)}>Deletion instructions</Button>
            <Button mode="outlined" icon="email-outline" onPress={() => void Linking.openURL(`mailto:${CONTACTS.email}?subject=Delete%20my%20Zemen%20Academy%20account`)}>Prepare email</Button>
          </View>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: ui.radius.lg },
  heroContent: { alignItems: 'center', gap: 9, paddingHorizontal: 22, paddingVertical: 24 },
  heroIcon: { width: 68, height: 68, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  heroTitle: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  heroBody: { textAlign: 'center', lineHeight: 22, opacity: 0.74 },
  muted: { opacity: 0.64, lineHeight: 19 },
  sectionCard: { borderRadius: ui.radius.md },
  sectionContent: { flexDirection: 'row', gap: 12, paddingVertical: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  grow: { flex: 1, gap: 5 },
  bold: { fontWeight: '800' },
  copy: { lineHeight: 22, opacity: 0.76 },
  contactCard: { borderRadius: ui.radius.md, marginTop: 8 },
  contactContent: { gap: 12 },
  deletionActions: { gap: 8 },
});
