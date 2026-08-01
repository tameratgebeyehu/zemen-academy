import { StyleSheet, View } from 'react-native';
import { Card, Icon, ProgressBar, Text, useTheme } from 'react-native-paper';

import { ui } from '@/data/theme';
import { IconTile, PressableScale } from '@/components/Motion';

export function ActionCard({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={title}>
      <Card mode="outlined" style={[styles.actionCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.actionContent}>
          <IconTile source={icon} size={25} />
          <View style={styles.grow}>
            <Text variant="titleSmall">{title}</Text>
            {subtitle ? <Text variant="bodySmall" style={styles.muted}>{subtitle}</Text> : null}
          </View>
          <View style={[styles.arrow, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon source="chevron-right" size={19} color={theme.colors.primary} />
          </View>
        </View>
      </Card>
    </PressableScale>
  );
}

export function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <Card mode="contained" style={styles.stat}>
      <Card.Content style={styles.statContent}>
        <Text variant="headlineSmall" style={[styles.bold, color ? { color } : undefined]}>{value}</Text>
        <Text variant="labelMedium" style={styles.muted}>{label}</Text>
      </Card.Content>
    </Card>
  );
}

export function StorageBar({ usedBytes }: { usedBytes: number }) {
  const mb = usedBytes / (1024 * 1024);
  return (
    <View style={styles.storage}>
      <View style={styles.rowBetween}>
        <Text variant="labelLarge">Offline content</Text>
        <Text variant="bodySmall">{mb < 0.1 ? `${Math.ceil(usedBytes / 1024)} KB` : `${mb.toFixed(1)} MB`}</Text>
      </View>
      <ProgressBar progress={Math.min(mb / 250, 1)} />
      <Text variant="bodySmall" style={styles.muted}>Shown against a 250 MB planning allowance.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: { overflow: 'hidden', borderRadius: ui.radius.md },
  actionContent: { minHeight: 80, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrow: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 2 },
  muted: { opacity: 0.68 },
  stat: { flex: 1, minWidth: 92 },
  statContent: { alignItems: 'center', gap: 2, paddingVertical: 12 },
  bold: { fontWeight: '800' },
  storage: { gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
