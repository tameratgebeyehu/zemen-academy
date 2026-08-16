import * as SecureStore from 'expo-secure-store';
import { beforeEach, expect, jest, test } from '@jest/globals';

import {
  acknowledgePremiumRequest,
  acknowledgedPremiumRequest,
} from '@/services/premiumCelebration';

const getItemAsync = jest.spyOn(SecureStore, 'getItemAsync');
const setItemAsync = jest.spyOn(SecureStore, 'setItemAsync');

beforeEach(() => {
  jest.clearAllMocks();
});

test('stores and reads the last acknowledged Premium approval per user', async () => {
  getItemAsync.mockResolvedValue('request-42');
  await expect(acknowledgedPremiumRequest('user/42')).resolves.toBe('request-42');
  expect(getItemAsync).toHaveBeenCalledWith('zemen-premium-celebrated-v1-user_42');

  setItemAsync.mockResolvedValue(undefined);
  await acknowledgePremiumRequest('user/42', 'request-43');
  expect(setItemAsync).toHaveBeenCalledWith('zemen-premium-celebrated-v1-user_42', 'request-43');
});
