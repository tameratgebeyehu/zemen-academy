export function normalizeRecoveryCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function passwordResetValidationError(password: string, confirmation: string): string {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must not exceed 128 characters.';
  if (password !== confirmation) return 'The passwords do not match.';
  return '';
}
