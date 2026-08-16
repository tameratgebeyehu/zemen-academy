import { expect, test } from '@jest/globals';

import {
  ethiopianPhoneInputHasError,
  ethiopianPhoneIsValid,
  normalizeEthiopianPhone,
  sanitizeEthiopianPhoneInput,
} from '@/utils/phone';

test('normalizes Ethiopian mobile numbers to the international format', () => {
  expect(normalizeEthiopianPhone('0912 345 678')).toBe('+251912345678');
  expect(normalizeEthiopianPhone('0712-345-678')).toBe('+251712345678');
  expect(normalizeEthiopianPhone('+251 912 345 678')).toBe('+251912345678');
  expect(normalizeEthiopianPhone('251712345678')).toBe('+251712345678');
});

test('keeps the signup field compact and warns only after an unsupported prefix', () => {
  expect(sanitizeEthiopianPhoneInput('+251 912 345 678')).toBe('0912345678');
  expect(sanitizeEthiopianPhoneInput('0712-345-678')).toBe('0712345678');
  expect(ethiopianPhoneInputHasError('')).toBe(false);
  expect(ethiopianPhoneInputHasError('0')).toBe(false);
  expect(ethiopianPhoneInputHasError('09')).toBe(false);
  expect(ethiopianPhoneInputHasError('07')).toBe(false);
  expect(ethiopianPhoneInputHasError('04')).toBe(true);
});

test('keeps the optional phone field blank and rejects unsupported prefixes', () => {
  expect(normalizeEthiopianPhone('')).toBe('');
  expect(ethiopianPhoneIsValid('')).toBe(true);
  expect(normalizeEthiopianPhone('0612345678')).toBeNull();
  expect(normalizeEthiopianPhone('0412345678')).toBeNull();
  expect(normalizeEthiopianPhone('+251812345678')).toBeNull();
  expect(normalizeEthiopianPhone('091234567')).toBeNull();
});
