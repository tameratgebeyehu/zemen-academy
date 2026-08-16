var SHEET_HEADERS = {
  Users: ['id', 'name', 'email', 'passwordHash', 'passwordSalt', 'grade', 'stream', 'language', 'isPremium', 'status', 'createdAt', 'updatedAt', 'premiumPlanId', 'premiumStartedAt', 'premiumUntil', 'premiumStatus', 'lastPremiumRequestId', 'phone', 'dailyQuizGoal'],
  Grades: ['id', 'name', 'order', 'status', 'updatedAt'],
  Subjects: ['id', 'grade', 'stream', 'name', 'nameAm', 'icon', 'order', 'status', 'updatedAt'],
  ContentSources: ['subjectId', 'spreadsheetId', 'spreadsheetName', 'status', 'updatedAt'],
  Units: ['id', 'subjectId', 'number', 'title', 'titleAm', 'questionCount', 'version', 'status', 'updatedAt', 'accessTier'],
  Questions: ['id', 'unitId', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'difficulty', 'order', 'status', 'updatedAt', 'externalId', 'topic', 'sourceReference', 'importId'],
  PastPapers: ['id', 'title', 'grade', 'stream', 'subjectId', 'year', 'version', 'content', 'downloadUrl', 'status', 'updatedAt', 'accessTier', 'questionCount', 'subjectName', 'subjectIcon'],
  PastPaperQuestions: ['id', 'paperId', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'difficulty', 'order', 'status', 'updatedAt', 'externalId', 'topic', 'sourceReference', 'importId'],
  Notes: ['id', 'grade', 'stream', 'subjectId', 'unitId', 'title', 'titleAm', 'summary', 'summaryAm', 'body', 'bodyAm', 'version', 'status', 'updatedAt', 'accessTier'],
  NoteDrafts: ['draftId', 'targetId', 'importId', 'grade', 'stream', 'subjectId', 'unitId', 'title', 'titleAm', 'summary', 'summaryAm', 'body', 'bodyAm', 'accessTier', 'createdAt'],
  Announcements: ['id', 'title', 'body', 'audienceGrade', 'audienceStream', 'publishedAt', 'status', 'kind', 'actionType', 'targetId', 'actionLabel'],
  Versions: ['platform', 'latestVersion', 'minimumVersion', 'updateUrl', 'message', 'updatedAt'],
  Sessions: ['id', 'userId', 'tokenHash', 'expiresAt', 'revokedAt', 'createdAt', 'installationId', 'deviceAuthorized'],
  PasswordResets: ['id', 'userId', 'emailHash', 'codeHash', 'expiresAt', 'attempts', 'usedAt', 'createdAt'],
  Attempts: ['id', 'userId', 'unitId', 'mode', 'answersJson', 'correct', 'wrong', 'skipped', 'durationSeconds', 'endReason', 'completedAt', 'createdAt', 'contentType'],
  Progress: ['userId', 'completedAttempts', 'totalSeconds', 'currentStreak', 'averageScore', 'bestScore', 'correct', 'wrong', 'skipped', 'lastCompletedAt', 'updatedAt'],
  StudyPlans: ['userId', 'planJson', 'updatedAt'],
  QuestionReports: ['id', 'questionId', 'unitId', 'subjectId', 'userId', 'isGuest', 'verifiedUser', 'mode', 'category', 'note', 'questionNumber', 'selectedAnswer', 'correctAnswer', 'question', 'optionsJson', 'status', 'createdAt', 'updatedAt'],
  DeviceTokens: ['id', 'userId', 'expoPushToken', 'platform', 'status', 'lastSuccessAt', 'lastError', 'lastErrorAt', 'createdAt', 'updatedAt', 'installationId'],
  PushQueue: ['id', 'announcementId', 'status', 'attempts', 'nextAttemptAt', 'lastError', 'createdAt', 'updatedAt'],
  PremiumPushQueue: ['id', 'requestId', 'userId', 'planName', 'premiumUntil', 'status', 'attempts', 'nextAttemptAt', 'lastError', 'createdAt', 'updatedAt'],
  PremiumPlans: ['id', 'name', 'durationDays', 'priceEtb', 'badge', 'description', 'status', 'order', 'createdAt', 'updatedAt'],
  PaymentMethods: ['id', 'name', 'accountName', 'accountNumber', 'instructions', 'status', 'order', 'updatedAt'],
  PremiumRequests: ['id', 'requestCode', 'userId', 'email', 'planId', 'amountEtb', 'bank', 'senderName', 'transactionReference', 'paymentDate', 'note', 'status', 'reviewedBy', 'reviewedAt', 'createdAt', 'updatedAt', 'reviewNote', 'durationDays', 'phone'],
  PremiumAudit: ['id', 'requestId', 'requestCode', 'userId', 'action', 'previousStatus', 'nextStatus', 'reviewer', 'note', 'createdAt'],
  UserDevices: ['id', 'userId', 'installationId', 'deviceType', 'platform', 'deviceName', 'status', 'firstSeenAt', 'lastSeenAt', 'revokedAt', 'updatedAt', 'observedPhoneCount', 'observedTabletCount', 'observedAccountCount', 'policyFlag', 'replacementAt']
};

var SUBJECT_CONTENT_HEADERS = {
  Units: SHEET_HEADERS.Units,
  Questions: SHEET_HEADERS.Questions,
  QuestionIndex: ['unitId', 'startRow', 'rowCount', 'version', 'status', 'updatedAt'],
  ImportHistory: ['id', 'unitId', 'fileName', 'totalRows', 'importedRows', 'rejectedRows', 'status', 'createdAt', 'completedAt']
};

var SECURITY_SENSITIVE_SHEETS = [
  'Users', 'Sessions', 'PasswordResets', 'Attempts', 'Progress', 'StudyPlans',
  'QuestionReports', 'DeviceTokens', 'PushQueue', 'PremiumPushQueue',
  'PremiumRequests', 'PremiumAudit', 'UserDevices'
];

var NOTE_EDITOR_SHEET = 'NoteEditor';
var NOTE_EDITOR_FIELDS = [
  { row: 3, key: 'grade', label: 'Grade *' },
  { row: 4, key: 'stream', label: 'Stream' },
  { row: 5, key: 'subjectId', label: 'Subject ID *' },
  { row: 6, key: 'unitId', label: 'Unit ID (optional)' },
  { row: 7, key: 'title', label: 'English title *' },
  { row: 8, key: 'titleAm', label: 'Amharic title' },
  { row: 9, key: 'summary', label: 'English summary *' },
  { row: 10, key: 'summaryAm', label: 'Amharic summary' },
  { row: 11, key: 'body', label: 'English note *' },
  { row: 12, key: 'bodyAm', label: 'Amharic note' },
  { row: 13, key: 'accessTier', label: 'Access *' },
  { row: 14, key: 'id', label: 'Note ID (automatic)' },
  { row: 15, key: 'version', label: 'Next version' },
  { row: 16, key: 'updatedAt', label: 'Draft saved at' }
];

var PAST_PAPER_EDITOR_SHEET = 'PastPaperEditor';
var PAST_PAPER_EDITOR_FIELDS = [
  { row: 3, key: 'grade', label: 'Grade *' },
  { row: 4, key: 'stream', label: 'Stream' },
  { row: 5, key: 'subjectId', label: 'Subject ID *' },
  { row: 6, key: 'year', label: 'Exam year *' },
  { row: 7, key: 'title', label: 'Paper title *' },
  { row: 8, key: 'content', label: 'Reviewed paper content *' },
  { row: 9, key: 'accessTier', label: 'Access *' },
  { row: 10, key: 'id', label: 'Paper ID (automatic)' },
  { row: 11, key: 'version', label: 'Next version' },
  { row: 12, key: 'updatedAt', label: 'Draft saved at' }
];

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var csvImportMenu = ui.createMenu('CSV import (recommended)')
    .addItem('Import active CSV sheet as Draft', 'importActiveQuestionSheetAsDraft')
    .addItem('Publish active imported unit', 'publishActiveQuestionSheetUnit')
    .addItem('Repair active unit announcement', 'repairActiveQuestionSheetUnitAnnouncement')
    .addItem('Repair fraction cells in all subjects', 'repairAllQuestionFractionDates')
    .addSeparator()
    .addItem('Create blank import sheet', 'createBlankQuestionImportSheet');
  ui
    .createMenu('Zemen Content')
    .addSubMenu(csvImportMenu)
    .addSeparator()
    .addItem('Open content manager (large)', 'openQuestionImporter')
    .addItem('Open content manager (sidebar)', 'openQuestionImporterSidebar')
    .addSeparator()
    .addItem('Provision selected subject file', 'provisionSelectedSubjectContentSpreadsheet')
    .addItem('Rebuild all question indexes', 'rebuildAllQuestionIndexes')
    .addSeparator()
    .addItem('Diagnose authentication', 'diagnoseAuthenticationSetup')
    .addItem('Install password recovery', 'installPasswordRecovery')
    .addItem('Authorize password recovery email', 'authorizePasswordResetEmail')
    .addSeparator()
    .addItem('Install push notifications', 'installPushNotifications')
    .addItem('Process push queue now', 'processPushQueue')
    .addToUi();
  ui.createMenu('Zemen Premium')
    .addItem('Mark selected request under review', 'markSelectedPremiumRequestUnderReview')
    .addItem('Approve selected request', 'approveSelectedPremiumRequest')
    .addItem('Reject selected request', 'rejectSelectedPremiumRequest')
    .addSeparator()
    .addItem('Install content access tiers', 'installPremiumContentTiers')
    .addToUi();
  ui.createMenu('Zemen Devices')
    .addItem('Release selected device', 'releaseSelectedUserDevice')
    .addItem('Release every device for selected user', 'releaseAllSelectedUserDevices')
    .addToUi();
  ui.createMenu('Zemen Notes')
    .addItem('Import active notes sheet as Draft', 'importActiveNotesSheetAsDraft')
    .addItem('Publish active imported notes', 'publishActiveNotesSheet')
    .addItem('Create blank notes import sheet', 'createBlankNotesImportSheet')
    .addSeparator()
    .addItem('Open note editor', 'openNoteEditor')
    .addItem('New blank note', 'newNoteEditorDraft')
    .addItem('Save current draft', 'saveNoteEditorDraft')
    .addSeparator()
    .addItem('Publish current note', 'publishNoteEditorDraft')
    .addItem('Load selected Notes row', 'loadSelectedNoteIntoEditor')
    .addToUi();
  ui.createMenu('Zemen Past Papers')
    .addItem('Import active entrance-exam sheet as Draft', 'importActivePastPaperSheetAsDraft')
    .addItem('Publish active imported entrance exam', 'publishActivePastPaperSheet')
    .addItem('Create blank entrance-exam import sheet', 'createBlankPastPaperImportSheet')
    .addToUi();
  ui.createMenu('Zemen Security')
    .addItem('Run release security diagnostic', 'diagnoseReleaseSecurity')
    .addItem('Install timetable sync storage', 'installStudyPlanSync')
    .addItem('Protect sensitive sheets', 'protectSensitiveSecuritySheets')
    .addItem('Create private production backup', 'createPrivateProductionBackup')
    .addItem('Verify latest private backup', 'verifyLatestPrivateProductionBackup')
    .addSeparator()
    .addItem('Delete selected user account data', 'deleteSelectedUserAccountData')
    .addItem('Install daily security cleanup', 'installSecurityMaintenance')
    .addToUi();
}

function releaseSecuritySnapshot_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  var properties = PropertiesService.getScriptProperties();
  var maintenanceTriggers = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'cleanupExpiredSecurityRecords';
  });
  var sheetStatus = SECURITY_SENSITIVE_SHEETS.map(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) return { name: name, exists: false, protected: false };
    var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    return {
      name: name,
      exists: true,
      protected: protections.some(function (protection) { return !protection.isWarningOnly(); })
    };
  });
  var file = DriveApp.getFileById(spreadsheet.getId());
  return {
    backendRelease: typeof ZEMEN_BACKEND_RELEASE === 'undefined' ? '' : ZEMEN_BACKEND_RELEASE,
    passwordPepperConfigured: String(properties.getProperty('PASSWORD_PEPPER') || '').length >= 32,
    spreadsheetIdConfigured: Boolean(String(properties.getProperty('SPREADSHEET_ID') || '').trim()),
    cleanupTriggerCount: maintenanceTriggers.length,
    cleanupTriggerHealthy: maintenanceTriggers.length === 1,
    externalEditorCount: file.getEditors().length,
    externalViewerCount: file.getViewers().length,
    sharingAccess: String(file.getSharingAccess()),
    sharingPermission: String(file.getSharingPermission()),
    sensitiveSheets: sheetStatus,
    protectedSheetCount: sheetStatus.filter(function (item) { return item.protected; }).length,
    lastPrivateBackupAt: properties.getProperty('LAST_PRIVATE_BACKUP_AT') || '',
    lastPrivateBackupVerifiedAt: properties.getProperty('LAST_PRIVATE_BACKUP_VERIFIED_AT') || '',
    checkedAt: new Date().toISOString()
  };
}

function diagnoseReleaseSecurity() {
  var result = releaseSecuritySnapshot_();
  console.log(JSON.stringify(result));
  try {
    SpreadsheetApp.getUi().alert(
      'Release security diagnostic',
      'Cleanup trigger: ' + (result.cleanupTriggerHealthy ? 'ready' : 'needs attention')
        + '\nSensitive sheets protected: ' + result.protectedSheetCount + '/' + result.sensitiveSheets.length
        + '\nAdditional file editors: ' + result.externalEditorCount
        + '\nAdditional file viewers: ' + result.externalViewerCount
        + '\nLast private backup: ' + (result.lastPrivateBackupAt || 'not recorded')
        + '\nBackup verified: ' + (result.lastPrivateBackupVerifiedAt || 'not verified'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    // Headless execution still returns the complete diagnostic object.
  }
  return result;
}

function protectSensitiveSecuritySheets() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Protect sensitive sheets?',
    'Only the spreadsheet owner should edit account, session, device, progress, report, and Premium records directly. Content sheets are not changed.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  var effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim();
  var protectedNames = [];
  SECURITY_SENSITIVE_SHEETS.forEach(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) return;
    var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    var protection = protections[0] || sheet.protect();
    if (!protection.canEdit()) throw new Error('The current account cannot update protection for ' + name + '.');
    protection.setDescription('Zemen Academy sensitive data — owner/admin only');
    protection.setWarningOnly(false);
    var editors = protection.getEditors();
    if (editors.length) protection.removeEditors(editors);
    if (effectiveEmail) protection.addEditor(effectiveEmail);
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
    protectedNames.push(name);
  });
  SpreadsheetApp.flush();
  return { protected: true, sheets: protectedNames, count: protectedNames.length };
}

function installStudyPlanSync() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  ensureSheetWithHeaders_(spreadsheet, 'StudyPlans', SHEET_HEADERS.StudyPlans);
  SpreadsheetApp.flush();
  console.log('Timetable sync storage is ready. Deploy a new web app version on the existing URL.');
  return { installed: true, sheet: 'StudyPlans', backendRelease: '2026-08-16-timetable-v2' };
}

function createPrivateProductionBackup() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Create a private production backup?',
    'This creates an owner-only Google Drive copy containing account and learning data. Keep it private and delete obsolete copies according to your retention policy.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Etc/UTC', 'yyyy-MM-dd_HHmmss');
  var source = DriveApp.getFileById(spreadsheet.getId());
  var copy = source.makeCopy('Zemen Academy PRIVATE BACKUP ' + timestamp);
  copy.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  var now = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperties({
    LAST_PRIVATE_BACKUP_AT: now,
    LAST_PRIVATE_BACKUP_FILE_ID: copy.getId()
  }, false);
  return { created: true, fileId: copy.getId(), createdAt: now, access: 'PRIVATE' };
}

function verifyLatestPrivateProductionBackup() {
  var properties = PropertiesService.getScriptProperties();
  var fileId = String(properties.getProperty('LAST_PRIVATE_BACKUP_FILE_ID') || '').trim();
  if (!fileId) throw new Error('Create a private production backup first.');
  var file = DriveApp.getFileById(fileId);
  if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    throw new Error('The latest production backup is not private. Fix its Drive sharing before continuing.');
  }
  var backup = SpreadsheetApp.openById(fileId);
  var missing = [];
  var invalidHeaders = [];
  Object.keys(SHEET_HEADERS).forEach(function (name) {
    var sheet = backup.getSheetByName(name);
    if (!sheet) {
      missing.push(name);
      return;
    }
    var expected = SHEET_HEADERS[name];
    var actual = sheet.getRange(1, 1, 1, expected.length).getDisplayValues()[0];
    if (expected.some(function (header, index) { return String(actual[index]) !== String(header); })) {
      invalidHeaders.push(name);
    }
  });
  if (missing.length || invalidHeaders.length) {
    throw new Error('Backup verification failed. Missing sheets: ' + missing.join(', ')
      + '. Invalid headers: ' + invalidHeaders.join(', ') + '.');
  }
  var verifiedAt = new Date().toISOString();
  properties.setProperty('LAST_PRIVATE_BACKUP_VERIFIED_AT', verifiedAt);
  return {
    verified: true,
    sharing: 'PRIVATE',
    sheetCount: Object.keys(SHEET_HEADERS).length,
    createdAt: properties.getProperty('LAST_PRIVATE_BACKUP_AT') || '',
    verifiedAt: verifiedAt
  };
}

function selectedUserAccount_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  var range = spreadsheet && spreadsheet.getActiveRange();
  if (!sheet || sheet.getName() !== 'Users' || !range || range.getRow() < 2) {
    throw new Error('Select one account row in the Users sheet first.');
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var values = sheet.getRange(range.getRow(), 1, 1, headers.length).getValues()[0];
  var user = { _row: range.getRow() };
  headers.forEach(function (header, index) { user[String(header)] = values[index]; });
  if (!user.id || !user.email) throw new Error('The selected row is not a valid user account.');
  return user;
}

function deleteSelectedUserAccountData() {
  var user = selectedUserAccount_();
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Permanently delete this account?',
    'Account: ' + String(user.email) + '\n\nThis removes the account, sessions, password resets, progress, attempts, timetable, devices, notification tokens, reports, and Premium records. This cannot be undone.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };

  var master = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  var userId = String(user.id);
  var counts = {};
  var userSheets = [
    'Sessions', 'PasswordResets', 'Attempts', 'Progress', 'StudyPlans',
    'QuestionReports', 'DeviceTokens', 'PremiumPushQueue', 'PremiumRequests',
    'PremiumAudit', 'UserDevices'
  ];

  withLock_(function () {
    var cache = CacheService.getScriptCache();
    userSheets.forEach(function (name) {
      var target = master.getSheetByName(name);
      if (!target) {
        counts[name] = 0;
        return;
      }
      var records = objects_(name).filter(function (record) {
        return String(record.userId || '') === userId;
      });
      if (name === 'Sessions') {
        records.forEach(function (session) {
          if (session.tokenHash) cache.remove(sessionCacheKey_(String(session.tokenHash)));
        });
      }
      var rows = records.map(function (record) { return record._row; }).sort(function (left, right) {
        return right - left;
      });
      rows.forEach(function (row) { target.deleteRow(row); });
      counts[name] = rows.length;
    });
    var usersSheet = master.getSheetByName('Users');
    var storedUser = findObject_('Users', 'id', userId);
    if (usersSheet && storedUser && storedUser._row) {
      usersSheet.deleteRow(storedUser._row);
      counts.Users = 1;
    } else {
      counts.Users = 0;
    }
  });

  SpreadsheetApp.flush();
  console.log('Account deletion completed for user ID hash: ' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, userId)
  ).slice(0, 16));
  return { deleted: true, counts: counts, completedAt: new Date().toISOString() };
}

function installPastPaperWorkspace_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  ensureSheetWithHeaders_(spreadsheet, 'PastPapers', SHEET_HEADERS.PastPapers);
  var sheet = spreadsheet.getSheetByName(PAST_PAPER_EDITOR_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(PAST_PAPER_EDITOR_SHEET);

  sheet.getRange('A1:B1').breakApart();
  sheet.getRange('A1:B1').merge();
  sheet.getRange('A1').setValue('Zemen Academy Past Paper Editor')
    .setFontSize(18).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#5A3E18');
  sheet.getRange('A2:B2').breakApart();
  sheet.getRange('A2:B2').merge();
  sheet.getRange('A2').setValue('Paste one reviewed text paper. Drafts stay private; Publish makes the paper available to the matching grade and stream.')
    .setWrap(true).setFontColor('#5A4528').setBackground('#FFF3DB');

  PAST_PAPER_EDITOR_FIELDS.forEach(function (field) {
    sheet.getRange(field.row, 1).setValue(field.label).setFontWeight('bold').setBackground('#FBF6EC');
  });
  sheet.getRange(3, 2, PAST_PAPER_EDITOR_FIELDS.length, 1).setNumberFormat('@').setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 720);
  sheet.setRowHeight(2, 52);
  sheet.setRowHeight(7, 58);
  sheet.setRowHeight(8, 420);
  sheet.setFrozenRows(2);
  sheet.setHiddenGridlines(true);

  sheet.getRange('B3').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['9', '10', '11', '12'], true).setAllowInvalid(false).build()
  );
  sheet.getRange('B4').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Natural', 'Social'], true).setAllowInvalid(false).build()
  );
  sheet.getRange('B9').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['free', 'premium'], true).setAllowInvalid(false).build()
  );
  var subjectsSheet = spreadsheet.getSheetByName('Subjects');
  if (subjectsSheet && subjectsSheet.getLastRow() > 1) {
    var idColumn = SHEET_HEADERS.Subjects.indexOf('id') + 1;
    sheet.getRange('B5').setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(subjectsSheet.getRange(2, idColumn, subjectsSheet.getLastRow() - 1, 1), true)
        .setAllowInvalid(false).build()
    );
  }
  if (!String(sheet.getRange('B9').getDisplayValue()).trim()) sheet.getRange('B9').setValue('premium');
  if (!String(sheet.getRange('B11').getDisplayValue()).trim()) sheet.getRange('B11').setValue('1');
  return sheet;
}

function openPastPaperEditor() {
  var sheet = installPastPaperWorkspace_();
  sheet.activate();
  sheet.getRange('B3').activate();
  return sheet.getName();
}

function newPastPaperEditorDraft() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert('Start a new past paper?', 'The editor will be cleared. Previously published papers are not affected.', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return { cancelled: true };
  var sheet = installPastPaperWorkspace_();
  sheet.getRange(3, 2, PAST_PAPER_EDITOR_FIELDS.length, 1).clearContent();
  sheet.getRange('B9').setValue('premium');
  sheet.getRange('B11').setValue('1');
  sheet.activate();
  sheet.getRange('B3').activate();
  return { cleared: true };
}

function pastPaperEditorValues_() {
  var sheet = installPastPaperWorkspace_();
  var paper = {};
  PAST_PAPER_EDITOR_FIELDS.forEach(function (field) {
    paper[field.key] = String(sheet.getRange(field.row, 2).getDisplayValue() || '').trim();
  });
  return paper;
}

function validatePastPaperEditor_(paper) {
  var grade = Number(paper.grade);
  if ([9, 10, 11, 12].indexOf(grade) < 0) throw new Error('Choose Grade 9, 10, 11, or 12.');
  var subjectId = clean_(paper.subjectId, 120);
  var subject = subjectId ? findObject_('Subjects', 'id', subjectId) : null;
  if (!subject || clean_(subject.status, 20).toLowerCase() !== 'active') throw new Error('Choose an active Subject ID from the list.');
  if (Number(subject.grade) !== grade) throw new Error('The selected subject belongs to a different grade.');

  var stream = clean_(paper.stream, 20);
  if (grade < 11) stream = '';
  if (grade >= 11 && ['Natural', 'Social'].indexOf(stream) < 0) throw new Error('Choose Natural or Social for Grade 11 or 12.');
  if (grade >= 11 && clean_(subject.stream, 20) !== stream) throw new Error('The selected subject belongs to a different stream.');

  var year = Number(String(paper.year || '').replace(/[^0-9]/g, ''));
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('Enter a four-digit exam year, for example 2018.');
  var title = safeSheetText_(paper.title, 180);
  var content = safeSheetText_(paper.content, 45000);
  if (!title) throw new Error('Add a clear paper title.');
  if (!content) throw new Error('Paste the reviewed paper content.');
  var tier = clean_(paper.accessTier, 20).toLowerCase();
  if (['free', 'premium'].indexOf(tier) < 0) throw new Error('Choose free or premium access.');

  return {
    title: title, grade: String(grade), stream: stream, subjectId: subjectId,
    year: String(year), content: content, downloadUrl: '', accessTier: tier
  };
}

function savePastPaperEditorDraft() {
  validatePastPaperEditor_(pastPaperEditorValues_());
  var savedAt = new Date().toISOString();
  var sheet = installPastPaperWorkspace_();
  sheet.getRange('B12').setValue(savedAt);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('Draft saved', 'The paper remains private in PastPaperEditor until you publish it.', SpreadsheetApp.getUi().ButtonSet.OK);
  return { saved: true, savedAt: savedAt };
}

function pastPaperEditorId_(paper) {
  if (paper.id) return validatedIdentifier_(paper.id, 'past paper');
  var base = ['PAPER', 'G' + paper.grade, paper.stream || 'ALL', paper.year, paper.subjectId].join('-')
    .toUpperCase().replace(/[^A-Z0-9._:-]+/g, '-').slice(0, 94);
  return validatedIdentifier_(base + '-' + Utilities.getUuid().split('-')[0].toUpperCase(), 'past paper');
}

function duplicatePastPaper_(paper) {
  return objects_('PastPapers').filter(function (item) {
    return clean_(item.status, 20).toLowerCase() === 'active'
      && Number(item.grade) === Number(paper.grade)
      && clean_(item.stream, 20) === clean_(paper.stream, 20)
      && clean_(item.subjectId, 120) === clean_(paper.subjectId, 120)
      && Number(item.year) === Number(paper.year)
      && clean_(item.title, 180).toLowerCase() === clean_(paper.title, 180).toLowerCase();
  })[0];
}

function invalidatePastPaperCaches_(paper, previous) {
  var cache = CacheService.getScriptCache();
  [paper, previous].filter(function (item) { return Boolean(item); }).forEach(function (item) {
    cache.remove('paper:v2:' + String(item.id) + ':v' + String(Math.max(1, Number(item.version) || 1)));
    cache.remove('paper:v3:' + String(item.id) + ':v' + String(Math.max(1, Number(item.version) || 1)));
  });
  invalidateCatalogCaches_();
}

function publishPastPaperEditorDraft() {
  var raw = pastPaperEditorValues_();
  var paper = validatePastPaperEditor_(raw);
  paper.id = pastPaperEditorId_(raw);
  var existing = findObject_('PastPapers', 'id', paper.id);
  if (!existing) {
    var duplicate = duplicatePastPaper_(paper);
    if (duplicate) throw new Error('This paper already exists. Select its PastPapers row and load it into the editor to update it.');
  }
  paper.version = existing ? Math.max(1, Number(existing.version) || 1) + 1 : Math.max(1, Number(raw.version) || 1);
  paper.status = 'active';
  paper.updatedAt = new Date().toISOString();

  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    existing ? 'Publish updated past paper?' : 'Publish this past paper?',
    paper.title + '\n\nGrade ' + paper.grade + (paper.stream ? ' · ' + paper.stream : '')
      + ' · ' + paper.year + ' · ' + paper.accessTier + ' access',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };

  withLock_(function () {
    if (existing) updateObjectAtRow_('PastPapers', existing._row, paper);
    else appendObject_('PastPapers', paper);
  });
  invalidatePastPaperCaches_(paper, existing);

  var sheet = installPastPaperWorkspace_();
  sheet.getRange('B10').setValue(paper.id);
  sheet.getRange('B11').setValue(String(paper.version + 1));
  sheet.getRange('B12').setValue(paper.updatedAt);
  SpreadsheetApp.flush();
  ui.alert('Past paper published', paper.title + ' is now available to the matching students.', ui.ButtonSet.OK);
  return { published: true, id: paper.id, version: paper.version };
}

function loadSelectedPastPaperIntoEditor() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  var range = spreadsheet && spreadsheet.getActiveRange();
  if (!sheet || sheet.getName() !== 'PastPapers' || !range || range.getRow() < 2) {
    throw new Error('Select one published row in the PastPapers sheet first.');
  }
  var headers = sheet.getRange(1, 1, 1, SHEET_HEADERS.PastPapers.length).getValues()[0];
  var values = sheet.getRange(range.getRow(), 1, 1, headers.length).getDisplayValues()[0];
  var paper = {};
  headers.forEach(function (header, index) { paper[String(header)] = values[index]; });
  if (!paper.id) throw new Error('The selected PastPapers row is empty.');

  var editor = installPastPaperWorkspace_();
  PAST_PAPER_EDITOR_FIELDS.forEach(function (field) {
    var value = field.key === 'version' ? String((Number(paper.version) || 1) + 1) : (paper[field.key] || '');
    editor.getRange(field.row, 2).setValue(value);
  });
  editor.getRange('B12').setValue(new Date().toISOString());
  editor.activate();
  editor.getRange('B7').activate();
  return { loaded: true, id: String(paper.id) };
}

function installNotesWorkspace_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  ensureSheetWithHeaders_(spreadsheet, 'Notes', SHEET_HEADERS.Notes);
  var sheet = spreadsheet.getSheetByName(NOTE_EDITOR_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(NOTE_EDITOR_SHEET);

  sheet.getRange('A1:B1').breakApart();
  sheet.getRange('A1:B1').merge();
  sheet.getRange('A1').setValue('Zemen Academy Note Editor')
    .setFontSize(18).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1F4E5F');
  sheet.getRange('A2:B2').breakApart();
  sheet.getRange('A2:B2').merge();
  sheet.getRange('A2').setValue('Write one reviewed note here. Google Sheets saves this draft automatically; students see it only after Publish.')
    .setWrap(true).setFontColor('#415A66').setBackground('#E9F4F7');

  NOTE_EDITOR_FIELDS.forEach(function (field) {
    sheet.getRange(field.row, 1).setValue(field.label).setFontWeight('bold').setBackground('#F3F6F8');
  });
  sheet.getRange(3, 2, NOTE_EDITOR_FIELDS.length, 1).setNumberFormat('@').setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 720);
  sheet.setRowHeight(2, 48);
  sheet.setRowHeight(9, 72);
  sheet.setRowHeight(10, 72);
  sheet.setRowHeight(11, 240);
  sheet.setRowHeight(12, 240);
  sheet.setFrozenRows(2);
  sheet.setHiddenGridlines(true);

  var gradeRule = SpreadsheetApp.newDataValidation().requireValueInList(['9', '10', '11', '12'], true).setAllowInvalid(false).build();
  var streamRule = SpreadsheetApp.newDataValidation().requireValueInList(['Natural', 'Social'], true).setAllowInvalid(false).build();
  var tierRule = SpreadsheetApp.newDataValidation().requireValueInList(['free', 'premium'], true).setAllowInvalid(false).build();
  sheet.getRange('B3').setDataValidation(gradeRule);
  sheet.getRange('B4').setDataValidation(streamRule);
  sheet.getRange('B13').setDataValidation(tierRule);

  var subjectsSheet = spreadsheet.getSheetByName('Subjects');
  if (subjectsSheet && subjectsSheet.getLastRow() > 1) {
    var subjectIdColumn = SHEET_HEADERS.Subjects.indexOf('id') + 1;
    var subjectRule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(subjectsSheet.getRange(2, subjectIdColumn, subjectsSheet.getLastRow() - 1, 1), true)
      .setAllowInvalid(false).build();
    sheet.getRange('B5').setDataValidation(subjectRule);
  }
  if (!String(sheet.getRange('B13').getDisplayValue()).trim()) sheet.getRange('B13').setValue('premium');
  if (!String(sheet.getRange('B15').getDisplayValue()).trim()) sheet.getRange('B15').setValue('1');
  return sheet;
}

function openNoteEditor() {
  var sheet = installNotesWorkspace_();
  sheet.activate();
  sheet.getRange('B3').activate();
  return sheet.getName();
}

function newNoteEditorDraft() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert('Start a new note?', 'The current editor fields will be cleared. A previously published note is not affected.', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return { cancelled: true };
  var sheet = installNotesWorkspace_();
  sheet.getRange(3, 2, NOTE_EDITOR_FIELDS.length, 1).clearContent();
  sheet.getRange('B13').setValue('premium');
  sheet.getRange('B15').setValue('1');
  sheet.activate();
  sheet.getRange('B3').activate();
  return { cleared: true };
}

function noteEditorValues_() {
  var sheet = installNotesWorkspace_();
  var note = {};
  NOTE_EDITOR_FIELDS.forEach(function (field) {
    note[field.key] = String(sheet.getRange(field.row, 2).getDisplayValue() || '').trim();
  });
  return note;
}

function validateNoteEditor_(note) {
  var grade = Number(note.grade);
  if ([9, 10, 11, 12].indexOf(grade) < 0) throw new Error('Choose Grade 9, 10, 11, or 12.');
  var subjectId = clean_(note.subjectId, 120);
  var subject = subjectId ? findObject_('Subjects', 'id', subjectId) : null;
  if (!subject || clean_(subject.status, 20).toLowerCase() !== 'active') throw new Error('Choose an active Subject ID from the list.');
  if (Number(subject.grade) !== grade) throw new Error('The selected subject belongs to a different grade.');

  var stream = clean_(note.stream, 20);
  if (grade < 11) stream = '';
  if (grade >= 11 && ['Natural', 'Social'].indexOf(stream) < 0) throw new Error('Choose Natural or Social for Grade 11 or 12.');
  if (grade >= 11 && clean_(subject.stream, 20) !== stream) throw new Error('The selected subject belongs to a different stream.');

  var unitId = clean_(note.unitId, 120);
  if (unitId) resolveUnitContent_(unitId, subjectId);
  var title = safeSheetText_(note.title, 180);
  var summary = safeSheetText_(note.summary, 500);
  var body = safeSheetText_(note.body, 45000);
  if (!title) throw new Error('Add an English title.');
  if (!summary) throw new Error('Add a short English summary.');
  if (!body) throw new Error('Add the reviewed English note.');
  var tier = clean_(note.accessTier, 20).toLowerCase();
  if (['free', 'premium'].indexOf(tier) < 0) throw new Error('Choose free or premium access.');

  return {
    grade: String(grade), stream: stream, subjectId: subjectId, unitId: unitId,
    title: title, titleAm: safeSheetText_(note.titleAm, 180),
    summary: summary, summaryAm: safeSheetText_(note.summaryAm, 500),
    body: body, bodyAm: safeSheetText_(note.bodyAm, 45000), accessTier: tier
  };
}

function saveNoteEditorDraft() {
  var note = noteEditorValues_();
  validateNoteEditor_(note);
  var savedAt = new Date().toISOString();
  var sheet = installNotesWorkspace_();
  sheet.getRange('B16').setValue(savedAt);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('Draft saved', 'The editor is saved in this spreadsheet and is not visible to students.', SpreadsheetApp.getUi().ButtonSet.OK);
  return { saved: true, savedAt: savedAt };
}

function noteEditorId_(note) {
  if (note.id) return validatedIdentifier_(note.id, 'note');
  var base = ['NOTE', 'G' + note.grade, note.subjectId, note.unitId || 'GENERAL'].join('-')
    .toUpperCase().replace(/[^A-Z0-9._:-]+/g, '-').slice(0, 94);
  return validatedIdentifier_(base + '-' + Utilities.getUuid().split('-')[0].toUpperCase(), 'note');
}

function invalidateNoteCaches_(note, previous) {
  var cache = CacheService.getScriptCache();
  [note, previous].filter(function (item) { return Boolean(item); }).forEach(function (item) {
    ['', 'Natural', 'Social', clean_(item.stream, 20)].forEach(function (stream) {
      cache.remove('notes:v1:' + String(Number(item.grade)) + ':' + String(stream || ''));
    });
    cache.remove('note:v1:' + String(item.id) + ':' + String(Number(item.version) || 1));
  });
}

function publishNoteEditorDraft() {
  var raw = noteEditorValues_();
  var note = validateNoteEditor_(raw);
  note.id = noteEditorId_(raw);
  var existing = findObject_('Notes', 'id', note.id);
  note.version = existing ? Math.max(1, Number(existing.version) || 1) + 1 : Math.max(1, Number(raw.version) || 1);
  note.status = 'active';
  note.updatedAt = new Date().toISOString();

  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    existing ? 'Publish updated note?' : 'Publish this note?',
    note.title + '\n\nGrade ' + note.grade + ' · ' + note.accessTier + ' access\nStudents will see it after their Notes page refreshes.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };

  withLock_(function () {
    if (existing) updateObjectAtRow_('Notes', existing._row, note);
    else appendObject_('Notes', note);
  });
  invalidateNoteCaches_(note, existing);

  var sheet = installNotesWorkspace_();
  sheet.getRange('B14').setValue(note.id);
  sheet.getRange('B15').setValue(String(note.version + 1));
  sheet.getRange('B16').setValue(note.updatedAt);
  SpreadsheetApp.flush();
  ui.alert('Note published', note.title + ' is now available in the app.', ui.ButtonSet.OK);
  return { published: true, id: note.id, version: note.version };
}

function loadSelectedNoteIntoEditor() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  var range = spreadsheet && spreadsheet.getActiveRange();
  if (!sheet || sheet.getName() !== 'Notes' || !range || range.getRow() < 2) {
    throw new Error('Select one published row in the Notes sheet first.');
  }
  var headers = sheet.getRange(1, 1, 1, SHEET_HEADERS.Notes.length).getValues()[0];
  var values = sheet.getRange(range.getRow(), 1, 1, headers.length).getDisplayValues()[0];
  var note = {};
  headers.forEach(function (header, index) { note[String(header)] = values[index]; });
  if (!note.id) throw new Error('The selected Notes row is empty.');

  var editor = installNotesWorkspace_();
  NOTE_EDITOR_FIELDS.forEach(function (field) {
    var value = field.key === 'version' ? String((Number(note.version) || 1) + 1) : (note[field.key] || '');
    editor.getRange(field.row, 2).setValue(value);
  });
  editor.getRange('B16').setValue(new Date().toISOString());
  editor.activate();
  editor.getRange('B7').activate();
  return { loaded: true, id: String(note.id) };
}

function selectedUserDevice_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  var range = spreadsheet && spreadsheet.getActiveRange();
  if (!sheet || sheet.getName() !== 'UserDevices' || !range || range.getRow() < 2) {
    throw new Error('Select one device row in the UserDevices sheet first.');
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(range.getRow(), 1, 1, headers.length).getValues()[0];
  var device = { _row: range.getRow() };
  headers.forEach(function (header, index) { device[String(header)] = values[index]; });
  if (!device.id || !device.userId || !device.installationId) throw new Error('The selected row is not a valid device.');
  return device;
}

function releaseSelectedUserDevice() {
  var device = selectedUserDevice_();
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Release this device?',
    String(device.deviceName || 'Mobile device') + ' will lose account access. The student can then register a replacement.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };
  var now = new Date().toISOString();
  updateObjectAtRow_('UserDevices', device._row, {
    status: 'revoked', revokedAt: now, updatedAt: now, policyFlag: 'released-by-admin'
  });
  revokeSessionsForDevice_(String(device.userId), clean_(device.installationId, 80).toLowerCase());
  ui.alert('Device released', 'The selected device no longer has account access.', ui.ButtonSet.OK);
  return { released: true, id: String(device.id) };
}

function releaseAllSelectedUserDevices() {
  var selected = selectedUserDevice_();
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Release every device?',
    'This will sign out every registered device for this student account.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };
  var now = new Date().toISOString();
  var released = 0;
  objects_('UserDevices').filter(function (device) {
    return String(device.userId) === String(selected.userId) && clean_(device.status, 20).toLowerCase() === 'active';
  }).forEach(function (device) {
    updateObjectAtRow_('UserDevices', device._row, {
      status: 'revoked', revokedAt: now, updatedAt: now, policyFlag: 'released-by-admin'
    });
    revokeSessionsForDevice_(String(device.userId), clean_(device.installationId, 80).toLowerCase());
    released += 1;
  });
  ui.alert('Devices released', released + ' active device(s) were released.', ui.ButtonSet.OK);
  return { released: released };
}

function installPremiumContentTiers() {
  var master = SpreadsheetApp.getActiveSpreadsheet();
  if (!master) throw new Error('Open the Zemen Academy master spreadsheet first.');
  var updated = seedContentAccessTiers_(master, true);
  objectsFromSpreadsheet_(master, 'ContentSources').filter(function (source) {
    return clean_(source.status, 20).toLowerCase() === 'active' && source.spreadsheetId;
  }).forEach(function (source) {
    var contentSpreadsheet = SpreadsheetApp.openById(String(source.spreadsheetId));
    ensureSheetWithHeaders_(contentSpreadsheet, 'Units', SUBJECT_CONTENT_HEADERS.Units);
    updated += seedContentAccessTiers_(contentSpreadsheet, false);
  });
  SpreadsheetApp.getUi().alert(
    'Content tiers installed',
    updated + ' blank access tiers were filled. Unit 1 is free; later units and past papers are premium by default.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return updated;
}

function seedContentAccessTiers_(spreadsheet, includePastPapers) {
  var updated = seedAccessTierSheet_(spreadsheet.getSheetByName('Units'), 'number');
  if (includePastPapers) updated += seedAccessTierSheet_(spreadsheet.getSheetByName('PastPapers'), '');
  return updated;
}

function seedAccessTierSheet_(sheet, numberHeader) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var tierColumn = headers.indexOf('accessTier');
  var numberColumn = numberHeader ? headers.indexOf(numberHeader) : -1;
  if (tierColumn < 0) return 0;
  var rowCount = sheet.getLastRow() - 1;
  var values = sheet.getRange(2, 1, rowCount, headers.length).getValues();
  var changed = 0;
  values.forEach(function (row) {
    if (clean_(row[tierColumn], 20)) return;
    row[tierColumn] = numberColumn >= 0 && Number(row[numberColumn]) === 1 ? 'free' : 'premium';
    changed += 1;
  });
  if (changed) sheet.getRange(2, tierColumn + 1, rowCount, 1).setValues(values.map(function (row) { return [row[tierColumn]]; }));
  return changed;
}

function markSelectedPremiumRequestUnderReview() {
  var selected = selectedPremiumRequest_();
  var result = markPremiumRequestUnderReview_(selected.id, 'Administrator started verification.');
  SpreadsheetApp.getUi().alert('Request updated', result.requestCode + ' is now under review.', SpreadsheetApp.getUi().ButtonSet.OK);
  return result;
}

function approveSelectedPremiumRequest() {
  var selected = selectedPremiumRequest_();
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Confirm verified payment',
    'Approve only after finding the matching transaction in the bank record.\n\n'
      + 'Request: ' + selected.requestCode + '\n'
      + 'Amount: ' + selected.amountEtb + ' ETB\n'
      + 'Bank: ' + selected.bank + '\n'
      + 'Sender: ' + selected.senderName + '\n'
      + (selected.phone ? 'Phone: ' + selected.phone + '\n' : '')
      + 'Payment date: ' + selected.paymentDate + '\n'
      + 'Submitted at: ' + String(selected.createdAt || 'Not recorded') + '\n\n'
      + 'Match the bank, exact amount, account-holder name, and date in your bank statement.\n'
      + 'Activate or extend premium now?',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return { cancelled: true };
  var result = approvePremiumRequest_(selected.id, 'Bank transaction verified manually.');
  ui.alert(
    'Premium activated',
    result.requestCode + ' approved.\nAccess is active until ' + String(result.premiumUntil || 'the configured expiry').slice(0, 10) + '.',
    ui.ButtonSet.OK
  );
  return result;
}

function rejectSelectedPremiumRequest() {
  var selected = selectedPremiumRequest_();
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Reject ' + selected.requestCode,
    'Enter the reason the student should see. Do not include private bank information.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return { cancelled: true };
  var reason = clean_(response.getResponseText(), 300);
  if (reason.length < 3) throw new Error('A clear rejection reason is required.');
  var result = rejectPremiumRequest_(selected.id, reason);
  ui.alert('Request rejected', result.requestCode + ' was rejected.', ui.ButtonSet.OK);
  return result;
}

function selectedPremiumRequest_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  var range = spreadsheet && spreadsheet.getActiveRange();
  if (!sheet || sheet.getName() !== 'PremiumRequests' || !range || range.getRow() < 2) {
    throw new Error('Select one student request row in the PremiumRequests sheet first.');
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(range.getRow(), 1, 1, headers.length).getValues()[0];
  var request = {};
  headers.forEach(function (header, index) { request[String(header)] = values[index]; });
  if (!request.id || !request.requestCode) throw new Error('The selected row is not a valid premium request.');
  return request;
}

function setupZemenAcademy() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open the destination Google Sheet before running setupZemenAcademy.');

  Object.keys(SHEET_HEADERS).forEach(function (name) {
    ensureSheetWithHeaders_(spreadsheet, name, SHEET_HEADERS[name]);
  });

  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  if (!properties.getProperty('PASSWORD_PEPPER')) {
    var usersSheet = spreadsheet.getSheetByName('Users');
    if (usersSheet && usersSheet.getLastRow() > 1) {
      throw new Error(
        'Existing users were found, but PASSWORD_PEPPER is missing. Do not generate a new pepper. '
          + 'Restore PASSWORD_PEPPER from the original Apps Script project, then run setup again.'
      );
    }
    properties.setProperty('PASSWORD_PEPPER', Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid());
  }
  properties.setProperty('APP_VERSION', '1.0.0');

  seedGrades_();
  seedVersion_();
  seedPremiumPlans_();
  seedPremiumPaymentMethods_();
  installNotesWorkspace_();
  return 'Zemen Academy sheets and server properties are ready.';
}

function repairAccountRegistration() {
  console.log('Account registration repair: starting.');
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open the Zemen Academy master spreadsheet before running repairAccountRegistration.');

  console.log('Account registration repair: checking Users.');
  ensureSheetWithHeaders_(spreadsheet, 'Users', SHEET_HEADERS.Users);
  console.log('Account registration repair: checking Sessions.');
  ensureSheetWithHeaders_(spreadsheet, 'Sessions', SHEET_HEADERS.Sessions);
  console.log('Account registration repair: checking UserDevices.');
  ensureSheetWithHeaders_(spreadsheet, 'UserDevices', SHEET_HEADERS.UserDevices);

  console.log('Account registration repair: checking server properties.');
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  if (!properties.getProperty('PASSWORD_PEPPER')) {
    var usersSheet = spreadsheet.getSheetByName('Users');
    if (usersSheet && usersSheet.getLastRow() > 1) {
      throw new Error(
        'Existing users were found, but PASSWORD_PEPPER is missing. Restore PASSWORD_PEPPER from the original Apps Script project; do not create a new one.'
      );
    }
    properties.setProperty('PASSWORD_PEPPER', Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid());
  }

  SpreadsheetApp.flush();
  console.log('Account registration repair: complete. Deploy a new web app version before testing sign-up.');
  return 'Account registration is ready. Deploy a new web app version before testing sign-up.';
}

function diagnoseAccountRegistration() {
  console.log('Account registration diagnosis: starting end-to-end test.');
  assertSignupServiceReady_();
  var suffix = Utilities.getUuid().toLowerCase();
  var email = 'signup-diagnostic-' + suffix.slice(0, 12) + '@example.invalid';
  var payload = {
    name: 'Registration Diagnostic',
    email: email,
    password: 'diagnostic-password-not-a-user',
    phone: '',
    installationId: Utilities.getUuid().toLowerCase(),
    deviceType: 'phone',
    platform: 'android',
    deviceName: 'Registration diagnostic'
  };
  var result = null;
  try {
    result = signup_(payload);
    console.log('Account registration diagnosis: SUCCESS. User storage, device registration, and session creation all passed.');
    return 'SUCCESS: the complete account-registration pipeline is working.';
  } catch (error) {
    console.error('Account registration diagnosis: FAILED: ' + String(error && error.stack || error));
    throw error;
  } finally {
    try {
      var diagnosticUser = findObject_('Users', 'email', email);
      if (diagnosticUser && diagnosticUser.id) rollbackIncompleteSignup_(diagnosticUser.id);
      if (result && result.token) CacheService.getScriptCache().remove(sessionCacheKey_(tokenHash_(result.token)));
      console.log('Account registration diagnosis: temporary test records cleaned up.');
    } catch (cleanupError) {
      console.error('Account registration diagnosis cleanup failed: ' + String(cleanupError && cleanupError.message || cleanupError));
    }
  }
}

function diagnoseV1AccountAndDeviceGate() {
  console.log('Gate 2 diagnosis: starting account, device, session, and progress checks.');
  assertSignupServiceReady_();
  var suffix = Utilities.getUuid().toLowerCase();
  var email = 'gate2-' + suffix.slice(0, 12) + '@example.invalid';
  var password = 'gate2-diagnostic-password';
  var userId = '';
  var tokens = [];
  var phoneOne = {
    installationId: Utilities.getUuid().toLowerCase(),
    deviceType: 'phone', platform: 'android', deviceName: 'Gate 2 phone one'
  };
  var phoneTwo = {
    installationId: Utilities.getUuid().toLowerCase(),
    deviceType: 'phone', platform: 'android', deviceName: 'Gate 2 phone two'
  };
  var tablet = {
    installationId: Utilities.getUuid().toLowerCase(),
    deviceType: 'tablet', platform: 'android', deviceName: 'Gate 2 tablet'
  };

  function requireGate_(condition, message) {
    if (!condition) throw new Error('GATE-2 FAILED: ' + message);
  }

  try {
    var signup = signup_({
      name: 'Gate Two Diagnostic', email: email, password: password, phone: '',
      installationId: phoneOne.installationId, deviceType: phoneOne.deviceType,
      platform: phoneOne.platform, deviceName: phoneOne.deviceName
    });
    tokens.push(signup.token);
    userId = String(signup.user && signup.user.id || '');
    requireGate_(userId && signup.devicePolicy && signup.devicePolicy.accessAllowed,
      'new account or first phone authorization did not complete.');

    var tabletLogin = login_({
      email: email, password: password,
      installationId: tablet.installationId, deviceType: tablet.deviceType,
      platform: tablet.platform, deviceName: tablet.deviceName
    });
    tokens.push(tabletLogin.token);
    requireGate_(tabletLogin.devicePolicy.accessAllowed
      && Number(tabletLogin.devicePolicy.phoneCount) === 1
      && Number(tabletLogin.devicePolicy.tabletCount) === 1,
      'one-phone/one-tablet authorization failed.');

    var blockedLogin = login_({
      email: email, password: password,
      installationId: phoneTwo.installationId, deviceType: phoneTwo.deviceType,
      platform: phoneTwo.platform, deviceName: phoneTwo.deviceName
    });
    tokens.push(blockedLogin.token);
    requireGate_(!blockedLogin.devicePolicy.accessAllowed
      && blockedLogin.devicePolicy.blockedReason === 'device-limit',
      'the second phone was not blocked by the device policy.');

    var oldPhone = objects_('UserDevices').filter(function (device) {
      return String(device.userId) === userId
        && clean_(device.installationId, 80).toLowerCase() === phoneOne.installationId;
    })[0];
    requireGate_(oldPhone && oldPhone._row, 'the first phone record was not stored.');
    var releasedAt = new Date().toISOString();
    updateObjectAtRow_('UserDevices', oldPhone._row, {
      status: 'revoked', revokedAt: releasedAt, updatedAt: releasedAt,
      policyFlag: 'released-by-gate-2-diagnostic'
    });
    revokeSessionsForDevice_(userId, phoneOne.installationId);

    var reclaimed = registerDeviceObservation_({
      token: blockedLogin.token,
      installationId: phoneTwo.installationId, deviceType: phoneTwo.deviceType,
      platform: phoneTwo.platform, deviceName: phoneTwo.deviceName
    });
    requireGate_(reclaimed.policy.accessAllowed
      && Number(reclaimed.policy.phoneCount) === 1
      && Number(reclaimed.policy.tabletCount) === 1,
      'the released phone slot was not reclaimed automatically.');

    appendObject_('Attempts', {
      id: 'attempt-gate2-' + suffix, userId: userId, unitId: 'gate-2-unit',
      mode: 'exam', answersJson: '[0]', correct: 1, wrong: 0, skipped: 0,
      durationSeconds: 60, endReason: 'submitted',
      completedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      contentType: 'unit'
    });
    updateProgressSummary_(userId);
    var progress = findObject_('Progress', 'userId', userId);
    requireGate_(progress && Number(progress.completedAttempts) === 1
      && Number(progress.totalSeconds) === 60,
      'server-side progress was not persisted.');

    logout_({ token: blockedLogin.token });
    requireGate_(!optionalSession_(blockedLogin.token), 'logout did not revoke the session.');

    var relogin = login_({
      email: email, password: password,
      installationId: phoneTwo.installationId, deviceType: phoneTwo.deviceType,
      platform: phoneTwo.platform, deviceName: phoneTwo.deviceName
    });
    tokens.push(relogin.token);
    requireGate_(relogin.devicePolicy.accessAllowed, 'the released slot could not sign in again.');

    console.log('Gate 2 diagnosis: SUCCESS.');
    return {
      status: 'SUCCESS',
      backendRelease: typeof ZEMEN_BACKEND_RELEASE === 'string' ? ZEMEN_BACKEND_RELEASE : 'unknown',
      checks: [
        'signup', 'login', 'one-phone-one-tablet', 'second-phone-blocked',
        'admin-release-reclaim', 'progress-persisted', 'logout-revoked', 'relogin'
      ]
    };
  } catch (error) {
    console.error('Gate 2 diagnosis: FAILED: ' + String(error && error.stack || error));
    throw error;
  } finally {
    try {
      tokens.forEach(function (token) {
        if (token) CacheService.getScriptCache().remove(sessionCacheKey_(tokenHash_(token)));
      });
      if (!userId) {
        var temporary = findObject_('Users', 'email', email);
        userId = temporary && temporary.id ? String(temporary.id) : '';
      }
      if (userId) {
        withLock_(function () {
          removeSignupRowsForUser_(userId, ['Sessions', 'UserDevices', 'Attempts', 'Progress']);
          var createdUser = findObject_('Users', 'id', userId);
          var usersSheet = masterSpreadsheet_().getSheetByName('Users');
          if (usersSheet && createdUser && createdUser._row) usersSheet.deleteRow(createdUser._row);
        });
      }
      console.log('Gate 2 diagnosis: temporary records cleaned up.');
    } catch (cleanupError) {
      console.error('Gate 2 diagnosis cleanup failed: '
        + String(cleanupError && cleanupError.message || cleanupError));
    }
  }
}

function installProgressAndAnnouncementUpgrade() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open the Zemen Academy master spreadsheet first.');
  ensureSheetWithHeaders_(spreadsheet, 'Progress', SHEET_HEADERS.Progress);
  ensureSheetWithHeaders_(spreadsheet, 'Announcements', SHEET_HEADERS.Announcements);
  SpreadsheetApp.flush();
  return 'Progress summaries and announcement actions are ready.';
}

function diagnoseAuthenticationSetup() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open the master spreadsheet first.');
  var properties = PropertiesService.getScriptProperties();
  var configuredSpreadsheetId = properties.getProperty('SPREADSHEET_ID') || '';
  var pepper = properties.getProperty('PASSWORD_PEPPER') || '';
  var users = spreadsheet.getSheetByName('Users') ? objectsFromSpreadsheet_(spreadsheet, 'Users') : [];
  var missingCredentials = users.filter(function (user) {
    return !String(user.passwordHash || '').trim() || !String(user.passwordSalt || '').trim();
  }).length;
  var inactiveUsers = users.filter(function (user) {
    return clean_(user.status, 20).toLowerCase() !== 'active';
  }).length;
  var normalizedEmails = {};
  var duplicateEmails = 0;
  users.forEach(function (user) {
    var email = clean_(user.email, 160).toLowerCase();
    if (!email) return;
    if (normalizedEmails[email]) duplicateEmails += 1;
    normalizedEmails[email] = true;
  });
  var roundTripPassed = false;
  var pepperFingerprint = 'missing';
  if (pepper) {
    pepperFingerprint = Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pepper)
    ).slice(0, 12);
    var diagnosticSalt = 'zemen-auth-diagnostic';
    var diagnosticPassword = 'diagnostic-password-not-an-account';
    roundTripPassed = constantTimeEqual_(
      passwordHash_(diagnosticPassword, diagnosticSalt),
      passwordHash_(diagnosticPassword, diagnosticSalt)
    );
  }
  var result = {
    activeSpreadsheetMatches: configuredSpreadsheetId === spreadsheet.getId(),
    pepperPresent: Boolean(pepper),
    pepperFingerprint: pepperFingerprint,
    hashRoundTripPassed: roundTripPassed,
    users: users.length,
    missingCredentials: missingCredentials,
    inactiveUsers: inactiveUsers,
    duplicateEmails: duplicateEmails
  };
  SpreadsheetApp.getUi().alert(
    'Authentication diagnosis',
    'Spreadsheet configured correctly: ' + result.activeSpreadsheetMatches + '\n'
      + 'Password pepper present: ' + result.pepperPresent + '\n'
      + 'Pepper fingerprint: ' + result.pepperFingerprint + '\n'
      + 'Hash round-trip passed: ' + result.hashRoundTripPassed + '\n'
      + 'User rows: ' + result.users + '\n'
      + 'Missing hash or salt: ' + result.missingCredentials + '\n'
      + 'Inactive users: ' + result.inactiveUsers + '\n'
      + 'Duplicate normalized emails: ' + result.duplicateEmails + '\n\n'
      + 'If all existing users fail after moving Apps Script projects, compare this fingerprint '
      + 'with the original project and restore its PASSWORD_PEPPER.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return result;
}

function installPasswordRecovery() {
  console.log('Password recovery setup: starting.');
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open the master spreadsheet before running installPasswordRecovery.');

  var properties = PropertiesService.getScriptProperties();
  var configuredSpreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (configuredSpreadsheetId && configuredSpreadsheetId !== spreadsheet.getId()) {
    throw new Error(
      'This Apps Script project points to a different master spreadsheet. '
        + 'Open the configured master spreadsheet and run installPasswordRecovery there.'
    );
  }
  properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());

  if (!properties.getProperty('PASSWORD_PEPPER')) {
    var usersSheet = spreadsheet.getSheetByName('Users');
    if (usersSheet && usersSheet.getLastRow() > 1) {
      throw new Error(
        'PASSWORD_PEPPER is missing while user accounts exist. Restore the original pepper; '
          + 'do not generate a replacement.'
      );
    }
    properties.setProperty('PASSWORD_PEPPER', Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid());
  }

  console.log('Password recovery setup: creating or verifying PasswordResets.');
  ensureSheetWithHeaders_(spreadsheet, 'PasswordResets', SHEET_HEADERS.PasswordResets);
  SpreadsheetApp.flush();
  console.log('Password recovery setup: complete.');
  return 'Password recovery storage is ready. Now run authorizePasswordResetEmail.';
}

function authorizePasswordResetEmail() {
  console.log('Password recovery email authorization: checking MailApp quota.');
  var remaining = MailApp.getRemainingDailyQuota();
  console.log('Password recovery email authorization: complete. Remaining quota: ' + remaining + '.');
  return remaining;
}

function ensureSheetWithHeaders_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name);
  var changed = false;
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    changed = true;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    changed = true;
  } else {
    var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    headers.forEach(function (header, index) {
      if (!existing[index]) {
        sheet.getRange(1, index + 1).setValue(header);
        changed = true;
      }
      else if (existing[index] !== header) {
        if (isKnownLegacyHeader_(name, header, existing[index])) {
          sheet.getRange(1, index + 1).setValue(header);
          changed = true;
        } else {
          throw new Error(
            'Unexpected header in ' + name + ' column ' + (index + 1) + ': expected "' + header + '". '
              + 'The sheet was left unchanged to protect its data.'
          );
        }
      }
    });
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#111113')
    .setFontColor('#FFFFFF');
  if (name === 'Questions' || name === 'PastPaperQuestions') {
    formatQuestionTextColumns_(sheet, headers, 2, Math.max(1, sheet.getMaxRows() - 1));
  }
  if (name === 'Notes' || name === 'NoteDrafts') {
    formatNoteTextColumns_(sheet, headers, 2, Math.max(1, sheet.getMaxRows() - 1));
  }
  if (name === 'PastPapers') {
    formatPastPaperTextColumns_(sheet, headers, 2, Math.max(1, sheet.getMaxRows() - 1));
  }
  // Auto-resizing scans cell contents and can exceed Apps Script's execution limit on
  // large question banks. It is cosmetic, so only use it for small administrative tabs.
  if (changed && sheet.getLastRow() <= 1000) sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function formatQuestionTextColumns_(sheet, headers, startRow, rowCount) {
  if (!sheet || rowCount < 1) return;
  var textHeaders = [
    'question', 'optionA', 'optionB', 'optionC', 'optionD',
    'explanation', 'externalId', 'topic', 'sourceReference'
  ];
  textHeaders.forEach(function (header) {
    var column = headers.indexOf(header);
    if (column >= 0) sheet.getRange(startRow, column + 1, rowCount, 1).setNumberFormat('@');
  });
}

function formatNoteTextColumns_(sheet, headers, startRow, rowCount) {
  if (!sheet || rowCount < 1) return;
  [
    'id', 'stream', 'subjectId', 'unitId', 'title', 'titleAm', 'summary',
    'summaryAm', 'body', 'bodyAm', 'status', 'updatedAt', 'accessTier'
  ].forEach(function (header) {
    var column = headers.indexOf(header);
    if (column >= 0) sheet.getRange(startRow, column + 1, rowCount, 1).setNumberFormat('@');
  });
}

function formatPastPaperTextColumns_(sheet, headers, startRow, rowCount) {
  if (!sheet || rowCount < 1) return;
  ['id', 'title', 'stream', 'subjectId', 'subjectName', 'subjectIcon', 'content', 'downloadUrl', 'status', 'updatedAt', 'accessTier'].forEach(function (header) {
    var column = headers.indexOf(header);
    if (column >= 0) sheet.getRange(startRow, column + 1, rowCount, 1).setNumberFormat('@');
  });
}

function normalizedHeader_(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isKnownLegacyHeader_(sheetName, expected, existing) {
  var expectedKey = normalizedHeader_(expected);
  var existingKey = normalizedHeader_(existing);
  if (existingKey === expectedKey) return true;

  var aliases = {
    PaymentMethods: {
      accountName: ['accountHolder', 'accountHolderName', 'bankAccountName'],
      accountNumber: ['account', 'accountNo', 'accountNum', 'bankAccount', 'bankAccountNo', 'bankAccountNumber'],
      instructions: ['instruction', 'paymentInstructions'],
      updatedAt: ['updated', 'lastUpdated']
    }
  };
  var sheetAliases = aliases[String(sheetName)] || {};
  var expectedAliases = sheetAliases[String(expected)] || [];
  return expectedAliases.some(function (alias) {
    return normalizedHeader_(alias) === existingKey;
  });
}

function provisionSelectedSubjectContentSpreadsheet() {
  var master = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = master && master.getActiveSheet();
  var activeRange = master && master.getActiveRange();
  if (!activeSheet || activeSheet.getName() !== 'Subjects' || !activeRange || activeRange.getRow() < 2) {
    throw new Error('Select a subject row in the Subjects tab, then run this command again.');
  }
  var idColumn = SHEET_HEADERS.Subjects.indexOf('id') + 1;
  var subjectId = clean_(activeSheet.getRange(activeRange.getRow(), idColumn).getValue(), 120);
  if (!subjectId) throw new Error('The selected Subjects row does not contain an ID.');
  var result = provisionSubjectContentSpreadsheet_(subjectId);
  SpreadsheetApp.getUi().alert(
    'Subject content file ready',
    result.name + '\n\n' + result.url + '\n\n'
      + (result.existing ? 'Contains ' : 'Copied ')
      + result.units + ' units and ' + result.questions + ' questions'
      + (result.existing ? '.' : ' from the master file.'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return result;
}

function provisionSubjectContentSpreadsheet_(subjectId) {
  var subject = findObject_('Subjects', 'id', clean_(subjectId, 120));
  if (!subject) throw new Error('Subject not found: ' + subjectId);

  var existing = contentSourceRecords_().filter(function (item) {
    return item.subjectId === subject.id && item.status === 'active';
  })[0];
  if (existing) {
    var existingFile = SpreadsheetApp.openById(String(existing.spreadsheetId));
    ensureSheetWithHeaders_(existingFile, 'Units', SUBJECT_CONTENT_HEADERS.Units);
    ensureSheetWithHeaders_(existingFile, 'Questions', SUBJECT_CONTENT_HEADERS.Questions);
    ensureSheetWithHeaders_(existingFile, 'QuestionIndex', SUBJECT_CONTENT_HEADERS.QuestionIndex);
    ensureSheetWithHeaders_(existingFile, 'ImportHistory', SUBJECT_CONTENT_HEADERS.ImportHistory);
    var existingUnits = objectsFromSpreadsheet_(existingFile, 'Units').length;
    var existingQuestions = objectsFromSpreadsheet_(existingFile, 'Questions').length;
    rebuildQuestionIndexForSpreadsheet_(existingFile);
    invalidateCatalogCaches_();
    return {
      subjectId: subject.id,
      spreadsheetId: existingFile.getId(),
      name: existingFile.getName(),
      url: existingFile.getUrl(),
      units: existingUnits,
      questions: existingQuestions,
      existing: true
    };
  }

  var streamLabel = subject.stream ? ' - ' + subject.stream : '';
  var name = 'Zemen Academy - Grade ' + subject.grade + streamLabel + ' - ' + subject.name;
  var contentSpreadsheet = SpreadsheetApp.create(name);
  var firstSheet = contentSpreadsheet.getSheets()[0];
  firstSheet.setName('Units');
  ensureSheetWithHeaders_(contentSpreadsheet, 'Units', SUBJECT_CONTENT_HEADERS.Units);
  ensureSheetWithHeaders_(contentSpreadsheet, 'Questions', SUBJECT_CONTENT_HEADERS.Questions);
  ensureSheetWithHeaders_(contentSpreadsheet, 'QuestionIndex', SUBJECT_CONTENT_HEADERS.QuestionIndex);
  ensureSheetWithHeaders_(contentSpreadsheet, 'ImportHistory', SUBJECT_CONTENT_HEADERS.ImportHistory);

  var copied = copyMasterSubjectContent_(contentSpreadsheet, subject.id);
  appendObject_('ContentSources', {
    subjectId: subject.id,
    spreadsheetId: contentSpreadsheet.getId(),
    spreadsheetName: contentSpreadsheet.getName(),
    status: 'active',
    updatedAt: new Date().toISOString()
  });
  invalidateCatalogCaches_();

  return {
    subjectId: subject.id,
    spreadsheetId: contentSpreadsheet.getId(),
    name: contentSpreadsheet.getName(),
    url: contentSpreadsheet.getUrl(),
    units: copied.units,
    questions: copied.questions,
    existing: false
  };
}

function copyMasterSubjectContent_(targetSpreadsheet, subjectId) {
  var units = objects_('Units').filter(function (item) {
    return String(item.subjectId) === String(subjectId);
  }).sort(function (left, right) {
    return Number(left.number) - Number(right.number);
  });
  var unitIds = {};
  units.forEach(function (unit) { unitIds[String(unit.id)] = true; });
  var questions = objects_('Questions').filter(function (item) {
    return unitIds[String(item.unitId)];
  }).sort(function (left, right) {
    var unitCompare = String(left.unitId).localeCompare(String(right.unitId));
    return unitCompare || Number(left.order) - Number(right.order);
  });

  writeObjectsToContentSheet_(targetSpreadsheet, 'Units', units);
  writeObjectsToContentSheet_(targetSpreadsheet, 'Questions', questions);
  rebuildQuestionIndexForSpreadsheet_(targetSpreadsheet);
  return { units: units.length, questions: questions.length };
}

function writeObjectsToContentSheet_(spreadsheet, sheetName, objects) {
  if (!objects.length) return;
  var headers = SUBJECT_CONTENT_HEADERS[sheetName];
  var rows = objects.map(function (object) {
    return headers.map(function (header) {
      return object[header] === undefined ? '' : object[header];
    });
  });
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (sheetName === 'Questions') formatQuestionTextColumns_(sheet, headers, 2, rows.length);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function rebuildQuestionIndexForSpreadsheet_(spreadsheet) {
  var indexSheet = ensureSheetWithHeaders_(spreadsheet, 'QuestionIndex', SUBJECT_CONTENT_HEADERS.QuestionIndex);
  if (indexSheet.getLastRow() > 1) {
    indexSheet.getRange(2, 1, indexSheet.getLastRow() - 1, indexSheet.getLastColumn()).clearContent();
  }
  var questionsSheet = spreadsheet.getSheetByName('Questions');
  if (!questionsSheet || questionsSheet.getLastRow() < 2) return 0;
  var headers = questionsSheet.getRange(1, 1, 1, questionsSheet.getLastColumn()).getValues()[0];
  var unitColumn = headers.indexOf('unitId');
  var statusColumn = headers.indexOf('status');
  if (unitColumn < 0 || statusColumn < 0) throw new Error('Questions sheet is missing unitId or status.');
  var rows = questionsSheet.getRange(2, 1, questionsSheet.getLastRow() - 1, headers.length).getValues();
  var entries = [];
  var current = null;
  rows.forEach(function (row, offset) {
    var unitId = clean_(row[unitColumn], 120);
    if (!unitId) return;
    var rowNumber = offset + 2;
    if (!current || current.unitId !== unitId || current.startRow + current.rowCount !== rowNumber) {
      current = { unitId: unitId, startRow: rowNumber, rowCount: 0 };
      entries.push(current);
    }
    current.rowCount += 1;
  });
  var units = objectsFromSpreadsheet_(spreadsheet, 'Units');
  var versions = {};
  units.forEach(function (unit) { versions[String(unit.id)] = Number(unit.version) || 1; });
  var now = new Date().toISOString();
  var output = entries.map(function (entry) {
    return [entry.unitId, entry.startRow, entry.rowCount, versions[entry.unitId] || 1, 'active', now];
  });
  if (output.length) indexSheet.getRange(2, 1, output.length, SUBJECT_CONTENT_HEADERS.QuestionIndex.length).setValues(output);
  return output.length;
}

function rebuildAllQuestionIndexes() {
  var rebuilt = 0;
  contentSourceRecords_().filter(function (item) {
    return item.status === 'active' && item.spreadsheetId;
  }).forEach(function (item) {
    rebuilt += rebuildQuestionIndexForSpreadsheet_(SpreadsheetApp.openById(String(item.spreadsheetId)));
  });
  invalidateCatalogCaches_();
  return rebuilt;
}

function seedGrades_() {
  var sheet = sheet_('Grades');
  if (sheet.getLastRow() > 1) return;
  var now = new Date().toISOString();
  sheet.getRange(2, 1, 4, SHEET_HEADERS.Grades.length).setValues([
    ['9', 'Grade 9', 1, 'active', now],
    ['10', 'Grade 10', 2, 'active', now],
    ['11', 'Grade 11', 3, 'active', now],
    ['12', 'Grade 12', 4, 'active', now]
  ]);
}

function seedVersion_() {
  var sheet = sheet_('Versions');
  if (sheet.getLastRow() > 1) return;
  sheet.appendRow(['android', '1.0.0', '1.0.0', '', 'You are using the first public release.', new Date().toISOString()]);
}

function seedPremiumPlans_() {
  var sheet = sheet_('PremiumPlans');
  var now = new Date().toISOString();
  var plans = [
    {
      id: 'premium-30', name: 'Monthly', durationDays: 30, priceEtb: 149,
      badge: 'Flexible', description: 'Complete premium access for focused monthly revision.',
      status: 'active', order: 1, createdAt: now, updatedAt: now
    },
    {
      id: 'premium-90', name: 'Three Months', durationDays: 90, priceEtb: 399,
      badge: 'Most Popular', description: 'A full school-term of premium access. Save 48 ETB.',
      status: 'active', order: 2, createdAt: now, updatedAt: now
    },
    {
      id: 'premium-365', name: 'One Year', durationDays: 365, priceEtb: 1199,
      badge: 'Best Value', description: 'The complete academic-year experience. Save 589 ETB.',
      status: 'active', order: 3, createdAt: now, updatedAt: now
    }
  ];
  plans.forEach(function (plan) {
    var existing = findObject_('PremiumPlans', 'id', plan.id);
    if (!existing) appendObject_('PremiumPlans', plan);
    else updateObjectAtRow_('PremiumPlans', existing._row, {
      name: plan.name, durationDays: plan.durationDays, priceEtb: plan.priceEtb,
      badge: plan.badge, description: plan.description, status: plan.status,
      order: plan.order, updatedAt: now
    });
  });
  CacheService.getScriptCache().remove('premium-plans:v1');
}

function seedPremiumPaymentMethods_() {
  var paymentSheet = sheet_('PaymentMethods');
  var accountNumberColumn = SHEET_HEADERS.PaymentMethods.indexOf('accountNumber') + 1;
  // Bank account numbers are identifiers, not quantities. Plain-text formatting is
  // required or Google Sheets removes leading zeroes.
  paymentSheet
    .getRange(2, accountNumberColumn, Math.max(1, paymentSheet.getMaxRows() - 1), 1)
    .setNumberFormat('@');
  CacheService.getScriptCache().remove('premium-payment-methods:v1');
  CacheService.getScriptCache().remove('premium-payment-methods:v2');
}

function removeLegacySampleContent() {
  var sampleIds = {
    Questions: ['g12-natural-mathematics-u1-q1', 'g12-natural-mathematics-u1-q2'],
    Units: ['g12-natural-mathematics-u1'],
    Subjects: ['g12-natural-mathematics']
  };
  var removed = {};
  Object.keys(sampleIds).forEach(function (sheetName) {
    var ids = sampleIds[sheetName];
    var rows = objects_(sheetName).filter(function (item) {
      return ids.indexOf(String(item.id)) >= 0;
    }).map(function (item) {
      return item._row;
    }).sort(function (a, b) {
      return b - a;
    });
    var sheet = sheet_(sheetName);
    rows.forEach(function (row) { sheet.deleteRow(row); });
    removed[sheetName] = rows.length;
  });
  return removed;
}

function sheet_(name) {
  var sheet = masterSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing required sheet: ' + name);
  return sheet;
}
