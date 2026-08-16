import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('account deletion is directly discoverable from Profile', () => {
  const profile = source('src/screens/profile/ProfileScreen.tsx');
  expect(profile).toContain('title="Account deletion"');
  expect(profile).toContain('CONTACTS.accountDeletion');
  expect(profile).toContain('openExternalBrowser(CONTACTS.accountDeletion)');
});

test('privacy center offers official web and registered-email deletion paths', () => {
  const privacy = source('src/screens/profile/PrivacyCenterScreen.tsx');
  expect(privacy).toContain('Deletion instructions');
  expect(privacy).toContain('openExternalBrowser(CONTACTS.accountDeletion)');
  expect(privacy).toContain('Delete%20my%20Zemen%20Academy%20account');
  expect(privacy).toContain('Never send your password');
});

test('official web actions explicitly select an external Android browser', () => {
  const browser = source('src/utils/externalBrowser.ts');
  expect(browser).toContain('getCustomTabsSupportingBrowsersAsync');
  expect(browser).toContain('browserPackage');
  expect(browser).toContain('WebBrowser.openBrowserAsync');
});

test('owner workflow deletes account-linked server records after confirmation', () => {
  const setup = source('backend/Setup.gs');
  expect(setup).toContain(".addItem('Delete selected user account data', 'deleteSelectedUserAccountData')");
  expect(setup).toContain('function deleteSelectedUserAccountData()');
  expect(setup).toContain("'Sessions', 'PasswordResets', 'Attempts', 'Progress', 'StudyPlans'");
  expect(setup).toContain("'QuestionReports', 'DeviceTokens', 'PremiumPushQueue', 'PremiumRequests'");
  expect(setup).toContain("ui.ButtonSet.YES_NO");
  expect(setup).toContain('usersSheet.deleteRow(storedUser._row)');
});

test('private production backups have an owner verification command', () => {
  const setup = source('backend/Setup.gs');
  expect(setup).toContain(".addItem('Verify latest private backup', 'verifyLatestPrivateProductionBackup')");
  expect(setup).toContain('function verifyLatestPrivateProductionBackup()');
  expect(setup).toContain('LAST_PRIVATE_BACKUP_VERIFIED_AT');
  expect(setup).toContain('DriveApp.Access.PRIVATE');
});
