import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Icon, Snackbar, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { StudyNoteDocument } from '@/components/StudyNoteDocument';
import { V1_AMHARIC_UI_ENABLED } from '@/config';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import { api } from '@/services/api';
import type { StudyNote } from '@/types';
import { canAccessStudyNote, resolveStudyNoteUnit, studyNoteCacheKey, studyNoteUnitNumber } from '@/utils/notes';
import { userFacingError } from '@/utils/userFacingError';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteViewer'>;

export function NoteViewerScreen({ route, navigation }: Props) {
  const { state, downloadNote } = useApp();
  const theme = useTheme();
  const savedDownload = state.noteDownloads.find((item) => item.note.id === route.params.noteId);
  const [note, setNote] = useState<StudyNote | null>(savedDownload?.note ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const ownerId = state.user?.id ?? 'guest';
  const cacheKey = studyNoteCacheKey(ownerId, route.params.noteId, route.params.version);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.note(route.params.noteId, route.params.version);
      setNote(response.note);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(response.note));
    } catch (caught) {
      setError(userFacingError(caught, 'notes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(cacheKey)
      .then((raw) => {
        if (!active || !raw) return;
        const cached = JSON.parse(raw) as StudyNote;
        if (cached?.id !== route.params.noteId) return;
        if (canAccessStudyNote(state.user, cached)) setNote(cached);
        else void AsyncStorage.removeItem(cacheKey);
      })
      .catch(() => undefined)
      .finally(() => { if (active) void load(); });
    return () => { active = false; };
    // Route identity owns this cache and request lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, route.params.noteId]);

  const unit = note ? resolveStudyNoteUnit(
    note,
    state.catalog.units.filter((item) => item.subjectId === note.subjectId),
  ) : undefined;
  const recoveredUnitNumber = note ? studyNoteUnitNumber(note) : null;
  const unitNumber = unit?.number ?? recoveredUnitNumber;
  const useAmharic = V1_AMHARIC_UI_ENABLED && state.preferences.language === 'am';
  const translatedTitle = note && useAmharic && note.titleAm ? note.titleAm : note?.title;
  const title = unit?.title ?? translatedTitle ?? 'Study note';
  const summary = note && useAmharic && note.summaryAm ? note.summaryAm : note?.summary;
  const body = note && useAmharic && note.bodyAm ? note.bodyAm : note?.body;
  const accessBlocked = Boolean(note && !canAccessStudyNote(state.user, note));
  const downloaded = Boolean(savedDownload && savedDownload.note.version >= (note?.version ?? route.params.version));

  const saveOffline = useCallback(async () => {
    if (!note || saving || downloaded) return;
    setSaving(true);
    setMessage('');
    try {
      await downloadNote(note);
      setMessage('Study note saved for offline reading.');
    } catch (caught) {
      setMessage(userFacingError(caught, 'notes'));
    } finally {
      setSaving(false);
    }
  }, [downloadNote, downloaded, note, saving]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: note && body && !accessBlocked
        ? () => (
          <Button
            compact
            mode="text"
            icon={downloaded ? 'check-circle' : 'download-outline'}
            loading={saving}
            disabled={saving || downloaded}
            contentStyle={styles.headerActionContent}
            labelStyle={styles.headerActionLabel}
            onPress={() => void saveOffline()}
            accessibilityLabel={downloaded ? 'Study note available offline' : 'Download study note for offline reading'}
          >
            {downloaded ? 'Saved' : 'Download'}
          </Button>
        )
        : undefined,
    });
  }, [accessBlocked, body, downloaded, navigation, note, saveOffline, saving]);

  return (
    <Screen scroll={false} style={styles.screen}>
      {loading && !note ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text variant="bodyMedium" style={styles.muted}>Preparing your unit note…</Text>
        </View>
      ) : null}

      {accessBlocked ? (
        <Card mode="outlined" style={styles.blockedCard}>
          <Card.Content style={styles.blockedContent}>
            <View style={[styles.lockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <Icon source="lock-outline" size={38} color={theme.colors.primary} />
            </View>
            <Text variant="titleLarge" style={styles.bold}>Premium access required</Text>
            <Text variant="bodyMedium" style={styles.center}>This complete unit note is available while Premium is active on your account.</Text>
            <Button mode="contained" icon="crown-outline" onPress={() => navigation.navigate('Premium')}>View Premium</Button>
          </Card.Content>
        </Card>
      ) : note && body ? (
        <StudyNoteDocument
          title={title}
          unitLabel={unitNumber ? `Unit ${unitNumber} • Complete study note` : 'Complete study note'}
          summary={summary}
          body={body}
          updatedLabel={`Updated ${new Date(note.updatedAt).toLocaleDateString()}`}
        />
      ) : null}

      {error && !note ? (
        <Card mode="contained" style={{ backgroundColor: theme.colors.errorContainer }}>
          <Card.Content style={styles.blockedContent}>
            <Text style={[styles.center, { color: theme.colors.onErrorContainer }]}>{error}</Text>
            <Button mode="contained" onPress={() => void load()}>Try again</Button>
          </Card.Content>
        </Card>
      ) : null}
      <Snackbar visible={Boolean(message)} duration={3000} onDismiss={() => setMessage('')}>{message}</Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { opacity: 0.68 }, blockedCard: { marginTop: 16, borderRadius: ui.radius.lg },
  headerActionContent: { minHeight: 42, paddingHorizontal: 2 },
  headerActionLabel: { fontWeight: '800', marginHorizontal: 4 },
  blockedContent: { alignItems: 'center', gap: 13, paddingVertical: 26 },
  lockIcon: { width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '900' }, center: { textAlign: 'center' },
});
