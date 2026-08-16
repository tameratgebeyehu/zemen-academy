import { expect, test } from '@jest/globals';

import { manualPremiumPaymentsEnabledFor, normalizeDistributionChannel } from '@/config';

test('uses the consumption-only Play channel as the safe default', () => {
  expect(normalizeDistributionChannel()).toBe('play');
  expect(normalizeDistributionChannel('unknown')).toBe('play');
});

test('recognizes the Google Play distribution channel', () => {
  expect(normalizeDistributionChannel('play')).toBe('play');
  expect(normalizeDistributionChannel(' PLAY ')).toBe('play');
});

test('fails closed when a retired Play channel value is used', () => {
  expect(normalizeDistributionChannel(' PLAY-ETHIOPIA ')).toBe('play');
  expect(normalizeDistributionChannel('direct')).toBe('play');
  expect(manualPremiumPaymentsEnabledFor('direct')).toBe(false);
  expect(manualPremiumPaymentsEnabledFor('play')).toBe(false);
});
