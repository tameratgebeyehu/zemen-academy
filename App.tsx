import {
  createNavigationContainerRef,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { useEffect, useMemo, useRef } from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';

import { AppProvider, useApp } from '@/context/AppContext';
import { AppDialogProvider } from '@/components/AppDialog';
import { darkTheme, lightTheme } from '@/data/theme';
import { RootNavigator } from '@/navigation/RootNavigator';
import type { RootStackParamList } from '@/navigation/types';
import { subscribeToAnnouncementNotificationResponses } from '@/services/notifications';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Prevent hidden tab/stack screens from consuming the JS thread on slower phones.
enableFreeze(true);

function ThemedApp() {
  const { state } = useApp();
  const pendingAnnouncementNavigation = useRef(false);
  const systemTheme = useColorScheme();
  const dark = state.preferences.theme === 'dark'
    || (state.preferences.theme === 'system' && systemTheme === 'dark');
  const paperTheme = dark ? darkTheme : lightTheme;
  const navigationTheme = useMemo(() => ({
    ...(dark ? NavigationDarkTheme : NavigationLightTheme),
    colors: {
      ...(dark ? NavigationDarkTheme : NavigationLightTheme).colors,
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outlineVariant,
      notification: paperTheme.colors.error,
    },
  }), [dark, paperTheme]);

  useEffect(() => {
    if (pendingAnnouncementNavigation.current && navigationRef.isReady() && state.user && state.profileReady) {
      pendingAnnouncementNavigation.current = false;
      navigationRef.navigate('Announcements');
    }
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void subscribeToAnnouncementNotificationResponses(() => {
      if (navigationRef.isReady() && state.user && state.profileReady) {
        navigationRef.navigate('Announcements');
      } else {
        pendingAnnouncementNavigation.current = true;
      }
    }).then((removeListener) => {
      if (active) unsubscribe = removeListener;
      else removeListener();
    }).catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [state.profileReady, state.user]);

  return (
    <PaperProvider theme={paperTheme}>
      <AppDialogProvider>
        <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          onReady={() => {
            if (pendingAnnouncementNavigation.current && state.user && state.profileReady) {
              pendingAnnouncementNavigation.current = false;
              navigationRef.navigate('Announcements');
            }
          }}
        >
          <StatusBar
            animated
            hidden={false}
            barStyle={dark ? 'light-content' : 'dark-content'}
            backgroundColor={paperTheme.colors.background}
            translucent={false}
          />
          <RootNavigator />
        </NavigationContainer>
        </View>
      </AppDialogProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <ThemedApp />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
