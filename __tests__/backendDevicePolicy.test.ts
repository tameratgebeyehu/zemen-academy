import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@jest/globals';

type DeviceRecord = Record<string, unknown> & { _row: number };

const PHONE_1 = '11111111-1111-4111-8111-111111111111';
const PHONE_2 = '22222222-2222-4222-8222-222222222222';
const TABLET_1 = '33333333-3333-4333-8333-333333333333';

function deviceHarness(initial: DeviceRecord[] = []) {
  const source = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  const records = { devices: initial.map((item) => ({ ...item })), sessions: [] as DeviceRecord[] };
  const revokedSessions: Array<{ userId: string; installationId: string }> = [];
  const factory = new Function('records', 'revokedSessions', `
    var Utilities = { getUuid: function () { return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; } };
    ${source}
    masterSpreadsheet_ = function () {
      return {
        getSheetByName: function (name) {
          var headers = name === 'UserDevices'
            ? ['id','userId','installationId','deviceType','platform','deviceName','status','firstSeenAt','lastSeenAt','revokedAt','updatedAt','observedPhoneCount','observedTabletCount','observedAccountCount','policyFlag','replacementAt']
            : ['id','userId','tokenHash','expiresAt','revokedAt','createdAt','installationId','deviceAuthorized'];
          return {
            getLastColumn: function () { return headers.length; },
            getRange: function () { return { getValues: function () { return [headers]; } }; }
          };
        }
      };
    };
    objects_ = function (sheet) {
      return (sheet === 'UserDevices' ? records.devices : records.sessions).slice();
    };
    updateObjectAtRow_ = function (sheet, row, updates) {
      var list = sheet === 'UserDevices' ? records.devices : records.sessions;
      var item = list.filter(function (entry) { return entry._row === row; })[0];
      if (item) Object.assign(item, updates);
    };
    appendObject_ = function (sheet, value) {
      var list = sheet === 'UserDevices' ? records.devices : records.sessions;
      list.push(Object.assign({}, value, { _row: list.length + 2 }));
    };
    sheet_ = function (sheet) {
      var list = sheet === 'UserDevices' ? records.devices : records.sessions;
      return { getLastRow: function () { return list.length + 1; } };
    };
    revokeSessionsForDevice_ = function (userId, installationId) {
      revokedSessions.push({ userId: userId, installationId: installationId });
    };
    return { registerDeviceForUser_, devicePolicyCategory_ };
  `) as (
    state: { devices: DeviceRecord[]; sessions: DeviceRecord[] },
    revoked: Array<{ userId: string; installationId: string }>,
  ) => {
    registerDeviceForUser_: (userId: string, payload: Record<string, unknown>) => {
      registered: boolean;
      id: string;
      policy: Record<string, unknown>;
    };
    devicePolicyCategory_: (deviceType: string) => string;
  };
  return { ...factory(records, revokedSessions), records, revokedSessions };
}

function identity(installationId: string, deviceType: 'phone' | 'tablet' | 'unknown') {
  return { installationId, deviceType, platform: 'android', deviceName: `${deviceType} test device` };
}

test('allows exactly one phone and one tablet for the same account', () => {
  const harness = deviceHarness();
  const phone = harness.registerDeviceForUser_('student-1', identity(PHONE_1, 'phone'));
  const tablet = harness.registerDeviceForUser_('student-1', identity(TABLET_1, 'tablet'));
  expect(phone.policy).toMatchObject({ accessAllowed: true, phoneCount: 1, tabletCount: 0 });
  expect(tablet.policy).toMatchObject({ accessAllowed: true, phoneCount: 1, tabletCount: 1 });
});

test('blocks a second phone but offers a controlled replacement', () => {
  const harness = deviceHarness();
  harness.registerDeviceForUser_('student-1', identity(PHONE_1, 'phone'));
  const second = harness.registerDeviceForUser_('student-1', identity(PHONE_2, 'phone'));
  expect(second.registered).toBe(false);
  expect(second.policy).toMatchObject({
    accessAllowed: false,
    blockedReason: 'device-limit',
    canReplace: true,
    phoneCount: 1,
  });
});

test('does not allow one installation to be shared by two accounts', () => {
  const harness = deviceHarness();
  harness.registerDeviceForUser_('student-1', identity(PHONE_1, 'phone'));
  const foreign = harness.registerDeviceForUser_('student-2', identity(PHONE_1, 'phone'));
  expect(foreign.policy).toMatchObject({
    accessAllowed: false,
    blockedReason: 'device-linked',
    sharedWithOtherAccounts: true,
    canReplace: false,
  });
});

test('an administrator-released phone can reclaim an empty phone slot', () => {
  const harness = deviceHarness();
  harness.registerDeviceForUser_('student-1', identity(PHONE_1, 'phone'));
  harness.registerDeviceForUser_('student-1', identity(PHONE_2, 'phone'));
  const oldPhone = harness.records.devices.find((item) => item.installationId === PHONE_1)!;
  oldPhone.status = 'revoked';
  oldPhone.policyFlag = 'released-by-admin';

  const released = harness.registerDeviceForUser_('student-1', identity(PHONE_1, 'phone'));
  expect(released.policy).toMatchObject({ accessAllowed: true, blockedReason: null, phoneCount: 1 });
  expect(harness.records.devices.find((item) => item.installationId === PHONE_1)?.status).toBe('active');
});

test('a recent self-service replacement enforces the 30-day cooldown', () => {
  const recent = new Date().toISOString();
  const harness = deviceHarness([{
    _row: 2,
    id: 'old-replaced-phone',
    userId: 'student-1',
    installationId: PHONE_1,
    deviceType: 'phone',
    platform: 'android',
    deviceName: 'Old phone',
    status: 'revoked',
    firstSeenAt: recent,
    lastSeenAt: recent,
    replacementAt: recent,
  }, {
    _row: 3,
    id: 'current-phone',
    userId: 'student-1',
    installationId: PHONE_2,
    deviceType: 'phone',
    platform: 'android',
    deviceName: 'Current phone',
    status: 'active',
    firstSeenAt: recent,
    lastSeenAt: recent,
  }]);
  const third = harness.registerDeviceForUser_('student-1', identity(TABLET_1.replace(/^3/, '4'), 'phone'));
  expect(third.policy).toMatchObject({ accessAllowed: false, blockedReason: 'device-limit', canReplace: false });
  expect(third.policy.replacementAvailableAt).toEqual(expect.any(String));
});
