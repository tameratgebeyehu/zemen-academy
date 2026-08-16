import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, IconButton, ProgressBar, Text, useTheme } from 'react-native-paper';

import { useAppDialog } from '@/components/AppDialog';
import { PressableScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { V1_PAST_PAPERS_ENABLED } from '@/config';
import { useApp } from '@/context/AppContext';
import { heroPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { canAccessPaper, canAccessUnit } from '@/utils/access';
import {
  noteDownloadMatchesProfile,
  paperDownloadMatchesProfile,
  unitDownloadMatchesProfile,
} from '@/utils/downloads';
import { canAccessStudyNote, resolveStudyNoteUnit } from '@/utils/notes';

type DownloadTab = 'quizzes' | 'notes' | 'papers';

export function DownloadsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, deleteUnitDownload, deleteNoteDownload, deletePaperDownload, t } = useApp();
  const { showDialog } = useAppDialog();
  const theme = useTheme();
  const hero = heroPalette(theme.dark);
  const profile = { grade: state.preferences.grade, stream: state.preferences.stream };
  const unitDownloads = state.unitDownloads
    .filter((item) => unitDownloadMatchesProfile(item, profile))
    .filter((item) => canAccessUnit(state.user, item.unit));
  const noteDownloads = state.noteDownloads
    .filter((item) => noteDownloadMatchesProfile(item, profile))
    .filter((item) => canAccessStudyNote(state.user, item.note));
  const paperDownloads = V1_PAST_PAPERS_ENABLED
    ? state.paperDownloads
        .filter((item) => paperDownloadMatchesProfile(item, profile))
        .filter((item) => canAccessPaper(state.user, item.paper))
    : [];
  const storageBytes = unitDownloads.reduce((sum, item) => sum + item.byteSize, 0)
    + noteDownloads.reduce((sum, item) => sum + item.byteSize, 0)
    + paperDownloads.reduce((sum, item) => sum + item.byteSize, 0);
  const [tab, setTab] = useState<DownloadTab>(
    unitDownloads.length ? 'quizzes' : noteDownloads.length ? 'notes' : paperDownloads.length ? 'papers' : 'quizzes',
  );
  const totalItems = unitDownloads.length + noteDownloads.length + paperDownloads.length;
  const storageMb = storageBytes / (1024 * 1024);
  const storageProgress = Math.min(storageMb / 250, 1);

  return (
    <Screen safeTop safeBottom={false}>
      <View style={styles.heading}>
        <Text variant="labelLarge" style={[styles.eyebrow, { color: theme.colors.primary }]}>OFFLINE LIBRARY</Text>
        <Text variant="headlineMedium" style={styles.title}>{t('downloads')}</Text>
        <Text variant="bodyMedium" style={styles.muted}>Your saved learning stays available without mobile data.</Text>
      </View>

      <Card mode="contained" style={[styles.storageCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: hero.background }]}>
        <Card.Content style={styles.storageContent}>
          <View style={styles.storageTop}>
            <View style={styles.storageCopy}>
              <Text variant="labelMedium" style={[styles.heroEyebrow, { color: hero.muted }]}>GRADE {state.preferences.grade} OFFLINE</Text>
              <Text variant="headlineSmall" style={[styles.heroTitle, { color: hero.foreground }]}>
                {totalItems} {totalItems === 1 ? 'item' : 'items'} saved
              </Text>
              <Text variant="bodySmall" style={{ color: hero.muted }}>
                {formatBytes(storageBytes)} used • 250 MB planning allowance
              </Text>
            </View>
            <View style={[styles.downloadIcon, { backgroundColor: hero.overlay }]}>
              <Icon source="cloud-check-outline" size={30} color={hero.foreground} />
            </View>
          </View>
          <ProgressBar progress={storageProgress} color={hero.accent} style={[styles.progress, { backgroundColor: hero.overlay }]} />
          <View style={styles.storageLabels}>
            <Text variant="labelSmall" style={{ color: hero.muted }}>{formatBytes(storageBytes)}</Text>
            <Text variant="labelSmall" style={{ color: hero.muted }}>250 MB</Text>
          </View>
        </Card.Content>
      </Card>

      <View
        style={[
          styles.tabBar,
          theme.dark ? ui.shadow.dark : ui.shadow.light,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
        ]}
        accessibilityRole="tablist"
      >
        <DownloadTabButton
          active={tab === 'quizzes'}
          icon="clipboard-text-outline"
          label="Quizzes"
          onPress={() => setTab('quizzes')}
        />
        <DownloadTabButton
          active={tab === 'notes'}
          icon="notebook-outline"
          label="Notes"
          onPress={() => setTab('notes')}
        />
        {V1_PAST_PAPERS_ENABLED ? (
          <DownloadTabButton
            active={tab === 'papers'}
            icon="file-document-outline"
            label="Papers"
            onPress={() => setTab('papers')}
          />
        ) : null}
      </View>

      {tab === 'quizzes' && unitDownloads.map((download) => (
        <Card key={download.unit.id} mode="outlined" style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.itemContent}>
            <View style={[styles.itemIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <Icon source={download.subject.icon} size={27} color={theme.colors.primary} />
            </View>
            <View style={styles.grow}>
              <Text variant="titleMedium" style={styles.bold}>{download.subject.name}</Text>
              <Text variant="bodyMedium">{download.unit.title}</Text>
              <View style={styles.metaRow}>
                <Icon source="help-circle-outline" size={14} color={theme.colors.outline} />
                <Text variant="bodySmall" style={styles.muted}>{download.questions.length} questions</Text>
                <Text variant="bodySmall" style={styles.muted}>•</Text>
                <Text variant="bodySmall" style={styles.muted}>{formatBytes(download.byteSize)}</Text>
              </View>
            </View>
            <IconButton
              icon="delete-outline"
              iconColor={theme.colors.error}
              size={20}
              accessibilityLabel={`Delete ${download.subject.name} ${download.unit.title}`}
              onPress={() => showDialog({
                title: 'Remove offline quiz?',
                body: 'The downloaded questions will be removed. Completed results will stay in your profile.',
                icon: 'delete-outline',
                tone: 'danger',
                actions: [
                  { label: 'Keep download', tone: 'neutral' },
                  { label: 'Remove', tone: 'danger', onPress: () => deleteUnitDownload(download.unit.id) },
                ],
              })}
            />
          </Card.Content>
          <View style={[styles.itemFooter, { borderTopColor: theme.colors.outlineVariant }]}>
            <View style={styles.offlineBadge}>
              <Icon source="check-circle" size={16} color={theme.colors.primary} />
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Available offline</Text>
            </View>
            <Button compact icon="arrow-right" contentStyle={styles.openButton} onPress={() => navigation.navigate('QuizDetails', { unitId: download.unit.id })}>
              Open
            </Button>
          </View>
        </Card>
      ))}

      {tab === 'notes' && noteDownloads.map((download) => {
        const subject = state.catalog.subjects.find((item) => item.id === download.note.subjectId);
        const unit = resolveStudyNoteUnit(
          download.note,
          state.catalog.units.filter((item) => item.subjectId === download.note.subjectId),
        );
        const noteTitle = unit?.title ?? download.note.title;
        return (
          <Card key={download.note.id} mode="outlined" style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.itemContent}>
              <View style={[styles.itemIcon, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <Icon source={subject?.icon || 'notebook-outline'} size={27} color={theme.colors.tertiary} />
              </View>
              <View style={styles.grow}>
                <Text variant="titleMedium" style={styles.bold}>{subject?.name ?? 'Study note'}</Text>
                <Text variant="bodyMedium">{noteTitle}</Text>
                <View style={styles.metaRow}>
                  <Icon source="book-open-page-variant-outline" size={14} color={theme.colors.outline} />
                  <Text variant="bodySmall" style={styles.muted}>{unit ? `Unit ${unit.number}` : 'Complete note'}</Text>
                  <Text variant="bodySmall" style={styles.muted}>•</Text>
                  <Text variant="bodySmall" style={styles.muted}>{formatBytes(download.byteSize)}</Text>
                </View>
              </View>
              <IconButton
                icon="delete-outline"
                iconColor={theme.colors.error}
                size={20}
                accessibilityLabel={`Delete ${noteTitle}`}
                onPress={() => showDialog({
                  title: 'Remove offline note?',
                  body: 'This study note will be removed from the device. You can download it again when online.',
                  icon: 'delete-outline',
                  tone: 'danger',
                  actions: [
                    { label: 'Keep download', tone: 'neutral' },
                    { label: 'Remove', tone: 'danger', onPress: () => deleteNoteDownload(download.note.id) },
                  ],
                })}
              />
            </Card.Content>
            <View style={[styles.itemFooter, { borderTopColor: theme.colors.outlineVariant }]}>
              <View style={styles.offlineBadge}>
                <Icon source="check-circle" size={16} color={theme.colors.primary} />
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Available offline</Text>
              </View>
              <Button
                compact
                icon="arrow-right"
                contentStyle={styles.openButton}
                onPress={() => navigation.navigate('NoteViewer', { noteId: download.note.id, version: download.note.version })}
              >
                Read
              </Button>
            </View>
          </Card>
        );
      })}

      {tab === 'papers' && paperDownloads.map((download) => (
        <Card key={download.paper.id} mode="outlined" style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.itemContent}>
            <View style={[styles.itemIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Icon source="file-document-outline" size={27} color={theme.colors.secondary} />
            </View>
            <View style={styles.grow}>
              <Text variant="titleMedium" style={styles.bold}>{download.paper.title}</Text>
              <Text variant="bodySmall" style={styles.muted}>
                Grade {download.paper.grade} • {download.paper.year} • {formatBytes(download.byteSize)}
              </Text>
            </View>
            <IconButton
              icon="delete-outline"
              iconColor={theme.colors.error}
              size={20}
              accessibilityLabel={`Delete ${download.paper.title}`}
              onPress={() => showDialog({
                title: 'Remove offline paper?',
                body: 'This saved paper will be removed from the device. You can download it again when online.',
                icon: 'delete-outline',
                tone: 'danger',
                actions: [
                  { label: 'Keep download', tone: 'neutral' },
                  { label: 'Remove', tone: 'danger', onPress: () => deletePaperDownload(download.paper.id) },
                ],
              })}
            />
          </Card.Content>
          <View style={[styles.itemFooter, { borderTopColor: theme.colors.outlineVariant }]}>
            <View style={styles.offlineBadge}>
              <Icon source="check-circle" size={16} color={theme.colors.primary} />
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Available offline</Text>
            </View>
            <Button compact icon="arrow-right" contentStyle={styles.openButton} onPress={() => navigation.navigate('PastPaperDetails', { paperId: download.paper.id })}>
              Practice
            </Button>
          </View>
        </Card>
      ))}

      {tab === 'quizzes' && !unitDownloads.length ? (
        <DownloadEmpty
          icon="clipboard-text-outline"
          title="No quiz units saved"
          body="Choose a subject and download a unit for offline practice."
          action="Browse quizzes"
          onPress={() => navigation.navigate('Main', { screen: 'QuizzesTab' })}
        />
      ) : null}

      {tab === 'papers' && !paperDownloads.length ? (
        <DownloadEmpty
          icon="file-document-outline"
          title="No papers saved"
          body="Download an entrance paper to practise without an internet connection."
          action="Browse papers"
          onPress={() => navigation.navigate('PastPapers')}
        />
      ) : null}

      {tab === 'notes' && !noteDownloads.length ? (
        <DownloadEmpty
          icon="notebook-outline"
          title="No study notes saved"
          body="Open a published unit note and download it for offline reading."
          action="Browse notes"
          onPress={() => navigation.navigate('Notes')}
        />
      ) : null}

    </Screen>
  );
}

function DownloadTabButton({ active, icon, label, onPress }: {
  active: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityLabel={`${label} downloads${active ? ', selected' : ''}`}
      onPress={onPress}
      style={styles.tabButtonWrap}
    >
      <View style={[
        styles.tabButton,
        active && {
          backgroundColor: theme.colors.primary,
        },
      ]}>
        <Icon
          source={icon}
          size={20}
          color={active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
        />
        <Text
          variant="labelLarge"
          numberOfLines={1}
          style={[styles.tabLabel, { color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

function DownloadEmpty({ icon, title, body, action, onPress }: {
  icon: string;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        <Icon source={icon} size={42} color={theme.colors.primary} />
      </View>
      <Text variant="titleLarge" style={styles.bold}>{title}</Text>
      <Text variant="bodyMedium" style={[styles.muted, styles.center]}>{body}</Text>
      <Button mode="contained" icon="arrow-right" contentStyle={styles.emptyButton} onPress={onPress}>{action}</Button>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  heading: { gap: 6, marginTop: 3, marginBottom: 3 },
  eyebrow: { fontWeight: '900', letterSpacing: 1.2, fontSize: 11 },
  title: { fontWeight: '900', letterSpacing: -0.7 },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.65 },
  storageCard: { borderRadius: ui.radius.lg },
  storageContent: { gap: 10, paddingVertical: 17 },
  storageTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storageCopy: { flex: 1, gap: 3 },
  heroEyebrow: { fontWeight: '900', letterSpacing: 1, fontSize: 10 },
  heroTitle: { fontWeight: '900' },
  downloadIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  progress: { height: 7, borderRadius: ui.radius.pill },
  storageLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: ui.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    overflow: 'hidden',
  },
  tabButtonWrap: { flex: 1, minWidth: 0 },
  tabButton: {
    minHeight: 46,
    borderRadius: ui.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  tabLabel: { flexShrink: 1, fontWeight: '800' },
  itemCard: { borderRadius: ui.radius.md, overflow: 'hidden' },
  itemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  itemIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  itemFooter: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  openButton: { flexDirection: 'row-reverse' },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 38 },
  emptyIcon: { width: 82, height: 82, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  center: { textAlign: 'center', lineHeight: 21 },
  emptyButton: { minHeight: 48, flexDirection: 'row-reverse' },
});
