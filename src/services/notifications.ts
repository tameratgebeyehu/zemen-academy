import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Linking, Platform } from 'react-native';

import type { Announcement } from '@/types';
import { zemenNotificationEvent, type ZemenNotificationEvent } from '@/utils/notificationEvents';
import { notificationPermissionState, type NotificationPermissionState } from '@/utils/permissions';
import { isExpoPushToken } from '@/utils/pushNotifications';
import { timetableReminderCandidates, type TimetableEntry } from '@/utils/timetable';

const REMINDER_ID_KEY = 'zemen-daily-reminder';
const ANNOUNCEMENT_CHANNEL_ID = 'zemen-announcements';
const PREMIUM_CHANNEL_ID = 'zemen-premium';
const TIMETABLE_CHANNEL_ID = 'zemen-timetable';
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
    Notifications.setNotificationChannelAsync(PREMIUM_CHANNEL_ID, {
      name: 'Premium account updates',
      description: 'Premium activation and account-access updates',
      importance: Notifications.AndroidImportance.HIGH,
    }),
    Notifications.setNotificationChannelAsync(TIMETABLE_CHANNEL_ID, {
      name: 'Study timetable',
      description: 'Reminders for study sessions created in your timetable',
      importance: Notifications.AndroidImportance.HIGH,
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
      .filter((item) => (
        item.content.data?.kind === REMINDER_ID_KEY
        || item.content.data?.kind === 'announcement'
        || item.content.data?.kind === 'premium-activation'
        || item.content.data?.kind === 'timetable'
      ))
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

export type TimetableReminderSyncResult = {
  available: boolean;
  permission: NotificationPermissionState;
  scheduledCount: number;
  nextTriggerAt: string | null;
};

export async function syncTimetableReminders(
  entries: TimetableEntry[],
  now = new Date(),
): Promise<TimetableReminderSyncResult> {
  const Notifications = await loadNotifications();
  if (!Notifications) return { available: false, permission: 'unavailable', scheduledCount: 0, nextTriggerAt: null };
  const permission = await ensureNotificationPermission(Notifications);
  if (permission !== 'granted') return { available: true, permission, scheduledCount: 0, nextTriggerAt: null };
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => item.content.data?.kind === 'timetable')
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  const candidates = timetableReminderCandidates(entries, now, 14);
  let scheduledCount = 0;
  let nextTriggerAt: string | null = null;
  for (const entry of candidates) {
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: entry.triggerAt,
      channelId: Platform.OS === 'android' ? TIMETABLE_CHANNEL_ID : undefined,
    } as const;
    const verifiedAt = await Notifications.getNextTriggerDateAsync(trigger);
    if (verifiedAt === null || verifiedAt <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `zemen-timetable-${entry.id}`,
      content: {
        title: `${entry.subjectName} study time`,
        body: `${entry.durationMinutes} minutes are planned. Open Zemen Academy when you are ready.`,
        data: { kind: 'timetable', timetableId: entry.id, timetableDate: entry.date },
      },
      trigger,
    });
    scheduledCount += 1;
    if (!nextTriggerAt || verifiedAt < new Date(nextTriggerAt).getTime()) {
      nextTriggerAt = new Date(verifiedAt).toISOString();
    }
  }
  return { available: true, permission, scheduledCount, nextTriggerAt };
}

export async function presentPremiumActivationNotification(planName = 'Zemen Premium'): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return false;
  await configureNotificationChannels(Notifications);
  await Notifications.scheduleNotificationAsync({
    identifier: 'zemen-premium-activated',
    content: {
      title: 'Premium activated 🎉',
      body: `${planName} is now active. Your complete learning library is ready.`,
      data: { kind: 'premium-activation' },
    },
    trigger: Platform.OS === 'android' ? { channelId: PREMIUM_CHANNEL_ID } : null,
  });
  return true;
}

export async function subscribeToZemenNotificationEvents(
  listener: (event: ZemenNotificationEvent, opened: boolean) => void,
): Promise<() => void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return () => undefined;

  const emit = (data: Record<string, unknown> | null | undefined, opened: boolean) => {
    const event = zemenNotificationEvent(data);
    if (event) listener(event, opened);
  };
  const handleReceived = (notification: Parameters<Parameters<typeof Notifications.addNotificationReceivedListener>[0]>[0]) => {
    emit(notification.request.content.data, false);
  };
  const handleResponse = (response: Awaited<ReturnType<typeof Notifications.getLastNotificationResponseAsync>>) => {
    emit(response?.notification.request.content.data, true);
  };

  const receivedSubscription = Notifications.addNotificationReceivedListener(handleReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
  const previousResponse = await Notifications.getLastNotificationResponseAsync();
  if (previousResponse) {
    handleResponse(previousResponse);
    Notifications.clearLastNotificationResponse();
  }
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
