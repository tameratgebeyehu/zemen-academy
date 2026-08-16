import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';

import { renderPastPaperDocument } from '@/utils/paperHtml';

export function PaperContent({ content }: { content: string }) {
  const theme = useTheme();
  const html = useMemo(() => renderPastPaperDocument(content, {
    background: theme.colors.background,
    surface: theme.colors.surface,
    foreground: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    outline: theme.colors.outlineVariant,
    accent: theme.colors.primary,
  }), [content, theme.colors]);
  const source = useMemo(() => ({ html }), [html]);

  return (
    <WebView
      originWhitelist={['about:blank']}
      source={source}
      style={styles.webView}
      containerStyle={styles.container}
      javaScriptEnabled
      domStorageEnabled={false}
      cacheEnabled
      setSupportMultipleWindows={false}
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      textZoom={100}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  webView: { flex: 1, backgroundColor: 'transparent' },
});
