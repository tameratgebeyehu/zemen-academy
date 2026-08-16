import { expect, test } from '@jest/globals';

import { ethiopianDayPeriod, formatEthiopianTime, isValidLocalTime } from '@/utils/ethiopianTime';

test('formats stored notification times using the Ethiopian clock', () => {
  expect(formatEthiopianTime('07:00')).toBe('1:00 morning');
  expect(formatEthiopianTime('12:00')).toBe('6:00 afternoon');
  expect(formatEthiopianTime('13:30')).toBe('7:30 afternoon');
  expect(formatEthiopianTime('18:00')).toBe('12:00 evening');
  expect(formatEthiopianTime('19:00')).toBe('1:00 evening');
  expect(formatEthiopianTime('01:00')).toBe('7:00 night');
});

test('validates stored local times and labels their Ethiopian period', () => {
  expect(isValidLocalTime('20:30')).toBe(true);
  expect(isValidLocalTime('24:00')).toBe(false);
  expect(ethiopianDayPeriod(8)).toBe('morning');
  expect(ethiopianDayPeriod(15)).toBe('afternoon');
  expect(ethiopianDayPeriod(20)).toBe('evening');
  expect(ethiopianDayPeriod(2)).toBe('night');
});
