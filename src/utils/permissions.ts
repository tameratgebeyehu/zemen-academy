export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export function notificationPermissionState(permission: {
  granted: boolean;
  status?: string;
}): NotificationPermissionState {
  if (permission.granted) return 'granted';
  return String(permission.status || '').toLowerCase() === 'undetermined' ? 'undetermined' : 'denied';
}

export function notificationPermissionDescription(state: NotificationPermissionState): string {
  switch (state) {
    case 'granted': return 'Allowed - announcements and study reminders can appear on this device';
    case 'denied': return 'Blocked - open your device settings to enable notifications';
    case 'unavailable': return 'Available in the Zemen Academy development or Play Store build';
    default: return 'Tap to allow announcements and study reminders';
  }
}
