import AsyncStorage from '@react-native-async-storage/async-storage';

import { V1_DEFAULT_LANGUAGE } from '@/config';
import { bundledAnnouncements, bundledPastPapers, bundledSubjects, bundledUnits } from '@/data/catalog';
import type { PersistedState } from '@/types';
import { compactStoredAttempts } from '@/utils/attemptRetention';

const STATE_KEY = '@zemen-academy/state-v1';
const NOTE_CACHE_PREFIX = '@zemen-academy/note-v2:';

export const defaultState: PersistedState = {
  schemaVersion: 1,
  hasSeenIntro: false,
  profileReady: false,
  user: null,
  preferences: {
    grade: 12,
    stream: 'Natural',
    language: V1_DEFAULT_LANGUAGE,
    theme: 'system',
    reminderTime: '19:00',
    dailyQuizGoal: 1,
    notificationsEnabled: true,
  },
  unitDownloads: [],
  noteDownloads: [],
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
  const raw = await AsyncStorage.getItem(STATE_KEY).catch(() => null);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return normalizePersistedState(parsed);
  } catch {
    await AsyncStorage.removeItem(STATE_KEY).catch(() => undefined);
    return defaultState;
  }
}

export function normalizePersistedState(parsed: Partial<PersistedState>): PersistedState {
  if (parsed.schemaVersion !== 1) return defaultState;
  const announcements = Array.isArray(parsed.announcements) ? parsed.announcements : defaultState.announcements;
  const parsedCatalog = parsed.catalog && typeof parsed.catalog === 'object'
    ? parsed.catalog
    : ({} as Partial<PersistedState['catalog']>);
  const user = parsed.user && typeof parsed.user === 'object'
    && typeof parsed.user.id === 'string'
    && typeof parsed.user.name === 'string'
    ? parsed.user
    : null;
  return {
    ...defaultState,
    ...parsed,
    user,
    localDataOwnerId: typeof parsed.localDataOwnerId === 'string' ? parsed.localDataOwnerId : user?.id,
    announcements,
    preferences: { ...defaultState.preferences, ...parsed.preferences, language: V1_DEFAULT_LANGUAGE },
    catalog: {
      subjects: Array.isArray(parsedCatalog.subjects) ? parsedCatalog.subjects : defaultState.catalog.subjects,
      units: Array.isArray(parsedCatalog.units) ? parsedCatalog.units : defaultState.catalog.units,
      pastPapers: Array.isArray(parsedCatalog.pastPapers) ? parsedCatalog.pastPapers : defaultState.catalog.pastPapers,
    },
    unitDownloads: Array.isArray(parsed.unitDownloads) ? parsed.unitDownloads : [],
    noteDownloads: Array.isArray(parsed.noteDownloads)
      ? parsed.noteDownloads.filter((download) => (
          download
          && typeof download === 'object'
          && download.note
          && typeof download.note.id === 'string'
          && typeof download.note.body === 'string'
        ))
      : [],
    paperDownloads: Array.isArray(parsed.paperDownloads)
      ? parsed.paperDownloads.map((download) => ({
          ...download,
          questions: Array.isArray(download?.questions) ? download.questions : [],
        }))
      : [],
    attempts: compactStoredAttempts(Array.isArray(parsed.attempts) ? parsed.attempts : []),
    pendingQuestionReports: Array.isArray(parsed.pendingQuestionReports) ? parsed.pendingQuestionReports : [],
    knownAnnouncementIds: Array.isArray(parsed.knownAnnouncementIds)
      ? parsed.knownAnnouncementIds
      : announcements.map((item) => item.id),
    readAnnouncementIds: Array.isArray(parsed.readAnnouncementIds) ? parsed.readAnnouncementIds : [],
    premiumPlans: Array.isArray(parsed.premiumPlans) ? parsed.premiumPlans : [],
    premiumPaymentMethods: Array.isArray(parsed.premiumPaymentMethods) ? parsed.premiumPaymentMethods : [],
  };
}

let saveQueue: Promise<void> = Promise.resolve();

export async function saveState(state: PersistedState): Promise<void> {
  const serialized = JSON.stringify(state);
  saveQueue = saveQueue.catch(() => undefined).then(() => AsyncStorage.setItem(STATE_KEY, serialized));
  await saveQueue;
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(STATE_KEY);
}

export async function clearAccountScopedNoteCache(ownerId: string): Promise<void> {
  const ownerPrefix = `${NOTE_CACHE_PREFIX}${ownerId}:`;
  const keys = await AsyncStorage.getAllKeys();
  const ownedKeys = keys.filter((key) => key.startsWith(ownerPrefix));
  if (ownedKeys.length) await AsyncStorage.multiRemove(ownedKeys);
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
