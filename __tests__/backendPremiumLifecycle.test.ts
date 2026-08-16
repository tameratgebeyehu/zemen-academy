import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@jest/globals';

type SheetRecord = Record<string, unknown> & { _row?: number };

function backendHarness(records: Record<string, SheetRecord>) {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  const userUpdates: Record<string, unknown>[] = [];
  const requestUpdates: Record<string, unknown>[] = [];
  const pushes: Array<{ userId: string; planName: string; until: string }> = [];
  const factory = new Function('records', 'userUpdates', 'requestUpdates', 'pushes', `
    ${source}
    withLock_ = function (callback) { return callback(); };
    findObject_ = function (sheet, key, value) {
      if (sheet === 'PremiumRequests') return records.request;
      if (sheet === 'Users') return records.user;
      if (sheet === 'PremiumPlans') return records.plan;
      return null;
    };
    updateObjectAtRow_ = function (sheet, row, updates) {
      if (sheet === 'Users') { userUpdates.push(updates); Object.assign(records.user, updates); }
      if (sheet === 'PremiumRequests') { requestUpdates.push(updates); Object.assign(records.request, updates); }
    };
    appendPremiumAudit_ = function () {};
    premiumReviewer_ = function () { return 'test-admin'; };
    sendPremiumActivationPush_ = function (userId, planName, until) {
      pushes.push({ userId: userId, planName: planName, until: until });
    };
    return { approvePremiumRequest_, premiumEntitlementForUser_ };
  `) as (
    input: Record<string, SheetRecord>,
    users: Record<string, unknown>[],
    requests: Record<string, unknown>[],
    pushCalls: Array<{ userId: string; planName: string; until: string }>,
  ) => {
    approvePremiumRequest_: (requestId: string, note: string) => Record<string, unknown>;
    premiumEntitlementForUser_: (user: SheetRecord) => Record<string, unknown>;
  };
  return {
    ...factory(records, userUpdates, requestUpdates, pushes),
    userUpdates,
    requestUpdates,
    pushes,
  };
}

test('backend entitlement expires timed Premium access', () => {
  const harness = backendHarness({});
  expect(harness.premiumEntitlementForUser_({
    isPremium: true,
    premiumStatus: 'active',
    premiumPlanId: 'premium-30',
    premiumStartedAt: '2000-01-01T00:00:00.000Z',
    premiumUntil: '2000-02-01T00:00:00.000Z',
  })).toMatchObject({ isPremium: false, status: 'expired' });
});

test('approval activates an expired account and sends one activation push', () => {
  const records = {
    request: {
      _row: 2,
      id: 'request-1',
      requestCode: 'ZA-TEST-1',
      userId: 'user-1',
      planId: 'premium-30',
      durationDays: 30,
      status: 'pending',
    },
    user: {
      _row: 2,
      id: 'user-1',
      isPremium: false,
      premiumStatus: 'expired',
      premiumUntil: '2000-02-01T00:00:00.000Z',
      lastPremiumRequestId: '',
    },
    plan: { id: 'premium-30', name: 'Monthly', durationDays: 30 },
  };
  const harness = backendHarness(records);
  const result = harness.approvePremiumRequest_('request-1', 'Verified');
  expect(result).toMatchObject({ requestCode: 'ZA-TEST-1', alreadyApproved: false });
  expect(harness.userUpdates[0]).toMatchObject({
    isPremium: true,
    premiumPlanId: 'premium-30',
    premiumStatus: 'active',
    lastPremiumRequestId: 'request-1',
  });
  expect(harness.requestUpdates[0]).toMatchObject({ status: 'approved' });
  expect(harness.pushes).toHaveLength(1);
});

test('approving an already applied request does not extend or notify twice', () => {
  const records = {
    request: {
      _row: 2,
      id: 'request-2',
      requestCode: 'ZA-TEST-2',
      userId: 'user-2',
      planId: 'premium-90',
      durationDays: 90,
      status: 'under-review',
    },
    user: {
      _row: 2,
      id: 'user-2',
      isPremium: true,
      premiumStatus: 'active',
      premiumStartedAt: '2099-01-01T00:00:00.000Z',
      premiumUntil: '2099-04-01T00:00:00.000Z',
      lastPremiumRequestId: 'request-2',
    },
    plan: { id: 'premium-90', name: 'Three Months', durationDays: 90 },
  };
  const harness = backendHarness(records);
  const result = harness.approvePremiumRequest_('request-2', 'Verified again');
  expect(result).toMatchObject({ alreadyApproved: true, premiumUntil: '2099-04-01T00:00:00.000Z' });
  expect(harness.userUpdates).toHaveLength(0);
  expect(harness.pushes).toHaveLength(0);
});

test('approval extends from an unexpired entitlement without losing remaining time', () => {
  const currentUntil = new Date(Date.now() + 10 * 86_400_000).toISOString();
  const expectedUntil = new Date(new Date(currentUntil).getTime() + 30 * 86_400_000).toISOString();
  const records = {
    request: {
      _row: 4,
      id: 'request-renewal',
      requestCode: 'ZA-RENEWAL',
      userId: 'user-renewal',
      planId: 'premium-30',
      durationDays: 30,
      status: 'pending',
    },
    user: {
      _row: 4,
      id: 'user-renewal',
      isPremium: true,
      premiumStatus: 'active',
      premiumStartedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      premiumUntil: currentUntil,
      lastPremiumRequestId: 'previous-request',
    },
    plan: { id: 'premium-30', name: 'Monthly', durationDays: 30 },
  };
  const harness = backendHarness(records);
  const result = harness.approvePremiumRequest_('request-renewal', 'Renewal verified');
  expect(result.premiumUntil).toBe(expectedUntil);
  expect(harness.userUpdates[0]).toMatchObject({
    premiumUntil: expectedUntil,
    lastPremiumRequestId: 'request-renewal',
  });
  expect(harness.pushes).toHaveLength(1);
});
