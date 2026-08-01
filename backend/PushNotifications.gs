var EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
var EXPO_PUSH_BATCH_SIZE = 100;
var PUSH_QUEUE_MAX_ATTEMPTS = 5;

function registerPushToken_(payload) {
  var session = requireSession_(payload.token);
  var expoPushToken = clean_(payload.expoPushToken, 240);
  var platform = clean_(payload.platform, 20).toLowerCase();
  if (!isExpoPushToken_(expoPushToken)) throw new Error('Invalid Expo push token.');
  if (['android', 'ios'].indexOf(platform) < 0) throw new Error('Invalid push platform.');

  return withLock_(function () {
    var now = new Date().toISOString();
    var existing = findObject_('DeviceTokens', 'expoPushToken', expoPushToken);
    if (existing && existing._row) {
      if (
        String(existing.userId) !== String(session.userId)
        && clean_(existing.status, 20).toLowerCase() === 'active'
      ) {
        throw new Error('This notification token is already linked to another account.');
      }
      updateObjectAtRow_('DeviceTokens', existing._row, {
        userId: session.userId,
        platform: platform,
        status: 'active',
        lastError: '',
        lastErrorAt: '',
        updatedAt: now
      });
      return { registered: true, id: existing.id };
    }
    var id = 'device-' + Utilities.getUuid();
    appendObject_('DeviceTokens', {
      id: id,
      userId: session.userId,
      expoPushToken: expoPushToken,
      platform: platform,
      status: 'active',
      lastSuccessAt: '',
      lastError: '',
      lastErrorAt: '',
      createdAt: now,
      updatedAt: now
    });
    return { registered: true, id: id };
  });
}

function unregisterPushToken_(payload) {
  var session = requireSession_(payload.token);
  return { unregistered: unregisterPushTokenForUser_(session.userId, payload.expoPushToken) };
}

function unregisterPushTokenForUser_(userId, value) {
  var expoPushToken = clean_(value, 240);
  if (!expoPushToken || !masterSpreadsheet_().getSheetByName('DeviceTokens')) return false;
  var existing = findObject_('DeviceTokens', 'expoPushToken', expoPushToken);
  if (!existing || String(existing.userId) !== String(userId) || !existing._row) return false;
  updateObjectAtRow_('DeviceTokens', existing._row, {
    status: 'inactive',
    updatedAt: new Date().toISOString()
  });
  return true;
}

function isExpoPushToken_(value) {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(String(value || ''));
}

function enqueueAnnouncementPush_(announcementId) {
  var spreadsheet = masterSpreadsheet_();
  if (!spreadsheet.getSheetByName('PushQueue')) {
    console.warn('Push queue is not installed; the announcement remains available in-app.');
    return false;
  }
  announcementId = clean_(announcementId, 160);
  if (!announcementId || findObject_('PushQueue', 'announcementId', announcementId)) return false;
  var now = new Date().toISOString();
  appendObject_('PushQueue', {
    id: 'push-' + Utilities.getUuid(),
    announcementId: announcementId,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now,
    lastError: '',
    createdAt: now,
    updatedAt: now
  });
  return true;
}

function enqueueNewActiveAnnouncements_() {
  var properties = PropertiesService.getScriptProperties();
  var now = new Date();
  var previousCursor = new Date(properties.getProperty('PUSH_SCAN_CURSOR') || now.toISOString());
  var cutoff = new Date(previousCursor.getTime() - 5 * 60 * 1000).getTime();
  objects_('Announcements').filter(function (announcement) {
    var publishedAt = new Date(announcement.publishedAt).getTime();
    return String(announcement.status).toLowerCase() === 'active'
      && publishedAt > cutoff
      && publishedAt <= now.getTime();
  }).forEach(function (announcement) {
    enqueueAnnouncementPush_(announcement.id);
  });
  properties.setProperty('PUSH_SCAN_CURSOR', now.toISOString());
}

function processPushQueue() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { processed: 0, busy: true };
  try {
    var spreadsheet = masterSpreadsheet_();
    if (!spreadsheet.getSheetByName('DeviceTokens') || !spreadsheet.getSheetByName('PushQueue')) {
      throw new Error('Push notifications are not installed. Run installPushNotifications first.');
    }
    enqueueNewActiveAnnouncements_();
    var now = Date.now();
    var queue = objects_('PushQueue').filter(function (item) {
      var status = String(item.status).toLowerCase();
      return ['pending', 'retry'].indexOf(status) >= 0
        && Number(item.attempts || 0) < PUSH_QUEUE_MAX_ATTEMPTS
        && (!item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now);
    }).slice(0, 3);

    var accepted = 0;
    queue.forEach(function (item) {
      var attempts = Number(item.attempts || 0) + 1;
      try {
        var result = sendAnnouncementPush_(item.announcementId);
        accepted += result.accepted;
        updateObjectAtRow_('PushQueue', item._row, {
          status: 'sent',
          attempts: attempts,
          nextAttemptAt: '',
          lastError: '',
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        var finalAttempt = attempts >= PUSH_QUEUE_MAX_ATTEMPTS;
        updateObjectAtRow_('PushQueue', item._row, {
          status: finalAttempt ? 'failed' : 'retry',
          attempts: attempts,
          nextAttemptAt: finalAttempt ? '' : new Date(Date.now() + pushRetryDelayMs_(attempts)).toISOString(),
          lastError: clean_(error && error.message ? error.message : error, 500),
          updatedAt: new Date().toISOString()
        });
      }
    });
    return { processed: queue.length, accepted: accepted, busy: false };
  } finally {
    lock.releaseLock();
  }
}

function sendAnnouncementPush_(announcementId) {
  var announcement = findObject_('Announcements', 'id', announcementId);
  if (!announcement || String(announcement.status).toLowerCase() !== 'active') {
    throw new Error('Announcement is missing or inactive: ' + announcementId);
  }
  var grade = Number(announcement.audienceGrade) || 0;
  var stream = clean_(announcement.audienceStream, 20);
  var usersById = {};
  objects_('Users').forEach(function (user) {
    usersById[String(user.id)] = user;
  });
  var recipients = objects_('DeviceTokens').filter(function (device) {
    if (String(device.status).toLowerCase() !== 'active' || !isExpoPushToken_(device.expoPushToken)) return false;
    var user = usersById[String(device.userId)];
    if (!user || String(user.status).toLowerCase() !== 'active') return false;
    if (grade && Number(user.grade) !== grade) return false;
    if (stream && String(user.stream) !== stream) return false;
    return true;
  });
  if (!recipients.length) return { recipients: 0, accepted: 0, invalid: 0 };

  var accepted = 0;
  var invalid = 0;
  for (var offset = 0; offset < recipients.length; offset += EXPO_PUSH_BATCH_SIZE) {
    var batch = recipients.slice(offset, offset + EXPO_PUSH_BATCH_SIZE);
    var messages = batch.map(function (device) {
      return {
        to: device.expoPushToken,
        sound: 'default',
        title: clean_(announcement.title, 120),
        body: clean_(announcement.body, 500),
        data: { kind: 'announcement', announcementId: String(announcement.id) },
        priority: 'high',
        channelId: 'zemen-announcements',
        ttl: 86400
      };
    });
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(messages),
      muteHttpExceptions: true,
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' }
    };
    var accessToken = PropertiesService.getScriptProperties().getProperty('EXPO_ACCESS_TOKEN');
    if (accessToken) options.headers.Authorization = 'Bearer ' + accessToken;
    var response = UrlFetchApp.fetch(EXPO_PUSH_ENDPOINT, options);
    var statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error('Expo Push Service returned HTTP ' + statusCode + ': ' + clean_(response.getContentText(), 300));
    }
    var parsed = JSON.parse(response.getContentText() || '{}');
    var tickets = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    tickets.forEach(function (ticket, index) {
      var device = batch[index];
      if (!device || !ticket) return;
      var now = new Date().toISOString();
      if (ticket.status === 'ok') {
        accepted += 1;
        updateObjectAtRow_('DeviceTokens', device._row, {
          lastSuccessAt: now, lastError: '', lastErrorAt: '', updatedAt: now
        });
        return;
      }
      var errorCode = ticket.details && ticket.details.error ? String(ticket.details.error) : 'PushRejected';
      if (errorCode === 'DeviceNotRegistered') {
        invalid += 1;
        updateObjectAtRow_('DeviceTokens', device._row, {
          status: 'invalid', lastError: errorCode, lastErrorAt: now, updatedAt: now
        });
      } else {
        updateObjectAtRow_('DeviceTokens', device._row, {
          lastError: errorCode, lastErrorAt: now, updatedAt: now
        });
      }
    });
  }
  return { recipients: recipients.length, accepted: accepted, invalid: invalid };
}

function pushRetryDelayMs_(attempts) {
  return Math.min(15 * 60 * 1000 * Math.pow(2, Math.max(0, Number(attempts) - 1)), 6 * 60 * 60 * 1000);
}

function installPushNotifications() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open the master spreadsheet before installing push notifications.');
  ensureSheetWithHeaders_(spreadsheet, 'DeviceTokens', SHEET_HEADERS.DeviceTokens);
  ensureSheetWithHeaders_(spreadsheet, 'PushQueue', SHEET_HEADERS.PushQueue);
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  properties.setProperty('PUSH_SCAN_CURSOR', new Date().toISOString());
  ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'processPushQueue';
  }).forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('processPushQueue').timeBased().everyMinutes(1).create();
  console.log('Push notifications installed: DeviceTokens, PushQueue, and one-minute worker are ready.');
  return { installed: true, trigger: 'every minute' };
}
