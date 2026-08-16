export type ZemenNotificationEvent =
  | { kind: 'announcement'; announcementId: string }
  | { kind: 'premium-activation' }
  | { kind: 'timetable'; timetableId: string };

export function zemenNotificationEvent(
  data: Record<string, unknown> | null | undefined,
): ZemenNotificationEvent | null {
  if (data?.kind === 'premium-activation') return { kind: 'premium-activation' };
  if (data?.kind === 'timetable' && typeof data.timetableId === 'string' && data.timetableId.trim()) {
    return { kind: 'timetable', timetableId: data.timetableId.trim() };
  }
  if (data?.kind === 'announcement' && typeof data.announcementId === 'string' && data.announcementId.trim()) {
    return { kind: 'announcement', announcementId: data.announcementId.trim() };
  }
  return null;
}
