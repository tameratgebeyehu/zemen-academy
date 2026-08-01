import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { LoadingScreen } from '@/components/Screen';
import { useApp } from '@/context/AppContext';
import { DownloadsScreen } from '@/screens/downloads/DownloadsScreen';
import { PaperViewerScreen } from '@/screens/content/PaperViewerScreen';
import { PastPapersScreen } from '@/screens/content/PastPapersScreen';
import { SearchScreen } from '@/screens/content/SearchScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { AnnouncementsScreen } from '@/screens/home/AnnouncementsScreen';
import { AuthScreen } from '@/screens/onboarding/AuthScreen';
import { ForgotPasswordScreen } from '@/screens/onboarding/ForgotPasswordScreen';
import { DeviceAccessScreen } from '@/screens/onboarding/DeviceAccessScreen';
import { IntroScreen } from '@/screens/onboarding/IntroScreen';
import { SetupScreen } from '@/screens/onboarding/SetupScreen';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { AboutScreen } from '@/screens/profile/AboutScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { PremiumScreen } from '@/screens/profile/PremiumScreen';
import { ProgressScreen } from '@/screens/progress/ProgressScreen';
import { ExamRulesScreen } from '@/screens/quizzes/ExamRulesScreen';
import { QuizDetailsScreen } from '@/screens/quizzes/QuizDetailsScreen';
import { QuizPlayerScreen } from '@/screens/quizzes/QuizPlayerScreen';
import { QuizzesScreen } from '@/screens/quizzes/QuizzesScreen';
import { ResultsScreen } from '@/screens/quizzes/ResultsScreen';
import { UnitsScreen } from '@/screens/quizzes/UnitsScreen';
import type { MainTabParamList, RootStackParamList } from '@/navigation/types';
import { devicePolicyRequiresAttention } from '@/utils/devicePolicy';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  HomeTab: { active: 'home-variant', inactive: 'home-variant-outline' },
  QuizzesTab: { active: 'clipboard-text', inactive: 'clipboard-text-outline' },
  DownloadsTab: { active: 'download-circle', inactive: 'download-circle-outline' },
  ProfileTab: { active: 'account-circle', inactive: 'account-circle-outline' },
};

function AnimatedTabIcon({ source, focused, color, activeColor, containerColor, size }: {
  source: string;
  focused: boolean;
  color: string;
  activeColor: string;
  containerColor: string;
  size: number;
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      speed: 22,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);
  return (
    <Animated.View style={[
      styles.tabIcon,
      focused && { backgroundColor: containerColor },
      { transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
      ] },
    ]}>
      <Icon source={source} color={focused ? activeColor : color} size={focused ? size : size - 1} />
      {focused ? <View style={[styles.activeDot, { backgroundColor: activeColor }]} /> : null}
    </Animated.View>
  );
}

function MainTabs() {
  const { t } = useApp();
  const theme = useTheme();
  return (
    <Tabs.Navigator
      backBehavior="history"
      detachInactiveScreens
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: true,
        freezeOnBlur: true,
        animation: 'none',
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarIcon: ({ color, size, focused }) => (
          <AnimatedTabIcon
            source={tabIcons[route.name][focused ? 'active' : 'inactive']}
            focused={focused}
            color={color}
            activeColor={theme.colors.primary}
            containerColor={theme.colors.primaryContainer}
            size={size}
          />
        ),
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 8,
          shadowColor: theme.dark ? '#000000' : '#283266',
          shadowOpacity: theme.dark ? 0.28 : 0.1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -5 },
        },
        tabBarItemStyle: { minHeight: 56, paddingVertical: 4, marginHorizontal: 3 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.1 },
      })}
    >
      <Tabs.Screen name="HomeTab" component={HomeScreen} options={{ title: t('home') }} />
      <Tabs.Screen name="QuizzesTab" component={QuizzesScreen} options={{ title: t('quizzes') }} />
      <Tabs.Screen name="DownloadsTab" component={DownloadsScreen} options={{ title: t('downloads') }} />
      <Tabs.Screen name="ProfileTab" component={ProfileScreen} options={{ title: t('profile') }} />
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 48,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2 },
});

export function RootNavigator() {
  const { state, hydrated, t } = useApp();
  if (!hydrated) return <LoadingScreen />;

  if (!state.hasSeenIntro) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
      </Stack.Navigator>
    );
  }

  if (!state.user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    );
  }

  const deviceRequiresAttention = devicePolicyRequiresAttention(
    state.user.isGuest,
    state.user.id,
    state.lastDeviceRegistrationUserId,
    state.devicePolicyObservation,
  );
  if (deviceRequiresAttention) return <DeviceAccessScreen />;

  if (!state.profileReady) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Setup" component={SetupScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'fade_from_bottom',
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: t('search') }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <Stack.Screen name="PastPapers" component={PastPapersScreen} options={{ title: t('pastPapers') }} />
      <Stack.Screen name="PaperViewer" component={PaperViewerScreen} options={{ title: 'Offline paper' }} />
      <Stack.Screen name="Units" component={UnitsScreen} options={{ title: t('units') }} />
      <Stack.Screen name="QuizDetails" component={QuizDetailsScreen} options={{ title: 'Quiz' }} />
      <Stack.Screen name="ExamRules" component={ExamRulesScreen} options={{ title: 'Attempt rules' }} />
      <Stack.Screen name="QuizPlayer" component={QuizPlayerScreen} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Results', headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'Progress' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: t('about') }} />
      <Stack.Screen name="Premium" component={PremiumScreen} options={{ title: 'Premium' }} />
    </Stack.Navigator>
  );
}
