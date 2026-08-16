import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, List, Text, useTheme } from 'react-native-paper';

import { Screen, SectionTitle } from '@/components/Screen';
import { CONTACTS, MANUAL_PREMIUM_PAYMENTS_ENABLED } from '@/config';
import { ui } from '@/data/theme';

const helpTopics = [
  {
    id: 'account',
    icon: 'account-key-outline',
    title: 'Account and password',
    body: 'Use the email registered with your account. Your phone or Google password manager may offer to save the password. If you lose it, Premium accounts can use secure email recovery.',
  },
  {
    id: 'device',
    icon: 'devices',
    title: 'Phone and tablet access',
    body: 'One account may use one phone and one tablet. If an administrator releases a device, keep the device-access page open; it checks again automatically.',
  },
  {
    id: 'offline',
    icon: 'download-circle-outline',
    title: 'Downloads and offline study',
    body: 'Open a unit while online and download it once. Downloaded quizzes remain available without mobile data, subject to Premium verification where applicable.',
  },
  {
    id: 'premium',
    icon: 'crown-outline',
    title: MANUAL_PREMIUM_PAYMENTS_ENABLED ? 'Premium payment verification' : 'Premium account access',
    body: MANUAL_PREMIUM_PAYMENTS_ENABLED
      ? 'Submit the sender name after transferring the exact amount to the selected bank. Zemen Academy checks the request manually and activates the plan after matching it.'
      : 'This Google Play version recognizes Premium already linked to your signed-in Zemen Academy account. It does not offer Premium purchasing inside the app.',
  },
  {
    id: 'question',
    icon: 'flag-outline',
    title: 'Incorrect or unclear questions',
    body: 'Use Report issue inside the quiz. Choose the problem type and add details only when needed. Reports are saved offline and sent when the device reconnects.',
  },
] as const;

export function HelpCenterScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}>
        <Card.Content style={styles.heroContent}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.surface }]}>
            <Icon source="lifebuoy" size={34} color={theme.colors.primary} />
          </View>
          <View style={styles.grow}>
            <Text variant="headlineSmall" style={styles.bold}>How can we help?</Text>
            <Text variant="bodyMedium" style={styles.muted}>Quick answers for accounts, devices, downloads, Premium, and quiz content.</Text>
          </View>
        </Card.Content>
      </Card>

      <SectionTitle>Common questions</SectionTitle>
      <Card mode="outlined" style={styles.listCard}>
        <List.AccordionGroup>
          {helpTopics.map((topic, index) => (
            <View key={topic.id}>
              {index ? <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
              <List.Accordion
                id={topic.id}
                title={topic.title}
                titleStyle={styles.bold}
                left={(props) => <List.Icon {...props} icon={topic.icon} />}
              >
                <Text variant="bodyMedium" style={styles.answer}>{topic.body}</Text>
              </List.Accordion>
            </View>
          ))}
        </List.AccordionGroup>
      </Card>

      <SectionTitle>Still need help?</SectionTitle>
      <Card mode="outlined" style={styles.contactCard}>
        <Card.Content style={styles.contactContent}>
          <Icon source="message-processing-outline" size={30} color={theme.colors.primary} />
          <View style={styles.grow}>
            <Text variant="titleMedium" style={styles.bold}>Contact Zemen Academy</Text>
            <Text variant="bodySmall" style={styles.muted}>{MANUAL_PREMIUM_PAYMENTS_ENABLED ? 'Include your account email and request code when asking about a payment. ' : 'Include your account email when asking for account help. '}Never send your password.</Text>
          </View>
          <Button mode="contained" icon="send-outline" onPress={() => void Linking.openURL(CONTACTS.telegram)}>Telegram</Button>
          <Button mode="outlined" icon="email-outline" onPress={() => void Linking.openURL(`mailto:${CONTACTS.email}`)}>Email</Button>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: ui.radius.lg },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20 },
  heroIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 4 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.68, lineHeight: 20 },
  listCard: { borderRadius: ui.radius.md, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  answer: { paddingHorizontal: 22, paddingBottom: 18, paddingRight: 28, lineHeight: 22, opacity: 0.78 },
  contactCard: { borderRadius: ui.radius.md },
  contactContent: { gap: 12 },
});
