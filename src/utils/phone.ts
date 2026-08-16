const ETHIOPIAN_MOBILE_LOCAL = /^0[79]\d{8}$/;
const ETHIOPIAN_MOBILE_INTERNATIONAL = /^251[79]\d{8}$/;

export function normalizeEthiopianPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (ETHIOPIAN_MOBILE_LOCAL.test(digits)) return `+251${digits.slice(1)}`;
  if (ETHIOPIAN_MOBILE_INTERNATIONAL.test(digits)) return `+${digits}`;
  return null;
}

export function ethiopianPhoneIsValid(value: string): boolean {
  return normalizeEthiopianPhone(value) !== null;
}

export function sanitizeEthiopianPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('251')) return `0${digits.slice(3)}`.slice(0, 10);
  return digits.slice(0, 10);
}

export function ethiopianPhoneInputHasError(value: string): boolean {
  if (!value) return false;
  if (value.length >= 2 && !value.startsWith('09') && !value.startsWith('07')) return true;
  return value.length === 10 && normalizeEthiopianPhone(value) === null;
}

export const ETHIOPIAN_PHONE_ERROR = 'Enter a valid Ethiopian mobile number.';
