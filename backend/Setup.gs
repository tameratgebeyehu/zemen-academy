var SHEET_HEADERS = {
  Users: ['id', 'name', 'email', 'passwordHash', 'passwordSalt', 'grade', 'stream', 'language', 'isPremium', 'status', 'createdAt', 'updatedAt', 'premiumPlanId', 'premiumStartedAt', 'premiumUntil', 'premiumStatus', 'lastPremiumRequestId', 'phone', 'dailyQuizGoal'],
  Grades: ['id', 'name', 'order', 'status', 'updatedAt'],
  Subjects: ['id', 'grade', 'stream', 'name', 'nameAm', 'icon', 'order', 'status', 'updatedAt'],
  ContentSources: ['subjectId', 'spreadsheetId', 'spreadsheetName', 'status', 'updatedAt'],
  Units: ['id', 'subjectId', 'number', 'title', 'titleAm', 'questionCount', 'version', 'status', 'updatedAt', 'accessTier'],
  Questions: ['id', 'unitId', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'difficulty', 'order', 'status', 'updatedAt', 'externalId', 'topic', 'sourceReference', 'importId'],
  PastPapers: ['id', 'title', 'grade', 'stream', 'subjectId', 'year', 'version', 'content', 'downloadUrl', 'status', 'updatedAt', 'accessTier'],
  Announcements: ['id', 'title', 'body', 'audienceGrade', 'audienceStream', 'publishedAt', 'status'],
  Versions: ['platform', 'latestVersion', 'minimumVersion', 'updateUrl', 'message', 'updatedAt'],
  Sessions: ['id', 'userId', 'tokenHash', 'expiresAt', 'revokedAt', 'createdAt', 'installationId', 'deviceAuthorized'],
  PasswordResets: ['id', 'userId', 'emailHash', 'codeHash', 'expiresAt', 'attempts', 'usedAt', 'createdAt'],
  Attempts: ['id', 'userId', 'unitId', 'mode', 'answersJson', 'correct', 'wrong', 'skipped', 'durationSeconds', 'endReason', 'completedAt', 'createdAt'],
  QuestionReports: ['id', 'questionId', 'unitId', 'subjectId', 'userId', 'isGuest', 'verifiedUser', 'mode', 'category', 'note', 'questionNumber', 'selectedAnswer', 'correctAnswer', 'question', 'optionsJson', 'status', 'createdAt', 'updatedAt'],
  DeviceTokens: ['id', 'userId', 'expoPushToken', 'platform', 'status', 'lastSuccessAt', 'lastError', 'lastErrorAt', 'createdAt', 'updatedAt'],
  PushQueue: ['id', 'announcementId', 'status', 'attempts', 'nextAttemptAt', 'lastError', 'createdAt', 'updatedAt'],
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

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var csvImportMenu = ui.createMenu('CSV import (recommended)')
    .addItem('Import active CSV sheet as Draft', 'importActiveQuestionSheetAsDraft')
    .addItem('Publish active imported unit', 'publishActiveQuestionSheetUnit')
    .addItem('Repair active unit announcement', 'repairActiveQuestionSheetUnitAnnouncement')
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
      + 'Payment date: ' + selected.paymentDate + '\n\n'
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
  return 'Zemen Academy sheets and server properties are ready.';
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
  // Auto-resizing scans cell contents and can exceed Apps Script's execution limit on
  // large question banks. It is cosmetic, so only use it for small administrative tabs.
  if (changed && sheet.getLastRow() <= 1000) sheet.autoResizeColumns(1, headers.length);
  return sheet;
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
  spreadsheet.getSheetByName(sheetName).getRange(2, 1, rows.length, headers.length).setValues(rows);
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
