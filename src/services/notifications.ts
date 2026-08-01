import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Linking, Platform } from 'react-native';

import type { Announcement } from '@/types';
import { notificationPermissionState, type NotificationPermissionState } from '@/utils/permissions';
import { isExpoPushToken } from '@/utils/pushNotifications';

const REMINDER_ID_KEY = 'zemen-daily-reminder';
const ANNOUNCEMENT_CHANNEL_ID = 'zemen-announcements';
const REGISTERED_PUSH_TOKEN_KEY = 'zemen-registered-expo-push-token';
let handlerConfigured = false;
type NotificationsModule = typeof import('expo-notifications');

async function loadNotifications() {
  // Importing expo-notifications initializes its push-token listener. Android
  // Expo Go no longer includes that native capability, so defer the import
  // until we know the app is running in a development or production build.
  if (Platform.OS === 'android' && isRunningInExpoGo()) return null;

  const Notifications = await import('expo-notifications');
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }
  return Notifications;
}

async function configureNotificationChannels(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(REMINDER_ID_KEY, {
      name: 'Daily study reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync(ANNOUNCEMENT_CHANNEL_ID, {
      name: 'Academy announcements',
      description: 'New lessons, quizzes, and important Zemen Academy updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
  ]);
}

async function ensureNotificationPermission(Notifications: NotificationsModule): Promise<NotificationPermissionState> {
  await configureNotificationChannels(Notifications);
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || !existing.canAskAgain) return notificationPermissionState(existing);
  return notificationPermissionState(await Notifications.requestPermissionsAsync());
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 'unavailable';
  return notificationPermissionState(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 'unavailable';
  return ensureNotificationPermission(Notifications);
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

function expoProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

export async function getExpoPushTokenForDevice(): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  await configureNotificationChannels(Notifications);
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return null;
  const projectId = expoProjectId();
  if (!projectId) {
    if (__DEV__) console.warn('[notifications] EAS project ID is missing; remote push registration skipped.');
    return null;
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return isExpoPushToken(token) ? token : null;
}

export function registeredPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REGISTERED_PUSH_TOKEN_KEY);
}

export function rememberRegisteredPushToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(REGISTERED_PUSH_TOKEN_KEY, token);
}

export function forgetRegisteredPushToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REGISTERED_PUSH_TOKEN_KEY);
}

export async function cancelZemenNotifications(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === REMINDER_ID_KEY || item.content.data?.kind === 'announcement')
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  await Notifications.dismissAllNotificationsAsync();
}

export async function scheduleDailyReminder(time: string): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  if (await ensureNotificationPermission(Notifications) !== 'granted') return false;

  const [hourText = '19', minuteText = '00'] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === REMINDER_ID_KEY)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Zemen Academy',
      body: 'A short practice session today keeps your preparation moving.',
      data: { kind: REMINDER_ID_KEY },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? REMINDER_ID_KEY : undefined,
    },
  });
  return true;
}

export async function presentAnnouncementNotification(announcement: Announcement): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return false;

  await configureNotificationChannels(Notifications);

  await Notifications.scheduleNotificationAsync({
    identifier: `zemen-announcement-${announcement.id}`,
    content: {
      title: announcement.title,
      body: announcement.body,
      data: { kind: 'announcement', announcementId: announcement.id },
    },
    trigger: Platform.OS === 'android' ? { channelId: ANNOUNCEMENT_CHANNEL_ID } : null,
  });
  return true;
}

export async function subscribeToAnnouncementNotificationResponses(
  listener: (announcementId: string) => void,
): Promise<() => void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return () => undefined;

  const handleResponse = (response: Awaited<ReturnType<typeof Notifications.getLastNotificationResponseAsync>>) => {
    const data = response?.notification.request.content.data;
    if (data?.kind === 'announcement' && typeof data.announcementId === 'string') {
      listener(data.announcementId);
    }
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
  const previousResponse = await Notifications.getLastNotificationResponseAsync();
  if (previousResponse) {
    handleResponse(previousResponse);
    Notifications.clearLastNotificationResponse();
  }
  return () => subscription.remove();
}
