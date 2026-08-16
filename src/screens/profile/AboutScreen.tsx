import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useState, type ComponentProps } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Snackbar, Text, useTheme } from 'react-native-paper';

import { Screen, SectionTitle } from '@/components/Screen';
import { APP_VERSION, CONTACTS } from '@/config';
import { openExternalBrowser } from '@/utils/externalBrowser';

const channels = [
  { label: 'Website', icon: 'globe', url: CONTACTS.website, browser: true },
  { label: 'Telegram', icon: 'telegram', url: CONTACTS.telegram, browser: false },
  { label: 'TikTok', icon: 'tiktok', url: CONTACTS.tiktok, browser: false },
  { label: 'Instagram', icon: 'instagram', url: CONTACTS.instagram, browser: false },
  { label: 'YouTube', icon: 'youtube', url: CONTACTS.youtube, browser: false },
  { label: 'Email', icon: 'envelope', url: `mailto:${CONTACTS.email}`, browser: false },
] satisfies ReadonlyArray<{
  label: string;
  icon: ComponentProps<typeof FontAwesome6>['name'];
  url: string;
  browser?: boolean;
}>;

export function AboutScreen() {
  const theme = useTheme();
  const [message, setMessage] = useState('');

  const open = async (url: string, label: string, browser = false) => {
    try {
      if (browser) await openExternalBrowser(url);
      else await Linking.openURL(url);
    } catch {
      setMessage(`${label} could not be opened on this device.`);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source="school" size={46} color={theme.colors.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.bold}>Zemen Academy</Text>
        <Text variant="labelLarge" style={styles.muted}>Version {APP_VERSION}</Text>
      </View>
      <Card mode="contained">
        <Card.Content style={styles.mission}>
          <Text variant="titleMedium" style={styles.bold}>Our mission</Text>
          <Text variant="bodyLarge" style={styles.copy}>
            Helping Ethiopian students prepare for exams using a simple and accessible mobile application.
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            Zemen Academy is designed to make focused quiz practice reliable on low-end Android phones and useful even when internet access is limited.
          </Text>
        </Card.Content>
      </Card>
      <SectionTitle>Connect with us</SectionTitle>
      <View style={styles.channelGrid}>
        {channels.map((channel, index) => (
          <Button
            key={channel.label}
            mode="outlined"
            icon={({ color, size }) => <FontAwesome6 name={channel.icon} size={size - 1} color={color} />}
            style={[styles.channelButton, index === channels.length - 1 && styles.channelButtonWide]}
            contentStyle={styles.channelContent}
            labelStyle={styles.channelLabel}
            onPress={() => void open(channel.url, channel.label, channel.browser)}
            accessibilityLabel={`Open Zemen Academy ${channel.label}`}
          >
            {channel.label}
          </Button>
        ))}
      </View>
      <Text variant="bodySmall" style={styles.footer}>Made for Ethiopian students.</Text>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={2500}>
        {message}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 7, paddingVertical: 14 },
  logo: { width: 86, height: 86, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.68 },
  mission: { gap: 11 },
  copy: { lineHeight: 26 },
  channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  channelButton: { width: '48%', flexGrow: 1 },
  channelButtonWide: { width: '100%' },
  channelContent: { minHeight: 50 },
  channelLabel: { fontWeight: '800' },
  footer: { textAlign: 'center', opacity: 0.6, paddingVertical: 12 },
});
