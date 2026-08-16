import type { PremiumRequestInput, PremiumRequestStatus } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatPremiumRequestDate(value: string): string {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${day} ${MONTHS[month - 1]} ${iso[1]}`;
  }

  const readable = value.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})/i);
  if (readable) return `${Number(readable[2])} ${readable[1]} ${readable[3]}`;
  return value;
}

export function premiumRequestIsOpen(status: PremiumRequestStatus | undefined): boolean {
  return status === 'pending' || status === 'under-review';
}

export function premiumRequestValidationError(
  input: PremiumRequestInput,
  confirmed: boolean,
): string {
  if (input.senderName.trim().length < 2) return 'Enter the name used for the bank transfer.';
  if (!confirmed) return 'Confirm that the transfer details are accurate.';
  return '';
}

export function canStartPremiumPurchase(input: {
  manualPaymentsEnabled: boolean;
  isGuest: boolean;
  isPremium: boolean;
  verificationRequired: boolean;
  requestStatus?: PremiumRequestStatus;
}): boolean {
  return input.manualPaymentsEnabled
    && !input.isGuest
    && !input.isPremium
    && !input.verificationRequired
    && !premiumRequestIsOpen(input.requestStatus);
}
