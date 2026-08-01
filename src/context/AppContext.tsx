import NetInfo from '@react-native-community/netinfo';
import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, InteractionManager, Platform } from 'react-native';

import { translate, type TranslationKey } from '@/data/translations';
import { api, type ProfileSetup } from '@/services/api';
import {
  cancelZemenNotifications,
  forgetRegisteredPushToken,
  getExpoPushTokenForDevice,
  getNotificationPermissionState,
  presentAnnouncementNotification,
  registeredPushToken,
  rememberRegisteredPushToken,
  scheduleDailyReminder,
} from '@/services/notifications';
import { defaultState, loadState, saveState, utf8ByteLength } from '@/services/storage';
import { normalizeDailyQuizGoal } from '@/utils/studyGoal';
import type {
  AnswerIndex,
  Announcement,
  DevicePolicyObservation,
  Language,
  PaperDownload,
  PastPaper,
  PersistedState,
  Preferences,
  PremiumPlan,
  PremiumPaymentMethod,
  PremiumRequest,
  PremiumRequestInput,
  Question,
  QuestionReportCategory,
  QuizAttempt,
  QuizMode,
  Stream,
  Subject,
  ThemePreference,
  Unit,
  UnitDownload,
} from '@/types';
import { deviceRegistrationIdentity } from '@/services/deviceRegistration';
import {
  clearPremiumOfflineLease,
  readPremiumOfflineLease,
  writePremiumOfflineLease,
} from '@/services/premiumLease';
import { deviceRegistrationIsFresh } from '@/utils/devicePolicy';
import { applyPremiumEntitlement } from '@/utils/premium';
import { createPremiumOfflineLease, premiumClaimNeedsVerification } from '@/utils/premiumLease';
import { createQuestionReport } from '@/utils/questionReports';
import { canAccessPaper, canAccessUnit } from '@/utils/access';
import { userFacingError } from '@/utils/userFacingError';
import { mergeSyncedAttempts } from '@/utils/attemptSync';
import {
  announcementRefreshDelay,
  announcementsEqual,
  createWelcomeAnnouncement,
  findNewAnnouncements,
  mergeKnownAnnouncementIds,
  personalAnnouncementsFor,
  sortAnnouncements,
} from '@/utils/announcements';

interface RecordAttemptInput {
  unitId: string;
  mode: QuizMode;
  questions: QuizAttempt['questions'];
  answers: Array<AnswerIndex | null>;
  startedAt: string;
  durationSeconds: number;
  endReason: QuizAttempt['endReason'];
}

interface ReportQuestionInput {
  question: Question;
  mode: QuizMode;
  category: QuestionReportCategory;
  note?: string;
  questionNumber: number;
  selectedAnswer: AnswerIndex | null;
}

interface AppContextValue {
  state: PersistedState;
  hydrated: boolean;
  announcementNotice: Announcement | null;
  announcementSyncing: boolean;
  announcementSyncError: string | null;
  lastAnnouncementSyncAt: string | null;
  premiumPlans: PremiumPlan[];
  premiumPaymentMethods: PremiumPaymentMethod[];
  premiumRequest: PremiumRequest | null;
  devicePolicyObservation: DevicePolicyObservation | null;
  subjects: Subject[];
  unitsForSubject: (subjectId: string) => Unit[];
  t: (key: TranslationKey) => string;
  markIntroSeen: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  continueAsGuest: () => void;
  startAuthentication: () => void;
  completeProfile: (setup: ProfileSetup) => Promise<void>;
  updateTheme: (theme: ThemePreference) => void;
  updateLanguage: (language: Language) => void;
  updateDailyQuizGoal: (goal: number) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  rememberLearningPosition: (subjectId: string, unitId?: string) => void;
  logout: () => Promise<void>;
  isUnitUnlocked: (unit: Unit) => boolean;
  questionsForUnit: (unitId: string) => Question[];
  prepareOnlineQuiz: (unitId: string) => Promise<void>;
  downloadUnit: (unitId: string) => Promise<void>;
  deleteUnitDownload: (unitId: string) => void;
  downloadPaper: (paperId: string) => Promise<void>;
  deletePaperDownload: (paperId: string) => void;
  recordAttempt: (input: RecordAttemptInput) => string;
  reportQuestion: (input: ReportQuestionInput) => Promise<'sent' | 'queued'>;
  refreshCatalog: (force?: boolean) => Promise<void>;
  refreshAnnouncements: () => Promise<void>;
  refreshPremium: () => Promise<void>;
  submitPremiumRequest: (input: PremiumRequestInput) => Promise<PremiumRequest>;
  cancelPremiumRequest: () => Promise<PremiumRequest>;
  syncDeviceObservation: (force?: boolean) => Promise<void>;
  replaceCurrentDevice: () => Promise<DevicePolicyObservation>;
  markAnnouncementsRead: (ids: string[]) => void;
  dismissAnnouncementNotice: () => void;
  dismissWelcomeAnimation: () => void;
  syncPushRegistration: () => Promise<boolean>;
  storageBytes: number;
}

const AppContext = createContext<AppContextValue | null>(null);

function shallowRecordEqual<T extends { id: string }>(left: T, right: T): boolean {
  const leftKeys = Object.keys(left) as Array<keyof T>;
  const rightKeys = Object.keys(right) as Array<keyof T>;
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => left[key] === right[key]);
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  let changed = false;
  incoming.forEach((item) => {
    const current = map.get(item.id);
    if (!current) {
      changed = true;
      map.set(item.id, item);
    } else if (!shallowRecordEqual(current, item)) {
      changed = true;
      map.set(item.id, item);
    }
  });
  if (!changed) return existing;
  return [...map.values()];
}

function recordArraysEqual<T extends { id: string }>(left: T[], right: T[]): boolean {
  return left.length === right.length
    && left.every((item, index) => {
      const other = right[index];
      return Boolean(other && item.id === other.id && shallowRecordEqual(item, other));
    });
}

const CATALOG_REFRESH_INTERVAL_MS = 2 * 60_000;
const PREMIUM_REFRESH_INTERVAL_MS = 5 * 60_000;
const PROGRESS_REFRESH_INTERVAL_MS = 2 * 60_000;
const DEVICE_OBSERVATION_INTERVAL_MS = 12 * 60 * 60_000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(defaultState);
  const [onlineQuestions, setOnlineQuestions] = useState<Record<string, Question[]>>({});
  const [hydrated, setHydrated] = useState(false);
  const [announcementNotice, setAnnouncementNotice] = useState<Announcement | null>(null);
  const [announcementSyncing, setAnnouncementSyncing] = useState(false);
  const [announcementSyncError, setAnnouncementSyncError] = useState<string | null>(null);
  const [lastAnnouncementSyncAt, setLastAnnouncementSyncAt] = useState<string | null>(null);
  const syncInProgress = useRef(false);
  const pushRegistrationInProgress = useRef(false);
  const announcementRefreshPromise = useRef<Promise<void> | null>(null);
  const catalogRefreshPromise = useRef<Promise<void> | null>(null);
  const premiumRefreshPromise = useRef<Promise<void> | null>(null);
  const deviceObservationPromise = useRef<Promise<void> | null>(null);
  const catalogRefreshDispatcher = useRef<((preferences: Preferences, force?: boolean) => Promise<void>) | null>(null);
  const catalogLastSuccessfulAt = useRef<string | undefined>(defaultState.lastCatalogSync);
  const announcementIds = useRef(new Set(defaultState.knownAnnouncementIds));
  const persistedState = useRef<PersistedState | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const loaded = await loadState();
      let restored = loaded;
      if (loaded.user && !loaded.user.isGuest) {
        const leaseResult = await readPremiumOfflineLease(loaded.user.id).catch(() => ({
          valid: false as const,
          reason: 'missing' as const,
          lease: undefined,
        }));
        if (leaseResult.valid) {
          restored = {
            ...loaded,
            user: applyPremiumEntitlement(loaded.user, leaseResult.lease.entitlement),
            premiumOfflineAccessUntil: leaseResult.lease.accessUntil,
            premiumVerificationRequired: false,
          };
        } else {
          const leaseEntitlement = leaseResult.lease?.userId === loaded.user.id
            ? leaseResult.lease.entitlement
            : null;
          const claimedUser = leaseEntitlement
            ? applyPremiumEntitlement(loaded.user, leaseEntitlement)
            : loaded.user;
          const subscriptionExpired = leaseResult.reason === 'subscription-expired';
          restored = {
            ...loaded,
            user: {
              ...claimedUser,
              isPremium: false,
              premiumStatus: subscriptionExpired ? 'expired' : claimedUser.premiumStatus,
            },
            premiumOfflineAccessUntil: undefined,
            premiumVerificationRequired: !subscriptionExpired && premiumClaimNeedsVerification({
              isPremium: claimedUser.isPremium,
              status: claimedUser.premiumStatus ?? (claimedUser.isPremium ? 'active' : 'free'),
              until: claimedUser.premiumUntil ?? null,
            }),
          };
        }
      }
      if (!active) return;
      persistedState.current = restored;
      catalogLastSuccessfulAt.current = restored.lastCatalogSync;
      announcementIds.current = new Set([
        ...restored.knownAnnouncementIds,
        ...restored.announcements.map((item) => item.id),
      ]);
      setState(restored);
    })().finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated || state === persistedState.current) return undefined;

    // Large offline question sets are expensive to stringify on lower-powered
    // phones. Let the current gesture/navigation finish before persisting.
    const snapshot = state;
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;
    const timer = setTimeout(() => {
      interactionTask = InteractionManager.runAfterInteractions(() => {
        void saveState(snapshot).then(() => {
          persistedState.current = snapshot;
        }).catch(() => undefined);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      interactionTask?.cancel();
    };
  }, [hydrated, state]);

  useEffect(() => {
    state.knownAnnouncementIds.forEach((id) => announcementIds.current.add(id));
    state.announcements.forEach((item) => announcementIds.current.add(item.id));
  }, [state.announcements, state.knownAnnouncementIds]);

  const refreshAnnouncementsFor = useCallback(async (
    preferences: Preferences,
    force = false,
    visible = false,
  ) => {
    if (!api.isConfigured) return;
    if (announcementRefreshPromise.current) {
      await announcementRefreshPromise.current;
      return;
    }

    if (visible) setAnnouncementSyncing(true);
    const refresh = (async () => {
      const remoteAnnouncements = sortAnnouncements(
        (await api.announcements(preferences.grade, preferences.stream, force)).announcements,
      );
      const newItems = findNewAnnouncements(remoteAnnouncements, announcementIds.current);
      if (newItems.length) {
        void catalogRefreshDispatcher.current?.(preferences, true).catch(() => undefined);
      }
      remoteAnnouncements.forEach((item) => announcementIds.current.add(item.id));
      setState((current) => {
        const incoming = sortAnnouncements([
          ...remoteAnnouncements,
          ...personalAnnouncementsFor(current.announcements, current.user?.id),
        ]);
        const knownAnnouncementIds = mergeKnownAnnouncementIds(current.knownAnnouncementIds, incoming);
        const knownUnchanged = knownAnnouncementIds.length === current.knownAnnouncementIds.length
          && knownAnnouncementIds.every((id, index) => id === current.knownAnnouncementIds[index]);
        if (knownUnchanged && announcementsEqual(current.announcements, incoming)) return current;
        return { ...current, announcements: incoming, knownAnnouncementIds };
      });
      const newest = newItems[0];
      if (hydrated && newest && preferences.notificationsEnabled !== false) {
        void registeredPushToken()
          .then((remoteToken) => {
            if (remoteToken) {
              setAnnouncementNotice(newest);
              return true;
            }
            return presentAnnouncementNotification(newest);
          })
          .then((presented) => { if (!presented) setAnnouncementNotice(newest); })
          .catch(() => setAnnouncementNotice(newest));
      }
      if (visible) {
        setLastAnnouncementSyncAt(new Date().toISOString());
        setAnnouncementSyncError(null);
      }
    })();
    announcementRefreshPromise.current = refresh;
    try {
      await refresh;
    } catch (error) {
      if (visible) {
        setAnnouncementSyncError(userFacingError(error, 'announcements'));
      }
      throw error;
    } finally {
      if (announcementRefreshPromise.current === refresh) announcementRefreshPromise.current = null;
      if (visible) setAnnouncementSyncing(false);
    }
  }, [hydrated]);

  const sync = useCallback(async () => {
    if (!api.isConfigured || syncInProgress.current) return;
    syncInProgress.current = true;
    try {
      if (state.user && !state.user.isGuest) {
        const requestedUserId = state.user.id;
        const pending = state.attempts.filter((attempt) => !attempt.synced);
        if (pending.length) {
          try {
            const { syncedIds } = await api.syncAttempts(pending);
            setState((current) => ({
              ...current,
              attempts: current.attempts.map((attempt) => (
                syncedIds.includes(attempt.id) ? { ...attempt, synced: true } : attempt
              )),
            }));
          } catch {
            // Attempts remain queued while report delivery can still continue.
          }
        }
        try {
          const { attempts } = await api.attempts(true);
          setState((current) => {
            if (!current.user || current.user.isGuest || current.user.id !== requestedUserId) return current;
            const mergedAttempts = mergeSyncedAttempts(current.attempts, attempts);
            const newest = mergedAttempts[0];
            const newestUnit = newest
              ? current.catalog.units.find((unit) => unit.id === newest.unitId)
              : undefined;
            const lastViewedUnitId = current.lastViewedUnitId ?? newest?.unitId;
            const lastViewedSubjectId = current.lastViewedSubjectId ?? newestUnit?.subjectId;
            if (
              mergedAttempts === current.attempts
              && lastViewedUnitId === current.lastViewedUnitId
              && lastViewedSubjectId === current.lastViewedSubjectId
            ) return current;
            return {
              ...current,
              attempts: mergedAttempts,
              lastViewedUnitId,
              lastViewedSubjectId,
            };
          });
        } catch {
          // Local progress remains available and cloud history will retry later.
        }
      }

      const pendingReports = state.pendingQuestionReports.slice(0, 25);
      if (pendingReports.length) {
        try {
          const { reportedIds } = await api.syncQuestionReports(pendingReports);
          setState((current) => ({
            ...current,
            pendingQuestionReports: current.pendingQuestionReports.filter((report) => !reportedIds.includes(report.id)),
          }));
        } catch {
          // Reports stay queued and will be retried when connectivity returns.
        }
      }
    } finally {
      syncInProgress.current = false;
    }
  }, [state.attempts, state.pendingQuestionReports, state.user?.id, state.user?.isGuest]);

  const registerPushDevice = useCallback(async (overridePreference = false): Promise<boolean> => {
    if (
      !api.isConfigured
      || !hydrated
      || !state.user
      || state.user.isGuest
      || !state.profileReady
      || (!overridePreference && state.preferences.notificationsEnabled === false)
      || pushRegistrationInProgress.current
      || (Platform.OS !== 'android' && Platform.OS !== 'ios')
    ) return false;
    pushRegistrationInProgress.current = true;
    try {
      const permission = await getNotificationPermissionState();
      const previousToken = await registeredPushToken();
      if (permission !== 'granted') {
        if (permission === 'denied' && previousToken) {
          await api.unregisterPushToken(previousToken).catch(() => undefined);
          await forgetRegisteredPushToken();
        }
        return false;
      }
      const nextToken = await getExpoPushTokenForDevice();
      if (!nextToken) return false;
      await api.registerPushToken(nextToken, Platform.OS);
      await rememberRegisteredPushToken(nextToken);
      if (previousToken && previousToken !== nextToken) {
        await api.unregisterPushToken(previousToken).catch(() => undefined);
      }
      return true;
    } catch (error) {
      if (__DEV__) console.warn('[notifications] Remote push registration failed.', error);
      return false;
    } finally {
      pushRegistrationInProgress.current = false;
    }
  }, [hydrated, state.preferences.notificationsEnabled, state.profileReady, state.user]);

  useEffect(() => NetInfo.addEventListener((network) => {
    if (!network.isConnected) return;
    void sync();
    void registerPushDevice();
    if (hydrated && state.user && state.profileReady) {
      void refreshAnnouncementsFor(state.preferences, true).catch(() => undefined);
    }
  }), [hydrated, refreshAnnouncementsFor, registerPushDevice, state.preferences, state.profileReady, state.user, sync]);

  useEffect(() => {
    if (!hydrated || !state.user || state.user.isGuest || !api.isConfigured) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;

    const run = () => {
      if (!cancelled && AppState.currentState === 'active') void sync();
    };
    const queue = (delay = 0) => {
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      interactionTask = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(run, delay);
      });
    };

    queue(500);
    const interval = setInterval(run, PROGRESS_REFRESH_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') queue(250);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [hydrated, state.user?.id, state.user?.isGuest, sync]);

  useEffect(() => {
    if (!hydrated || !state.user || state.user.isGuest || !state.profileReady) return undefined;
    void registerPushDevice();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void registerPushDevice();
    });
    return () => subscription.remove();
  }, [hydrated, registerPushDevice, state.profileReady, state.user]);

  useEffect(() => {
    if (!hydrated || !state.user || !state.profileReady) return undefined;
    let cancelled = false;
    let running = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delay: number) => {
      if (timer) clearTimeout(timer);
      if (!cancelled) timer = setTimeout(() => void run(), delay);
    };
    const run = async () => {
      if (cancelled || running) return;
      if (AppState.currentState !== 'active') {
        schedule(announcementRefreshDelay(0));
        return;
      }
      running = true;
      try {
        await refreshAnnouncementsFor(state.preferences, true);
        failures = 0;
      } catch {
        failures += 1;
      } finally {
        running = false;
        if (!cancelled) schedule(announcementRefreshDelay(failures));
      }
    };
    const refreshNow = () => {
      if (timer) clearTimeout(timer);
      if (!running) void run();
    };

    refreshNow();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshNow();
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [hydrated, refreshAnnouncementsFor, state.preferences, state.profileReady, state.user]);

  const refreshPremium = useCallback(async () => {
    if (!api.isConfigured || !state.user) return;
    if (premiumRefreshPromise.current) {
      await premiumRefreshPromise.current;
      return;
    }

    const requestedUserId = state.user.id;
    const includeEntitlement = !state.user.isGuest;
    const refresh = (async () => {
      const overview = await api.premiumOverview(includeEntitlement);
      const offlineLease = overview.entitlement && includeEntitlement
        ? createPremiumOfflineLease(requestedUserId, overview.entitlement, overview.refreshedAt)
        : null;
      if (overview.entitlement && includeEntitlement) {
        if (offlineLease) await writePremiumOfflineLease(offlineLease).catch(() => undefined);
        else await clearPremiumOfflineLease().catch(() => undefined);
      }
      startTransition(() => {
        setState((current) => {
          const plans = recordArraysEqual(current.premiumPlans, overview.plans)
            ? current.premiumPlans
            : overview.plans;
          const paymentMethods = recordArraysEqual(current.premiumPaymentMethods, overview.paymentMethods)
            ? current.premiumPaymentMethods
            : overview.paymentMethods;
          const incomingRequest = overview.request ?? undefined;
          const requestUnchanged = (!current.premiumRequest && !incomingRequest)
            || Boolean(
              current.premiumRequest
              && incomingRequest
              && shallowRecordEqual(current.premiumRequest, incomingRequest),
            );
          const premiumRequest = requestUnchanged ? current.premiumRequest : incomingRequest;
          const canApplyEntitlement = Boolean(
            overview.entitlement
            && current.user
            && !current.user.isGuest
            && current.user.id === requestedUserId,
          );
          const user = canApplyEntitlement && current.user && overview.entitlement
            ? applyPremiumEntitlement(current.user, overview.entitlement)
            : current.user;
          if (
            plans === current.premiumPlans
            && paymentMethods === current.premiumPaymentMethods
            && premiumRequest === current.premiumRequest
            && user === current.user
            && current.lastPremiumSync === overview.refreshedAt
            && current.premiumOfflineAccessUntil === offlineLease?.accessUntil
            && !current.premiumVerificationRequired
          ) return current;
          return {
            ...current,
            user,
            premiumPlans: plans,
            premiumPaymentMethods: paymentMethods,
            premiumRequest,
            lastPremiumSync: overview.refreshedAt,
            premiumOfflineAccessUntil: canApplyEntitlement ? offlineLease?.accessUntil : current.premiumOfflineAccessUntil,
            premiumVerificationRequired: canApplyEntitlement ? false : current.premiumVerificationRequired,
          };
        });
      });
    })();
    premiumRefreshPromise.current = refresh;
    try {
      await refresh;
    } finally {
      if (premiumRefreshPromise.current === refresh) premiumRefreshPromise.current = null;
    }
  }, [state.user?.id, state.user?.isGuest]);

  useEffect(() => {
    if (!hydrated || !state.user || !api.isConfigured) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;

    const run = () => {
      if (!cancelled && AppState.currentState === 'active') {
        void refreshPremium().catch(() => undefined);
      }
    };
    const queue = (delay = 0) => {
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      interactionTask = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(run, delay);
      });
    };

    queue(800);
    const interval = setInterval(run, PREMIUM_REFRESH_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') queue(300);
    });
    const networkSubscription = NetInfo.addEventListener((network) => {
      if (network.isConnected) queue(300);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      clearInterval(interval);
      appStateSubscription.remove();
      networkSubscription();
    };
  }, [hydrated, refreshPremium, state.user?.id]);

  useEffect(() => {
    if (!hydrated || !state.user || state.user.isGuest || !state.user.isPremium) return undefined;

    const enforceLease = async () => {
      const userId = state.user?.id;
      if (!userId) return;
      const result = await readPremiumOfflineLease(userId).catch(() => ({
        valid: false as const,
        reason: 'missing' as const,
      }));
      if (result.valid) return;
      setState((current) => {
        if (!current.user || current.user.id !== userId || !current.user.isPremium) return current;
        const until = current.user.premiumUntil ? new Date(current.user.premiumUntil).getTime() : Number.NaN;
        const subscriptionExpired = Number.isFinite(until) && until <= Date.now();
        return {
          ...current,
          user: {
            ...current.user,
            isPremium: false,
            premiumStatus: subscriptionExpired ? 'expired' : current.user.premiumStatus,
          },
          premiumOfflineAccessUntil: undefined,
          premiumVerificationRequired: !subscriptionExpired,
        };
      });
    };

    const accessUntil = state.premiumOfflineAccessUntil
      ? new Date(state.premiumOfflineAccessUntil).getTime()
      : Number.NaN;
    const delay = Number.isFinite(accessUntil) ? Math.max(0, accessUntil - Date.now() + 25) : 0;
    const timer = setTimeout(() => { void enforceLease(); }, delay);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void enforceLease();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [hydrated, state.premiumOfflineAccessUntil, state.user?.id, state.user?.isGuest, state.user?.isPremium]);

  const syncDeviceObservation = useCallback(async (force = false) => {
    if (!api.isConfigured || !state.user || state.user.isGuest) return;
    if (!force && deviceRegistrationIsFresh(
      state.lastDeviceRegistrationAt,
      state.lastDeviceRegistrationUserId,
      state.user.id,
    )) return;
    if (deviceObservationPromise.current) {
      await deviceObservationPromise.current;
      return;
    }

    const requestedUserId = state.user.id;
    const syncRequest = (async () => {
      const identity = await deviceRegistrationIdentity();
      if (!identity) return;
      const result = await api.registerDevice(identity);
      setState((current) => {
        if (!current.user || current.user.isGuest || current.user.id !== requestedUserId) return current;
        return {
          ...current,
          devicePolicyObservation: result.policy,
          lastDeviceRegistrationAt: result.policy.observedAt,
          lastDeviceRegistrationUserId: requestedUserId,
        };
      });
    })();
    deviceObservationPromise.current = syncRequest;
    try {
      await syncRequest;
    } finally {
      if (deviceObservationPromise.current === syncRequest) deviceObservationPromise.current = null;
    }
  }, [
    state.lastDeviceRegistrationAt,
    state.lastDeviceRegistrationUserId,
    state.user?.id,
    state.user?.isGuest,
  ]);

  const replaceCurrentDevice = useCallback(async (): Promise<DevicePolicyObservation> => {
    if (!state.user || state.user.isGuest) throw new Error('Sign in before replacing a device.');
    const requestedUserId = state.user.id;
    const identity = await deviceRegistrationIdentity();
    if (!identity) throw new Error('Device identification is unavailable on this platform.');
    const result = await api.replaceDevice(identity);
    setState((current) => {
      if (!current.user || current.user.id !== requestedUserId) return current;
      return {
        ...current,
        devicePolicyObservation: result.policy,
        lastDeviceRegistrationAt: result.policy.observedAt,
        lastDeviceRegistrationUserId: requestedUserId,
      };
    });
    return result.policy;
  }, [state.user?.id, state.user?.isGuest]);

  useEffect(() => {
    if (!hydrated || !state.user || state.user.isGuest || !api.isConfigured) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;

    const run = () => {
      if (!cancelled && AppState.currentState === 'active') {
        void syncDeviceObservation().catch(() => undefined);
      }
    };
    const queue = (delay = 0) => {
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      interactionTask = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(run, delay);
      });
    };

    queue(1_000);
    const interval = setInterval(run, DEVICE_OBSERVATION_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') queue(500);
    });
    const networkSubscription = NetInfo.addEventListener((network) => {
      if (network.isConnected) queue(500);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      clearInterval(interval);
      appStateSubscription.remove();
      networkSubscription();
    };
  }, [hydrated, state.user?.id, state.user?.isGuest, syncDeviceObservation]);

  const submitPremiumRequest = useCallback(async (input: PremiumRequestInput): Promise<PremiumRequest> => {
    if (!state.user || state.user.isGuest) throw new Error('Sign in before submitting a premium request.');
    const result = await api.createPremiumRequest(input);
    setState((current) => ({ ...current, premiumRequest: result.request }));
    return result.request;
  }, [state.user?.id, state.user?.isGuest]);

  const cancelPremiumRequest = useCallback(async (): Promise<PremiumRequest> => {
    if (!state.premiumRequest) throw new Error('There is no payment request to cancel.');
    const result = await api.cancelPremiumRequest(state.premiumRequest.id);
    setState((current) => ({ ...current, premiumRequest: result.request }));
    return result.request;
  }, [state.premiumRequest?.id]);

  const subjects = useMemo(() => state.catalog.subjects
    .filter((subject) => subject.grade === state.preferences.grade)
    .filter((subject) => state.preferences.grade < 11 || subject.stream === state.preferences.stream)
    .sort((a, b) => a.order - b.order), [state.catalog.subjects, state.preferences.grade, state.preferences.stream]);

  const unitsForSubject = useCallback((id: string) => state.catalog.units
    .filter((unit) => unit.subjectId === id)
    .sort((a, b) => a.number - b.number), [state.catalog.units]);

  const refreshAnnouncements = useCallback(
    () => refreshAnnouncementsFor(state.preferences, true, true),
    [refreshAnnouncementsFor, state.preferences.grade, state.preferences.stream],
  );

  const refreshCatalogFor = useCallback(async (preferences: Preferences, force = false) => {
    if (!api.isConfigured) return;
    const lastSuccessfulAt = catalogLastSuccessfulAt.current;
    const lastSuccessfulMs = lastSuccessfulAt ? new Date(lastSuccessfulAt).getTime() : 0;
    if (!force && lastSuccessfulMs && Date.now() - lastSuccessfulMs < CATALOG_REFRESH_INTERVAL_MS) return;
    if (catalogRefreshPromise.current) {
      await catalogRefreshPromise.current;
      return;
    }

    const refresh = (async () => {
      const incoming = await api.catalog(
        preferences.grade,
        preferences.stream,
        lastSuccessfulAt,
        force,
      );
      const completedAt = new Date().toISOString();
      catalogLastSuccessfulAt.current = completedAt;
      startTransition(() => {
        setState((current) => {
          const subjects = mergeById(current.catalog.subjects, incoming.subjects);
          const units = mergeById(current.catalog.units, incoming.units);
          const pastPapers = mergeById(current.catalog.pastPapers, incoming.pastPapers);
          const mergedAnnouncements = mergeById(current.announcements, incoming.announcements);
          const announcements = mergedAnnouncements === current.announcements
            ? current.announcements
            : sortAnnouncements(mergedAnnouncements);
          const changed = subjects !== current.catalog.subjects
            || units !== current.catalog.units
            || pastPapers !== current.catalog.pastPapers
            || announcements !== current.announcements;
          if (!changed) return current;
          return {
            ...current,
            catalog: { subjects, units, pastPapers },
            announcements,
            lastCatalogSync: completedAt,
          };
        });
      });
    })();
    catalogRefreshPromise.current = refresh;
    try {
      await refresh;
    } finally {
      if (catalogRefreshPromise.current === refresh) catalogRefreshPromise.current = null;
    }
  }, []);

  const refreshCatalog = useCallback(
    (force = false) => refreshCatalogFor(state.preferences, force),
    [refreshCatalogFor, state.preferences.grade, state.preferences.stream],
  );
  catalogRefreshDispatcher.current = refreshCatalogFor;

  useEffect(() => {
    if (!hydrated || !state.user || !state.profileReady || !api.isConfigured) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;

    const run = () => {
      if (!cancelled && AppState.currentState === 'active') {
        void refreshCatalog(false).catch(() => undefined);
      }
    };
    const queue = (delay = 0) => {
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      interactionTask = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(run, delay);
      });
    };

    queue(600);
    const interval = setInterval(run, CATALOG_REFRESH_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') queue(300);
    });
    const networkSubscription = NetInfo.addEventListener((network) => {
      if (network.isConnected) queue(300);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      interactionTask?.cancel();
      clearInterval(interval);
      appStateSubscription.remove();
      networkSubscription();
    };
  }, [hydrated, refreshCatalog, state.profileReady, state.user?.id]);

  const fetchUnitQuestions = useCallback(async (unitId: string): Promise<Question[]> => {
    const unit = state.catalog.units.find((item) => item.id === unitId);
    if (!unit) throw new Error('This unit is no longer available.');
    if (!canAccessUnit(state.user, unit)) throw new Error('Premium access is required for this unit.');
    if (!api.isConfigured) {
      throw new Error('Connect the Apps Script backend to take this quiz online.');
    }
    const questions = (await api.questions(unitId, unit.subjectId, unit.version)).questions;
    if (!questions.length) throw new Error('Questions have not been published for this unit yet.');
    return questions;
  }, [state.catalog.units, state.user?.isPremium]);

  const rememberLearningPosition = useCallback((subjectId: string, unitId?: string) => {
    setState((current) => {
      if (current.lastViewedSubjectId === subjectId && current.lastViewedUnitId === unitId) return current;
      return {
        ...current,
        lastViewedSubjectId: subjectId,
        lastViewedUnitId: unitId,
      };
    });
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    state,
    hydrated,
    announcementNotice,
    announcementSyncing,
    announcementSyncError,
    lastAnnouncementSyncAt,
    premiumPlans: state.premiumPlans,
    premiumPaymentMethods: state.premiumPaymentMethods,
    premiumRequest: state.premiumRequest ?? null,
    devicePolicyObservation: state.devicePolicyObservation ?? null,
    subjects,
    unitsForSubject,
    t: (key) => translate(state.preferences.language, key),
    markIntroSeen: () => setState((current) => ({ ...current, hasSeenIntro: true })),

    login: async (email, password) => {
      const identity = await deviceRegistrationIdentity();
      if (!identity) throw new Error('This device could not be identified securely.');
      const result = await api.login(email.trim().toLowerCase(), password, identity);
      const verifiedAt = new Date().toISOString();
      const loginLease = createPremiumOfflineLease(result.user.id, {
        isPremium: result.user.isPremium,
        status: result.user.premiumStatus ?? (result.user.isPremium ? 'active' : 'free'),
        planId: result.user.premiumPlanId ?? null,
        startedAt: result.user.premiumStartedAt ?? null,
        until: result.user.premiumUntil ?? null,
      }, verifiedAt);
      if (loginLease) await writePremiumOfflineLease(loginLease).catch(() => undefined);
      else await clearPremiumOfflineLease().catch(() => undefined);
      setState((current) => ({
        ...current,
        user: result.user,
        preferences: result.preferences ? { ...current.preferences, ...result.preferences } : current.preferences,
        profileReady: Boolean(result.preferences),
        announcements: current.announcements.filter((item) => item.kind !== 'welcome' || item.ownerUserId === result.user.id),
        pendingWelcomeUserId: undefined,
        premiumRequest: undefined,
        premiumOfflineAccessUntil: loginLease?.accessUntil,
        premiumVerificationRequired: false,
        devicePolicyObservation: result.devicePolicy,
        lastDeviceRegistrationAt: result.devicePolicy?.observedAt,
        lastDeviceRegistrationUserId: result.devicePolicy ? result.user.id : undefined,
        lastViewedSubjectId: undefined,
        lastViewedUnitId: undefined,
      }));
    },

    signup: async (name, email, password, phone = '') => {
      const identity = await deviceRegistrationIdentity();
      if (!identity) throw new Error('This device could not be identified securely.');
      const result = await api.signup(name.trim(), email.trim().toLowerCase(), password, phone.trim(), identity);
      await clearPremiumOfflineLease().catch(() => undefined);
      setState((current) => ({
        ...current,
        user: result.user,
        profileReady: false,
        announcements: current.announcements.filter((item) => item.kind !== 'welcome' && item.id !== 'welcome-v1'),
        readAnnouncementIds: current.readAnnouncementIds.filter((id) => id !== `welcome-${result.user.id}`),
        pendingWelcomeUserId: result.user.id,
        premiumRequest: undefined,
        premiumOfflineAccessUntil: undefined,
        premiumVerificationRequired: false,
        devicePolicyObservation: result.devicePolicy,
        lastDeviceRegistrationAt: result.devicePolicy?.observedAt,
        lastDeviceRegistrationUserId: result.devicePolicy ? result.user.id : undefined,
        lastViewedSubjectId: undefined,
        lastViewedUnitId: undefined,
      }));
    },

    continueAsGuest: () => {
      void clearPremiumOfflineLease().catch(() => undefined);
      setState((current) => ({
        ...current,
        user: {
          id: `guest-${Date.now()}`,
          name: 'Guest Student',
          isGuest: true,
          isPremium: false,
        },
        profileReady: current.profileReady,
        premiumRequest: undefined,
        premiumOfflineAccessUntil: undefined,
        premiumVerificationRequired: false,
        lastViewedSubjectId: undefined,
        lastViewedUnitId: undefined,
      }));
    },

    startAuthentication: () => {
      void clearPremiumOfflineLease().catch(() => undefined);
      setState((current) => ({
        ...current,
        user: null,
        premiumRequest: undefined,
        premiumOfflineAccessUntil: undefined,
        premiumVerificationRequired: false,
        lastViewedSubjectId: undefined,
        lastViewedUnitId: undefined,
      }));
    },

    completeProfile: async (setup) => {
      const preferences: Preferences = { ...state.preferences, ...setup };
      setState((current) => {
        if (!current.user || current.user.isGuest || current.pendingWelcomeUserId !== current.user.id) {
          return { ...current, preferences, profileReady: true };
        }
        const welcome = createWelcomeAnnouncement(current.user, preferences.grade);
        announcementIds.current.add(welcome.id);
        return {
          ...current,
          preferences,
          profileReady: true,
          announcements: sortAnnouncements([
            welcome,
            ...current.announcements.filter((item) => item.id !== welcome.id && item.kind !== 'welcome'),
          ]),
          knownAnnouncementIds: mergeKnownAnnouncementIds(current.knownAnnouncementIds, [welcome]),
        };
      });
      if (!state.user?.isGuest && api.isConfigured) {
        await api.updateProfile(preferences);
      }
      try {
        await refreshCatalogFor(preferences, true);
      } catch {
        // The bundled catalog remains available and a later connection will refresh it.
      }
    },

    updateTheme: (theme) => setState((current) => ({
      ...current,
      preferences: { ...current.preferences, theme },
    })),

    updateLanguage: (language) => setState((current) => ({
      ...current,
      preferences: { ...current.preferences, language },
    })),

    updateDailyQuizGoal: async (goal) => {
      const dailyQuizGoal = normalizeDailyQuizGoal(goal);
      const preferences: Preferences = { ...state.preferences, dailyQuizGoal };
      if (state.user && !state.user.isGuest && api.isConfigured) {
        await api.updateProfile(preferences);
      }
      setState((current) => ({
        ...current,
        preferences: { ...current.preferences, dailyQuizGoal },
      }));
    },

    setNotificationsEnabled: async (enabled) => {
      setState((current) => ({
        ...current,
        preferences: { ...current.preferences, notificationsEnabled: enabled },
      }));
      if (enabled) {
        await scheduleDailyReminder(state.preferences.reminderTime).catch(() => false);
        return registerPushDevice(true);
      }

      const previousToken = await registeredPushToken().catch(() => null);
      if (previousToken && state.user && !state.user.isGuest && api.isConfigured) {
        await api.unregisterPushToken(previousToken).catch(() => undefined);
      }
      await forgetRegisteredPushToken().catch(() => undefined);
      await cancelZemenNotifications().catch(() => undefined);
      return true;
    },

    rememberLearningPosition,

    logout: async () => {
      const pushToken = await registeredPushToken().catch(() => null);
      await api.logout(pushToken);
      await forgetRegisteredPushToken().catch(() => undefined);
      await clearPremiumOfflineLease().catch(() => undefined);
      setOnlineQuestions({});
      setState((current) => ({
        ...current,
        user: null,
        profileReady: false,
        attempts: [],
        announcements: current.announcements.filter((item) => item.kind !== 'welcome'),
        pendingWelcomeUserId: undefined,
        premiumRequest: undefined,
        premiumOfflineAccessUntil: undefined,
        premiumVerificationRequired: false,
        lastViewedSubjectId: undefined,
        lastViewedUnitId: undefined,
      }));
    },

    isUnitUnlocked: (unit) => canAccessUnit(state.user, unit),

    questionsForUnit: (unitId) => (
      state.unitDownloads.find((item) => item.unit.id === unitId)?.questions
      ?? onlineQuestions[unitId]
      ?? []
    ),

    prepareOnlineQuiz: async (unitId) => {
      if (state.unitDownloads.some((item) => item.unit.id === unitId) || onlineQuestions[unitId]?.length) return;
      const questions = await fetchUnitQuestions(unitId);
      setOnlineQuestions((current) => ({ ...current, [unitId]: questions }));
    },

    downloadUnit: async (unitId) => {
      const unit = state.catalog.units.find((item) => item.id === unitId);
      if (!unit) throw new Error('This unit is no longer available.');
      if (!canAccessUnit(state.user, unit)) throw new Error('Premium access is required to download this unit.');
      const subject = state.catalog.subjects.find((item) => item.id === unit.subjectId);
      if (!subject) throw new Error('The subject could not be found.');

      const questions = await fetchUnitQuestions(unitId);

      const base = { unit, subject, questions, downloadedAt: new Date().toISOString() };
      const download: UnitDownload = { ...base, byteSize: utf8ByteLength(base) };
      setState((current) => ({
        ...current,
        unitDownloads: [download, ...current.unitDownloads.filter((item) => item.unit.id !== unitId)],
      }));
    },

    deleteUnitDownload: (unitId) => setState((current) => ({
      ...current,
      unitDownloads: current.unitDownloads.filter((item) => item.unit.id !== unitId),
    })),

    downloadPaper: async (paperId) => {
      const cached = state.catalog.pastPapers.find((item) => item.id === paperId);
      if (!cached) throw new Error('This paper is no longer available.');
      if (!canAccessPaper(state.user, cached)) throw new Error('Premium access is required for this past paper.');
      let paper: PastPaper = cached;
      let content = cached.content ?? '';
      if (api.isConfigured) {
        try {
          const remote = await api.paper(paperId, cached.version);
          paper = remote.paper;
          content = remote.content;
        } catch (error) {
          if (!content) throw error;
        }
      }
      if (!content) throw new Error('This paper has not been published yet.');
      const base = { paper, content, downloadedAt: new Date().toISOString() };
      const download: PaperDownload = { ...base, byteSize: utf8ByteLength(base) };
      setState((current) => ({
        ...current,
        paperDownloads: [download, ...current.paperDownloads.filter((item) => item.paper.id !== paperId)],
      }));
    },

    deletePaperDownload: (paperId) => setState((current) => ({
      ...current,
      paperDownloads: current.paperDownloads.filter((item) => item.paper.id !== paperId),
    })),

    recordAttempt: (input) => {
      const id = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const attempt: QuizAttempt = {
        ...input,
        id,
        completedAt: new Date().toISOString(),
        synced: Boolean(state.user?.isGuest),
      };
      const attemptedUnit = state.catalog.units.find((unit) => unit.id === attempt.unitId);
      setState((current) => ({
        ...current,
        attempts: [attempt, ...current.attempts],
        lastViewedSubjectId: attemptedUnit?.subjectId ?? current.lastViewedSubjectId,
        lastViewedUnitId: attempt.unitId,
      }));
      if (!state.user?.isGuest && api.isConfigured) {
        setTimeout(() => {
          void api.syncAttempts([attempt]).then(({ syncedIds }) => {
            if (!syncedIds.includes(id)) return;
            setState((current) => ({
              ...current,
              attempts: current.attempts.map((item) => item.id === id ? { ...item, synced: true } : item),
            }));
          }).catch(() => undefined);
        }, 0);
      }
      return id;
    },

    reportQuestion: async (input) => {
      const unit = state.catalog.units.find((item) => item.id === input.question.unitId);
      const report = createQuestionReport({
        ...input,
        subjectId: unit?.subjectId ?? '',
        reporterId: state.user?.id ?? `guest-${Date.now()}`,
        isGuest: state.user?.isGuest ?? true,
      });

      setState((current) => ({
        ...current,
        pendingQuestionReports: [
          ...current.pendingQuestionReports.filter((item) => item.id !== report.id),
          report,
        ],
      }));

      if (!api.isConfigured) return 'queued';
      try {
        const { reportedIds } = await api.syncQuestionReports([report]);
        if (!reportedIds.includes(report.id)) return 'queued';
        setState((current) => ({
          ...current,
          pendingQuestionReports: current.pendingQuestionReports.filter((item) => item.id !== report.id),
        }));
        return 'sent';
      } catch {
        return 'queued';
      }
    },

    refreshCatalog,

    refreshAnnouncements,

    refreshPremium,

    submitPremiumRequest,

    cancelPremiumRequest,

    syncDeviceObservation,
    replaceCurrentDevice,

    markAnnouncementsRead: (ids) => setState((current) => {
      const read = new Set(current.readAnnouncementIds);
      ids.forEach((id) => read.add(id));
      if (read.size === current.readAnnouncementIds.length) return current;
      return { ...current, readAnnouncementIds: [...read] };
    }),

    dismissAnnouncementNotice: () => setAnnouncementNotice(null),

    dismissWelcomeAnimation: () => setState((current) => ({
      ...current,
      pendingWelcomeUserId: undefined,
    })),

    syncPushRegistration: () => registerPushDevice(true),

    storageBytes: state.unitDownloads.reduce((sum, item) => sum + item.byteSize, 0)
      + state.paperDownloads.reduce((sum, item) => sum + item.byteSize, 0),
  }), [announcementNotice, announcementSyncError, announcementSyncing, cancelPremiumRequest, fetchUnitQuestions, hydrated, lastAnnouncementSyncAt, onlineQuestions, refreshAnnouncements, refreshCatalog, refreshCatalogFor, refreshPremium, registerPushDevice, rememberLearningPosition, replaceCurrentDevice, state, subjects, submitPremiumRequest, sync, syncDeviceObservation, unitsForSubject]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider.');
  return context;
}
