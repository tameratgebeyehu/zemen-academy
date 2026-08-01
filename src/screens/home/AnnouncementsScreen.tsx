import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, useTheme } from 'react-native-paper';

import { PressableScale } from '@/components/Motion';
import { NetworkActivity } from '@/components/NetworkActivity';
import { EmptyState, Screen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import { userFacingError } from '@/utils/userFacingError';

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLastCheck(value: string | null): string {
  if (!value) return 'Automatic updates are on';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Automatic updates are on';
  return `Last checked at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function AnnouncementsScreen() {
  const {
    state,
    announcementSyncing,
    announcementSyncError,
    lastAnnouncementSyncAt,
    refreshAnnouncements,
    markAnnouncementsRead,
  } = useApp();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const readIds = new Set(state.readAnnouncementIds);
  const unread = state.announcements.filter((item) => !readIds.has(item.id));

  useFocusEffect(useCallback(() => {
    void refreshAnnouncements().catch(() => undefined);
  }, [refreshAnnouncements]));

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      await refreshAnnouncements();
    } catch (caught) {
      setError(userFacingError(caught, 'announcements'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      <Card mode="contained" style={[styles.summaryCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.secondaryContainer }]}>
        <Card.Content style={styles.summaryContent}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.colors.secondary }]}>
            <Icon source="bell-outline" size={25} color={theme.colors.onSecondary} />
          </View>
          <View style={styles.grow}>
            <Text variant="titleMedium" style={styles.bold}>Zemen updates</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {unread.length ? `${unread.length} unread update${unread.length === 1 ? '' : 's'}` : 'You are all caught up'}
            </Text>
            <Text variant="labelSmall" style={styles.muted}>
              {announcementSyncing ? 'Checking automatically…' : formatLastCheck(lastAnnouncementSyncAt)}
            </Text>
          </View>
          <Button compact icon="refresh" loading={refreshing} disabled={refreshing} onPress={() => void refresh()}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </Card.Content>
      </Card>

      {unread.length ? (
        <View style={styles.listHeader}>
          <Text variant="labelLarge" style={styles.bold}>Latest announcements</Text>
          <Button compact onPress={() => markAnnouncementsRead(unread.map((item) => item.id))}>Mark all read</Button>
        </View>
      ) : null}

      {error || announcementSyncError ? (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
          <Icon source="cloud-alert-outline" size={19} color={theme.colors.error} />
          <Text variant="bodySmall" style={[styles.grow, { color: theme.colors.onErrorContainer }]}>
            {error || announcementSyncError}
          </Text>
        </View>
      ) : null}

      <NetworkActivity
        visible={refreshing}
        label="Checking for new announcements…"
        detail="Your current updates remain available."
      />

      {state.announcements.map((announcement) => {
        const isUnread = !readIds.has(announcement.id);
        return (
          <PressableScale
            key={announcement.id}
            accessibilityLabel={`${isUnread ? 'Unread announcement' : 'Announcement'}: ${announcement.title}`}
            onPress={() => markAnnouncementsRead([announcement.id])}
          >
            <Card
              mode="outlined"
              style={[
                styles.announcementCard,
                {
                  borderColor: isUnread ? theme.colors.primary : theme.colors.outlineVariant,
                  backgroundColor: isUnread ? theme.colors.primaryContainer : theme.colors.surface,
                },
              ]}
            >
              <Card.Content style={styles.announcementContent}>
                <View style={[
                  styles.announcementIcon,
                  { backgroundColor: isUnread ? theme.colors.primary : theme.colors.surfaceVariant },
                ]}>
                  <Icon
                    source={announcement.kind === 'welcome' ? 'school' : isUnread ? 'bullhorn' : 'bullhorn-outline'}
                    size={22}
                    color={isUnread ? theme.colors.onPrimary : theme.colors.primary}
                  />
                </View>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text variant="titleMedium" style={styles.announcementTitle}>{announcement.title}</Text>
                    {isUnread ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} /> : null}
                  </View>
                  <Text variant="labelSmall" style={styles.date}>{formatPublishedAt(announcement.publishedAt)}</Text>
                  <Text variant="bodyMedium" style={styles.body}>{announcement.body}</Text>
                  {isUnread ? <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Tap to mark as read</Text> : null}
                </View>
              </Card.Content>
            </Card>
          </PressableScale>
        );
      })}

      {!state.announcements.length ? (
        <EmptyState icon="bell-sleep-outline" title="No announcements yet" body="New lessons and important academy updates will appear here." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: { borderRadius: ui.radius.lg },
  summaryContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.65 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: ui.radius.sm },
  announcementCard: { borderRadius: ui.radius.md },
  announcementContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  announcementIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  announcementTitle: { flex: 1, fontWeight: '800', letterSpacing: -0.2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  date: { opacity: 0.56, textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { lineHeight: 21, opacity: 0.82 },
});
