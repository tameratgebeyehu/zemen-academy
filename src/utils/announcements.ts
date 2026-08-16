import type { Announcement, Grade, User } from '@/types';

export const MAX_KNOWN_ANNOUNCEMENTS = 500;
export const ANNOUNCEMENT_REFRESH_INTERVAL_MS = 2 * 60_000;

export function announcementRefreshDelay(failureCount: number): number {
  if (failureCount <= 0) return ANNOUNCEMENT_REFRESH_INTERVAL_MS;
  return Math.min(30_000 * (2 ** (failureCount - 1)), ANNOUNCEMENT_REFRESH_INTERVAL_MS);
}

export function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort((left, right) => (
    new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  ));
}

export function findNewAnnouncements(items: Announcement[], knownIds: ReadonlySet<string>): Announcement[] {
  return items.filter((item) => !knownIds.has(item.id));
}

export function mergeKnownAnnouncementIds(
  knownIds: string[],
  items: Announcement[],
  limit = MAX_KNOWN_ANNOUNCEMENTS,
): string[] {
  return [...new Set([...items.map((item) => item.id), ...knownIds])].slice(0, limit);
}

export function announcementsEqual(left: Announcement[], right: Announcement[]): boolean {
  return left.length === right.length && left.every((item, index) => {
    const candidate = right[index];
    return candidate?.id === item.id
      && candidate.title === item.title
      && candidate.body === item.body
      && candidate.publishedAt === item.publishedAt
      && candidate.kind === item.kind
      && candidate.ownerUserId === item.ownerUserId
      && candidate.actionType === item.actionType
      && candidate.targetId === item.targetId
      && candidate.actionLabel === item.actionLabel;
  });
}

export function announcementQuizUnitId(announcement: Announcement): string | null {
  if (announcement.actionType === 'quiz' && announcement.targetId?.trim()) {
    return announcement.targetId.trim();
  }
  const legacyMatch = announcement.id.match(/^unit-published-(.+)-v\d+$/);
  return legacyMatch?.[1]?.trim() || null;
}

export function createWelcomeAnnouncement(
  user: User,
  grade: Grade,
  publishedAt = new Date().toISOString(),
): Announcement {
  const firstName = user.name.trim().split(/\s+/)[0] || 'Student';
  return {
    id: `welcome-${user.id}`,
    title: `Welcome to Zemen Academy, ${firstName}!`,
    body: `Your Grade ${grade} learning plan is ready. Explore a subject and begin your first practice session.`,
    publishedAt,
    kind: 'welcome',
    ownerUserId: user.id,
    actionType: 'quizzes',
    actionLabel: 'Explore quizzes',
  };
}

export function personalAnnouncementsFor(items: Announcement[], userId?: string): Announcement[] {
  if (!userId) return [];
  return items.filter((item) => item.kind === 'welcome' && item.ownerUserId === userId);
}
