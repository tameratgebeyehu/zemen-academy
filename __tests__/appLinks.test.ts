import { expect, test } from '@jest/globals';

import { appLinkDestination } from '@/utils/appLinks';

test('routes only the dedicated verified-link namespace to app screens', () => {
  expect(appLinkDestination('https://zemenacademy.com/app/help')).toBe('HelpCenter');
  expect(appLinkDestination('https://zemenacademy.com/app/privacy')).toBe('PrivacyCenter');
  expect(appLinkDestination('https://zemenacademy.com/app/terms')).toBe('PrivacyCenter');
  expect(appLinkDestination('https://zemenacademy.com/app/account-deletion')).toBe('PrivacyCenter');
});

test('leaves public website and policy pages in the external browser', () => {
  expect(appLinkDestination('https://zemenacademy.com')).toBeNull();
  expect(appLinkDestination('https://zemenacademy.com/help')).toBeNull();
  expect(appLinkDestination('https://zemenacademy.com/privacy')).toBeNull();
  expect(appLinkDestination('https://zemenacademy.com/account-deletion')).toBeNull();
});

test('accepts the existing custom scheme and rejects untrusted domains', () => {
  expect(appLinkDestination('zemenacademy://help')).toBe('HelpCenter');
  expect(appLinkDestination('https://example.com/help')).toBeNull();
  expect(appLinkDestination('not a url')).toBeNull();
});
