export const APP_VERSION = '1.0.0';

// Version 1 scope is deliberately smaller than the long-term codebase. Keep
// deferred implementations in source, but never advertise incomplete surfaces.
export const V1_PAST_PAPERS_ENABLED = false;
export const V1_AMHARIC_UI_ENABLED = false;
export const V1_DEFAULT_LANGUAGE = 'en' as const;
export const V1_SUPPORTED_LANGUAGES = [V1_DEFAULT_LANGUAGE] as const;

export type DistributionChannel = 'direct' | 'play';

export function normalizeDistributionChannel(value?: string): DistributionChannel {
  const normalized = value?.trim().toLowerCase();
  // Direct/manual distribution has been retired. Unknown and legacy values
  // fail closed to the consumption-only Google Play experience.
  if (normalized === 'direct' || normalized === 'play-ethiopia') return 'play';
  return 'play';
}

export function manualPremiumPaymentsEnabledFor(channel: DistributionChannel): boolean {
  void channel;
  return false;
}

export const DISTRIBUTION_CHANNEL = normalizeDistributionChannel(
  process.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL,
);

// Premium enrollment is website-managed. The mobile app only recognizes an
// existing entitlement and can never reveal bank details or submit a request.
export const MANUAL_PREMIUM_PAYMENTS_ENABLED = manualPremiumPaymentsEnabledFor(DISTRIBUTION_CHANNEL);
export const PREMIUM_ACCESS_BUTTON_LABEL = MANUAL_PREMIUM_PAYMENTS_ENABLED
  ? 'View Premium plans'
  : 'Check Premium access';

export const CONTACTS = {
  website: 'https://zemenacademy.com',
  help: 'https://zemenacademy.com/help',
  privacy: 'https://zemenacademy.com/privacy',
  terms: 'https://zemenacademy.com/terms',
  accountDeletion: 'https://zemenacademy.com/account-deletion',
  email: 'zemenacademy@gmail.com',
  telegram: 'https://t.me/zemen_academy',
  youtube: 'https://www.youtube.com/@ZemenAcademy',
  instagram: 'https://www.instagram.com/zemen_academy/',
  tiktok: 'https://www.tiktok.com/@zemen_academy',
} as const;
