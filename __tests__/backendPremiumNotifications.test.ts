import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@jest/globals';

type Row = Record<string, unknown> & { _row: number };
interface HarnessRecords {
  DeviceTokens: Row[];
  UserDevices: Row[];
  PremiumPushQueue: Row[];
  PushQueue: Row[];
  [key: string]: Row[];
}

const PHONE = '11111111-1111-4111-8111-111111111111';
const RELEASED_PHONE = '22222222-2222-4222-8222-222222222222';

function notificationHarness() {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'PushNotifications.gs'), 'utf8');
  const records: HarnessRecords = {
    DeviceTokens: [],
    UserDevices: [],
    PremiumPushQueue: [],
    PushQueue: [],
  };
  const sentMessages: Array<Record<string, unknown>> = [];
  const session = { userId: 'user-1', installationId: PHONE, deviceAuthorized: true };
  const factory = new Function('records', 'sentMessages', 'session', `
    function clean_(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 1000); }
    function optionalIso_(value) { return value ? new Date(value).toISOString() : ''; }
    function requireSession_() { return session; }
    function withLock_(callback) { return callback(); }
    var Utilities = { getUuid: function () { return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; } };
    var PropertiesService = { getScriptProperties: function () { return { getProperty: function () { return ''; } }; } };
    var UrlFetchApp = { fetch: function (_url, options) {
      var payload = JSON.parse(options.payload);
      payload.forEach(function (message) { sentMessages.push(message); });
      return {
        getResponseCode: function () { return 200; },
        getContentText: function () { return JSON.stringify({ data: payload.map(function () { return { status: 'ok' }; }) }); }
      };
    } };
    function masterSpreadsheet_() { return { getSheetByName: function (name) { return records[name] ? name : null; } }; }
    function objects_(name) { return records[name] || []; }
    function findObject_(name, key, value) {
      return (records[name] || []).filter(function (item) { return String(item[key]) === String(value); })[0] || null;
    }
    function updateObjectAtRow_(name, row, updates) {
      var item = (records[name] || []).filter(function (entry) { return entry._row === row; })[0];
      if (item) Object.assign(item, updates);
    }
    function appendObject_(name, value) {
      records[name].push(Object.assign({ _row: records[name].length + 2 }, value));
    }
    ${source}
    return {
      registerPushToken_: registerPushToken_,
      sendPremiumActivationPush_: sendPremiumActivationPush_,
      enqueuePremiumActivationPush_: enqueuePremiumActivationPush_,
      processPremiumActivationPushQueue_: processPremiumActivationPushQueue_,
      deactivatePushTokensForInstallation_: deactivatePushTokensForInstallation_
    };
  `) as (
    input: HarnessRecords,
    sent: Array<Record<string, unknown>>,
    activeSession: Record<string, unknown>,
  ) => {
    registerPushToken_: (payload: Record<string, unknown>) => Record<string, unknown>;
    sendPremiumActivationPush_: (userId: string, planName: string, until: string) => Record<string, number>;
    enqueuePremiumActivationPush_: (requestId: string, userId: string, planName: string, until: string) => boolean;
    processPremiumActivationPushQueue_: (now: number) => Record<string, number>;
    deactivatePushTokensForInstallation_: (userId: string, installationId: string) => number;
  };
  return { ...factory(records, sentMessages, session), records, sentMessages, session };
}

test('registers a push token against the authorized installation only', () => {
  const harness = notificationHarness();
  harness.registerPushToken_({
    expoPushToken: 'ExpoPushToken[phone_token]',
    platform: 'android',
    installationId: PHONE,
  });
  expect(harness.records.DeviceTokens[0]).toMatchObject({
    userId: 'user-1',
    installationId: PHONE,
    status: 'active',
  });
  expect(() => harness.registerPushToken_({
    expoPushToken: 'ExpoPushToken[other_token]',
    platform: 'android',
    installationId: RELEASED_PHONE,
  })).toThrow('does not match');
});

test('sends Premium activation only to currently authorized installations', () => {
  const harness = notificationHarness();
  harness.records.UserDevices.push(
    { _row: 2, userId: 'user-1', installationId: PHONE, status: 'active' },
    { _row: 3, userId: 'user-1', installationId: RELEASED_PHONE, status: 'revoked' },
  );
  harness.records.DeviceTokens.push(
    { _row: 2, userId: 'user-1', installationId: PHONE, expoPushToken: 'ExpoPushToken[active_phone]', status: 'active' },
    { _row: 3, userId: 'user-1', installationId: RELEASED_PHONE, expoPushToken: 'ExpoPushToken[released_phone]', status: 'active' },
  );
  const result = harness.sendPremiumActivationPush_('user-1', 'Monthly', '2099-01-01T00:00:00.000Z');
  expect(result).toMatchObject({ recipients: 1, accepted: 1 });
  expect(harness.sentMessages).toHaveLength(1);
  expect(harness.sentMessages[0]?.to).toBe('ExpoPushToken[active_phone]');
});

test('retries a Premium activation when no authorized notification device is available', () => {
  const harness = notificationHarness();
  expect(harness.enqueuePremiumActivationPush_(
    'request-1',
    'user-1',
    'Monthly',
    '2099-01-01T00:00:00.000Z',
  )).toBe(true);
  const first = harness.processPremiumActivationPushQueue_(Date.now());
  expect(first).toMatchObject({ processed: 1, accepted: 0 });
  expect(harness.records.PremiumPushQueue[0]).toMatchObject({ status: 'retry', attempts: 1 });

  harness.records.UserDevices.push({ _row: 2, userId: 'user-1', installationId: PHONE, status: 'active' });
  harness.records.DeviceTokens.push({
    _row: 2,
    userId: 'user-1',
    installationId: PHONE,
    expoPushToken: 'ExpoPushToken[phone_token]',
    status: 'active',
  });
  const second = harness.processPremiumActivationPushQueue_(Date.now() + 60 * 60_000);
  expect(second).toMatchObject({ processed: 1, accepted: 1 });
  expect(harness.records.PremiumPushQueue[0]).toMatchObject({ status: 'sent', attempts: 2 });
});

test('deactivates the notification token when an installation is released', () => {
  const harness = notificationHarness();
  harness.records.DeviceTokens.push({
    _row: 2,
    userId: 'user-1',
    installationId: PHONE,
    expoPushToken: 'ExpoPushToken[phone_token]',
    status: 'active',
  });
  expect(harness.deactivatePushTokensForInstallation_('user-1', PHONE)).toBe(1);
  expect(harness.records.DeviceTokens[0]?.status).toBe('inactive');
});
