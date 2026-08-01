function doGet(event) {
  var payload = event && event.parameter ? event.parameter : {};
  var action = String(payload.action || 'health');
  return respondSafely_(function () {
    if (['health', 'version'].indexOf(action) < 0) {
      throw new Error('This action requires a POST request.');
    }
    return route_(payload);
  }, action);
}

function doPost(event) {
  var raw = event && event.postData && event.postData.contents ? event.postData.contents : '{}';
  var payload;
  try {
    if (raw.length > 5 * 1024 * 1024) throw new Error('Request is too large.');
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid request.');
  } catch (error) {
    return respondSafely_(function () { throw new Error('Invalid request.'); }, 'general');
  }
  return respondSafely_(function () { return route_(payload); }, String(payload.action || 'general'));
}

function respondSafely_(work, action) {
  try {
    return json_({ ok: true, data: work() });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: publicApiError_(error, action) });
  }
}

function publicApiError_(error, action) {
  var message = String(error && error.message || '').trim();
  var lower = message.toLowerCase();
  if (lower.indexOf('email or password is incorrect') >= 0) return 'Email or password is incorrect.';
  if (lower.indexOf('too many failed attempts') >= 0 || lower.indexOf('too many attempts') >= 0) {
    return 'Too many attempts. Wait a few minutes and try again.';
  }
  if (lower.indexOf('account already exists') >= 0) return 'An account already exists for this email.';
  if (lower.indexOf('valid name') >= 0) return 'Enter a valid name.';
  if (lower.indexOf('valid email') >= 0) return 'Enter a valid email address.';
  if (lower.indexOf('valid phone') >= 0) return 'Enter a valid phone number or leave it empty.';
  if (lower.indexOf('password must be') >= 0) return 'Use a password with at least 8 characters.';
  if (lower.indexOf('device already belongs') >= 0) return 'This device already belongs to another account.';
  if (lower.indexOf('device replacement is temporarily unavailable') >= 0) return message;
  if (lower.indexOf('device is linked to another account') >= 0) return 'This device is linked to another account. Contact support.';
  if (lower.indexOf('session expired') >= 0 || lower.indexOf('authentication required') >= 0) return 'Your session expired. Sign in again.';
  if (lower.indexOf('premium access is required') >= 0) return 'Zemen Premium is required to open this content.';
  if (lower.indexOf('premium subscription is already active') >= 0) return 'Your Premium subscription is already active.';
  if (lower.indexOf('payment request waiting for review') >= 0) return 'Your previous payment request is still waiting for review.';
  if (lower.indexOf('name used for the bank transfer') >= 0) return 'Enter the name used for the bank transfer.';
  if (lower.indexOf('premium plan is no longer available') >= 0) return 'This Premium plan is no longer available.';
  if (lower.indexOf('payment method is no longer available') >= 0) return 'This payment method is no longer available.';
  if (lower.indexOf('password recovery is available') >= 0) return 'Password recovery is available for Premium accounts.';
  if (lower.indexOf('recovery code') >= 0 && (lower.indexOf('incorrect') >= 0 || lower.indexOf('expired') >= 0)) {
    return 'The recovery code is incorrect or expired. Request a new code.';
  }

  var safeByAction = {
    login: 'Sign-in could not be completed. Check your email and password, then try again.',
    signup: 'Your account could not be created right now. Check your details and try again later.',
    requestPasswordReset: 'Password recovery could not be started. Please try again later.',
    confirmPasswordReset: 'The password could not be reset. Please request a new code and try again.',
    announcements: 'Announcements could not be updated. Please try again shortly.',
    catalog: 'Learning content could not be updated. Please try again shortly.',
    questions: 'This quiz could not be opened right now. Please try again.',
    paper: 'This past paper could not be opened right now. Please try again.',
    premiumOverview: 'Premium information could not be updated. Please try again.',
    premiumStatus: 'Premium information could not be updated. Please try again.',
    createPremiumRequest: 'The Premium request could not be submitted. Check the details and try again.',
    cancelPremiumRequest: 'The payment request could not be cancelled. Please try again.',
    registerDevice: 'This device could not be verified right now. Please try again.',
    replaceDevice: 'This device could not be replaced right now. Please try again.',
    updateProfile: 'Your profile could not be updated. Please try again.',
    registerPushToken: 'Notification registration could not be completed. It will retry automatically.',
    unregisterPushToken: 'Notification settings could not be updated. Please try again.',
    syncAttempts: 'Your progress is saved on this device and will sync later.',
    attempts: 'Your saved progress could not be updated. It will retry automatically.',
    reportQuestions: 'Your report is saved on this device and will be sent later.'
  };
  return safeByAction[String(action || '')] || 'The request could not be completed. Please try again.';
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function route_(payload) {
  var action = String(payload.action || 'health');
  switch (action) {
    case 'health': return { status: 'ok', version: PropertiesService.getScriptProperties().getProperty('APP_VERSION') || '1.0.0' };
    case 'signup': return signup_(payload);
    case 'login': return login_(payload);
    case 'requestPasswordReset': return requestPasswordReset_(payload);
    case 'confirmPasswordReset': return confirmPasswordReset_(payload);
    case 'logout': return logout_(payload);
    case 'updateProfile': return updateProfile_(payload);
    case 'catalog': return catalog_(payload);
    case 'announcements': return announcements_(payload);
    case 'questions': return questions_(payload);
    case 'paper': return paper_(payload);
    case 'syncAttempts': return syncAttempts_(payload);
    case 'attempts': return attempts_(payload);
    case 'reportQuestions': return reportQuestions_(payload);
    case 'version': return version_();
    case 'premiumOverview': return premiumOverview_(payload);
    case 'premiumStatus': return premiumStatus_(payload);
    case 'createPremiumRequest': return createPremiumRequest_(payload);
    case 'cancelPremiumRequest': return cancelPremiumRequest_(payload);
    case 'registerDevice': return registerDeviceObservation_(payload);
    case 'replaceDevice': return replaceCurrentDevice_(payload);
    case 'registerPushToken': return registerPushToken_(payload);
    case 'unregisterPushToken': return unregisterPushToken_(payload);
    default: throw new Error('Unknown action.');
  }
}

function signup_(payload) {
  var name = clean_(payload.name, 80).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  var email = clean_(payload.email, 160).toLowerCase();
  var password = String(payload.password || '');
  var phone = safeSheetText_(payload.phone, 30);
  var identity = normalizeDeviceIdentity_(payload);
  if (name.length < 2 || /^[=+\-@]/.test(name)) throw new Error('A valid name is required.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid email is required.');
  if (password.length < 8 || password.length > 128) throw new Error('Password must be 8–128 characters.');

  var phoneDigits = phone.replace(/\D/g, '');
  if (phone && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
    throw new Error('Enter a valid phone number or leave it empty.');
  }
  enforceSignupRateLimit_(email, identity.installationId);

  var user = withLock_(function () {
    if (findObject_('Users', 'email', email)) throw new Error('An account already exists for this email.');
    var deviceAlreadyLinked = objects_('UserDevices').some(function (device) {
      return clean_(device.status, 20).toLowerCase() === 'active'
        && clean_(device.installationId, 80).toLowerCase() === identity.installationId;
    });
    if (deviceAlreadyLinked) {
      throw new Error('This device already belongs to a Zemen Academy account. Sign in with that account or contact support.');
    }
    var now = new Date().toISOString();
    var salt = Utilities.getUuid();
    var user = {
      id: 'user-' + Utilities.getUuid(), name: name, email: email,
      passwordHash: passwordHash_(password, salt), passwordSalt: salt,
      grade: '', stream: '', language: 'en', isPremium: false,
      status: 'active', createdAt: now, updatedAt: now,
      premiumPlanId: '', premiumStartedAt: '', premiumUntil: '', premiumStatus: 'free',
      phone: phone, dailyQuizGoal: 1
    };
    appendObject_('Users', user);
    return user;
  });
  return authResult_(user, payload);
}

function login_(payload) {
  var email = clean_(payload.email, 160).toLowerCase();
  var password = String(payload.password || '');
  normalizeDeviceIdentity_(payload);
  enforceRateLimit_(email);
  var user = findObject_('Users', 'email', email);
  var valid = user
    && clean_(user.status, 20).toLowerCase() === 'active'
    && verifyPassword_(user, password);
  if (!valid) {
    logAuthenticationFailure_(email, user);
    recordFailedLogin_(email);
    throw new Error('Email or password is incorrect.');
  }
  clearFailedLogin_(email);
  return authResult_(user, payload);
}

function requestPasswordReset_(payload) {
  var response = {
    accepted: true,
    message: 'If an active account uses that email, a verification code will arrive shortly.'
  };
  var email = clean_(payload.email, 160).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return response;
  if (!allowPasswordResetRequest_(email)) return response;
  var user = findObject_('Users', 'email', email);
  if (!user || clean_(user.status, 20).toLowerCase() !== 'active') return response;
  if (!premiumEntitlementForUser_(user).isPremium) return response;

  var remainingEmailQuota;
  try {
    remainingEmailQuota = MailApp.getRemainingDailyQuota();
  } catch (error) {
    console.error('Password-reset email authorization is missing: ' + (error && error.message ? error.message : error));
    throw new Error('Password recovery email is temporarily unavailable. Please try again later.');
  }
  if (remainingEmailQuota < 1) {
    console.error('Password-reset email quota is exhausted.');
    throw new Error('Password recovery email is temporarily unavailable. Please try again later.');
  }

  var emailHash = passwordResetEmailHash_(email);
  var oneHourAgo = Date.now() - 60 * 60 * 1000;
  var recentRequests = objects_('PasswordResets').filter(function (item) {
    return String(item.userId) === String(user.id)
      && String(item.emailHash) === emailHash
      && new Date(item.createdAt).getTime() > oneHourAgo;
  }).length;
  if (recentRequests >= 3) return response;
  var now = new Date();
  var reset = withLock_(function () {
    objects_('PasswordResets').filter(function (item) {
      return String(item.userId) === String(user.id) && !item.usedAt;
    }).forEach(function (item) {
      updateObjectAtRow_('PasswordResets', item._row, { usedAt: now.toISOString() });
    });

    var id = 'reset-' + Utilities.getUuid();
    var code = passwordResetCode_();
    var record = {
      id: id,
      userId: user.id,
      emailHash: emailHash,
      codeHash: passwordResetCodeHash_(id, code),
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      attempts: 0,
      usedAt: '',
      createdAt: now.toISOString()
    };
    appendObject_('PasswordResets', record);
    record.code = code;
    return record;
  });

  try {
    MailApp.sendEmail({
      to: email,
      name: 'Zemen Academy',
      subject: 'Your Zemen Academy password reset code',
      body: passwordResetEmailText_(user.name, reset.code),
      htmlBody: passwordResetEmailHtml_(user.name, reset.code),
      replyTo: 'zemenacademy@gmail.com'
    });
  } catch (error) {
    var failedReset = findObject_('PasswordResets', 'id', reset.id);
    if (failedReset && failedReset._row) {
      updateObjectAtRow_('PasswordResets', failedReset._row, { usedAt: new Date().toISOString() });
    }
    console.error('Password-reset email delivery failed: ' + (error && error.message ? error.message : error));
  }
  return response;
}

function passwordResetEmailText_(name, code) {
  var studentName = clean_(name, 80);
  var greeting = studentName ? 'Hello ' + studentName + ',' : 'Hello,';
  return greeting + '\n\n'
    + 'We received a request to reset your Zemen Academy password.\n\n'
    + 'Your verification code is:\n\n'
    + String(code) + '\n\n'
    + 'This code expires in 15 minutes and can be used only once.\n\n'
    + 'If you did not request a password reset, you can safely ignore this email. '
    + 'Never share this code with anyone.\n\n'
    + 'Zemen Academy\n'
    + 'zemenacademy@gmail.com';
}

function passwordResetEmailHtml_(name, code) {
  var studentName = escapeEmailHtml_(clean_(name, 80));
  var safeCode = escapeEmailHtml_(String(code));
  var greeting = studentName ? 'Hello ' + studentName + ',' : 'Hello,';
  return '<!doctype html>'
    + '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
    + '<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:Arial,Helvetica,sans-serif;color:#111113;">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">'
    + 'Your Zemen Academy verification code is ' + safeCode + '. It expires in 15 minutes.'
    + '</div>'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F4F4F5;">'
    + '<tr><td align="center" style="padding:32px 16px;">'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E4E4E7;border-radius:20px;overflow:hidden;">'
    + '<tr><td style="height:8px;background-color:#F59E0B;font-size:0;line-height:0;">&nbsp;</td></tr>'
    + '<tr><td style="padding:30px 32px 12px;text-align:center;">'
    + '<div style="font-size:25px;font-weight:800;letter-spacing:5px;color:#09090A;">ZEMEN</div>'
    + '<div style="margin-top:5px;font-size:11px;font-weight:600;letter-spacing:7px;color:#52525B;">ACADEMY</div>'
    + '</td></tr>'
    + '<tr><td style="padding:18px 32px 32px;">'
    + '<h1 style="margin:0 0 12px;font-size:27px;line-height:34px;text-align:center;color:#09090A;">Reset your password</h1>'
    + '<p style="margin:0 0 16px;font-size:16px;line-height:25px;color:#3F3F46;">' + greeting + '</p>'
    + '<p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#3F3F46;">We received a request to reset your Zemen Academy password. Enter this verification code in the app:</p>'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
    + '<tr><td align="center" style="padding:22px 12px;background-color:#FAFAFA;border:2px solid #18181B;border-radius:14px;">'
    + '<div dir="ltr" style="font-family:Consolas,Monaco,\'Courier New\',monospace;font-size:36px;line-height:44px;font-weight:800;letter-spacing:9px;color:#09090A;user-select:all;">' + safeCode + '</div>'
    + '</td></tr></table>'
    + '<p style="margin:12px 0 24px;font-size:13px;line-height:20px;text-align:center;color:#71717A;">Tap and hold the code to copy it, or let your phone fill it automatically.</p>'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">'
    + '<tr><td style="padding:14px 16px;background-color:#FFF7E6;border-radius:12px;font-size:14px;line-height:21px;color:#713F12;">'
    + '<strong>Expires in 15 minutes.</strong> This code can be used only once.'
    + '</td></tr></table>'
    + '<p style="margin:0;font-size:14px;line-height:22px;color:#52525B;">If you did not request a password reset, you can safely ignore this email. Never share this code with anyone.</p>'
    + '</td></tr>'
    + '<tr><td style="padding:22px 32px;background-color:#18181B;text-align:center;">'
    + '<p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#F4F4F5;">Zemen Academy &middot; Learn with confidence</p>'
    + '<a href="mailto:zemenacademy@gmail.com" style="font-size:13px;line-height:20px;color:#FBBF24;text-decoration:none;">zemenacademy@gmail.com</a>'
    + '</td></tr></table>'
    + '</td></tr></table>'
    + '</body></html>';
}

function escapeEmailHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function confirmPasswordReset_(payload) {
  var email = clean_(payload.email, 160).toLowerCase();
  var code = clean_(payload.code, 12).replace(/\s/g, '');
  var newPassword = String(payload.newPassword || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) {
    throw new Error('The verification code is invalid or has expired.');
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    throw new Error('Password must be 8–128 characters.');
  }
  enforcePasswordResetConfirmationLimit_(email);

  return withLock_(function () {
    var user = findObject_('Users', 'email', email);
    if (user && clean_(user.status, 20).toLowerCase() !== 'active') user = null;
    if (user && !premiumEntitlementForUser_(user).isPremium) user = null;
    var resets = user ? objects_('PasswordResets').filter(function (item) {
      return String(item.userId) === String(user.id)
        && !item.usedAt
        && new Date(item.expiresAt).getTime() > Date.now();
    }).sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }) : [];
    var reset = resets[0] || null;
    var expectedHash = reset
      ? String(reset.codeHash || '').trim()
      : passwordResetCodeHash_('missing-reset', code);
    var suppliedHash = passwordResetCodeHash_(reset ? reset.id : 'missing-reset', code);
    var valid = reset
      && Number(reset.attempts || 0) < 5
      && constantTimeEqual_(expectedHash, suppliedHash);
    if (!valid) {
      if (reset && reset._row) {
        var attempts = Number(reset.attempts || 0) + 1;
        updateObjectAtRow_('PasswordResets', reset._row, {
          attempts: attempts,
          usedAt: attempts >= 5 ? new Date().toISOString() : ''
        });
      }
      recordPasswordResetConfirmationFailure_(email);
      throw new Error('The verification code is invalid or has expired.');
    }

    var now = new Date().toISOString();
    var salt = Utilities.getUuid();
    updateObjectAtRow_('Users', user._row, {
      passwordHash: passwordHash_(newPassword, salt),
      passwordSalt: salt,
      updatedAt: now
    });
    updateObjectAtRow_('PasswordResets', reset._row, { usedAt: now });
    revokeUserSessions_(user.id, now);
    clearFailedLogin_(email);
    clearPasswordResetLimits_(email);
    return { reset: true };
  });
}

function passwordResetCode_() {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + '|' + new Date().getTime() + '|' + Utilities.getUuid()
  );
  var value = (((bytes[0] & 255) << 24) | ((bytes[1] & 255) << 16)
    | ((bytes[2] & 255) << 8) | (bytes[3] & 255)) >>> 0;
  return String(value % 1000000).padStart(6, '0');
}

function passwordResetEmailHash_(email) { return hmac_('password-reset-email|' + email); }
function passwordResetCodeHash_(id, code) { return hmac_('password-reset-code|' + id + '|' + code); }
function passwordResetRateKey_(kind, email) { return 'password-reset:' + kind + ':' + rateKey_(email); }

function allowPasswordResetRequest_(email) {
  var cache = CacheService.getScriptCache();
  var key = passwordResetRateKey_('request', email);
  var count = Number(cache.get(key) || 0);
  if (count >= 3) return false;
  cache.put(key, String(count + 1), 3600);
  return true;
}

function enforcePasswordResetConfirmationLimit_(email) {
  var count = Number(CacheService.getScriptCache().get(passwordResetRateKey_('confirm', email)) || 0);
  if (count >= 10) throw new Error('Too many attempts. Request a new code later.');
}

function recordPasswordResetConfirmationFailure_(email) {
  var cache = CacheService.getScriptCache();
  var key = passwordResetRateKey_('confirm', email);
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 900);
}

function clearPasswordResetLimits_(email) {
  var cache = CacheService.getScriptCache();
  cache.remove(passwordResetRateKey_('request', email));
  cache.remove(passwordResetRateKey_('confirm', email));
}

function revokeUserSessions_(userId, revokedAt) {
  var cache = CacheService.getScriptCache();
  objects_('Sessions').filter(function (session) {
    return String(session.userId) === String(userId) && !session.revokedAt;
  }).forEach(function (session) {
    updateObjectAtRow_('Sessions', session._row, { revokedAt: revokedAt });
    cache.remove(sessionCacheKey_(String(session.tokenHash)));
  });
}

function authResult_(user, devicePayload) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  var now = new Date();
  var hash = tokenHash_(token);
  var result = withLock_(function () {
    var registration = registerDeviceForUser_(user.id, devicePayload);
    var session = {
      id: 'session-' + Utilities.getUuid(), userId: user.id, tokenHash: hash,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: '', createdAt: now.toISOString(),
      installationId: registration.installationId,
      deviceAuthorized: registration.policy.accessAllowed
    };
    appendObject_('Sessions', session);
    return { session: session, registration: registration };
  });
  var session = result.session;
  cachePutSafely_(sessionCacheKey_(hash), JSON.stringify(session), 21600);
  var hasProfile = Boolean(user.grade);
  return {
    token: token,
    user: publicUser_(user),
    preferences: hasProfile ? {
      grade: Number(user.grade),
      stream: user.stream || undefined,
      language: user.language || 'en',
      theme: 'system',
      reminderTime: '19:00',
      dailyQuizGoal: normalizeDailyQuizGoal_(user.dailyQuizGoal)
    } : undefined,
    devicePolicy: result.registration.policy
  };
}

function logout_(payload) {
  var session = requireBasicSession_(payload.token);
  if (payload.expoPushToken) unregisterPushTokenForUser_(session.userId, payload.expoPushToken);
  var stored = session._row ? session : findObject_('Sessions', 'id', session.id);
  if (!stored || !stored._row) throw new Error('Session could not be revoked.');
  updateObjectAtRow_('Sessions', stored._row, { revokedAt: new Date().toISOString() });
  CacheService.getScriptCache().remove(sessionCacheKey_(tokenHash_(payload.token)));
  return { loggedOut: true };
}

function updateProfile_(payload) {
  var session = requireSession_(payload.token);
  var preferences = payload.preferences || {};
  var grade = Number(preferences.grade);
  var stream = clean_(preferences.stream, 20);
  var language = clean_(preferences.language, 5);
  if ([9, 10, 11, 12].indexOf(grade) < 0) throw new Error('Invalid grade.');
  if (grade >= 11 && ['Natural', 'Social'].indexOf(stream) < 0) throw new Error('Invalid stream.');
  if (['en', 'am'].indexOf(language) < 0) throw new Error('Invalid language.');
  var user = findObject_('Users', 'id', session.userId);
  var dailyQuizGoal = preferences.dailyQuizGoal === undefined
    ? normalizeDailyQuizGoal_(user.dailyQuizGoal)
    : normalizeDailyQuizGoal_(preferences.dailyQuizGoal);
  updateObjectAtRow_('Users', user._row, {
    grade: grade,
    stream: grade >= 11 ? stream : '',
    language: language,
    dailyQuizGoal: dailyQuizGoal,
    updatedAt: new Date().toISOString()
  });
  return { updated: true };
}

function catalog_(payload) {
  var grade = Number(payload.grade);
  var stream = clean_(payload.stream, 20);
  if ([9, 10, 11, 12].indexOf(grade) < 0) throw new Error('Invalid grade.');
  var cache = CacheService.getScriptCache();
  var cacheKey = catalogCacheKey_(grade, stream);
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var subjects = objects_('Subjects').filter(function (item) {
    return item.status === 'active' && Number(item.grade) === grade && (grade < 11 || item.stream === stream);
  }).map(mapSubject_);
  var unitsById = {};
  subjects.forEach(function (subject) {
    var spreadsheet = contentSpreadsheetForSubject_(subject.id);
    var sourceUnits;
    try {
      sourceUnits = objectsFromSpreadsheet_(spreadsheet, 'Units');
    } catch (error) {
      console.error('Falling back to master Units for ' + subject.id + ': ' + error.message);
      sourceUnits = objects_('Units');
    }
    sourceUnits.filter(function (item) {
      return item.status === 'active' && item.subjectId === subject.id;
    }).forEach(function (item) {
      unitsById[String(item.id)] = mapUnit_(item);
    });
  });
  var units = Object.keys(unitsById).map(function (id) { return unitsById[id]; });
  var papers = objects_('PastPapers').filter(function (item) {
    return item.status === 'active' && Number(item.grade) === grade && (grade < 11 || item.stream === stream);
  }).map(mapPaper_);
  var now = Date.now();
  var announcements = objects_('Announcements').filter(function (item) {
    var gradeMatch = !item.audienceGrade || Number(item.audienceGrade) === grade;
    var streamMatch = !item.audienceStream || item.audienceStream === stream;
    return item.status === 'active' && gradeMatch && streamMatch && new Date(item.publishedAt).getTime() <= now;
  }).map(function (item) {
    return { id: item.id, title: item.title, body: item.body, publishedAt: iso_(item.publishedAt) };
  });
  var result = { subjects: subjects, units: units, pastPapers: papers, announcements: announcements };
  cachePutSafely_(cacheKey, JSON.stringify(result), 300);
  return result;
}

function announcements_(payload) {
  var grade = Number(payload.grade);
  var stream = clean_(payload.stream, 20);
  if ([9, 10, 11, 12].indexOf(grade) < 0) throw new Error('Invalid grade.');

  var cache = CacheService.getScriptCache();
  var cacheKey = 'announcements:v1:' + String(grade) + ':' + String(stream || '');
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var now = Date.now();
  var announcements = objects_('Announcements').filter(function (item) {
    var gradeMatch = !item.audienceGrade || Number(item.audienceGrade) === grade;
    var streamMatch = !item.audienceStream || item.audienceStream === stream;
    return item.status === 'active' && gradeMatch && streamMatch && new Date(item.publishedAt).getTime() <= now;
  }).map(function (item) {
    return { id: item.id, title: item.title, body: item.body, publishedAt: iso_(item.publishedAt) };
  }).sort(function (left, right) {
    return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
  });

  var result = { announcements: announcements };
  cachePutSafely_(cacheKey, JSON.stringify(result), 60);
  return result;
}

function questions_(payload) {
  var unitId = clean_(payload.unitId, 120);
  var subjectId = clean_(payload.subjectId, 120);
  var cache = CacheService.getScriptCache();
  var resolved = resolveUnitContent_(unitId, subjectId);
  var unit = resolved.unit;
  if (!unit || unit.status !== 'active') throw new Error('Unit not found.');
  var accessTier = unitAccessTier_(unit);
  if (accessTier === 'premium') requirePremiumAccess_(payload.token);
  var cacheKey = questionCacheKey_(subjectId, unitId, Number(unit.version) || 1);
  var cached = getCachedQuestionResult_(cache, accessTier === 'free' ? 'public:' + cacheKey : cacheKey);
  if (cached) return cached;
  var indexes = { A: 0, B: 1, C: 2, D: 3 };
  var questionRows;
  try {
    questionRows = questionRowsForUnit_(resolved.spreadsheet, unit);
  } catch (error) {
    var master = masterSpreadsheet_();
    if (resolved.spreadsheet.getId() === master.getId()) throw error;
    console.error('Falling back to master Questions for ' + unitId + ': ' + error.message);
    var masterUnit = findObjectInSpreadsheet_(master, 'Units', 'id', unitId);
    if (!masterUnit) throw error;
    questionRows = questionRowsForUnit_(master, masterUnit);
  }
  var questions = questionRows.map(function (item) {
    var rawAnswer = String(item.correctAnswer).toUpperCase();
    var answer = indexes[rawAnswer];
    if (answer === undefined) answer = Number(item.correctAnswer);
    if ([0, 1, 2, 3].indexOf(answer) < 0) throw new Error('Invalid correct answer for question ' + item.id + '.');
    var prompt = String(item.question || '').trim();
    var options = [item.optionA, item.optionB, item.optionC, item.optionD].map(function (option) {
      return String(option || '').trim();
    });
    var explanation = String(item.explanation || '').trim();
    if (!prompt) throw new Error('Question text is missing for ' + item.id + '.');
    if (options.some(function (option) { return !option; })) {
      throw new Error('All four options are required for question ' + item.id + '.');
    }
    if (!explanation) throw new Error('An explanation is required for question ' + item.id + '.');
    return {
      id: item.id, unitId: item.unitId, prompt: prompt,
      options: options,
      correctAnswer: answer, explanation: explanation, order: Number(item.order)
    };
  });
  var result = { questions: questions };
  cacheQuestionResult_(cache, cacheKey, questions, 300);
  if (accessTier === 'free') cacheQuestionResult_(cache, 'public:' + cacheKey, questions, 300);
  return result;
}

function paper_(payload) {
  var paperId = clean_(payload.paperId, 120);
  var paper = findObject_('PastPapers', 'id', paperId);
  if (!paper || paper.status !== 'active') throw new Error('Paper not found.');
  if (paperAccessTier_(paper) === 'premium') requirePremiumAccess_(payload.token);
  var cache = CacheService.getScriptCache();
  var cacheKey = 'paper:v2:' + paperId + ':v' + Math.max(1, Number(paper.version) || 1);
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  if (!paper.content) throw new Error('Paper content has not been added.');
  var result = { paper: mapPaper_(paper), content: String(paper.content) };
  cachePutSafely_(cacheKey, JSON.stringify(result), 300);
  return result;
}

function syncAttempts_(payload) {
  var session = requireSession_(payload.token);
  var attempts = Array.isArray(payload.attempts) ? payload.attempts.slice(0, 50) : [];
  var existing = {};
  objects_('Attempts').forEach(function (item) { existing[String(item.id)] = String(item.userId); });
  var syncedIds = [];
  withLock_(function () {
    attempts.forEach(function (attempt) {
      var id = validatedIdentifier_(attempt.id, 'attempt');
      var unitId = validatedIdentifier_(attempt.unitId, 'unit');
      var mode = clean_(attempt.mode, 20);
      var endReason = clean_(attempt.endReason, 30);
      var questions = Array.isArray(attempt.questions) ? attempt.questions : [];
      var answers = Array.isArray(attempt.answers) ? attempt.answers : [];
      if (['instant', 'exam'].indexOf(mode) < 0) throw new Error('Invalid attempt mode.');
      if (['submitted', 'time-expired', 'left-app', 'quit'].indexOf(endReason) < 0) throw new Error('Invalid attempt end reason.');
      if (!questions.length || questions.length > 500 || answers.length > questions.length) {
        throw new Error('Invalid attempt question data.');
      }
      questions = questions.map(function (question) {
        var correctAnswer = question && Number(question.correctAnswer);
        if ([0, 1, 2, 3].indexOf(correctAnswer) < 0) throw new Error('Invalid attempt answer key.');
        return { correctAnswer: correctAnswer };
      });
      var normalizedAnswers = answers.map(function (answer) {
        if (answer === null || answer === undefined) return null;
        var index = Number(answer);
        if ([0, 1, 2, 3].indexOf(index) < 0) throw new Error('Invalid attempt answer.');
        return index;
      });
      var completedTime = new Date(attempt.completedAt).getTime();
      if (!isFinite(completedTime) || completedTime > Date.now() + 5 * 60 * 1000) {
        throw new Error('Invalid attempt completion time.');
      }
      var durationSeconds = Math.max(0, Math.min(12 * 60 * 60, Number(attempt.durationSeconds) || 0));
      if (existing[id] && existing[id] !== String(session.userId)) {
        throw new Error('Attempt identifier is already in use.');
      }
      if (!existing[id]) {
        var score = score_(questions, normalizedAnswers);
        appendObject_('Attempts', {
          id: id, userId: session.userId, unitId: unitId, mode: mode,
          answersJson: JSON.stringify(normalizedAnswers), correct: score.correct, wrong: score.wrong,
          skipped: score.skipped, durationSeconds: durationSeconds,
          endReason: endReason, completedAt: new Date(completedTime).toISOString(), createdAt: new Date().toISOString()
        });
        existing[id] = String(session.userId);
      }
      syncedIds.push(id);
    });
  });
  return { syncedIds: syncedIds };
}

function attempts_(payload) {
  var session = requireSession_(payload.token);
  var attempts = objects_('Attempts').filter(function (attempt) {
    return String(attempt.userId) === String(session.userId);
  }).sort(function (left, right) {
    return new Date(right.completedAt || right.createdAt).getTime()
      - new Date(left.completedAt || left.createdAt).getTime();
  }).slice(0, 1000).map(function (attempt) {
    var correct = Math.max(0, Number(attempt.correct) || 0);
    var wrong = Math.max(0, Number(attempt.wrong) || 0);
    var skipped = Math.max(0, Number(attempt.skipped) || 0);
    var durationSeconds = Math.max(0, Number(attempt.durationSeconds) || 0);
    var completedAt = safeIso_(attempt.completedAt || attempt.createdAt);
    var completedTime = new Date(completedAt).getTime();
    return {
      id: clean_(attempt.id, 120),
      unitId: clean_(attempt.unitId, 120),
      mode: clean_(attempt.mode, 20) === 'exam' ? 'exam' : 'instant',
      questions: [],
      answers: [],
      startedAt: new Date(completedTime - durationSeconds * 1000).toISOString(),
      completedAt: completedAt,
      durationSeconds: durationSeconds,
      endReason: clean_(attempt.endReason, 30) || 'submitted',
      synced: true,
      remoteOnly: true,
      scoreSnapshot: {
        total: correct + wrong + skipped,
        correct: correct,
        wrong: wrong,
        skipped: skipped,
        percentage: correct + wrong + skipped
          ? Math.round(correct / (correct + wrong + skipped) * 100)
          : 0
      }
    };
  });
  return { attempts: attempts };
}

function reportQuestions_(payload) {
  var reports = Array.isArray(payload.reports) ? payload.reports.slice(0, 25) : [];
  if (!reports.length) throw new Error('At least one question report is required.');

  var session = optionalSession_(payload.token);
  var allowedCategories = ['answer-key', 'question-content', 'formatting', 'options', 'typo', 'other'];
  var allowedModes = ['instant', 'exam'];
  var seenInRequest = {};
  var normalized = reports.map(function (report) {
    var id = clean_(report.id, 120);
    var reporterId = session ? String(session.userId) : clean_(report.reporterId, 120);
    var category = clean_(report.category, 40);
    var mode = clean_(report.mode, 20);
    if (!id || seenInRequest[id]) throw new Error('Each report requires a unique ID.');
    if (!reporterId) throw new Error('A reporter ID is required.');
    if (!clean_(report.questionId, 120) || !clean_(report.unitId, 120)) throw new Error('Question and unit IDs are required.');
    if (allowedCategories.indexOf(category) < 0) throw new Error('Invalid report category.');
    if (allowedModes.indexOf(mode) < 0) throw new Error('Invalid quiz mode.');
    seenInRequest[id] = true;

    return {
      id: id,
      questionId: clean_(report.questionId, 120),
      unitId: clean_(report.unitId, 120),
      subjectId: clean_(report.subjectId, 120),
      userId: reporterId,
      isGuest: session ? false : report.isGuest === true,
      verifiedUser: Boolean(session),
      mode: mode,
      category: category,
      note: safeSheetText_(report.note, 500),
      questionNumber: Math.max(1, Number(report.questionNumber) || 1),
      selectedAnswer: answerLabel_(report.selectedAnswer),
      correctAnswer: answerLabel_(report.correctAnswer),
      question: safeSheetText_(report.prompt, 2000),
      optionsJson: JSON.stringify(Array.isArray(report.options) ? report.options.slice(0, 4) : []),
      status: 'open',
      createdAt: safeIso_(report.createdAt),
      updatedAt: new Date().toISOString()
    };
  });

  var reportedIds = [];
  withLock_(function () {
    var existing = {};
    objects_('QuestionReports').forEach(function (item) { existing[String(item.id)] = true; });
    var newReports = normalized.filter(function (report) {
      reportedIds.push(report.id);
      return !existing[report.id];
    });
    if (!newReports.length) return;

    enforceQuestionReportRateLimit_(session ? String(session.userId) : normalized[0].userId, newReports.length);
    var headers = SHEET_HEADERS.QuestionReports;
    var sheet = sheet_('QuestionReports');
    var values = newReports.map(function (report) {
      return headers.map(function (header) { return report[header] === undefined ? '' : report[header]; });
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  });
  return { reportedIds: reportedIds };
}

function enforceQuestionReportRateLimit_(reporterId, count) {
  var cache = CacheService.getScriptCache();
  var key = 'question-reports:' + hmac_(String(reporterId)).slice(0, 32);
  var recent = Number(cache.get(key)) || 0;
  var globalKey = 'question-reports:global';
  var globalRecent = Number(cache.get(globalKey)) || 0;
  if (recent + count > 30) throw new Error('Too many reports were submitted. Please try again later.');
  if (globalRecent + count > 300) throw new Error('Question reporting is temporarily busy. Please try again later.');
  cache.put(key, String(recent + count), 600);
  cache.put(globalKey, String(globalRecent + count), 600);
}

function answerLabel_(value) {
  if (value === null || value === undefined || value === '') return '';
  var index = Number(value);
  return index >= 0 && index <= 3 ? ['A', 'B', 'C', 'D'][index] : '';
}

function version_() {
  var row = objects_('Versions').filter(function (item) { return item.platform === 'android'; })[0];
  return row || { latestVersion: '1.0.0', minimumVersion: '1.0.0', message: '' };
}

function premiumStatus_(payload) {
  var session = requireSession_(payload.token);
  var user = findObject_('Users', 'id', session.userId);
  if (!user) throw new Error('Account not found.');
  return premiumEntitlementForUser_(user);
}

function premiumOverview_(payload) {
  var entitlement = null;
  var request = null;
  if (payload.includeEntitlement === true || String(payload.includeEntitlement).toLowerCase() === 'true') {
    var session = requireSession_(payload.token);
    var user = findObject_('Users', 'id', session.userId);
    if (!user) throw new Error('Account not found.');
    entitlement = premiumEntitlementForUser_(user);
    request = latestPremiumRequestForUser_(session.userId);
  }
  return {
    plans: activePremiumPlans_(),
    paymentMethods: activePremiumPaymentMethods_(),
    entitlement: entitlement,
    request: request,
    refreshedAt: new Date().toISOString()
  };
}

function activePremiumPlans_() {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'premium-plans:v1';
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  var plans = objects_('PremiumPlans').filter(function (plan) {
    return clean_(plan.status, 20).toLowerCase() === 'active';
  }).map(function (plan) {
    return {
      id: clean_(plan.id, 80),
      name: clean_(plan.name, 80),
      durationDays: Math.max(1, Number(plan.durationDays) || 1),
      priceEtb: Math.max(0, Number(plan.priceEtb) || 0),
      badge: clean_(plan.badge, 80) || null,
      description: clean_(plan.description, 240) || null,
      order: Number(plan.order) || 0
    };
  }).filter(function (plan) {
    return Boolean(plan.id && plan.name);
  }).sort(function (left, right) {
    return left.order - right.order;
  });
  cachePutSafely_(cacheKey, JSON.stringify(plans), 300);
  return plans;
}

function activePremiumPaymentMethods_() {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'premium-payment-methods:v2';
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  var methods = objects_('PaymentMethods').filter(function (method) {
    return clean_(method.status, 20).toLowerCase() === 'active';
  }).map(function (method) {
    return {
      id: clean_(method.id, 80),
      name: clean_(method.name, 100),
      accountName: clean_(method.accountName, 100),
      accountNumber: clean_(method.accountNumber, 60),
      instructions: clean_(method.instructions, 240) || null,
      order: Number(method.order) || 0
    };
  }).filter(function (method) {
    return Boolean(method.id && method.name && method.accountName && method.accountNumber);
  }).sort(function (left, right) {
    return left.order - right.order;
  });
  cachePutSafely_(cacheKey, JSON.stringify(methods), 300);
  return methods;
}

function latestPremiumRequestForUser_(userId) {
  var requests = objects_('PremiumRequests').filter(function (request) {
    return String(request.userId) === String(userId);
  }).sort(function (left, right) {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
  return requests.length ? mapPremiumRequest_(requests[0]) : null;
}

function mapPremiumRequest_(request) {
  return {
    id: String(request.id),
    requestCode: String(request.requestCode),
    planId: String(request.planId),
    amountEtb: Number(request.amountEtb) || 0,
    durationDays: Number(request.durationDays) || 0,
    paymentMethodId: String(request.bank),
    senderName: String(request.senderName),
    phone: String(request.phone || ''),
    transactionReference: String(request.transactionReference),
    paymentDate: String(request.paymentDate),
    note: String(request.note || ''),
    status: clean_(request.status, 30).toLowerCase(),
    reviewNote: String(request.reviewNote || ''),
    createdAt: optionalIso_(request.createdAt),
    updatedAt: optionalIso_(request.updatedAt),
    reviewedAt: optionalIso_(request.reviewedAt)
  };
}

function createPremiumRequestLegacy_(payload) {
  var session = requireSession_(payload.token);
  var planId = clean_(payload.planId, 80);
  var paymentMethodId = clean_(payload.paymentMethodId, 80);
  var senderName = safeSheetText_(payload.senderName, 100);
  var transactionReference = safeSheetText_(payload.transactionReference, 100);
  var paymentDate = clean_(payload.paymentDate, 20);
  var note = safeSheetText_(payload.note, 500);
  if (senderName.length < 2) throw new Error('Enter the bank account holder name.');
  if (transactionReference.length < 4) throw new Error('Enter a valid transaction reference.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) throw new Error('Enter a valid payment date.');
  var paymentTime = new Date(paymentDate + 'T12:00:00Z').getTime();
  if (!isFinite(paymentTime) || paymentTime > Date.now() + 24 * 60 * 60 * 1000 || paymentTime < Date.now() - 31 * 24 * 60 * 60 * 1000) {
    throw new Error('Payment date must be within the last 30 days.');
  }

  return withLock_(function () {
    var user = findObject_('Users', 'id', session.userId);
    if (!user) throw new Error('Account not found.');
    if (premiumEntitlementForUser_(user).isPremium) throw new Error('Your Premium subscription is already active.');
    var plan = objects_('PremiumPlans').filter(function (item) {
      return String(item.id) === planId && clean_(item.status, 20).toLowerCase() === 'active';
    })[0];
    if (!plan) throw new Error('This premium plan is no longer available.');
    var method = activePremiumPaymentMethods_().filter(function (item) {
      return String(item.id) === paymentMethodId;
    })[0];
    if (!method) throw new Error('This payment method is no longer available.');
    var requests = objects_('PremiumRequests');
    var open = requests.filter(function (request) {
      var status = clean_(request.status, 30).toLowerCase();
      return String(request.userId) === String(session.userId) && ['pending', 'under-review'].indexOf(status) >= 0;
    })[0];
    if (open) throw new Error('You already have a payment request waiting for review.');
    var duplicateReference = requests.some(function (request) {
      return clean_(request.transactionReference, 100).toLowerCase() === transactionReference.toLowerCase()
        && ['cancelled', 'rejected'].indexOf(clean_(request.status, 30).toLowerCase()) < 0;
    });
    if (duplicateReference) throw new Error('This transaction reference has already been submitted.');
    var now = new Date().toISOString();
    var request = {
      id: 'premium-request-' + Utilities.getUuid(),
      requestCode: premiumRequestCode_(),
      userId: session.userId,
      email: user.email,
      planId: planId,
      amountEtb: Number(plan.priceEtb) || 0,
      durationDays: Math.floor(Number(plan.durationDays) || 0),
      bank: paymentMethodId,
      senderName: senderName,
      transactionReference: transactionReference,
      paymentDate: paymentDate,
      note: note,
      status: 'pending',
      reviewedBy: '',
      reviewedAt: '',
      createdAt: now,
      updatedAt: now
    };
    appendObject_('PremiumRequests', request);
    return { request: mapPremiumRequest_(request) };
  });
}

function createPremiumRequest_(payload) {
  var session = requireSession_(payload.token);
  var planId = clean_(payload.planId, 80);
  var paymentMethodId = clean_(payload.paymentMethodId, 80);
  var senderName = safeSheetText_(payload.senderName, 100);
  if (senderName.length < 2) throw new Error('Enter the name used for the bank transfer.');

  return withLock_(function () {
    var user = findObject_('Users', 'id', session.userId);
    if (!user) throw new Error('Account not found.');
    if (premiumEntitlementForUser_(user).isPremium) throw new Error('Your Premium subscription is already active.');
    var plan = objects_('PremiumPlans').filter(function (item) {
      return String(item.id) === planId && clean_(item.status, 20).toLowerCase() === 'active';
    })[0];
    if (!plan) throw new Error('This premium plan is no longer available.');
    var method = activePremiumPaymentMethods_().filter(function (item) {
      return String(item.id) === paymentMethodId;
    })[0];
    if (!method) throw new Error('This payment method is no longer available.');
    var open = objects_('PremiumRequests').filter(function (request) {
      var status = clean_(request.status, 30).toLowerCase();
      return String(request.userId) === String(session.userId)
        && ['pending', 'under-review'].indexOf(status) >= 0;
    })[0];
    if (open) throw new Error('You already have a payment request waiting for review.');

    var now = new Date().toISOString();
    var paymentDate = Utilities.formatDate(
      new Date(),
      'Africa/Addis_Ababa',
      'yyyy-MM-dd'
    );
    var request = {
      id: 'premium-request-' + Utilities.getUuid(),
      requestCode: premiumRequestCode_(),
      userId: session.userId,
      email: user.email,
      planId: planId,
      amountEtb: Number(plan.priceEtb) || 0,
      durationDays: Math.floor(Number(plan.durationDays) || 0),
      bank: paymentMethodId,
      senderName: senderName,
      transactionReference: '',
      paymentDate: paymentDate,
      note: '',
      phone: String(user.phone || ''),
      status: 'pending',
      reviewedBy: '',
      reviewedAt: '',
      createdAt: now,
      updatedAt: now
    };
    appendObject_('PremiumRequests', request);
    return { request: mapPremiumRequest_(request) };
  });
}

function cancelPremiumRequest_(payload) {
  var session = requireSession_(payload.token);
  var requestId = clean_(payload.requestId, 120);
  return withLock_(function () {
    var request = findObject_('PremiumRequests', 'id', requestId);
    if (!request || String(request.userId) !== String(session.userId)) throw new Error('Payment request not found.');
    if (clean_(request.status, 30).toLowerCase() !== 'pending') {
      throw new Error('Only a pending payment request can be cancelled.');
    }
    var now = new Date().toISOString();
    updateObjectAtRow_('PremiumRequests', request._row, { status: 'cancelled', updatedAt: now });
    request.status = 'cancelled';
    request.updatedAt = now;
    return { request: mapPremiumRequest_(request) };
  });
}

function premiumRequestCode_() {
  var date = Utilities.formatDate(new Date(), 'Africa/Addis_Ababa', 'yyyyMMdd');
  return 'ZA-' + date + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function markPremiumRequestUnderReview_(requestId, note) {
  return withLock_(function () {
    var request = findObject_('PremiumRequests', 'id', requestId);
    if (!request) throw new Error('Premium request not found.');
    var previousStatus = clean_(request.status, 30).toLowerCase();
    if (previousStatus === 'under-review') return mapPremiumRequest_(request);
    if (previousStatus !== 'pending') throw new Error('Only a pending request can be marked under review.');
    var now = new Date().toISOString();
    var reviewer = premiumReviewer_();
    updateObjectAtRow_('PremiumRequests', request._row, {
      status: 'under-review', reviewedBy: reviewer, reviewNote: clean_(note, 300), updatedAt: now
    });
    appendPremiumAudit_(request, 'mark-under-review', previousStatus, 'under-review', reviewer, note, now);
    request.status = 'under-review';
    request.reviewedBy = reviewer;
    request.reviewNote = clean_(note, 300);
    request.updatedAt = now;
    return mapPremiumRequest_(request);
  });
}

function rejectPremiumRequest_(requestId, note) {
  note = clean_(note, 300);
  if (note.length < 3) throw new Error('A clear rejection reason is required.');
  return withLock_(function () {
    var request = findObject_('PremiumRequests', 'id', requestId);
    if (!request) throw new Error('Premium request not found.');
    var previousStatus = clean_(request.status, 30).toLowerCase();
    if (previousStatus === 'rejected') return mapPremiumRequest_(request);
    if (['pending', 'under-review'].indexOf(previousStatus) < 0) {
      throw new Error('Only a pending or under-review request can be rejected.');
    }
    var now = new Date().toISOString();
    var reviewer = premiumReviewer_();
    updateObjectAtRow_('PremiumRequests', request._row, {
      status: 'rejected', reviewedBy: reviewer, reviewedAt: now,
      reviewNote: note, updatedAt: now
    });
    appendPremiumAudit_(request, 'reject', previousStatus, 'rejected', reviewer, note, now);
    request.status = 'rejected';
    request.reviewedBy = reviewer;
    request.reviewedAt = now;
    request.reviewNote = note;
    request.updatedAt = now;
    return mapPremiumRequest_(request);
  });
}

function approvePremiumRequest_(requestId, note) {
  return withLock_(function () {
    var request = findObject_('PremiumRequests', 'id', requestId);
    if (!request) throw new Error('Premium request not found.');
    var previousStatus = clean_(request.status, 30).toLowerCase();
    var user = findObject_('Users', 'id', request.userId);
    if (!user) throw new Error('The student account no longer exists.');
    if (previousStatus === 'approved') {
      return {
        requestCode: String(request.requestCode),
        premiumUntil: optionalIso_(user.premiumUntil),
        alreadyApproved: true
      };
    }
    if (['pending', 'under-review'].indexOf(previousStatus) < 0) {
      throw new Error('Only a pending or under-review request can be approved.');
    }
    var plan = findObject_('PremiumPlans', 'id', request.planId);
    var durationDays = Math.floor(Number(request.durationDays) || Number(plan && plan.durationDays) || 0);
    if (!plan || durationDays < 1 || durationDays > 3660) throw new Error('The purchased plan duration is invalid.');
    var nowDate = new Date();
    var now = nowDate.toISOString();
    var reviewer = premiumReviewer_();
    var alreadyApplied = String(user.lastPremiumRequestId || '') === String(request.id);
    var premiumUntil;

    if (alreadyApplied) {
      premiumUntil = optionalIso_(user.premiumUntil);
      if (!premiumUntil) throw new Error('The request marker exists but the premium expiry is missing. Review the user row manually.');
    } else {
      var entitlement = premiumEntitlementForUser_(user);
      if (entitlement.status === 'legacy' && !entitlement.until) {
        throw new Error('This account has legacy premium without an expiry. Resolve that account before approving a timed plan.');
      }
      var currentUntilTime = entitlement.isPremium && entitlement.until
        ? new Date(entitlement.until).getTime()
        : NaN;
      var baseTime = isFinite(currentUntilTime) && currentUntilTime > nowDate.getTime()
        ? currentUntilTime
        : nowDate.getTime();
      premiumUntil = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();
      var premiumStartedAt = entitlement.isPremium && entitlement.startedAt
        ? entitlement.startedAt
        : now;
      updateObjectAtRow_('Users', user._row, {
        isPremium: true,
        premiumPlanId: String(request.planId),
        premiumStartedAt: premiumStartedAt,
        premiumUntil: premiumUntil,
        premiumStatus: 'active',
        lastPremiumRequestId: String(request.id),
        updatedAt: now
      });
    }

    updateObjectAtRow_('PremiumRequests', request._row, {
      status: 'approved', reviewedBy: reviewer, reviewedAt: now,
      reviewNote: clean_(note, 300), updatedAt: now
    });
    appendPremiumAudit_(request, 'approve', previousStatus, 'approved', reviewer, note, now);
    return {
      requestCode: String(request.requestCode),
      premiumUntil: premiumUntil,
      alreadyApproved: alreadyApplied
    };
  });
}

function premiumReviewer_() {
  try {
    return clean_(Session.getActiveUser().getEmail(), 160) || 'spreadsheet-admin';
  } catch (error) {
    return 'spreadsheet-admin';
  }
}

function appendPremiumAudit_(request, action, previousStatus, nextStatus, reviewer, note, now) {
  appendObject_('PremiumAudit', {
    id: 'premium-audit-' + Utilities.getUuid(),
    requestId: String(request.id),
    requestCode: String(request.requestCode),
    userId: String(request.userId),
    action: action,
    previousStatus: previousStatus,
    nextStatus: nextStatus,
    reviewer: reviewer,
    note: clean_(note, 300),
    createdAt: now
  });
}

function premiumEntitlementForUser_(user) {
  var legacyPremium = Boolean(user && (
    user.isPremium === true || String(user.isPremium || '').toLowerCase() === 'true'
  ));
  var configuredStatus = clean_(user && user.premiumStatus, 20).toLowerCase();
  var planId = clean_(user && user.premiumPlanId, 80);
  var startedAt = optionalIso_(user && user.premiumStartedAt);
  var until = optionalIso_(user && user.premiumUntil);
  var untilTime = until ? new Date(until).getTime() : NaN;
  var status = 'free';
  var isPremium = false;

  if (configuredStatus === 'active') {
    if (isFinite(untilTime)) {
      isPremium = untilTime > Date.now();
      status = isPremium ? 'active' : 'expired';
    } else {
      // An active record without an expiry is treated as a grandfathered account.
      isPremium = true;
      status = 'legacy';
    }
  } else if (configuredStatus === 'expired') {
    status = 'expired';
  } else if (['revoked', 'cancelled'].indexOf(configuredStatus) >= 0) {
    status = configuredStatus;
  } else if (legacyPremium) {
    if (isFinite(untilTime)) {
      isPremium = untilTime > Date.now();
      status = isPremium ? 'active' : 'expired';
    } else {
      isPremium = true;
      status = 'legacy';
    }
  }

  return {
    isPremium: isPremium,
    status: status,
    planId: planId || null,
    startedAt: startedAt,
    until: until
  };
}

function registerDeviceObservationLegacy_(payload) {
  var session = requireSession_(payload.token);
  var installationId = clean_(payload.installationId, 80).toLowerCase();
  var deviceType = clean_(payload.deviceType, 20).toLowerCase();
  var platform = clean_(payload.platform, 20).toLowerCase();
  var deviceName = safeSheetText_(payload.deviceName, 120) || 'Mobile device';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(installationId)) {
    throw new Error('Invalid installation identifier.');
  }
  if (['phone', 'tablet', 'unknown'].indexOf(deviceType) < 0) throw new Error('Invalid device type.');
  if (['android', 'ios'].indexOf(platform) < 0) throw new Error('Invalid device platform.');
  if (!masterSpreadsheet_().getSheetByName('UserDevices')) {
    throw new Error('Device observation is not installed. Run setupZemenAcademy first.');
  }

  return withLock_(function () {
    var now = new Date().toISOString();
    var devices = objects_('UserDevices');
    var existing = devices.filter(function (device) {
      return String(device.userId) === String(session.userId)
        && clean_(device.installationId, 80).toLowerCase() === installationId;
    })[0];
    var registrationId;
    var registrationRow;
    var activeStatus = existing && clean_(existing.status, 20).toLowerCase() === 'revoked'
      ? 'revoked'
      : 'active';
    if (existing && existing._row) {
      registrationId = String(existing.id);
      registrationRow = existing._row;
      updateObjectAtRow_('UserDevices', existing._row, {
        deviceType: deviceType,
        platform: platform,
        deviceName: deviceName,
        status: activeStatus,
        lastSeenAt: now,
        updatedAt: now
      });
      existing.deviceType = deviceType;
      existing.platform = platform;
      existing.deviceName = deviceName;
      existing.status = activeStatus;
      existing.lastSeenAt = now;
      existing.updatedAt = now;
    } else {
      registrationId = 'user-device-' + Utilities.getUuid();
      var created = {
        id: registrationId,
        userId: session.userId,
        installationId: installationId,
        deviceType: deviceType,
        platform: platform,
        deviceName: deviceName,
        status: 'active',
        firstSeenAt: now,
        lastSeenAt: now,
        revokedAt: '',
        updatedAt: now
      };
      appendObject_('UserDevices', created);
      registrationRow = sheet_('UserDevices').getLastRow();
      devices.push(created);
    }

    var userInstallations = {};
    var accountIdsOnDevice = {};
    devices.forEach(function (device) {
      if (clean_(device.status, 20).toLowerCase() !== 'active') return;
      var storedInstallationId = clean_(device.installationId, 80).toLowerCase();
      if (storedInstallationId === installationId) accountIdsOnDevice[String(device.userId)] = true;
      if (String(device.userId) !== String(session.userId) || !storedInstallationId) return;
      userInstallations[storedInstallationId] = clean_(device.deviceType, 20).toLowerCase();
    });
    var phoneCount = 0;
    var tabletCount = 0;
    var unknownCount = 0;
    Object.keys(userInstallations).forEach(function (id) {
      if (userInstallations[id] === 'phone') phoneCount += 1;
      else if (userInstallations[id] === 'tablet') tabletCount += 1;
      else unknownCount += 1;
    });
    var accountCountOnDevice = Object.keys(accountIdsOnDevice).length;
    var exceedsAccountDeviceLimit = phoneCount > 1 || tabletCount > 1;
    var sharedWithOtherAccounts = accountCountOnDevice > 1;
    var policyFlags = [];
    if (phoneCount > 1) policyFlags.push('multiple-phones');
    if (tabletCount > 1) policyFlags.push('multiple-tablets');
    if (sharedWithOtherAccounts) policyFlags.push('shared-installation');
    updateObjectAtRow_('UserDevices', registrationRow, {
      observedPhoneCount: phoneCount,
      observedTabletCount: tabletCount,
      observedAccountCount: accountCountOnDevice,
      policyFlag: policyFlags.length ? policyFlags.join(',') : 'clear'
    });
    return {
      registered: true,
      id: registrationId,
      observationOnly: true,
      policy: {
        phoneCount: phoneCount,
        tabletCount: tabletCount,
        unknownCount: unknownCount,
        allowedPhoneCount: 1,
        allowedTabletCount: 1,
        accountCountOnDevice: accountCountOnDevice,
        exceedsAccountDeviceLimit: exceedsAccountDeviceLimit,
        sharedWithOtherAccounts: sharedWithOtherAccounts,
        wouldExceedPolicy: exceedsAccountDeviceLimit || sharedWithOtherAccounts,
        observedAt: now
      }
    };
  });
}

var DEVICE_REPLACEMENT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeDeviceIdentity_(payload) {
  var identity = {
    installationId: clean_(payload && payload.installationId, 80).toLowerCase(),
    deviceType: clean_(payload && payload.deviceType, 20).toLowerCase(),
    platform: clean_(payload && payload.platform, 20).toLowerCase(),
    deviceName: safeSheetText_(payload && payload.deviceName, 120) || 'Mobile device'
  };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(identity.installationId)) {
    throw new Error('Invalid installation identifier. Please update Zemen Academy and try again.');
  }
  if (['phone', 'tablet', 'unknown'].indexOf(identity.deviceType) < 0) throw new Error('Invalid device type.');
  if (['android', 'ios'].indexOf(identity.platform) < 0) throw new Error('Invalid device platform.');
  return identity;
}

function devicePolicyCategory_(deviceType) {
  return clean_(deviceType, 20).toLowerCase() === 'tablet' ? 'tablet' : 'phone';
}

function registerDeviceObservation_(payload) {
  var session = requireBasicSession_(payload.token);
  return withLock_(function () {
    var registration = registerDeviceForUser_(session.userId, payload);
    updateSessionDeviceAuthorization_(session, registration.installationId, registration.policy.accessAllowed);
    return registration;
  });
}

function registerDeviceForUser_(userId, payload) {
  var identity = normalizeDeviceIdentity_(payload);
  var master = masterSpreadsheet_();
  var deviceSheet = master.getSheetByName('UserDevices');
  var sessionSheet = master.getSheetByName('Sessions');
  var deviceHeaders = deviceSheet ? deviceSheet.getRange(1, 1, 1, deviceSheet.getLastColumn()).getValues()[0] : [];
  var sessionHeaders = sessionSheet ? sessionSheet.getRange(1, 1, 1, sessionSheet.getLastColumn()).getValues()[0] : [];
  if (!deviceSheet || deviceHeaders.indexOf('replacementAt') < 0
      || !sessionSheet || sessionHeaders.indexOf('installationId') < 0
      || sessionHeaders.indexOf('deviceAuthorized') < 0) {
    throw new Error('Device security is not installed. Run setupZemenAcademy before deploying this version.');
  }
  var now = new Date().toISOString();
  var nowTime = new Date(now).getTime();
  var devices = objects_('UserDevices');
  var existing = devices.filter(function (device) {
    return String(device.userId) === String(userId)
      && clean_(device.installationId, 80).toLowerCase() === identity.installationId;
  })[0];
  var category = devicePolicyCategory_(identity.deviceType);
  var foreignActive = devices.filter(function (device) {
    return String(device.userId) !== String(userId)
      && clean_(device.status, 20).toLowerCase() === 'active'
      && clean_(device.installationId, 80).toLowerCase() === identity.installationId;
  });
  var categoryActive = devices.filter(function (device) {
    return String(device.userId) === String(userId)
      && clean_(device.status, 20).toLowerCase() === 'active'
      && clean_(device.installationId, 80).toLowerCase() !== identity.installationId
      && devicePolicyCategory_(device.deviceType) === category;
  }).sort(function (left, right) {
    return new Date(left.firstSeenAt || 0).getTime() - new Date(right.firstSeenAt || 0).getTime();
  });

  var existingIsActive = existing && clean_(existing.status, 20).toLowerCase() === 'active';
  var accessAllowed = foreignActive.length === 0 && (existingIsActive || categoryActive.length === 0);
  if (accessAllowed && existingIsActive && categoryActive.length) {
    var existingFirstSeen = new Date(existing.firstSeenAt || 0).getTime();
    if (new Date(categoryActive[0].firstSeenAt || 0).getTime() < existingFirstSeen) {
      accessAllowed = false;
    } else {
      categoryActive.forEach(function (device) {
        updateObjectAtRow_('UserDevices', device._row, {
          status: 'blocked', updatedAt: now, policyFlag: 'device-limit'
        });
        device.status = 'blocked';
        revokeSessionsForDevice_(userId, clean_(device.installationId, 80).toLowerCase());
      });
    }
  }

  var status = accessAllowed ? 'active' : 'blocked';
  var registrationId;
  var registrationRow;
  if (existing && existing._row) {
    registrationId = String(existing.id);
    registrationRow = existing._row;
    updateObjectAtRow_('UserDevices', existing._row, {
      deviceType: identity.deviceType, platform: identity.platform,
      deviceName: identity.deviceName, status: status, lastSeenAt: now,
      revokedAt: accessAllowed ? '' : existing.revokedAt, updatedAt: now
    });
    existing.deviceType = identity.deviceType;
    existing.platform = identity.platform;
    existing.deviceName = identity.deviceName;
    existing.status = status;
    existing.lastSeenAt = now;
  } else {
    registrationId = 'user-device-' + Utilities.getUuid();
    existing = {
      id: registrationId, userId: userId, installationId: identity.installationId,
      deviceType: identity.deviceType, platform: identity.platform,
      deviceName: identity.deviceName, status: status, firstSeenAt: now,
      lastSeenAt: now, revokedAt: '', updatedAt: now
    };
    appendObject_('UserDevices', existing);
    registrationRow = sheet_('UserDevices').getLastRow();
    existing._row = registrationRow;
    devices.push(existing);
  }

  var userInstallations = {};
  var accountIdsOnDevice = {};
  devices.forEach(function (device) {
    if (clean_(device.status, 20).toLowerCase() !== 'active') return;
    var storedId = clean_(device.installationId, 80).toLowerCase();
    if (storedId === identity.installationId) accountIdsOnDevice[String(device.userId)] = true;
    if (String(device.userId) === String(userId) && storedId) {
      userInstallations[storedId] = clean_(device.deviceType, 20).toLowerCase();
    }
  });
  var phoneCount = 0;
  var tabletCount = 0;
  var unknownCount = 0;
  Object.keys(userInstallations).forEach(function (id) {
    if (userInstallations[id] === 'tablet') tabletCount += 1;
    else if (userInstallations[id] === 'unknown') { unknownCount += 1; phoneCount += 1; }
    else phoneCount += 1;
  });

  var replacements = devices.filter(function (device) {
    return String(device.userId) === String(userId)
      && Boolean(device.replacementAt);
  }).sort(function (left, right) {
    return new Date(right.replacementAt || 0).getTime() - new Date(left.replacementAt || 0).getTime();
  });
  var lastReplacement = replacements.length ? new Date(replacements[0].replacementAt).getTime() : NaN;
  var availableTime = isFinite(lastReplacement) ? lastReplacement + DEVICE_REPLACEMENT_COOLDOWN_MS : nowTime;
  var blockedReason = accessAllowed ? null : (foreignActive.length ? 'device-linked' : 'device-limit');
  var canReplace = blockedReason === 'device-limit' && nowTime >= availableTime;
  var conflict = foreignActive[0] || categoryActive[0] || null;
  var accountCountOnDevice = Object.keys(accountIdsOnDevice).length;
  updateObjectAtRow_('UserDevices', registrationRow, {
    observedPhoneCount: phoneCount, observedTabletCount: tabletCount,
    observedAccountCount: accountCountOnDevice,
    policyFlag: accessAllowed ? 'clear' : blockedReason
  });

  return {
    registered: accessAllowed,
    id: registrationId,
    installationId: identity.installationId,
    policy: {
      phoneCount: phoneCount, tabletCount: tabletCount, unknownCount: unknownCount,
      allowedPhoneCount: 1, allowedTabletCount: 1,
      accountCountOnDevice: accountCountOnDevice,
      exceedsAccountDeviceLimit: blockedReason === 'device-limit',
      sharedWithOtherAccounts: foreignActive.length > 0,
      wouldExceedPolicy: !accessAllowed,
      accessAllowed: accessAllowed,
      currentDeviceStatus: status,
      blockedReason: blockedReason,
      canReplace: canReplace,
      replacementAvailableAt: !canReplace && blockedReason === 'device-limit'
        ? new Date(availableTime).toISOString() : null,
      conflictingDeviceName: conflict ? String(conflict.deviceName || 'another device') : null,
      conflictingLastSeenAt: conflict ? optionalIso_(conflict.lastSeenAt) : null,
      currentDeviceName: identity.deviceName,
      currentDeviceType: identity.deviceType,
      observedAt: now
    }
  };
}

function replaceCurrentDevice_(payload) {
  var session = requireBasicSession_(payload.token);
  return withLock_(function () {
    var registration = registerDeviceForUser_(session.userId, payload);
    if (registration.policy.accessAllowed) {
      updateSessionDeviceAuthorization_(session, registration.installationId, true);
      return { replaced: true, id: registration.id, policy: registration.policy };
    }
    if (registration.policy.blockedReason !== 'device-limit') {
      throw new Error('This device is linked to another account. Contact Zemen Academy support.');
    }
    if (!registration.policy.canReplace) {
      throw new Error('Device replacement is temporarily unavailable. Try again after '
        + String(registration.policy.replacementAvailableAt || '').slice(0, 10) + '.');
    }

    var identity = normalizeDeviceIdentity_(payload);
    var category = devicePolicyCategory_(identity.deviceType);
    var now = new Date().toISOString();
    objects_('UserDevices').filter(function (device) {
      return String(device.userId) === String(session.userId)
        && clean_(device.status, 20).toLowerCase() === 'active'
        && clean_(device.installationId, 80).toLowerCase() !== identity.installationId
        && devicePolicyCategory_(device.deviceType) === category;
    }).forEach(function (device) {
      updateObjectAtRow_('UserDevices', device._row, {
        status: 'revoked', revokedAt: now, updatedAt: now,
        policyFlag: 'replaced-by:' + identity.installationId,
        replacementAt: now
      });
      revokeSessionsForDevice_(session.userId, clean_(device.installationId, 80).toLowerCase());
    });
    var current = findObject_('UserDevices', 'id', registration.id);
    updateObjectAtRow_('UserDevices', current._row, {
      status: 'active', revokedAt: '', updatedAt: now, policyFlag: 'clear'
    });
    var updated = registerDeviceForUser_(session.userId, payload);
    updateSessionDeviceAuthorization_(session, updated.installationId, true);
    return { replaced: true, id: updated.id, policy: updated.policy };
  });
}

function updateSessionDeviceAuthorization_(session, installationId, allowed) {
  var stored = session && session._row ? session : findObject_('Sessions', 'id', session && session.id);
  if (!stored || !stored._row) return;
  updateObjectAtRow_('Sessions', stored._row, {
    installationId: installationId,
    deviceAuthorized: allowed
  });
  stored.installationId = installationId;
  stored.deviceAuthorized = allowed;
  CacheService.getScriptCache().put(sessionCacheKey_(String(stored.tokenHash)), JSON.stringify(stored), 21600);
}

function revokeSessionsForDevice_(userId, installationId) {
  var cache = CacheService.getScriptCache();
  objects_('Sessions').filter(function (session) {
    return String(session.userId) === String(userId)
      && clean_(session.installationId, 80).toLowerCase() === installationId
      && !session.revokedAt;
  }).forEach(function (session) {
    updateObjectAtRow_('Sessions', session._row, { deviceAuthorized: false });
    session.deviceAuthorized = false;
    cache.put(sessionCacheKey_(String(session.tokenHash)), JSON.stringify(session), 21600);
  });
}

function optionalSession_(token) {
  token = String(token || '');
  if (!token) return null;
  var hash = tokenHash_(token);
  var cache = CacheService.getScriptCache();
  var cacheKey = sessionCacheKey_(hash);
  var cached = cache.get(cacheKey);
  if (cached) {
    var cachedSession = JSON.parse(cached);
    if (!cachedSession.revokedAt && new Date(cachedSession.expiresAt).getTime() > Date.now()) return cachedSession;
    cache.remove(cacheKey);
  }
  var session = objects_('Sessions').filter(function (item) {
    return constantTimeEqual_(String(item.tokenHash), hash) && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now();
  })[0] || null;
  if (session) cachePutSafely_(cacheKey, JSON.stringify(session), 21600);
  return session;
}

function requireBasicSession_(token) {
  if (!token) throw new Error('Authentication required.');
  var session = optionalSession_(token);
  if (!session) throw new Error('Session expired. Please sign in again.');
  return session;
}

function requireSession_(token) {
  var session = requireBasicSession_(token);
  if (String(session.deviceAuthorized).toLowerCase() === 'false') {
    throw new Error('This device is not authorized for this account. Open Zemen Academy to manage the device.');
  }
  return session;
}

function requirePremiumAccess_(token) {
  var session = requireSession_(token);
  var user = findObject_('Users', 'id', session.userId);
  if (!user || !premiumEntitlementForUser_(user).isPremium) {
    throw new Error('Premium access is required for this content.');
  }
  return session;
}

function unitAccessTier_(unit) {
  var configured = clean_(unit && unit.accessTier, 20).toLowerCase();
  if (configured === 'free' || configured === 'premium') return configured;
  return Number(unit && unit.number) === 1 ? 'free' : 'premium';
}

function paperAccessTier_(paper) {
  return clean_(paper && paper.accessTier, 20).toLowerCase() === 'free' ? 'free' : 'premium';
}

function publicUser_(user) {
  var premium = premiumEntitlementForUser_(user);
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone || undefined, isGuest: false,
    isPremium: premium.isPremium,
    premiumStatus: premium.status,
    premiumPlanId: premium.planId,
    premiumStartedAt: premium.startedAt,
    premiumUntil: premium.until
  };
}

function mapSubject_(item) {
  return { id: item.id, grade: Number(item.grade), stream: item.stream || undefined, name: item.name, nameAm: item.nameAm || item.name, icon: item.icon || 'book-open-variant', order: Number(item.order), updatedAt: iso_(item.updatedAt) };
}

function mapUnit_(item) {
  return { id: item.id, subjectId: item.subjectId, number: Number(item.number), title: item.title, titleAm: item.titleAm || item.title, questionCount: Number(item.questionCount) || 0, version: Number(item.version) || 1, accessTier: unitAccessTier_(item), updatedAt: iso_(item.updatedAt) };
}

function mapPaper_(item) {
  return { id: item.id, title: item.title, grade: Number(item.grade), stream: item.stream || undefined, subjectId: item.subjectId, year: Number(item.year), version: Number(item.version) || 1, accessTier: paperAccessTier_(item), downloadUrl: item.downloadUrl || undefined, updatedAt: iso_(item.updatedAt) };
}

function masterSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Run setupZemenAcademy first.');
  return SpreadsheetApp.openById(id);
}

function contentSourceRecords_() {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'content-sources:v1';
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  var master = masterSpreadsheet_();
  if (!master.getSheetByName('ContentSources')) return [];
  var records = objectsFromSpreadsheet_(master, 'ContentSources').filter(function (item) {
    return item.subjectId && item.spreadsheetId;
  });
  cachePutSafely_(cacheKey, JSON.stringify(records), 300);
  return records;
}

function activeContentSourceForSubject_(subjectId) {
  return contentSourceRecords_().filter(function (item) {
    return String(item.subjectId) === String(subjectId) && item.status === 'active';
  }).sort(function (left, right) {
    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  })[0];
}

function contentSpreadsheetForSubject_(subjectId) {
  var source = activeContentSourceForSubject_(subjectId);
  if (!source) return masterSpreadsheet_();
  try {
    return SpreadsheetApp.openById(String(source.spreadsheetId));
  } catch (error) {
    console.error('Could not open content spreadsheet for ' + subjectId + ': ' + error.message);
    return masterSpreadsheet_();
  }
}

function resolveUnitContent_(unitId, subjectId) {
  var master = masterSpreadsheet_();
  if (subjectId) {
    var directSpreadsheet = contentSpreadsheetForSubject_(subjectId);
    var directUnit = findObjectInSpreadsheet_(directSpreadsheet, 'Units', 'id', unitId);
    if (directUnit && String(directUnit.subjectId) === String(subjectId)) {
      return { unit: directUnit, spreadsheet: directSpreadsheet };
    }
    var fallbackUnit = findObjectInSpreadsheet_(master, 'Units', 'id', unitId);
    if (fallbackUnit && String(fallbackUnit.subjectId) === String(subjectId)) {
      return { unit: fallbackUnit, spreadsheet: master };
    }
    throw new Error('Unit not found for the selected subject.');
  }

  var masterUnit = findObjectInSpreadsheet_(master, 'Units', 'id', unitId);
  if (masterUnit) {
    var routedSpreadsheet = contentSpreadsheetForSubject_(String(masterUnit.subjectId));
    var routedUnit = findObjectInSpreadsheet_(routedSpreadsheet, 'Units', 'id', unitId);
    return { unit: routedUnit || masterUnit, spreadsheet: routedUnit ? routedSpreadsheet : master };
  }

  var sources = contentSourceRecords_().filter(function (item) { return item.status === 'active'; });
  for (var index = 0; index < sources.length; index += 1) {
    try {
      var spreadsheet = SpreadsheetApp.openById(String(sources[index].spreadsheetId));
      var unit = findObjectInSpreadsheet_(spreadsheet, 'Units', 'id', unitId);
      if (unit) return { unit: unit, spreadsheet: spreadsheet };
    } catch (error) {
      console.error('Could not inspect content source ' + sources[index].subjectId + ': ' + error.message);
    }
  }
  throw new Error('Unit not found.');
}

function questionRowsForUnit_(spreadsheet, unit) {
  var unitId = String(unit.id);
  var questionsSheet = spreadsheet.getSheetByName('Questions');
  if (!questionsSheet) throw new Error('Missing required sheet: Questions');
  var headers = questionsSheet.getRange(1, 1, 1, questionsSheet.getLastColumn()).getValues()[0];
  var indexSheet = spreadsheet.getSheetByName('QuestionIndex');
  var indexedRows = [];

  if (indexSheet && indexSheet.getLastRow() >= 2) {
    var entries = objectsFromSpreadsheet_(spreadsheet, 'QuestionIndex').filter(function (entry) {
      return String(entry.unitId) === unitId && entry.status === 'active'
        && Number(entry.startRow) >= 2 && Number(entry.rowCount) > 0;
    }).sort(function (left, right) {
      return Number(left.startRow) - Number(right.startRow);
    });
    entries.forEach(function (entry) {
      var values = questionsSheet.getRange(
        Number(entry.startRow),
        1,
        Number(entry.rowCount),
        headers.length
      ).getValues();
      indexedRows = indexedRows.concat(objectsFromRows_(headers, values, Number(entry.startRow)));
    });
    var indexIsValid = indexedRows.length > 0 && indexedRows.every(function (item) {
      return String(item.unitId) === unitId;
    });
    var activeIndexedCount = indexedRows.filter(function (item) { return item.status === 'active'; }).length;
    var expectedCount = Number(unit.questionCount) || 0;
    if (!indexIsValid || (expectedCount && activeIndexedCount !== expectedCount)) indexedRows = [];
  }

  var rows = indexedRows.length ? indexedRows : objectsFromSpreadsheet_(spreadsheet, 'Questions');
  return rows.filter(function (item) {
    return String(item.unitId) === unitId && item.status === 'active';
  }).sort(function (left, right) {
    return Number(left.order) - Number(right.order);
  });
}

function objectsFromRows_(headers, rows, startRow) {
  return rows.filter(function (row) {
    return row.some(function (value) { return value !== ''; });
  }).map(function (row, rowIndex) {
    var object = { _row: Number(startRow || 2) + rowIndex };
    headers.forEach(function (header, index) { object[header] = row[index]; });
    return object;
  });
}

function objectsFromSpreadsheet_(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('Missing required sheet: ' + name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return objectsFromRows_(values[0], values.slice(1), 2);
}

function findObjectInSpreadsheet_(spreadsheet, sheetName, key, value) {
  return objectsFromSpreadsheet_(spreadsheet, sheetName).filter(function (item) {
    return String(item[key]).toLowerCase() === String(value).toLowerCase();
  })[0];
}

function catalogCacheKey_(grade, stream) {
  return 'catalog:v2:' + String(grade) + ':' + String(stream || '');
}

function invalidateCatalogCaches_() {
  var cache = CacheService.getScriptCache();
  [9, 10, 11, 12].forEach(function (grade) {
    ['', 'Natural', 'Social'].forEach(function (stream) {
      cache.remove(catalogCacheKey_(grade, stream));
      cache.remove('announcements:v1:' + String(grade) + ':' + String(stream || ''));
    });
  });
  cache.remove('content-sources:v1');
}

function sessionCacheKey_(hash) { return 'session:v1:' + String(hash); }

function questionCacheKey_(subjectId, unitId, version) {
  return 'questions:v2:' + String(subjectId) + ':' + String(unitId) + ':v' + String(version);
}

function getCachedQuestionResult_(cache, key) {
  var value = cache.get(key);
  if (!value) return null;
  var manifest = JSON.parse(value);
  if (!manifest.questionChunks) return manifest;
  var keys = [];
  for (var index = 0; index < manifest.questionChunks; index += 1) keys.push(key + ':part:' + index);
  var stored = cache.getAll(keys);
  var questions = [];
  for (var part = 0; part < keys.length; part += 1) {
    if (!stored[keys[part]]) return null;
    questions = questions.concat(JSON.parse(stored[keys[part]]).questions || []);
  }
  return { questions: questions };
}

function cacheQuestionResult_(cache, key, questions, seconds) {
  var complete = JSON.stringify({ questions: questions });
  if (cachePutSafely_(key, complete, seconds)) return true;

  var chunks = [];
  var current = [];
  for (var index = 0; index < questions.length; index += 1) {
    var candidate = current.concat([questions[index]]);
    if (Utilities.newBlob(JSON.stringify({ questions: candidate })).getBytes().length > 80000) {
      if (!current.length) return false;
      chunks.push(current);
      current = [questions[index]];
    } else {
      current = candidate;
    }
  }
  if (current.length) chunks.push(current);
  if (!chunks.length) return false;

  var values = {};
  chunks.forEach(function (chunk, part) {
    values[key + ':part:' + part] = JSON.stringify({ questions: chunk });
  });
  try {
    cache.putAll(values, seconds);
    cache.put(key, JSON.stringify({ questionChunks: chunks.length }), seconds);
    return true;
  } catch (error) {
    console.error('Chunked question cache skipped for ' + key + ': ' + error.message);
    return false;
  }
}

function cachePutSafely_(key, value, seconds) {
  if (!value || Utilities.newBlob(value).getBytes().length > 85000) return false;
  try {
    CacheService.getScriptCache().put(String(key), value, seconds);
    return true;
  } catch (error) {
    console.error('Cache write skipped for ' + key + ': ' + error.message);
    return false;
  }
}

function objects_(name) {
  return objectsFromSpreadsheet_(masterSpreadsheet_(), name);
}

function findObject_(sheetName, key, value) {
  var expected = String(value === undefined || value === null ? '' : value).trim().toLowerCase();
  return objects_(sheetName).filter(function (item) {
    return String(item[key] === undefined || item[key] === null ? '' : item[key]).trim().toLowerCase() === expected;
  })[0];
}

function appendObject_(sheetName, object) {
  var headers = SHEET_HEADERS[sheetName];
  sheet_(sheetName).appendRow(headers.map(function (header) { return object[header] === undefined ? '' : object[header]; }));
}

function updateObjectAtRow_(sheetName, rowNumber, changes) {
  var sheet = sheet_(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  Object.keys(changes).forEach(function (key) {
    var column = headers.indexOf(key) + 1;
    if (column > 0) sheet.getRange(rowNumber, column).setValue(changes[key]);
  });
}

function passwordHash_(password, salt) {
  return hmac_(String(salt) + '|' + String(password));
}

function verifyPassword_(user, password) {
  var storedHash = String(user && user.passwordHash || '').trim();
  var salt = String(user && user.passwordSalt || '').trim();
  if (!storedHash || !salt) return false;
  return constantTimeEqual_(storedHash, passwordHash_(password, salt));
}

function logAuthenticationFailure_(email, user) {
  var accountKey = rateKey_(email);
  if (!user) console.warn('Login rejected: account not found (' + accountKey + ').');
  else if (clean_(user.status, 20).toLowerCase() !== 'active') {
    console.warn('Login rejected: account is not active (' + accountKey + ').');
  } else if (!String(user.passwordHash || '').trim() || !String(user.passwordSalt || '').trim()) {
    console.error('Login rejected: account hash or salt is missing (' + accountKey + ').');
  } else {
    console.warn('Login rejected: password verification failed (' + accountKey + '). Check PASSWORD_PEPPER continuity if all existing accounts fail.');
  }
}

function tokenHash_(token) { return hmac_('token|' + token); }

function hmac_(message) {
  var pepper = PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER');
  if (!pepper) throw new Error('Server security is not initialized. Run setupZemenAcademy.');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(message, pepper));
}

function constantTimeEqual_(left, right) {
  if (left.length !== right.length) return false;
  var result = 0;
  for (var index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function clean_(value, maxLength) { return String(value || '').trim().slice(0, maxLength); }
function validatedIdentifier_(value, label) {
  var id = clean_(value, 120);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(id)) {
    throw new Error('Invalid ' + String(label || 'record') + ' identifier.');
  }
  return id;
}
function normalizeDailyQuizGoal_(value) {
  var goal = Math.round(Number(value));
  if (!isFinite(goal)) return 1;
  return Math.min(5, Math.max(1, goal));
}
function iso_(value) { var date = value instanceof Date ? value : new Date(value || Date.now()); return date.toISOString(); }
function optionalIso_(value) {
  if (value === null || value === undefined || value === '') return null;
  var date = value instanceof Date ? value : new Date(value);
  return isFinite(date.getTime()) ? date.toISOString() : null;
}
function safeIso_(value) { var date = new Date(value || Date.now()); return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(); }
function safeSheetText_(value, maxLength) {
  var text = clean_(value, maxLength);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function withLock_(work) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return work(); } finally { lock.releaseLock(); }
}

function rateKey_(email) { return 'login:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email)).slice(0, 28); }
function enforceSignupRateLimit_(email, installationId) {
  var cache = CacheService.getScriptCache();
  var rules = [
    { key: 'signup:email:' + rateKey_(email), limit: 5, seconds: 3600 },
    { key: 'signup:device:' + rateKey_(installationId), limit: 5, seconds: 3600 },
    { key: 'signup:global', limit: 200, seconds: 600 }
  ];
  rules.forEach(function (rule) {
    if (Number(cache.get(rule.key) || 0) >= rule.limit) {
      throw new Error('Too many attempts. Wait a few minutes and try again.');
    }
  });
  rules.forEach(function (rule) {
    cache.put(rule.key, String(Number(cache.get(rule.key) || 0) + 1), rule.seconds);
  });
}
function enforceRateLimit_(email) { if (Number(CacheService.getScriptCache().get(rateKey_(email)) || 0) >= 8) throw new Error('Too many failed attempts. Try again in 15 minutes.'); }
function recordFailedLogin_(email) { var cache = CacheService.getScriptCache(); var key = rateKey_(email); cache.put(key, String(Number(cache.get(key) || 0) + 1), 900); }
function clearFailedLogin_(email) { CacheService.getScriptCache().remove(rateKey_(email)); }

function score_(questions, answers) {
  var correct = 0;
  var skipped = 0;
  questions.forEach(function (question, index) {
    if (answers[index] === null || answers[index] === undefined) skipped += 1;
    else if (Number(answers[index]) === Number(question.correctAnswer)) correct += 1;
  });
  return { correct: correct, skipped: skipped, wrong: questions.length - correct - skipped };
}

function cleanupExpiredSecurityRecords() {
  var sessionSheet = sheet_('Sessions');
  var sessions = objects_('Sessions');
  var expiredRows = sessions.filter(function (item) { return item.revokedAt || new Date(item.expiresAt).getTime() <= Date.now(); }).map(function (item) { return item._row; }).sort(function (a, b) { return b - a; });
  expiredRows.forEach(function (row) { sessionSheet.deleteRow(row); });

  var resetSheet = sheet_('PasswordResets');
  var retentionCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  var resetRows = objects_('PasswordResets').filter(function (item) {
    var expiredAt = new Date(item.expiresAt).getTime();
    var createdAt = new Date(item.createdAt).getTime();
    return (item.usedAt || expiredAt <= Date.now()) && createdAt <= retentionCutoff;
  }).map(function (item) { return item._row; }).sort(function (a, b) { return b - a; });
  resetRows.forEach(function (row) { resetSheet.deleteRow(row); });
  return { sessions: expiredRows.length, passwordResets: resetRows.length };
}

function cleanupExpiredSessions() {
  return cleanupExpiredSecurityRecords().sessions;
}

function installSecurityMaintenance() {
  ScriptApp.getProjectTriggers().filter(function (trigger) {
    return ['cleanupExpiredSecurityRecords', 'cleanupExpiredSessions'].indexOf(trigger.getHandlerFunction()) >= 0;
  }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('cleanupExpiredSecurityRecords').timeBased().everyDays(1).atHour(3).create();
  return { installed: true, trigger: 'daily', retentionDays: 7 };
}
