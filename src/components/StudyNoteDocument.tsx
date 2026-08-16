import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';

import { renderStudyNoteHtml } from '@/utils/noteHtml';

interface StudyNoteDocumentProps {
  title: string;
  unitLabel: string;
  summary?: string;
  body: string;
  updatedLabel?: string;
}

function StudyNoteDocumentComponent({ title, unitLabel, summary, body, updatedLabel }: StudyNoteDocumentProps) {
  const theme = useTheme();
  const html = useMemo(() => renderStudyNoteHtml({
    title,
    unitLabel,
    summary,
    body,
    updatedLabel,
    colors: {
      background: theme.colors.background,
      surface: theme.colors.surface,
      surfaceVariant: theme.colors.surfaceVariant,
      text: theme.colors.onSurface,
      muted: theme.colors.onSurfaceVariant,
      primary: theme.colors.primary,
      primaryContainer: theme.colors.primaryContainer,
      outline: theme.colors.outlineVariant,
    },
  }), [body, summary, theme.colors, title, unitLabel, updatedLabel]);

  return (
    <WebView
      originWhitelist={['about:blank']}
      source={{ html }}
      style={[styles.webView, { backgroundColor: theme.colors.background }]}
      containerStyle={styles.container}
      scrollEnabled
      nestedScrollEnabled
      showsVerticalScrollIndicator
      showsHorizontalScrollIndicator={false}
      overScrollMode="never"
      bounces={false}
      javaScriptEnabled={false}
      domStorageEnabled={false}
      setSupportMultipleWindows={false}
      androidLayerType="hardware"
      accessible
      accessibilityLabel={`${unitLabel}. ${title}`}
    />
  );
}

export const StudyNoteDocument = memo(StudyNoteDocumentComponent);

const styles = StyleSheet.create({
  container: { flex: 1 },
  webView: { flex: 1 },
});
