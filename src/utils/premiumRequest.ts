import type { PremiumRequestInput, PremiumRequestStatus } from '@/types';

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
