export type ErrorContext =
  | 'login'
  | 'signup'
  | 'password-reset'
  | 'announcements'
  | 'catalog'
  | 'quiz'
  | 'paper'
  | 'notes'
  | 'premium'
  | 'device'
  | 'profile'
  | 'notifications'
  | 'sync'
  | 'general';

const CONTEXT_MESSAGES: Record<ErrorContext, string> = {
  login: 'Sign-in could not be completed. Check your email and password, then try again.',
  signup: 'Your account could not be created right now. Check your details and try again later.',
  'password-reset': 'Password recovery could not be completed right now. Please try again later.',
  announcements: 'Announcements could not be updated. Please try again shortly.',
  catalog: 'Learning content could not be updated. Your saved content is still available.',
  quiz: 'This quiz could not be opened right now. Please try again.',
  paper: 'This past paper could not be opened right now. Please try again.',
  notes: 'Study notes could not be updated. Your saved notes are still available.',
  premium: 'The Premium request could not be completed. Check the details and try again.',
  device: 'This device could not be verified right now. Please try again.',
  profile: 'Your changes could not be saved. Please try again.',
  notifications: 'Notification settings could not be updated. Please try again.',
  sync: 'Your changes are saved on this device and will sync automatically later.',
  general: 'Something went wrong. Please try again.',
};

function rawMessage(error: unknown): string {
  return error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';
}

export function userFacingError(error: unknown, context: ErrorContext = 'general'): string {
  const raw = rawMessage(error);
  const lower = raw.toLowerCase();

  if (
    (error instanceof Error && error.name === 'AbortError')
    || /timed?\s*out|timeout/.test(lower)
  ) return 'The connection took too long. Check your internet and try again.';

  if (/unknownhost|no address associated|failed to fetch|network request failed|networkerror|java\.net|dns|socket|offline|internet connection/.test(lower)) {
    return 'No internet connection. Check Wi-Fi or mobile data and try again.';
  }

  if (/\b404\b|\b500\b|\b502\b|\b503\b|server returned|service unavailable|invalid response|unexpected token|<!doctype|<html/.test(lower)) {
    return 'Zemen Academy is temporarily unavailable. Please try again shortly.';
  }

  if (/email or password is incorrect/.test(lower)) {
    return 'Email or password is incorrect. Check both and try again.';
  }
  if (/too many signup attempts|too many account creation attempts/.test(lower)) {
    return 'Too many account creation attempts. Wait 15 minutes, then try again.';
  }
  if (/too many failed attempts|too many attempts/.test(lower)) {
    return 'Too many attempts. Wait 15 minutes, then try again.';
  }
  if (/account already exists/.test(lower)) {
    return 'An account already exists for this email. Try signing in instead.';
  }
  if (/valid email/.test(lower)) return 'Enter a valid email address.';
  if (/ethiopian mobile|valid phone/.test(lower)) {
    return 'Enter a valid Ethiopian mobile number.';
  }
  if (/password must be/.test(lower)) return 'Use a password with at least 8 characters.';
  if (/account registration.*server setup is incomplete|device security is not installed|server security is not initialized|run setupzemenacademy/.test(lower)) {
    return 'Account registration is temporarily unavailable because the server setup is incomplete. Please contact Zemen Academy support.';
  }
  if (/signup-storage|account details could not be saved|account record could not be saved/.test(lower)) {
    return 'Your account details could not be saved. Try once more. If it continues, contact Zemen Academy support with code SIGNUP-STORAGE.';
  }
  if (/signup-device|device security could not finish creating your account|account device session could not be created/.test(lower)) {
    return 'Device security could not finish creating your account. Contact Zemen Academy support with code SIGNUP-DEVICE.';
  }
  if (/device-identity-read|could not read its secure app identity/.test(lower)) {
    return 'This phone could not read its secure app identity. Restart the phone or reinstall Zemen Academy. Code: DEVICE-IDENTITY-READ.';
  }
  if (/device-identity-save|could not save its secure app identity/.test(lower)) {
    return 'This phone could not save its secure app identity. Restart the phone or reinstall Zemen Academy. Code: DEVICE-IDENTITY-SAVE.';
  }
  if (/session-save|could not securely save the sign-in session/.test(lower)) {
    return 'Your account was created, but this phone could not securely save the sign-in session. Restart the phone, then sign in with the same email and password. Code: SESSION-SAVE.';
  }
  if (/invalid installation identifier|app installation could not be verified/.test(lower)) {
    return 'This app installation could not be verified. Update Zemen Academy or reinstall the app, then try again.';
  }
  if (/invalid device (type|platform)|device could not be verified by this version/.test(lower)) {
    return 'This device could not be verified by this version of Zemen Academy. Update the app and try again.';
  }
  if (/could not obtain lock|service invoked too many times|account registration is busy|\bquota\b/.test(lower)) {
    return 'Account registration is busy right now. Wait a minute and try again.';
  }
  if (/device already belongs/.test(lower)) return 'This device is already connected to another Zemen Academy account.';
  if (/device replacement is temporarily unavailable/.test(lower)) return raw;
  if (/device is linked to another account/.test(lower)) return 'This device is connected to another account. Sign in to that account or contact support.';
  if (/(installation|device) was released from the account/.test(lower)) return 'This device was released from the account. Use the replacement device or contact support.';
  if (/session expired/.test(lower)) return 'Your session expired. Sign in again to continue.';
  if (/premium access is required/.test(lower)) return 'Zemen Premium is required to open this content.';
  if (/premium subscription is already active/.test(lower)) return 'Your Premium subscription is already active.';
  if (/payment request waiting for review/.test(lower)) return 'Your previous payment request is still waiting for review.';
  if (/name used for the bank transfer/.test(lower)) return 'Enter the name used for the bank transfer.';
  if (/premium plan is no longer available/.test(lower)) return 'This plan is no longer available. Refresh and choose another plan.';
  if (/payment method is no longer available/.test(lower)) return 'This bank option is no longer available. Refresh and choose another bank.';

  return CONTEXT_MESSAGES[context];
}

export function apiErrorContext(action: string): ErrorContext {
  if (action === 'login') return 'login';
  if (action === 'signup') return 'signup';
  if (action === 'requestPasswordReset' || action === 'confirmPasswordReset') return 'password-reset';
  if (action === 'announcements') return 'announcements';
  if (action === 'catalog') return 'catalog';
  if (action === 'questions') return 'quiz';
  if (action === 'paper') return 'paper';
  if (action === 'notes' || action === 'note') return 'notes';
  if (/Premium/.test(action) || action === 'premiumOverview' || action === 'premiumStatus') return 'premium';
  if (action === 'registerDevice' || action === 'replaceDevice') return 'device';
  if (action === 'updateProfile') return 'profile';
  if (/PushToken/.test(action)) return 'notifications';
  if (/^sync|reportQuestions/.test(action)) return 'sync';
  return 'general';
}
