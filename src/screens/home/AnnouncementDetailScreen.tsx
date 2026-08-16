import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, useTheme } from 'react-native-paper';

import { NetworkActivity } from '@/components/NetworkActivity';
import { EmptyState, Screen } from '@/components/Screen';
import { V1_PAST_PAPERS_ENABLED } from '@/config';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { Announcement } from '@/types';
import { announcementQuizUnitId } from '@/utils/announcements';

type Props = NativeStackScreenProps<RootStackParamList, 'AnnouncementDetail'>;

export function AnnouncementDetailScreen({ route, navigation }: Props) {
  const { state, markAnnouncementsRead, refreshAnnouncements, refreshCatalog } = useApp();
  const theme = useTheme();
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const announcement = state.announcements.find((item) => item.id === route.params.announcementId);

  useEffect(() => {
    if (announcement) markAnnouncementsRead([announcement.id]);
  }, [announcement, markAnnouncementsRead]);

  useEffect(() => {
    if (announcement) return;
    let active = true;
    setChecking(true);
    void refreshAnnouncements()
      .catch(() => undefined)
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [announcement, refreshAnnouncements]);

  const action = useMemo(() => actionForAnnouncement(announcement), [announcement]);

  if (!announcement) {
    return (
      <Screen>
        <NetworkActivity
          visible={checking}
          label="Loading this announcement…"
          detail="Your saved updates remain available."
        />
        {!checking ? (
          <EmptyState
            icon="bell-off-outline"
            title="Announcement unavailable"
            body="This update may have expired or may belong to another grade."
          />
        ) : null}
      </Screen>
    );
  }

  const openAction = async () => {
    if (!action || opening) return;
    setOpening(true);
    if (action.type === 'quiz' || action.type === 'quizzes' || action.type === 'past-papers') {
      await refreshCatalog().catch(() => undefined);
    }
    if (action.type === 'quiz') navigation.navigate('QuizDetails', { unitId: action.targetId });
    else if (action.type === 'quizzes') navigation.navigate('Main', { screen: 'QuizzesTab' });
    else if (action.type === 'notes') navigation.navigate('Notes');
    else if (action.type === 'past-papers') navigation.navigate('PastPapers');
    else navigation.navigate('Premium');
    setOpening(false);
  };

  return (
    <Screen>
      <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        <Icon
          source={announcement.kind === 'welcome' ? 'school' : action?.type === 'quiz' ? 'clipboard-text-outline' : 'bullhorn-outline'}
          size={32}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.heading}>
        <Text variant="labelLarge" style={[styles.eyebrow, { color: theme.colors.primary }]}>ZEMEN ACADEMY UPDATE</Text>
        <Text variant="headlineMedium" style={styles.title}>{announcement.title}</Text>
        <Text variant="bodySmall" style={styles.date}>{formatPublishedAt(announcement.publishedAt)}</Text>
      </View>

      <Card mode="outlined" style={[styles.bodyCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.bodyContent}>
          <Text variant="bodyLarge" style={styles.body}>{announcement.body}</Text>
        </Card.Content>
      </Card>

      {action ? (
        <Button
          mode="contained"
          icon={action.icon}
          loading={opening}
          disabled={opening}
          contentStyle={styles.actionContent}
          onPress={() => void openAction()}
        >
          {announcement.actionLabel?.trim() || action.label}
        </Button>
      ) : (
        <View style={[styles.info, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="information-outline" size={18} color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.grow}>This is an informational academy announcement.</Text>
        </View>
      )}
    </Screen>
  );
}

type AnnouncementAction = {
  type: 'quiz' | 'quizzes' | 'notes' | 'past-papers' | 'premium';
  targetId: string;
  label: string;
  icon: string;
};

function actionForAnnouncement(announcement: Announcement | undefined): AnnouncementAction | null {
  if (!announcement) return null;
  const unitId = announcementQuizUnitId(announcement);
  if (unitId) return { type: 'quiz', targetId: unitId, label: 'Open quiz', icon: 'clipboard-text-outline' };
  if (announcement.actionType === 'quizzes') {
    return { type: 'quizzes', targetId: '', label: 'Explore quizzes', icon: 'clipboard-text-outline' };
  }
  if (announcement.actionType === 'notes') {
    return { type: 'notes', targetId: '', label: 'Open study notes', icon: 'notebook-outline' };
  }
  if (announcement.actionType === 'past-papers') {
    return V1_PAST_PAPERS_ENABLED
      ? { type: 'past-papers', targetId: '', label: 'Open entrance exams', icon: 'file-document-outline' }
      : null;
  }
  if (announcement.actionType === 'premium') {
    return { type: 'premium', targetId: '', label: 'View Premium', icon: 'crown-outline' };
  }
  return null;
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently published';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  heroIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heading: { gap: 7 },
  eyebrow: { fontWeight: '900', letterSpacing: 1.1 },
  title: { fontWeight: '900', letterSpacing: -0.7, lineHeight: 36 },
  date: { opacity: 0.58, textTransform: 'uppercase', letterSpacing: 0.45 },
  bodyCard: { borderRadius: ui.radius.lg },
  bodyContent: { paddingVertical: 20 },
  body: { lineHeight: 27 },
  actionContent: { minHeight: 52, flexDirection: 'row-reverse' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, borderRadius: ui.radius.sm },
  grow: { flex: 1 },
});
