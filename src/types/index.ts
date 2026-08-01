export type Grade = 9 | 10 | 11 | 12;
export type Stream = 'Natural' | 'Social';
export type Language = 'en' | 'am';
export type ThemePreference = 'light' | 'dark' | 'system';
export type QuizMode = 'instant' | 'exam';
export type AnswerIndex = 0 | 1 | 2 | 3;
export type PremiumStatus = 'free' | 'active' | 'expired' | 'legacy' | 'revoked' | 'cancelled';
export type DeviceCategory = 'phone' | 'tablet' | 'unknown';
export type MobilePlatform = 'android' | 'ios';
export type ContentAccessTier = 'free' | 'premium';

export interface PremiumEntitlement {
  isPremium: boolean;
  status: PremiumStatus;
  planId: string | null;
  startedAt: string | null;
  until: string | null;
}

export interface PremiumPlan {
  id: string;
  name: string;
  durationDays: number;
  priceEtb: number;
  badge: string | null;
  description: string | null;
  order: number;
}

export interface PremiumPaymentMethod {
  id: string;
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string | null;
  order: number;
}

export type PremiumRequestStatus = 'pending' | 'under-review' | 'approved' | 'rejected' | 'cancelled';

export interface PremiumRequest {
  id: string;
  requestCode: string;
  planId: string;
  amountEtb: number;
  durationDays: number;
  paymentMethodId: string;
  senderName: string;
  phone: string;
  transactionReference: string;
  paymentDate: string;
  note: string;
  status: PremiumRequestStatus;
  reviewNote: string;
  createdAt: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
}

export interface PremiumRequestInput {
  planId: string;
  paymentMethodId: string;
  senderName: string;
}

export interface PremiumOverview {
  plans: PremiumPlan[];
  paymentMethods: PremiumPaymentMethod[];
  entitlement: PremiumEntitlement | null;
  request: PremiumRequest | null;
  refreshedAt: string;
}

export interface DeviceRegistrationIdentity {
  installationId: string;
  deviceType: DeviceCategory;
  platform: MobilePlatform;
  deviceName: string;
}

export interface DevicePolicyObservation {
  phoneCount: number;
  tabletCount: number;
  unknownCount: number;
  allowedPhoneCount: 1;
  allowedTabletCount: 1;
  accountCountOnDevice: number;
  exceedsAccountDeviceLimit: boolean;
  sharedWithOtherAccounts: boolean;
  wouldExceedPolicy: boolean;
  accessAllowed: boolean;
  currentDeviceStatus: 'active' | 'blocked' | 'revoked';
  blockedReason: 'device-limit' | 'device-linked' | null;
  canReplace: boolean;
  replacementAvailableAt: string | null;
  conflictingDeviceName: string | null;
  conflictingLastSeenAt: string | null;
  currentDeviceName: string;
  currentDeviceType: DeviceCategory;
  observedAt: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isGuest: boolean;
  isPremium: boolean;
  premiumStatus?: PremiumStatus;
  premiumPlanId?: string | null;
  premiumStartedAt?: string | null;
  premiumUntil?: string | null;
}

export interface Preferences {
  grade: Grade;
  stream?: Stream;
  language: Language;
  theme: ThemePreference;
  reminderTime: string;
  dailyQuizGoal: number;
  notificationsEnabled: boolean;
}

export interface Subject {
  id: string;
  grade: Grade;
  stream?: Stream;
  name: string;
  nameAm: string;
  icon: string;
  order: number;
  updatedAt: string;
}

export interface Unit {
  id: string;
  subjectId: string;
  number: number;
  title: string;
  titleAm: string;
  questionCount: number;
  version: number;
  accessTier?: ContentAccessTier;
  updatedAt: string;
}

export interface Question {
  id: string;
  unitId: string;
  prompt: string;
  options: [string, string, string, string];
  correctAnswer: AnswerIndex;
  explanation: string;
  order: number;
}

export interface UnitDownload {
  unit: Unit;
  subject: Subject;
  questions: Question[];
  downloadedAt: string;
  byteSize: number;
}

export interface PastPaper {
  id: string;
  title: string;
  grade: Grade;
  stream?: Stream;
  subjectId: string;
  year: number;
  version: number;
  accessTier?: ContentAccessTier;
  content?: string;
  downloadUrl?: string;
  updatedAt: string;
}

export interface PaperDownload {
  paper: PastPaper;
  content: string;
  downloadedAt: string;
  byteSize: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  kind?: 'academy' | 'welcome';
  ownerUserId?: string;
}

export interface CatalogCache {
  subjects: Subject[];
  units: Unit[];
  pastPapers: PastPaper[];
}

export type AttemptEndReason = 'submitted' | 'time-expired' | 'left-app' | 'quit';

export type QuestionReportCategory =
  | 'answer-key'
  | 'question-content'
  | 'formatting'
  | 'options'
  | 'typo'
  | 'other';

export interface QuestionReport {
  id: string;
  questionId: string;
  unitId: string;
  subjectId: string;
  reporterId: string;
  isGuest: boolean;
  mode: QuizMode;
  category: QuestionReportCategory;
  note: string;
  questionNumber: number;
  selectedAnswer: AnswerIndex | null;
  correctAnswer: AnswerIndex;
  prompt: string;
  options: [string, string, string, string];
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  unitId: string;
  mode: QuizMode;
  questions: Question[];
  answers: Array<AnswerIndex | null>;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  endReason: AttemptEndReason;
  synced: boolean;
  scoreSnapshot?: QuizScore;
  remoteOnly?: boolean;
}

export interface PersistedState {
  schemaVersion: 1;
  hasSeenIntro: boolean;
  profileReady: boolean;
  user: User | null;
  preferences: Preferences;
  unitDownloads: UnitDownload[];
  paperDownloads: PaperDownload[];
  attempts: QuizAttempt[];
  pendingQuestionReports: QuestionReport[];
  announcements: Announcement[];
  knownAnnouncementIds: string[];
  readAnnouncementIds: string[];
  pendingWelcomeUserId?: string;
  premiumPlans: PremiumPlan[];
  premiumPaymentMethods: PremiumPaymentMethod[];
  premiumRequest?: PremiumRequest;
  lastPremiumSync?: string;
  premiumOfflineAccessUntil?: string;
  premiumVerificationRequired?: boolean;
  devicePolicyObservation?: DevicePolicyObservation;
  lastDeviceRegistrationAt?: string;
  lastDeviceRegistrationUserId?: string;
  lastViewedSubjectId?: string;
  lastViewedUnitId?: string;
  catalog: CatalogCache;
  lastCatalogSync?: string;
}

export interface QuizScore {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  percentage: number;
}
