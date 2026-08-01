import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { ui } from '@/data/theme';

interface NetworkActivityProps {
  visible: boolean;
  label: string;
  detail?: string;
}

export function NetworkActivity({ visible, label, detail }: NetworkActivityProps) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.container, { backgroundColor: theme.colors.secondaryContainer, borderColor: theme.colors.secondary }]}
    >
      <ActivityIndicator size={20} color={theme.colors.secondary} />
      <View style={styles.copy}>
        <Text variant="labelLarge" style={styles.label}>{label}</Text>
        {detail ? <Text variant="bodySmall" style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11, borderRadius: ui.radius.sm, borderWidth: 1 },
  copy: { flex: 1, gap: 1 },
  label: { fontWeight: '800' },
  detail: { opacity: 0.65, lineHeight: 18 },
});
