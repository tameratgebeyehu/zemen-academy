import * as SecureStore from 'expo-secure-store';

import type {
  Announcement,
  CatalogCache,
  DevicePolicyObservation,
  DeviceRegistrationIdentity,
  Grade,
  Language,
  PastPaper,
  PremiumEntitlement,
  PremiumOverview,
  PremiumRequest,
  PremiumRequestInput,
  Preferences,
  Question,
  QuestionReport,
  QuizAttempt,
  Stream,
  StudyNote,
  User,
} from '@/types';
import { ReadRequestCache, stableRequestKey } from '@/utils/requestCache';
import type { StudyPlan } from '@/utils/timetable';
import { apiErrorContext, userFacingError } from '@/utils/userFacingError';

const TOKEN_KEY = 'zemen-session-token';
const API_URL = process.env.EXPO_PUBLIC_APPS_SCRIPT_URL?.trim() ?? '';
const readCache = new ReadRequestCache();
let memoryToken: string | null | undefined;

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

async function sessionToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return memoryToken;
}

async function request<T>(action: string, body?: Record<string, unknown>, timeoutMs = 15_000): Promise<T> {
  if (!API_URL || API_URL.includes('REPLACE_ME')) {
    throw new Error('The Apps Script backend has not been configured yet.');
  }

  const token = await sessionToken();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = body !== undefined || Boolean(token)
      ? await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ ...(body ?? {}), action, token }),
          signal: controller.signal,
        })
      : await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
          signal: controller.signal,
        });

    if (!response.ok) throw new Error(`Server returned ${response.status}.`);
    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!payload.ok) throw new Error(payload.error || 'The request could not be completed.');
    return payload.data;
  } catch (error) {
    throw new Error(userFacingError(error, apiErrorContext(action)));
  } finally {
    clearTimeout(timeout);
    if (__DEV__) console.info(`[api] ${action} completed in ${Date.now() - startedAt}ms`);
  }
}

function readRequest<T>(
  action: string,
  body: Record<string, unknown>,
  ttlMs: number,
  force = false,
  timeoutMs = 15_000,
): Promise<T> {
  const key = stableRequestKey(action, body);
  return readCache.run(key, ttlMs, () => request<T>(action, body, timeoutMs), force);
}

interface AuthResult {
  token: string;
  user: User;
  preferences?: Preferences;
  devicePolicy?: DevicePolicyObservation;
}

async function storeAuth(result: AuthResult): Promise<AuthResult> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  } catch {
    memoryToken = null;
    throw new Error('SESSION-SAVE: Your account was created, but this phone could not securely save the sign-in session. Restart the phone, then sign in with the same email and password.');
  }
  memoryToken = result.token;
  readCache.clear();
  return result;
}

export const api = {
  isConfigured: Boolean(API_URL && !API_URL.includes('REPLACE_ME')),

  async login(email: string, password: string, device: DeviceRegistrationIdentity): Promise<AuthResult> {
    return storeAuth(await request<AuthResult>('login', { email, password, ...device }));
  },

  async signup(name: string, email: string, password: string, phone: string, device: DeviceRegistrationIdentity): Promise<AuthResult> {
    return storeAuth(await request<AuthResult>('signup', { name, email, password, phone, ...device }));
  },

  requestPasswordReset(email: string): Promise<{ accepted: true; message: string }> {
    return request('requestPasswordReset', { email }, 25_000);
  },

  confirmPasswordReset(email: string, code: string, newPassword: string): Promise<{ reset: true }> {
    return request('confirmPasswordReset', { email, code, newPassword }, 20_000);
  },

  premiumStatus(): Promise<PremiumEntitlement> {
    return request('premiumStatus', {});
  },

  premiumOverview(includeEntitlement: boolean, includeCommerce: boolean): Promise<PremiumOverview> {
    return request('premiumOverview', { includeEntitlement, includeCommerce });
  },

  createPremiumRequest(input: PremiumRequestInput): Promise<{ request: PremiumRequest }> {
    return request('createPremiumRequest', { ...input });
  },

  cancelPremiumRequest(requestId: string): Promise<{ request: PremiumRequest }> {
    return request('cancelPremiumRequest', { requestId });
  },

  registerDevice(identity: DeviceRegistrationIdentity): Promise<{
    registered: boolean;
    id: string;
    policy: DevicePolicyObservation;
  }> {
    return request('registerDevice', { ...identity });
  },

  replaceDevice(identity: DeviceRegistrationIdentity): Promise<{
    replaced: true;
    id: string;
    policy: DevicePolicyObservation;
  }> {
    return request('replaceDevice', { ...identity });
  },

  async logout(expoPushToken?: string | null): Promise<void> {
    const token = await sessionToken();
    try {
      if (token && API_URL) await request('logout', expoPushToken ? { expoPushToken } : {}).catch(() => undefined);
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      memoryToken = null;
      readCache.clear();
    }
  },

  updateProfile(preferences: Preferences): Promise<{ updated: true }> {
    return request('updateProfile', { preferences });
  },

  registerPushToken(
    expoPushToken: string,
    platform: 'android' | 'ios',
    installationId: string,
  ): Promise<{ registered: true; id: string }> {
    return request('registerPushToken', { expoPushToken, platform, installationId });
  },

  unregisterPushToken(expoPushToken: string): Promise<{ unregistered: boolean }> {
    return request('unregisterPushToken', { expoPushToken });
  },

  catalog(grade: Grade, stream?: Stream, since?: string, force = false): Promise<CatalogCache & { announcements: Announcement[] }> {
    return readRequest('catalog', { grade, stream, since }, 30_000, force, 30_000);
  },

  announcements(grade: Grade, stream?: Stream, force = false): Promise<{ announcements: Announcement[] }> {
    return readRequest('announcements', { grade, stream }, 30_000, force);
  },

  questions(unitId: string, subjectId: string, version?: number): Promise<{ questions: Question[] }> {
    return readRequest('questions', { unitId, subjectId, version }, 5 * 60_000, false, 30_000);
  },

  paper(paperId: string, version?: number): Promise<{ paper: PastPaper; questions: Question[] }> {
    return readRequest('paper', { paperId, version }, 5 * 60_000);
  },

  notes(grade: Grade, stream?: Stream, force = false): Promise<{ notes: StudyNote[] }> {
    return readRequest('notes', { grade, stream }, 5 * 60_000, force, 30_000);
  },

  note(noteId: string, version?: number): Promise<{ note: StudyNote }> {
    return readRequest('note', { noteId, version }, 10 * 60_000, false, 30_000);
  },

  syncAttempts(attempts: QuizAttempt[]): Promise<{ syncedIds: string[] }> {
    return request('syncAttempts', { attempts });
  },

  attempts(force = false): Promise<{ attempts: QuizAttempt[] }> {
    return readRequest('attempts', {}, 30_000, force);
  },

  studyPlan(force = false): Promise<{ plan: StudyPlan | null; updatedAt: string | null }> {
    return readRequest('studyPlan', {}, 15_000, force);
  },

  syncStudyPlan(plan: StudyPlan): Promise<{ plan: StudyPlan; updatedAt: string; accepted: boolean }> {
    return request('syncStudyPlan', { plan });
  },

  syncQuestionReports(reports: QuestionReport[]): Promise<{ reportedIds: string[] }> {
    return request('reportQuestions', { reports });
  },
};

export type ProfileSetup = {
  grade: Grade;
  stream?: Stream;
  language: Language;
  reminderTime: string;
};
