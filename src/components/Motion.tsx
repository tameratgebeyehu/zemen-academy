import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { brand, ui } from '@/data/theme';

let reduceMotionEnabled = false;
let reduceMotionListening = false;
const reduceMotionListeners = new Set<() => void>();

function publishReduceMotion(value: boolean) {
  if (reduceMotionEnabled === value) return;
  reduceMotionEnabled = value;
  reduceMotionListeners.forEach((listener) => listener());
}

function ensureReduceMotionListener() {
  if (reduceMotionListening) return;
  reduceMotionListening = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(publishReduceMotion);
  AccessibilityInfo.addEventListener('reduceMotionChanged', publishReduceMotion);
}

function subscribeToReduceMotion(listener: () => void) {
  ensureReduceMotionListener();
  reduceMotionListeners.add(listener);
  return () => reduceMotionListeners.delete(listener);
}

function useReduceMotion() {
  return useSyncExternalStore(
    subscribeToReduceMotion,
    () => reduceMotionEnabled,
    () => false,
  );
}

export function Reveal({
  children,
  delay = 0,
  distance = 10,
  style,
}: PropsWithChildren<{ delay?: number; distance?: number; style?: StyleProp<ViewStyle> }>) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: ui.motion.emphasized,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function PressableScale({
  children,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}>) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue,
      speed: 30,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[style, disabled && styles.disabled, { transform: [
      { scale },
      { translateY: scale.interpolate({ inputRange: [0.97, 1], outputRange: [2, 0] }) },
    ] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        hitSlop={4}
        android_ripple={{ color: theme.colors.outlineVariant, foreground: true }}
        onPress={onPress}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export type IconTone = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warm' | 'coral' | 'error' | 'neutral';

export function IconTile({
  source,
  size = 24,
  tone = 'primary',
  style,
}: {
  source: string;
  size?: number;
  tone?: IconTone;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const tones = {
    primary: {
      background: theme.colors.primaryContainer,
      foreground: theme.colors.primary,
      border: theme.colors.primaryContainer,
    },
    secondary: {
      background: theme.colors.secondaryContainer,
      foreground: theme.colors.onSecondaryContainer,
      border: theme.colors.outlineVariant,
    },
    tertiary: {
      background: theme.colors.tertiaryContainer,
      foreground: theme.colors.onTertiaryContainer,
      border: theme.colors.outlineVariant,
    },
    success: {
      background: theme.dark ? '#173D32' : '#DDF5E9',
      foreground: theme.dark ? '#6ED5AB' : brand.success,
      border: theme.dark ? '#245746' : '#B9E8D2',
    },
    warm: {
      background: theme.dark ? '#4A321B' : '#FFF0D9',
      foreground: theme.dark ? '#F5BB6E' : brand.amber,
      border: theme.dark ? '#654523' : '#F5D7A9',
    },
    coral: {
      background: theme.dark ? '#4B252D' : '#FFE2E6',
      foreground: theme.dark ? '#FFA1AF' : brand.coral,
      border: theme.dark ? '#68313D' : '#F5C4CB',
    },
    error: { background: theme.colors.errorContainer, foreground: theme.colors.error },
    neutral: {
      background: theme.colors.surface,
      foreground: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
    },
  };
  const colors = tones[tone];

  return (
    <View
      style={[
        styles.iconTile,
        {
          backgroundColor: colors.background,
          borderColor: 'border' in colors ? colors.border : theme.colors.error,
        },
        style,
      ]}
    >
      <Icon source={source} size={size} color={colors.foreground} />
      {tone !== 'neutral' ? (
        <View style={[styles.iconAccent, { backgroundColor: colors.foreground }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: { overflow: 'hidden', borderRadius: ui.radius.md },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  iconTile: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconAccent: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    right: 7,
    top: 7,
    opacity: 0.8,
  },
});
