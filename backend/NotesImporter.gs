var NOTE_IMPORT_HEADERS = ['externalId', 'unitTitle', 'summary', 'body'];
var NOTE_IMPORT_FIELDS = [
  'externalId', 'grade', 'stream', 'subjectName', 'unitNumber', 'unitTitle', 'unitId',
  'subunitNumber', 'subunitTitle', 'title', 'titleAm', 'summary', 'summaryAm',
  'body', 'bodyAm', 'accessTier'
];
var NOTE_SUBJECT_CODES = {
  MATH: 'Mathematics', MATHEMATICS: 'Mathematics',
  PHYS: 'Physics', PHY: 'Physics', PHYSICS: 'Physics',
  CHEM: 'Chemistry', CHEMISTRY: 'Chemistry',
  BIO: 'Biology', BIOLOGY: 'Biology',
  ENG: 'English', ENGLISH: 'English', SAT: 'SAT',
  HIST: 'History', HISTORY: 'History',
  GEO: 'Geography', GEOG: 'Geography', GEOGRAPHY: 'Geography',
  ECON: 'Economics', ECONOMICS: 'Economics',
  CIV: 'Civics', CIVICS: 'Civics', ICT: 'ICT'
};

function createBlankNotesImportSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  var sheet = createTimestampedImportSheet_(spreadsheet, 'Notes Import', NOTE_IMPORT_HEADERS);
  sheet.getRange(2, 1, 4999, NOTE_IMPORT_HEADERS.length).setNumberFormat('@').setWrap(true).setVerticalAlignment('top');
  sheet.activate();
  return sheet.getName();
}

function importActiveNotesSheetAsDraft() {
  var ui = SpreadsheetApp.getUi();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  if (!sheet) throw new Error('Select the imported notes CSV tab first.');
  try {
    var notes = parseNotesImportSheet_(sheet);
    var confirmation = ui.alert(
      'Import notes as Draft?',
      notes.length + ' note(s) passed validation. Titles, summaries, and section headings will be normalized.\n\n'
        + 'Students will not see these drafts until you publish them.',
      ui.ButtonSet.YES_NO
    );
    if (confirmation !== ui.Button.YES) return { cancelled: true };
    var importId = 'NOTE-IMPORT-' + Utilities.getUuid();
    withLock_(function () { writeNoteDrafts_(notes, importId); });
    var state = { importId: importId, count: notes.length, title: sheet.getName() };
    PropertiesService.getUserProperties().setProperty(notesImportStateKey_(spreadsheet, sheet), JSON.stringify(state));
    sheet.setTabColor('#D97706');
    sheet.getRange(1, 1).setNote(notes.length + ' note(s) imported as Draft. Use Zemen Notes → Publish active imported notes.');
    ui.alert('Notes imported as Draft', notes.length + ' structured note(s) are ready for review.', ui.ButtonSet.OK);
    return state;
  } catch (error) {
    ui.alert('Notes import failed', error && error.message ? error.message : String(error), ui.ButtonSet.OK);
    return { ok: false };
  }
}

function publishActiveNotesSheet() {
  var ui = SpreadsheetApp.getUi();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  if (!sheet) throw new Error('Select the notes tab imported as Draft.');
  var raw = PropertiesService.getUserProperties().getProperty(notesImportStateKey_(spreadsheet, sheet));
  if (!raw) {
    ui.alert('Import this tab as Draft before publishing it.');
    return { ok: false };
  }
  try {
    var state = JSON.parse(raw);
    var drafts = objects_('NoteDrafts').filter(function (item) { return String(item.importId) === String(state.importId); });
    if (!drafts.length || drafts.length !== Number(state.count)) {
      throw new Error('The staged note count changed. Import this tab as Draft again.');
    }
    var confirmation = ui.alert(
      'Publish imported notes?',
      drafts.length + ' note(s) will become visible to matching grades and streams.',
      ui.ButtonSet.YES_NO
    );
    if (confirmation !== ui.Button.YES) return { cancelled: true };
    var result = withLock_(function () { return publishNoteDrafts_(drafts, state.importId); });
    sheet.setTabColor('#16A34A');
    sheet.getRange(1, 1).setNote(result.published + ' note(s) published on ' + result.updatedAt + '.');
    ui.alert('Notes published', result.published + ' note(s) are now available in the app.', ui.ButtonSet.OK);
    return result;
  } catch (error) {
    ui.alert('Notes publish failed', error && error.message ? error.message : String(error), ui.ButtonSet.OK);
    return { ok: false };
  }
}

function parseNotesImportSheet_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('The active sheet has no note rows.');
  var headerMap = notesImportHeaderMap_(values[0]);
  var timezone = sheet.getParent().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  var seen = {};
  var seenUnits = {};
  var notes = [];
  values.slice(1).forEach(function (row, index) {
    if (!row.some(function (cell) { return String(cell || '').trim() !== ''; })) return;
    var raw = {};
    NOTE_IMPORT_FIELDS.forEach(function (header) {
      raw[header] = headerMap[header] === undefined
        ? ''
        : questionImportCellText_(row[headerMap[header]], timezone);
    });
    var line = index + 2;
    var externalId = validatedIdentifier_(raw.externalId, 'note');
    if (seen[externalId.toLowerCase()]) throw new Error('Row ' + line + ': duplicate externalId.');
    seen[externalId.toLowerCase()] = true;
    var detected = noteMetadataFromExternalId_(externalId);
    var grade = Number(raw.grade || detected.grade);
    if ([9, 10, 11, 12].indexOf(grade) < 0) throw new Error('Row ' + line + ': grade could not be detected from externalId.');
    if (raw.grade && detected.grade && Number(raw.grade) !== Number(detected.grade)) {
      throw new Error('Row ' + line + ': grade conflicts with externalId.');
    }
    var stream = clean_(raw.stream || detected.stream, 20);
    if (grade < 11) stream = '';
    if (grade >= 11 && !stream) stream = noteDefaultStreamForSubject_(detected.subjectName || raw.subjectName);
    if (grade >= 11 && ['Natural', 'Social'].indexOf(stream) < 0) {
      throw new Error('Row ' + line + ': add NAT or SOC to externalId, or provide Natural or Social in stream.');
    }
    var subjectName = notesCanonicalSubjectName_(raw.subjectName || detected.subjectName);
    if (!subjectName) throw new Error('Row ' + line + ': subject could not be detected from externalId.');
    if (raw.subjectName && detected.subjectName
      && notesCanonicalSubjectName_(raw.subjectName).toLowerCase() !== detected.subjectName.toLowerCase()) {
      throw new Error('Row ' + line + ': subjectName conflicts with externalId.');
    }
    var unitNumber = Number(raw.unitNumber || detected.unitNumber);
    if (!Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 100) {
      throw new Error('Row ' + line + ': unit number could not be detected from externalId.');
    }
    if (raw.unitNumber && detected.unitNumber && Number(raw.unitNumber) !== Number(detected.unitNumber)) {
      throw new Error('Row ' + line + ': unitNumber conflicts with externalId.');
    }
    var unitKey = [grade, stream, subjectName.toLowerCase(), unitNumber].join(':');
    if (seenUnits[unitKey]) {
      throw new Error('Row ' + line + ': use exactly one note row per unit. Put 1.1, 1.2, and later subunits inside the body as headings.');
    }
    seenUnits[unitKey] = true;
    var unitTitle = notesImportText_(raw.unitTitle, 300);
    if (!unitTitle) throw new Error('Row ' + line + ': unitTitle is required.');
    var suppliedTitle = notesImportText_(raw.title, 180);
    var generatedTitle = 'Unit ' + unitNumber + ': ' + unitTitle;
    var body = normalizeNoteStructure_(raw.body, suppliedTitle || generatedTitle);
    if (!body.body) throw new Error('Row ' + line + ': body is required.');
    var title = suppliedTitle || generatedTitle || body.detectedTitle;
    if (!title) throw new Error('Row ' + line + ': add title or begin body with a clear heading.');
    var summary = notesImportText_(raw.summary, 500) || noteSummaryFromBody_(body.body);
    var tier = unitNumber === 1 ? 'free' : 'premium';
    notes.push({
      targetId: externalId, grade: grade, stream: stream, subjectName: subjectName,
      unitNumber: unitNumber, unitTitle: unitTitle,
      unitId: clean_(raw.unitId, 120), title: title, titleAm: notesImportText_(raw.titleAm, 180),
      summary: summary, summaryAm: notesImportText_(raw.summaryAm, 500),
      body: body.body, bodyAm: normalizeNoteStructure_(raw.bodyAm, raw.titleAm).body,
      accessTier: tier
    });
  });
  if (!notes.length) throw new Error('The active sheet has no note rows.');
  if (notes.length > 500) throw new Error('Import at most 500 notes at a time.');
  return notes;
}

function writeNoteDrafts_(notes, importId) {
  var now = new Date().toISOString();
  var sheet = sheet_('NoteDrafts');
  var resolvedSubjects = {};
  var resolvedUnits = {};
  var targets = {};
  notes.forEach(function (note) { targets[String(note.targetId).toLowerCase()] = true; });
  objects_('NoteDrafts').filter(function (item) {
    return targets[String(item.targetId || '').toLowerCase()];
  }).map(function (item) { return item._row; }).sort(function (left, right) {
    return right - left;
  }).forEach(function (row) { sheet.deleteRow(row); });
  var rows = notes.map(function (note) {
    var subjectKey = [note.grade, note.stream, note.subjectName.toLowerCase()].join(':');
    var subject = resolvedSubjects[subjectKey];
    if (!subject) {
      subject = findOrCreateQuestionImportSubject_({ grade: note.grade, stream: note.stream, name: note.subjectName });
      resolvedSubjects[subjectKey] = subject;
    }
    var unitKey = subject.id + ':' + note.unitNumber + ':' + (note.unitId || 'auto');
    var unitId = resolvedUnits[unitKey];
    if (!unitId) {
      unitId = resolveNoteImportUnit_(note, subject);
      resolvedUnits[unitKey] = unitId;
    }
    var draft = {
      draftId: 'DRAFT-' + Utilities.getUuid(), targetId: note.targetId, importId: importId,
      grade: note.grade, stream: note.stream, subjectId: subject.id, unitId: unitId,
      title: pastPaperSafeSheetText_(note.title), titleAm: pastPaperSafeSheetText_(note.titleAm),
      summary: pastPaperSafeSheetText_(note.summary), summaryAm: pastPaperSafeSheetText_(note.summaryAm),
      body: pastPaperSafeSheetText_(note.body), bodyAm: pastPaperSafeSheetText_(note.bodyAm),
      accessTier: note.accessTier, createdAt: now
    };
    return SHEET_HEADERS.NoteDrafts.map(function (header) { return draft[header] === undefined ? '' : draft[header]; });
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SHEET_HEADERS.NoteDrafts.length).setValues(rows);
  SpreadsheetApp.flush();
}

function publishNoteDrafts_(drafts, importId) {
  var now = new Date().toISOString();
  var targetIds = {};
  var unitScopes = {};
  drafts.forEach(function (draft) {
    targetIds[String(draft.targetId).toLowerCase()] = true;
    unitScopes[[draft.grade, draft.stream || '', draft.subjectId, draft.unitId].join(':')] = true;
  });
  objects_('Notes').filter(function (item) {
    var scope = [item.grade, item.stream || '', item.subjectId, item.unitId].join(':');
    return item.status === 'active' && unitScopes[scope] && !targetIds[String(item.id).toLowerCase()];
  }).forEach(function (item) {
    updateObjectAtRow_('Notes', item._row, { status: 'archived', updatedAt: now });
    invalidateNoteCaches_(item, item);
  });
  drafts.forEach(function (draft) {
    var existing = findObject_('Notes', 'id', draft.targetId);
    var note = {
      id: draft.targetId, grade: Number(draft.grade), stream: clean_(draft.stream, 20),
      subjectId: clean_(draft.subjectId, 120), unitId: clean_(draft.unitId, 120),
      title: String(draft.title || ''), titleAm: String(draft.titleAm || ''),
      summary: String(draft.summary || ''), summaryAm: String(draft.summaryAm || ''),
      body: String(draft.body || ''), bodyAm: String(draft.bodyAm || ''),
      version: existing ? Math.max(1, Number(existing.version) || 1) + 1 : 1,
      status: 'active', updatedAt: now, accessTier: clean_(draft.accessTier, 20) || 'premium'
    };
    if (existing) updateObjectAtRow_('Notes', existing._row, note);
    else appendObject_('Notes', note);
    invalidateNoteCaches_(note, existing);
  });
  var draftSheet = sheet_('NoteDrafts');
  objects_('NoteDrafts').filter(function (item) {
    return String(item.importId) === String(importId);
  }).map(function (item) { return item._row; }).sort(function (left, right) {
    return right - left;
  }).forEach(function (row) { draftSheet.deleteRow(row); });
  SpreadsheetApp.flush();
  return { ok: true, published: drafts.length, updatedAt: now };
}

function notesImportHeaderMap_(sourceHeaders) {
  var aliases = {
    id: 'externalId', noteid: 'externalId', externalid: 'externalId',
    grade: 'grade', stream: 'stream', subject: 'subjectName', subjectname: 'subjectName',
    unit: 'unitNumber', unitno: 'unitNumber', unitnumber: 'unitNumber',
    unittitle: 'unitTitle', unitname: 'unitTitle', unitid: 'unitId',
    subunit: 'subunitNumber', subunitno: 'subunitNumber', subunitnumber: 'subunitNumber',
    section: 'subunitNumber', sectionnumber: 'subunitNumber',
    subunittitle: 'subunitTitle', sectiontitle: 'subunitTitle',
    title: 'title', titleam: 'titleAm', summary: 'summary', summaryam: 'summaryAm',
    body: 'body', content: 'body', note: 'body', bodyam: 'bodyAm', contentam: 'bodyAm',
    accesstier: 'accessTier', access: 'accessTier'
  };
  var result = {};
  sourceHeaders.forEach(function (header, index) {
    var normalized = String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    var canonical = aliases[normalized];
    if (canonical && result[canonical] === undefined) result[canonical] = index;
  });
  var missing = ['externalId', 'body'].filter(function (header) { return result[header] === undefined; });
  if (missing.length) throw new Error('Missing required column(s): ' + missing.join(', ') + '.');
  return result;
}

function noteMetadataFromExternalId_(externalId) {
  var id = String(externalId || '').trim().toUpperCase();
  var match = id.match(/^NOTE-G(9|10|11|12)-(?:(NAT|NATURAL|SOC|SOCIAL)-)?([A-Z][A-Z0-9]*)-U(\d+)(?:-|$)/);
  if (!match) return {};
  var stream = '';
  if (match[2] === 'NAT' || match[2] === 'NATURAL') stream = 'Natural';
  if (match[2] === 'SOC' || match[2] === 'SOCIAL') stream = 'Social';
  return {
    grade: Number(match[1]),
    stream: stream,
    subjectName: NOTE_SUBJECT_CODES[match[3]] || '',
    unitNumber: Number(match[4])
  };
}

function notesCanonicalSubjectName_(value) {
  var name = notesImportText_(value, 160);
  if (!name) return '';
  var code = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return NOTE_SUBJECT_CODES[code] || name;
}

function noteDefaultStreamForSubject_(subjectName) {
  var name = notesCanonicalSubjectName_(subjectName).toLowerCase();
  if (['physics', 'chemistry', 'biology'].indexOf(name) >= 0) return 'Natural';
  if (['history', 'geography', 'economics', 'civics'].indexOf(name) >= 0) return 'Social';
  return '';
}

function resolveNoteImportUnit_(note, subject) {
  if (note.unitId) {
    var explicit = resolveUnitContent_(note.unitId, subject.id).unit;
    if (Number(explicit.number) !== Number(note.unitNumber)) {
      throw new Error(note.targetId + ': unitId conflicts with the detected unit number.');
    }
    return clean_(explicit.id, 120);
  }

  var matches = getQuestionImporterUnits(subject.id).filter(function (unit) {
    return Number(unit.number) === Number(note.unitNumber);
  });
  if (matches.length > 1) throw new Error('Duplicate Unit ' + note.unitNumber + ' rows exist for ' + subject.name + '.');
  if (matches.length === 1) return matches[0].id;
  if (!note.unitTitle) {
    throw new Error(note.targetId + ': Unit ' + note.unitNumber + ' does not exist yet. Add unitTitle so it can be created automatically.');
  }

  var unit = {
    id: subject.id + '-u' + note.unitNumber,
    subjectId: subject.id,
    number: Number(note.unitNumber),
    title: note.unitTitle,
    titleAm: '',
    questionCount: 0,
    version: 1,
    status: 'draft',
    updatedAt: new Date().toISOString(),
    accessTier: Number(note.unitNumber) === 1 ? 'free' : 'premium'
  };
  var spreadsheet = subjectContentSpreadsheetForImport_(subject.id);
  spreadsheet.getSheetByName('Units').appendRow(SUBJECT_CONTENT_HEADERS.Units.map(function (header) {
    return unit[header] === undefined ? '' : unit[header];
  }));
  invalidateCatalogCaches_();
  return unit.id;
}

function normalizeNoteStructure_(value, suppliedTitle) {
  var lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  var detectedTitle = '';
  if (lines.length) {
    var first = lines[0].trim();
    var cleanFirst = first.replace(/^#{1,3}\s+/, '').replace(/^(title|topic)\s*:\s*/i, '').trim();
    var supplied = String(suppliedTitle || '').replace(/^\d+(?:\.\d+)+\s+/, '').trim().toLowerCase();
    var repeatsSuppliedTitle = supplied && cleanFirst.toLowerCase() === supplied;
    if (repeatsSuppliedTitle || (!suppliedTitle && (
      /^#{1,2}\s+/.test(first) || /^(title|topic)\s*:/i.test(first)
      || (cleanFirst.length > 3 && cleanFirst.length <= 120 && !/[.!?]$/.test(cleanFirst))
    ))) {
      detectedTitle = cleanFirst;
      lines.shift();
    }
  }
  var normalized = lines.map(function (line) {
    var text = line.trim();
    if (!text) return '';
    if (/^#{1,3}\s+/.test(text)) return text;
    var labelled = text.match(/^(subtitle|section|heading)\s*:\s*(.+)$/i);
    if (labelled) return '## ' + labelled[2].trim();
    if (/^[A-Z][A-Z0-9 ,:&()\/-]{3,80}$/.test(text) && /[A-Z]/.test(text)) {
      return '## ' + text.replace(/\s+/g, ' ').replace(/:$/, '');
    }
    return text;
  });
  var paragraphs = [];
  var buffer = [];
  normalized.forEach(function (line) {
    if (!line) {
      if (buffer.length) { paragraphs.push(buffer.join(' ')); buffer = []; }
      return;
    }
    if (/^#{1,3}\s+/.test(line)) {
      if (buffer.length) { paragraphs.push(buffer.join(' ')); buffer = []; }
      paragraphs.push(line);
    } else if (/^(?:[-*•]|\d+[.)])\s+/.test(line)) {
      if (buffer.length) { paragraphs.push(buffer.join(' ')); buffer = []; }
      paragraphs.push(line);
    } else {
      buffer.push(line);
    }
  });
  if (buffer.length) paragraphs.push(buffer.join(' '));
  return { detectedTitle: detectedTitle, body: paragraphs.join('\n\n').trim().slice(0, 45000) };
}

function noteSummaryFromBody_(body) {
  var paragraph = String(body || '').split(/\n\s*\n/).filter(function (part) {
    return part.trim() && !/^#{1,3}\s+/.test(part.trim());
  })[0] || '';
  var clean = paragraph.replace(/\s+/g, ' ').trim();
  if (clean.length <= 220) return clean;
  return clean.slice(0, 217).replace(/\s+\S*$/, '') + '…';
}

function notesImportStateKey_(spreadsheet, sheet) {
  return 'NOTES_IMPORT:' + spreadsheet.getId() + ':' + sheet.getSheetId();
}

function notesImportText_(value, maxLength) {
  return String(value === undefined || value === null ? '' : value).replace(/\u0000/g, '').trim().slice(0, maxLength);
}
