import { memo, useEffect, useMemo, useState } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';

import { containsMath, estimateMathHeight, mathDocumentId, renderMathDocument } from '@/utils/math';

type TextVariant =
  | 'displayLarge' | 'displayMedium' | 'displaySmall'
  | 'headlineLarge' | 'headlineMedium' | 'headlineSmall'
  | 'titleLarge' | 'titleMedium' | 'titleSmall'
  | 'labelLarge' | 'labelMedium' | 'labelSmall'
  | 'bodyLarge' | 'bodyMedium' | 'bodySmall';

interface MathTextProps {
  children: string;
  variant?: TextVariant;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  selectable?: boolean;
  accessibilityLabel?: string;
  estimatedCharactersPerLine?: number;
}

function MathTextComponent({
  children,
  variant = 'bodyMedium',
  textStyle,
  containerStyle,
  selectable = false,
  accessibilityLabel,
  estimatedCharactersPerLine = 30,
}: MathTextProps) {
  const theme = useTheme();
  const typography = theme.fonts[variant];
  const flattened = StyleSheet.flatten(textStyle) ?? {};
  const fontSize = typeof flattened.fontSize === 'number' ? flattened.fontSize : typography.fontSize;
  const lineHeight = typeof flattened.lineHeight === 'number' ? flattened.lineHeight : typography.lineHeight;
  const color = typeof flattened.color === 'string' ? flattened.color : theme.colors.onSurface;
  const fontWeight = flattened.fontWeight ?? typography.fontWeight;
  const textAlign = flattened.textAlign;
  const estimatedHeight = useMemo(
    () => estimateMathHeight(children, lineHeight, estimatedCharactersPerLine),
    [children, estimatedCharactersPerLine, lineHeight],
  );
  const documentId = useMemo(() => mathDocumentId(children), [children]);
  const [height, setHeight] = useState(estimatedHeight);
  const hasMath = useMemo(() => containsMath(children), [children]);
  const html = useMemo(() => renderMathDocument(children, {
    color,
    fontSize,
    lineHeight,
    fontWeight,
    textAlign,
  }), [children, color, fontSize, fontWeight, lineHeight, textAlign]);

  useEffect(() => {
    setHeight(estimatedHeight);
  }, [documentId, estimatedHeight]);

  if (!hasMath) {
    return (
      <Text variant={variant} style={textStyle} selectable={selectable} accessibilityLabel={accessibilityLabel}>
        {children}
      </Text>
    );
  }

  return (
    <WebView
      originWhitelist={['about:blank']}
      source={{ html }}
      style={[styles.webView, containerStyle, { height }]}
      containerStyle={styles.transparent}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      javaScriptEnabled
      domStorageEnabled={false}
      setSupportMultipleWindows={false}
      pointerEvents="none"
      accessible
      accessibilityLabel={accessibilityLabel ?? children}
      onMessage={(event) => {
        try {
          const payload = JSON.parse(event.nativeEvent.data) as { id?: unknown; height?: unknown };
          if (payload.id === documentId && typeof payload.height === 'number' && Number.isFinite(payload.height)) {
            const measuredHeight = Math.max(Math.ceil(lineHeight), Math.ceil(payload.height) + 2);
            setHeight((currentHeight) => Math.max(currentHeight, measuredHeight));
          }
        } catch {
          // Ignore messages that are not produced by the local height reporter.
        }
      }}
    />
  );
}

export const MathText = memo(MathTextComponent);

const styles = StyleSheet.create({
  webView: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
});
