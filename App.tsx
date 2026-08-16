import {
  createNavigationContainerRef,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking, StatusBar, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';

import { AppProvider, useApp } from '@/context/AppContext';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AppDialogProvider } from '@/components/AppDialog';
import { darkTheme, lightTheme } from '@/data/theme';
import { RootNavigator } from '@/navigation/RootNavigator';
import type { RootStackParamList } from '@/navigation/types';
import { subscribeToZemenNotificationEvents } from '@/services/notifications';
import { appLinkDestination, type AppLinkDestination } from '@/utils/appLinks';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Prevent hidden tab/stack screens from consuming the JS thread on slower phones.
enableFreeze(true);

function ThemedApp() {
  const { state, refreshPremium } = useApp();
  const pendingAnnouncementNavigation = useRef<string | null>(null);
  const pendingPremiumNavigation = useRef(false);
  const pendingTimetableNavigation = useRef(false);
  const pendingAppLinkNavigation = useRef<AppLinkDestination | null>(null);
  const initialAppLinkHandled = useRef(false);
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

  const handleAppLink = useCallback((url: string) => {
    const destination = appLinkDestination(url);
    if (!destination) return;
    if (navigationRef.isReady()) {
      navigationRef.navigate(destination);
    } else {
      pendingAppLinkNavigation.current = destination;
    }
  }, []);

  useEffect(() => {
    if (!initialAppLinkHandled.current) {
      initialAppLinkHandled.current = true;
      void Linking.getInitialURL().then((url) => {
        if (url) handleAppLink(url);
      }).catch(() => undefined);
    }
    const subscription = Linking.addEventListener('url', ({ url }) => handleAppLink(url));
    return () => subscription.remove();
  }, [handleAppLink]);

  useEffect(() => {
    const destination = pendingAppLinkNavigation.current;
    if (destination && navigationRef.isReady()) {
      pendingAppLinkNavigation.current = null;
      navigationRef.navigate(destination);
    }
  }, [state.hasSeenIntro, state.profileReady, state.user]);

  useEffect(() => {
    if (pendingAnnouncementNavigation.current && navigationRef.isReady() && state.user && state.profileReady) {
      const announcementId = pendingAnnouncementNavigation.current;
      pendingAnnouncementNavigation.current = null;
      navigationRef.navigate('AnnouncementDetail', { announcementId });
    }
    if (pendingPremiumNavigation.current && navigationRef.isReady() && state.user && state.profileReady) {
      pendingPremiumNavigation.current = false;
      navigationRef.navigate('Premium');
    }
    if (pendingTimetableNavigation.current && navigationRef.isReady() && state.user && state.profileReady) {
      pendingTimetableNavigation.current = false;
      navigationRef.navigate('Timetable');
    }
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void subscribeToZemenNotificationEvents((event, opened) => {
      if (event.kind === 'premium-activation') {
        void refreshPremium().catch(() => undefined);
        if (!opened) return;
        if (navigationRef.isReady() && state.user && state.profileReady) navigationRef.navigate('Premium');
        else pendingPremiumNavigation.current = true;
        return;
      }
      if (event.kind === 'timetable') {
        if (!opened) return;
        if (navigationRef.isReady() && state.user && state.profileReady) navigationRef.navigate('Timetable');
        else pendingTimetableNavigation.current = true;
        return;
      }
      if (!opened) return;
      if (navigationRef.isReady() && state.user && state.profileReady) {
        navigationRef.navigate('AnnouncementDetail', { announcementId: event.announcementId });
      } else {
        pendingAnnouncementNavigation.current = event.announcementId;
      }
    }).then((removeListener) => {
      if (active) unsubscribe = removeListener;
      else removeListener();
    }).catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshPremium, state.profileReady, state.user?.id]);

  return (
    <PaperProvider theme={paperTheme}>
      <AppDialogProvider>
        <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          onReady={() => {
            if (pendingAppLinkNavigation.current) {
              const destination = pendingAppLinkNavigation.current;
              pendingAppLinkNavigation.current = null;
              navigationRef.navigate(destination);
            }
            if (pendingAnnouncementNavigation.current && state.user && state.profileReady) {
              const announcementId = pendingAnnouncementNavigation.current;
              pendingAnnouncementNavigation.current = null;
              navigationRef.navigate('AnnouncementDetail', { announcementId });
            }
            if (pendingPremiumNavigation.current && state.user && state.profileReady) {
              pendingPremiumNavigation.current = false;
              navigationRef.navigate('Premium');
            }
            if (pendingTimetableNavigation.current && state.user && state.profileReady) {
              pendingTimetableNavigation.current = false;
              navigationRef.navigate('Timetable');
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
        <AppErrorBoundary>
          <AppProvider>
            <ThemedApp />
          </AppProvider>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
