import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { ui } from '@/data/theme';
import { PressableScale } from '@/components/Motion';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.brandRow}>
      <View style={[styles.mark, compact && styles.markCompact, { backgroundColor: theme.colors.primary }]}>
        <Icon source="school-outline" size={compact ? 20 : 25} color={theme.colors.onPrimary} />
        <View style={[styles.markAccent, { backgroundColor: theme.colors.secondary }]} />
      </View>
      <View>
        <Text variant={compact ? 'titleMedium' : 'titleLarge'} style={styles.brandName}>Zemen</Text>
        {!compact ? <Text variant="labelSmall" style={[styles.academy, { color: theme.colors.primary }]}>ACADEMY</Text> : null}
      </View>
    </View>
  );
}

export function DecorativeBackdrop() {
  const theme = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orbLarge, { backgroundColor: theme.colors.primaryContainer }]} />
      <View style={[styles.orbSmall, { backgroundColor: theme.colors.secondaryContainer }]} />
      <View style={[styles.orbAccent, { backgroundColor: theme.colors.tertiaryContainer }]} />
      <View style={[styles.rule, { backgroundColor: theme.colors.secondary }]} />
    </View>
  );
}

export function StepProgress({ current, total, label }: { current: number; total: number; label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressHeader}>
        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
          {label ?? `Step ${current} of ${total}`}
        </Text>
        <Text variant="labelMedium" style={styles.muted}>{Math.round((current / total) * 100)}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={[styles.fill, { width: `${(current / total) * 100}%`, backgroundColor: theme.colors.primary }]} />
      </View>
    </View>
  );
}

interface SelectionCardProps {
  icon: string;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  trailing?: ReactNode;
}

export function SelectionCard({
  icon,
  title,
  description,
  selected,
  onPress,
  style,
  trailing,
}: SelectionCardProps) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={title}
      style={[
        styles.selection,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
          backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
          ...(theme.dark ? ui.shadow.dark : ui.shadow.light),
        },
        selected && styles.selectionActive,
        style,
      ]}
    >
      <View style={styles.selectionContent}>
        <View style={[
          styles.selectionIcon,
          { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant },
        ]}>
          <Icon source={icon} size={24} color={selected ? theme.colors.onPrimary : theme.colors.primary} />
        </View>
        <View style={styles.selectionCopy}>
          <Text variant="titleMedium" style={styles.selectionTitle}>{title}</Text>
          {description ? <Text variant="bodySmall" style={styles.muted}>{description}</Text> : null}
        </View>
        {trailing ?? (
          <Icon
            source={selected ? 'check-circle' : 'circle-outline'}
            size={23}
            color={selected ? theme.colors.primary : theme.colors.outline}
          />
        )}
      </View>
    </PressableScale>
  );
}

export function BenefitPill({ icon, label }: { icon: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.surface }]}>
      <Icon source={icon} size={17} color={theme.colors.primary} />
      <Text variant="labelMedium">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  mark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  markCompact: { width: 38, height: 38, borderRadius: 13 },
  markAccent: { position: 'absolute', right: 5, top: 5, width: 8, height: 8, borderRadius: 4 },
  brandName: { fontWeight: '900', letterSpacing: -0.6, lineHeight: 23 },
  academy: { fontWeight: '900', letterSpacing: 2.2, fontSize: 9 },
  orbLarge: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    right: -150,
    top: -100,
    opacity: 0.62,
  },
  orbSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    left: -80,
    bottom: 90,
    opacity: 0.62,
  },
  orbAccent: { position: 'absolute', width: 90, height: 90, borderRadius: 45, right: 45, bottom: 95, opacity: 0.5 },
  rule: { position: 'absolute', width: 58, height: 7, borderRadius: 5, right: 34, top: 116, opacity: 0.9 },
  progressWrap: { gap: 9 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 7, borderRadius: ui.radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: ui.radius.pill },
  muted: { opacity: 0.68 },
  selection: { borderWidth: 1, borderRadius: ui.radius.md, overflow: 'hidden' },
  selectionActive: { borderWidth: 1.5 },
  selectionContent: { minHeight: 78, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 },
  selectionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  selectionCopy: { flex: 1, gap: 2 },
  selectionTitle: { fontWeight: '800', letterSpacing: -0.25 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: ui.radius.pill,
  },
});
