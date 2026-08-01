import AsyncStorage from '@react-native-async-storage/async-storage';

import { bundledAnnouncements, bundledPastPapers, bundledSubjects, bundledUnits } from '@/data/catalog';
import type { PersistedState } from '@/types';

const STATE_KEY = '@zemen-academy/state-v1';

export const defaultState: PersistedState = {
  schemaVersion: 1,
  hasSeenIntro: false,
  profileReady: false,
  user: null,
  preferences: {
    grade: 12,
    stream: 'Natural',
    language: 'en',
    theme: 'system',
    reminderTime: '19:00',
    dailyQuizGoal: 1,
    notificationsEnabled: true,
  },
  unitDownloads: [],
  paperDownloads: [],
  attempts: [],
  pendingQuestionReports: [],
  announcements: bundledAnnouncements,
  knownAnnouncementIds: bundledAnnouncements.map((item) => item.id),
  readAnnouncementIds: [],
  premiumPlans: [],
  premiumPaymentMethods: [],
  catalog: {
    subjects: bundledSubjects,
    units: bundledUnits,
    pastPapers: bundledPastPapers,
  },
};

export async function loadState(): Promise<PersistedState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.schemaVersion !== 1) return defaultState;
    const announcements = Array.isArray(parsed.announcements) ? parsed.announcements : defaultState.announcements;
    return {
      ...defaultState,
      ...parsed,
      announcements,
      preferences: { ...defaultState.preferences, ...parsed.preferences },
      catalog: { ...defaultState.catalog, ...parsed.catalog },
      pendingQuestionReports: Array.isArray(parsed.pendingQuestionReports) ? parsed.pendingQuestionReports : [],
      knownAnnouncementIds: Array.isArray(parsed.knownAnnouncementIds)
        ? parsed.knownAnnouncementIds
        : announcements.map((item) => item.id),
      readAnnouncementIds: Array.isArray(parsed.readAnnouncementIds) ? parsed.readAnnouncementIds : [],
      premiumPlans: Array.isArray(parsed.premiumPlans) ? parsed.premiumPlans : [],
      premiumPaymentMethods: Array.isArray(parsed.premiumPaymentMethods) ? parsed.premiumPaymentMethods : [],
    };
  } catch {
    return defaultState;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(STATE_KEY);
}

export function utf8ByteLength(value: unknown): number {
  const text = JSON.stringify(value);
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}
