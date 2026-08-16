import { expect, test } from '@jest/globals';

import {
  deviceCategoryFromExpoType,
  devicePolicyRequiresAttention,
  devicePolicyRevokesLocalContent,
  deviceRegistrationIsFresh,
} from '@/utils/devicePolicy';

test('maps Expo device types to the supported policy categories', () => {
  expect(deviceCategoryFromExpoType(1)).toBe('phone');
  expect(deviceCategoryFromExpoType(2)).toBe('tablet');
  expect(deviceCategoryFromExpoType(0)).toBe('unknown');
  expect(deviceCategoryFromExpoType(3)).toBe('unknown');
  expect(deviceCategoryFromExpoType(null)).toBe('unknown');
});

test('only treats a recent registration for the same account as fresh', () => {
  const now = Date.parse('2026-08-01T12:00:00.000Z');
  expect(deviceRegistrationIsFresh('2026-08-01T06:00:00.000Z', 'student-1', 'student-1', now)).toBe(true);
  expect(deviceRegistrationIsFresh('2026-08-01T06:00:00.000Z', 'student-2', 'student-1', now)).toBe(false);
  expect(deviceRegistrationIsFresh('2026-07-31T20:00:00.000Z', 'student-1', 'student-1', now)).toBe(false);
  expect(deviceRegistrationIsFresh('invalid', 'student-1', 'student-1', now)).toBe(false);
});

test('requires a device check for a new account and blocks a rejected installation', () => {
  expect(devicePolicyRequiresAttention(false, 'student-1', undefined, undefined)).toBe(true);
  expect(devicePolicyRequiresAttention(false, 'student-1', 'student-2', { accessAllowed: true })).toBe(true);
  expect(devicePolicyRequiresAttention(false, 'student-1', 'student-1', { accessAllowed: false })).toBe(true);
  expect(devicePolicyRequiresAttention(false, 'student-1', 'student-1', { accessAllowed: true })).toBe(false);
});

test('keeps guests and legacy accepted observations usable during rollout', () => {
  expect(devicePolicyRequiresAttention(true, 'guest-1', undefined, undefined)).toBe(false);
  expect(devicePolicyRequiresAttention(false, 'student-1', 'student-1', {})).toBe(false);
});

test('purges offline learning only when this installation was explicitly revoked', () => {
  expect(devicePolicyRevokesLocalContent({ currentDeviceStatus: 'revoked', blockedReason: 'device-released' })).toBe(true);
  expect(devicePolicyRevokesLocalContent({ currentDeviceStatus: 'blocked', blockedReason: 'device-limit' })).toBe(false);
  expect(devicePolicyRevokesLocalContent({ currentDeviceStatus: 'active', blockedReason: null })).toBe(false);
});
