import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ui } from '@/data/theme';

interface ScreenProps {
  scroll?: boolean;
  safeTop?: boolean;
  safeBottom?: boolean;
  style?: ViewStyle;
}

export function Screen({
  children,
  scroll = true,
  safeTop = false,
  safeBottom = true,
  style,
}: PropsWithChildren<ScreenProps>) {
  const theme = useTheme();
  // Shared screens should paint immediately. Individual screens can still opt in
  // to Reveal for small, intentional moments instead of delaying every route.
  const content = <View style={[styles.content, style]}>{children}</View>;
  return (
    <SafeAreaView
      edges={safeTop
        ? (safeBottom ? ['top', 'bottom'] : ['top'])
        : (safeBottom ? ['bottom'] : [])}
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.backdropOrb, { backgroundColor: theme.colors.primaryContainer }]} />
        <View style={[styles.backdropOrbSmall, { backgroundColor: theme.colors.secondaryContainer }]} />
      </View>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

export function LoadingScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.loadingMark, { backgroundColor: theme.colors.primaryContainer }]}>
        <Icon source="school-outline" size={34} color={theme.colors.primary} />
      </View>
      <ActivityIndicator size="small" />
      <Text variant="titleSmall" style={styles.loadingTitle}>Preparing your learning space…</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        <Icon source={icon} size={36} color={theme.colors.primary} />
      </View>
      <Text variant="titleMedium" style={styles.center}>{title}</Text>
      <Text variant="bodyMedium" style={[styles.center, styles.muted]}>{body}</Text>
    </View>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <View style={styles.sectionRow}><View style={[styles.sectionAccent, { backgroundColor: theme.colors.primary }]} /><Text variant="titleMedium" style={styles.section}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backdropOrb: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -190, right: -120, opacity: 0.46 },
  backdropOrbSmall: { position: 'absolute', width: 130, height: 130, borderRadius: 65, top: 180, left: -105, opacity: 0.22 },
  scroll: { flexGrow: 1, paddingBottom: 12 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: ui.contentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 17,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13 },
  loadingMark: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  loadingTitle: { fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 42, paddingHorizontal: 24, gap: 8, borderRadius: ui.radius.lg, borderWidth: 1 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  center: { textAlign: 'center' },
  muted: { opacity: 0.7 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 8 },
  sectionAccent: { width: 5, height: 20, borderRadius: 3 },
  section: { fontWeight: '900', letterSpacing: -0.25 },
});
