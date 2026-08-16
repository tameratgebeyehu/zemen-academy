var QUESTION_IMPORT_REQUIRED_FIELDS = [
  'question',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'explanation'
];

var QUESTION_IMPORT_HEADER_ALIASES = {
  grade: 'grade',
  stream: 'stream',
  subject: 'subjectName',
  subjectname: 'subjectName',
  externalid: 'externalId',
  questionid: 'externalId',
  sourceid: 'externalId',
  unitnumber: 'unitNumber',
  unitno: 'unitNumber',
  unit: 'unitNumber',
  unittitle: 'unitTitle',
  unitname: 'unitTitle',
  topic: 'topic',
  question: 'question',
  prompt: 'question',
  optiona: 'optionA',
  optionb: 'optionB',
  optionc: 'optionC',
  optiond: 'optionD',
  correctanswer: 'correctAnswer',
  answer: 'correctAnswer',
  explanation: 'explanation',
  difficulty: 'difficulty',
  sourcereference: 'sourceReference',
  source: 'sourceReference'
};

function openQuestionImporter() {
  var html = HtmlService.createHtmlOutputFromFile('QuestionImporterPage')
    .setWidth(640)
    .setHeight(680);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Zemen Content Manager');
}

function openQuestionImporterSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('QuestionImporterPage')
    .setTitle('Zemen Content Manager');
  SpreadsheetApp.getUi().showSidebar(html);
}

function getQuestionImporterBootstrap() {
  var provisioned = {};
  contentSourceRecords_().filter(function (source) {
    return source.status === 'active';
  }).forEach(function (source) {
    provisioned[String(source.subjectId)] = true;
  });
  var subjects = objects_('Subjects').filter(function (subject) {
    return subject.status === 'active';
  }).map(function (subject) {
    return {
      id: String(subject.id),
      grade: Number(subject.grade),
      stream: subject.stream || '',
      name: String(subject.name),
      provisioned: Boolean(provisioned[String(subject.id)])
    };
  }).sort(function (left, right) {
    return left.grade - right.grade || left.name.localeCompare(right.name);
  });
  return {
    subjects: subjects,
    maxRowsPerImport: 5000,
    requiredColumns: QUESTION_IMPORT_REQUIRED_FIELDS
  };
}

function createQuestionImporterSubject(input) {
  input = input || {};
  var grade = Number(input.grade);
  var stream = clean_(input.stream, 80);
  var name = clean_(input.name, 200);
  if ([9, 10, 11, 12].indexOf(grade) < 0) {
    throw new Error('Grade must be 9, 10, 11, or 12.');
  }
  if (!name) throw new Error('Enter the subject name.');
  if (stream && ['Natural', 'Social'].indexOf(stream) < 0) {
    throw new Error('Stream must be Natural, Social, or blank.');
  }

  return withLock_(function () {
    var subjects = objects_('Subjects');
    var duplicate = subjects.filter(function (subject) {
      return Number(subject.grade) === grade
        && clean_(subject.stream, 80).toLowerCase() === stream.toLowerCase()
        && clean_(subject.name, 200).toLowerCase() === name.toLowerCase()
        && String(subject.status || '').trim().toLowerCase() !== 'archived';
    })[0];
    if (duplicate) {
      throw new Error('This subject already exists. Select it from the subject list.');
    }

    var baseId = 'g' + grade
      + (stream ? '-' + slugQuestionImporterPart_(stream) : '')
      + '-' + slugQuestionImporterPart_(name);
    var id = baseId;
    var suffix = 2;
    var existingIds = {};
    subjects.forEach(function (subject) {
      existingIds[clean_(subject.id, 120).toLowerCase()] = true;
    });
    while (existingIds[id.toLowerCase()]) {
      id = baseId + '-' + suffix;
      suffix += 1;
    }
    var maxOrder = subjects.filter(function (subject) {
      return Number(subject.grade) === grade
        && clean_(subject.stream, 80).toLowerCase() === stream.toLowerCase();
    }).reduce(function (current, subject) {
      return Math.max(current, Number(subject.order) || 0);
    }, 0);
    var now = new Date().toISOString();
    appendObject_('Subjects', {
      id: id,
      grade: grade,
      stream: stream,
      name: name,
      nameAm: clean_(input.nameAm, 200) || name,
      icon: clean_(input.icon, 100) || 'book-open-variant',
      order: maxOrder + 1,
      status: 'active',
      updatedAt: now
    });
    var provisioned = provisionSubjectContentSpreadsheet_(id);
    return {
      id: id,
      grade: grade,
      stream: stream,
      name: name,
      provisioned: true,
      spreadsheetUrl: provisioned.url
    };
  });
}

function provisionQuestionImporterSubject(subjectId) {
  var normalizedSubjectId = clean_(subjectId, 120);
  if (!normalizedSubjectId) throw new Error('Select a subject before preparing its content file.');
  return withLock_(function () {
    return provisionSubjectContentSpreadsheet_(normalizedSubjectId);
  });
}

function slugQuestionImporterPart_(value) {
  var slug = String(value || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'subject';
}

function createQuestionImporterUnit(input) {
  input = input || {};
  var subjectId = clean_(input.subjectId, 120);
  var number = Number(input.number);
  var title = clean_(input.title, 300);
  if (!subjectId) throw new Error('Select and prepare a subject first.');
  if (!Number.isInteger(number) || number < 1 || number > 100) {
    throw new Error('Unit number must be a whole number from 1 to 100.');
  }
  if (!title) throw new Error('Enter the unit title.');

  return withLock_(function () {
    var subject = findObject_('Subjects', 'id', subjectId);
    if (!subject || String(subject.status || '').trim().toLowerCase() !== 'active') {
      throw new Error('The selected subject is missing or inactive in the master Subjects sheet.');
    }
    var spreadsheet = subjectContentSpreadsheetForImport_(subjectId);
    var units = objectsFromSpreadsheet_(spreadsheet, 'Units');
    var sameNumber = units.filter(function (unit) {
      return clean_(unit.subjectId, 120) === subjectId && Number(unit.number) === number;
    })[0];
    if (sameNumber) {
      throw new Error(
        'Unit ' + number + ' already exists'
          + (sameNumber.title ? ' as "' + sameNumber.title + '"' : '')
          + '. Select it from the unit list.'
      );
    }

    var unitId = subjectId + '-u' + number;
    var sameId = units.filter(function (unit) {
      return clean_(unit.id, 120).toLowerCase() === unitId.toLowerCase();
    })[0];
    if (sameId) throw new Error('The generated unit id already exists: ' + unitId + '.');

    var unit = {
      id: unitId,
      subjectId: subjectId,
      number: number,
      title: title,
      titleAm: clean_(input.titleAm, 300),
      questionCount: 0,
      version: 1,
      status: 'draft',
      updatedAt: new Date().toISOString()
    };
    var sheet = spreadsheet.getSheetByName('Units');
    sheet.appendRow(SUBJECT_CONTENT_HEADERS.Units.map(function (header) {
      return unit[header] === undefined ? '' : unit[header];
    }));
    invalidateCatalogCaches_();
    SpreadsheetApp.flush();
    return {
      id: unit.id,
      subjectId: unit.subjectId,
      number: unit.number,
      title: unit.title,
      status: unit.status
    };
  });
}

function getQuestionImporterUnits(subjectId) {
  var normalizedSubjectId = clean_(subjectId, 120);
  var spreadsheet = subjectContentSpreadsheetForImport_(normalizedSubjectId);
  var units = objectsFromSpreadsheet_(spreadsheet, 'Units').filter(function (unit) {
    var status = String(unit.status || '').trim().toLowerCase();
    return clean_(unit.subjectId, 120) === normalizedSubjectId
      && ['active', 'draft'].indexOf(status) >= 0;
  });
  var existingIds = {};
  units.forEach(function (unit) {
    var currentId = clean_(unit.id, 120).toLowerCase();
    if (currentId) existingIds[currentId] = true;
  });
  units.forEach(function (unit) {
    if (clean_(unit.id, 120)) return;
    var number = Number(unit.number);
    if (!Number.isInteger(number) || number < 1 || number > 100) {
      throw new Error(
        'The Units sheet row ' + unit._row
          + ' has no id and no valid whole unit number. Correct that row.'
      );
    }
    var repairedId = normalizedSubjectId + '-u' + number;
    if (existingIds[repairedId.toLowerCase()]) {
      throw new Error(
        'The Units sheet row ' + unit._row + ' has no id, but "' + repairedId
          + '" already exists. Remove the duplicate unit row.'
      );
    }
    spreadsheet.getSheetByName('Units').getRange(
      unit._row,
      SUBJECT_CONTENT_HEADERS.Units.indexOf('id') + 1
    ).setValue(repairedId);
    unit.id = repairedId;
    existingIds[repairedId.toLowerCase()] = true;
  });
  var seenIds = {};
  var duplicateIds = [];
  units.forEach(function (unit) {
    var id = clean_(unit.id, 120);
    if (seenIds[id]) duplicateIds.push(id);
    seenIds[id] = true;
  });
  if (duplicateIds.length) {
    throw new Error(
      'The Units sheet contains duplicate unit ids: '
        + duplicateIds.join(', ') + '. Every unit must have a unique id.'
    );
  }
  return units.sort(function (left, right) {
    return Number(left.number) - Number(right.number);
  }).map(function (unit) {
    return {
      id: clean_(unit.id, 120),
      number: Number(unit.number),
      title: String(unit.title),
      status: String(unit.status),
      questionCount: Number(unit.questionCount) || 0,
      version: Number(unit.version) || 1
    };
  });
}

function importActiveQuestionSheetAsDraft() {
  var ui = SpreadsheetApp.getUi();
  var master = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = master && master.getActiveSheet();
  if (!master || master.getId() !== masterSpreadsheet_().getId() || !sheet) {
    ui.alert('Open the master Zemen Academy spreadsheet and select the imported CSV tab.');
    return;
  }
  try {
    var blob = questionImportBlobFromSheet_(sheet);
    var payload = parseQuestionImportCsv_(blob);
    var preview = previewQuestionCsv({ csvFile: blob });
    if (!preview.ok) {
      ui.alert(
        'CSV validation failed',
        preview.errorCount + ' problem(s) were found. Nothing was imported.\n\n'
          + preview.errors.join('\n'),
        ui.ButtonSet.OK
      );
      return;
    }
    if (!preview.unit) {
      throw new Error(
        'The native sheet importer requires unitNumber and unitTitle columns. '
          + 'Add them to the CSV so the destination unit is unambiguous.'
      );
    }
    var target = questionImportSubjectMetadata_(payload.sourceRows, payload.headerMap)
      || promptQuestionImportSubjectMetadata_(ui);
    if (!target) return;
    var subject = findOrCreateQuestionImportSubject_(target);
    var unitLabel = preview.unit
      ? 'Unit ' + preview.unit.number + ': ' + preview.unit.title
      : 'The existing unit selected in the HTML manager';
    var confirmation = ui.alert(
      'Import questions as Draft?',
      'Source tab: ' + sheet.getName() + '\n'
        + 'Destination: Grade ' + subject.grade
        + (subject.stream ? ' · ' + subject.stream : '') + ' · ' + subject.name + '\n'
        + unitLabel + '\n'
        + preview.questionRows + ' validated questions\n\n'
        + 'This writes Draft rows only. Publishing remains a separate action.',
      ui.ButtonSet.YES_NO
    );
    if (confirmation !== ui.Button.YES) return;

    var result = importQuestionCsv({
      subjectId: subject.id,
      unitId: '',
      csvFile: blob
    });
    if (!result.ok) {
      ui.alert(
        'Import rejected',
        result.errorCount + ' problem(s) were found. Nothing was imported.\n\n'
          + result.errors.join('\n'),
        ui.ButtonSet.OK
      );
      return;
    }
    var importState = {
      subjectId: subject.id,
      unitId: result.unit.id,
      subjectLabel: 'Grade ' + subject.grade
        + (subject.stream ? ' · ' + subject.stream : '') + ' · ' + subject.name,
      unitNumber: result.unit.number,
      unitTitle: result.unit.title,
      importedRows: result.importedRows,
      importId: result.importId
    };
    PropertiesService.getUserProperties().setProperty(
      questionImportSheetStateKey_(master, sheet),
      JSON.stringify(importState)
    );
    sheet.setTabColor('#16A34A');
    sheet.getRange(1, 1).setNote(
      result.importedRows + ' questions imported as Draft on ' + new Date().toISOString()
        + '. Use Zemen Content -> CSV import -> Publish active imported unit.'
    );
    ui.alert(
      'Draft import completed',
      result.importedRows + ' questions were actually written as Draft.\n\n'
        + importState.subjectLabel + '\n'
        + 'Unit ' + result.unit.number + ': ' + result.unit.title + '\n\n'
        + 'Review the questions, then publish from the same CSV import menu.',
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert('Import failed', error && error.message ? error.message : String(error), ui.ButtonSet.OK);
  }
}

function publishActiveQuestionSheetUnit() {
  var ui = SpreadsheetApp.getUi();
  var master = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = master && master.getActiveSheet();
  if (!master || !sheet) return;
  var raw = PropertiesService.getUserProperties().getProperty(
    questionImportSheetStateKey_(master, sheet)
  );
  if (!raw) {
    ui.alert(
      'No completed Draft import is recorded for this tab. Run "Import active CSV sheet as Draft" first.'
    );
    return;
  }
  try {
    var state = JSON.parse(raw);
    var confirmation = ui.alert(
      'Publish imported unit?',
      state.subjectLabel + '\nUnit ' + state.unitNumber + ': ' + state.unitTitle + '\n\n'
        + 'Publishing makes the reviewed questions available to students.',
      ui.ButtonSet.YES_NO
    );
    if (confirmation !== ui.Button.YES) return;
    var result = publishUnitQuestions(state.subjectId, state.unitId);
    if (!result.ok) {
      ui.alert(
        'Publish rejected',
        result.errorCount + ' problem(s):\n\n' + result.errors.join('\n'),
        ui.ButtonSet.OK
      );
      return;
    }
    sheet.setTabColor('#111113');
    var announcementSummary = result.announcement
      ? '\n\nAnnouncement: ' + (result.announcement.created ? 'created' : 'already existed')
        + '\nID: ' + result.announcement.id
        + '\nAudience: Grade ' + result.announcement.grade
        + (result.announcement.stream ? ' / ' + result.announcement.stream : '')
      : '\n\nAnnouncement details were not returned. Update the deployed importer code.';
    ui.alert(
      'Unit published',
      result.publishedQuestions + ' questions are active. Unit version: ' + result.version + '.'
        + announcementSummary,
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert('Publish failed', error && error.message ? error.message : String(error), ui.ButtonSet.OK);
  }
}

function repairActiveQuestionSheetUnitAnnouncement() {
  var ui = SpreadsheetApp.getUi();
  var master = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = master && master.getActiveSheet();
  if (!master || !sheet) return;
  var raw = PropertiesService.getUserProperties().getProperty(
    questionImportSheetStateKey_(master, sheet)
  );
  if (!raw) {
    ui.alert('No completed import is recorded for this tab. Open the CSV tab used for this unit and try again.');
    return;
  }
  try {
    var state = JSON.parse(raw);
    var spreadsheet = subjectContentSpreadsheetForImport_(state.subjectId);
    var unit = findObjectInSpreadsheet_(spreadsheet, 'Units', 'id', state.unitId);
    if (!unit || String(unit.status).toLowerCase() !== 'active') {
      throw new Error('This unit is not published yet. Publish it before creating an announcement.');
    }
    var announcement = createUnitPublishedAnnouncement_(
      state.subjectId,
      {
        id: unit.id,
        title: unit.title,
        number: Number(unit.number),
        version: Number(unit.version) || 1
      },
      Number(unit.questionCount) || 0,
      new Date().toISOString()
    );
    invalidateCatalogCaches_();
    SpreadsheetApp.flush();
    ui.alert(
      'Announcement checked',
      (announcement.created ? 'A missing announcement was created.' : 'The announcement already exists.')
        + '\n\nID: ' + announcement.id
        + '\nAudience: Grade ' + announcement.grade
        + (announcement.stream ? ' / ' + announcement.stream : ''),
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert('Announcement repair failed', error && error.message ? error.message : String(error), ui.ButtonSet.OK);
  }
}

function createBlankQuestionImportSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var baseName = 'Question Import ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd HHmm');
  var name = baseName;
  var suffix = 2;
  while (spreadsheet.getSheetByName(name)) {
    name = baseName + ' ' + suffix;
    suffix += 1;
  }
  var sheet = spreadsheet.insertSheet(name);
  var headers = [
    'grade', 'stream', 'subjectName', 'externalId', 'unitNumber', 'unitTitle', 'topic',
    'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer',
    'explanation', 'difficulty', 'sourceReference'
  ];
  if (sheet.getMaxRows() < 5001) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 5001 - sheet.getMaxRows());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground('#111113');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 7, 120);
  sheet.setColumnWidths(8, 7, 240);
  sheet.setColumnWidth(15, 110);
  sheet.setColumnWidth(16, 220);
  sheet.getRange(2, 1, 4999, headers.length)
    .setNumberFormat('@')
    .setWrap(true)
    .setVerticalAlignment('top');
  sheet.getRange(2, 1, 4999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['9', '10', '11', '12'], true).build()
  );
  sheet.getRange(2, 13, 4999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['A', 'B', 'C', 'D'], true).build()
  );
  sheet.getRange(2, 15, 4999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['easy', 'medium', 'hard'], true).build()
  );
  sheet.activate();
  return sheet.getName();
}

function questionImportBlobFromSheet_(sheet) {
  var timezone = sheet.getParent().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  var values = sheet.getDataRange().getValues().map(function (row) {
    return row.map(function (cell) { return questionImportCellText_(cell, timezone); });
  });
  if (values.length < 2) throw new Error('The active sheet has no question rows.');
  var csv = values.map(function (row) {
    return row.map(function (cell) {
      return '"' + String(cell || '').replace(/"/g, '""') + '"';
    }).join(',');
  }).join('\r\n');
  return Utilities.newBlob(csv, 'text/csv', sheet.getName() + '.csv');
}

function questionImportSheetStateKey_(spreadsheet, sheet) {
  return 'QUESTION_IMPORT_SHEET:' + spreadsheet.getId() + ':' + sheet.getSheetId();
}

function questionImportSubjectMetadata_(sourceRows, headerMap) {
  var hasGrade = headerMap.grade !== undefined;
  var hasSubject = headerMap.subjectName !== undefined;
  if (!hasGrade && !hasSubject) return null;
  if (!hasGrade || !hasSubject) {
    throw new Error('Use both grade and subjectName columns, or omit both and answer the import prompts.');
  }
  var grades = {};
  var streams = {};
  var names = {};
  sourceRows.forEach(function (entry) {
    var grade = Number(String(entry.row[headerMap.grade] || '').trim());
    var name = clean_(entry.row[headerMap.subjectName], 200);
    var stream = headerMap.stream === undefined ? '' : clean_(entry.row[headerMap.stream], 80);
    if ([9, 10, 11, 12].indexOf(grade) < 0) {
      throw new Error('Row ' + entry.line + ': grade must be 9, 10, 11, or 12.');
    }
    if (!name) throw new Error('Row ' + entry.line + ': subjectName is blank.');
    if (stream && ['Natural', 'Social'].indexOf(stream) < 0) {
      throw new Error('Row ' + entry.line + ': stream must be Natural, Social, or blank.');
    }
    grades[String(grade)] = grade;
    streams[stream.toLowerCase()] = stream;
    names[name.toLowerCase()] = name;
  });
  if (Object.keys(grades).length !== 1 || Object.keys(streams).length !== 1 || Object.keys(names).length !== 1) {
    throw new Error('Each CSV import sheet must target exactly one grade, stream, and subjectName.');
  }
  return {
    grade: grades[Object.keys(grades)[0]],
    stream: streams[Object.keys(streams)[0]],
    name: names[Object.keys(names)[0]]
  };
}

function promptQuestionImportSubjectMetadata_(ui) {
  var gradeResponse = ui.prompt(
    'Destination grade',
    'Enter 9, 10, 11, or 12:',
    ui.ButtonSet.OK_CANCEL
  );
  if (gradeResponse.getSelectedButton() !== ui.Button.OK) return null;
  var grade = Number(String(gradeResponse.getResponseText() || '').trim());
  if ([9, 10, 11, 12].indexOf(grade) < 0) throw new Error('Grade must be 9, 10, 11, or 12.');
  var subjectResponse = ui.prompt(
    'Destination subject',
    'Enter the subject name, for example Physics, Chemistry, Biology, History, or Geography:',
    ui.ButtonSet.OK_CANCEL
  );
  if (subjectResponse.getSelectedButton() !== ui.Button.OK) return null;
  var name = clean_(subjectResponse.getResponseText(), 200);
  if (!name) throw new Error('Subject name cannot be blank.');
  var stream = '';
  if (grade >= 11) {
    var streamResponse = ui.prompt(
      'Destination stream',
      'Enter Natural or Social. Leave blank for a shared subject:',
      ui.ButtonSet.OK_CANCEL
    );
    if (streamResponse.getSelectedButton() !== ui.Button.OK) return null;
    stream = clean_(streamResponse.getResponseText(), 80);
    if (stream && ['Natural', 'Social'].indexOf(stream) < 0) {
      throw new Error('Stream must be Natural, Social, or blank.');
    }
  }
  return { grade: grade, stream: stream, name: name };
}

function findOrCreateQuestionImportSubject_(target) {
  var matches = objects_('Subjects').filter(function (subject) {
    return Number(subject.grade) === Number(target.grade)
      && clean_(subject.stream, 80).toLowerCase() === clean_(target.stream, 80).toLowerCase()
      && clean_(subject.name, 200).toLowerCase() === clean_(target.name, 200).toLowerCase()
      && String(subject.status || '').trim().toLowerCase() === 'active';
  });
  if (matches.length > 1) {
    throw new Error('Duplicate active subject rows exist for this grade, stream, and subject name.');
  }
  if (matches.length === 1) return matches[0];
  return createQuestionImporterSubject(target);
}

function previewQuestionCsv(form) {
  if (!form || !form.csvFile) throw new Error('Choose a CSV file before importing.');
  var payload = parseQuestionImportCsv_(form.csvFile);
  var externalIds = {};
  var prompts = {};
  var errors = [];
  var answerCounts = { A: 0, B: 0, C: 0, D: 0 };
  payload.sourceRows.forEach(function (entry) {
    var item = readQuestionImportRow_(entry.row, payload.headerMap);
    var rowErrors = questionFieldErrors_(item);
    var externalKey = item.externalId.toLowerCase();
    var promptKey = normalizeQuestionText_(item.question);
    if (externalKey && externalIds[externalKey]) rowErrors.push('externalId is duplicated in this CSV');
    if (promptKey && prompts[promptKey]) rowErrors.push('question text is duplicated in this CSV');
    if (externalKey) externalIds[externalKey] = true;
    if (promptKey) prompts[promptKey] = true;
    if (answerCounts[item.correctAnswer] !== undefined) answerCounts[item.correctAnswer] += 1;
    if (rowErrors.length) errors.push('Row ' + entry.line + ': ' + rowErrors.join('; '));
  });
  return {
    ok: errors.length === 0,
    fileName: payload.fileName,
    questionRows: payload.sourceRows.length,
    unit: payload.unitMetadata,
    answerCounts: answerCounts,
    errorCount: errors.length,
    errors: errors.slice(0, 25)
  };
}

function importQuestionCsv(form) {
  if (!form || !form.csvFile) throw new Error('Choose a CSV file before importing.');
  var subjectId = clean_(form.subjectId, 120);
  var unitId = clean_(form.unitId, 120);
  if (!subjectId) throw new Error('Select a subject.');
  var payload = parseQuestionImportCsv_(form.csvFile);
  var fileName = payload.fileName;
  var headerMap = payload.headerMap;
  var sourceRows = payload.sourceRows;
  var unitMetadata = payload.unitMetadata;

  return withLock_(function () {
    var subject = findObject_('Subjects', 'id', subjectId);
    if (!subject || String(subject.status || '').trim().toLowerCase() !== 'active') {
      throw new Error('The selected subject is missing or inactive in the master Subjects sheet.');
    }
    if (!activeContentSourceForSubject_(subjectId)) {
      provisionSubjectContentSpreadsheet_(subjectId);
    }
    var spreadsheet = subjectContentSpreadsheetForImport_(subjectId);
    var unit = resolveQuestionImportUnit_(spreadsheet, subjectId, unitId, unitMetadata);
    unitId = clean_(unit.id, 120);

    var questionsSheet = spreadsheet.getSheetByName('Questions');
    var existing = objectsFromSpreadsheet_(spreadsheet, 'Questions');
    var existingForUnit = existing.filter(function (item) {
      return String(item.unitId) === unitId && String(item.status) !== 'archived';
    });
    var existingExternalIds = {};
    var existingPrompts = {};
    var existingIds = {};
    var nextOrder = 1;
    existing.forEach(function (item) {
      existingIds[String(item.id).toLowerCase()] = true;
      if (item.externalId) existingExternalIds[String(item.externalId).trim().toLowerCase()] = true;
      if (String(item.unitId) === unitId) nextOrder = Math.max(nextOrder, Number(item.order) + 1 || 1);
    });
    existingForUnit.forEach(function (item) {
      existingPrompts[normalizeQuestionText_(item.question)] = true;
    });

    var batchExternalIds = {};
    var batchPrompts = {};
    var errors = [];
    var normalized = [];
    sourceRows.forEach(function (entry) {
      var item = readQuestionImportRow_(entry.row, headerMap);
      var rowErrors = questionFieldErrors_(item);
      var externalKey = item.externalId.toLowerCase();
      var promptKey = normalizeQuestionText_(item.question);

      if (externalKey && (existingExternalIds[externalKey] || batchExternalIds[externalKey])) {
        rowErrors.push('externalId is already present');
      }
      if (promptKey && (existingPrompts[promptKey] || batchPrompts[promptKey])) {
        rowErrors.push('question text duplicates an existing or uploaded question');
      }
      if (externalKey) batchExternalIds[externalKey] = true;
      if (promptKey) batchPrompts[promptKey] = true;

      if (rowErrors.length) {
        errors.push('Row ' + entry.line + ': ' + rowErrors.join('; '));
      } else {
        normalized.push(item);
      }
    });

    if (errors.length) {
      if (unit._createdByImporter) removeImporterCreatedUnit_(spreadsheet, unitId);
      appendImportHistory_(spreadsheet, {
        id: 'import-' + Utilities.getUuid(),
        unitId: unitId,
        fileName: fileName,
        totalRows: sourceRows.length,
        importedRows: 0,
        rejectedRows: sourceRows.length,
        status: 'rejected',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });
      return {
        ok: false,
        totalRows: sourceRows.length,
        errorCount: errors.length,
        errors: errors.slice(0, 100)
      };
    }

    var importId = 'import-' + Utilities.getUuid();
    var now = new Date().toISOString();
    var answerCounts = { A: 0, B: 0, C: 0, D: 0 };
    var objects = normalized.map(function (item) {
      var order = nextOrder++;
      var id = nextQuestionId_(unitId, order, existingIds);
      existingIds[id.toLowerCase()] = true;
      answerCounts[item.correctAnswer] += 1;
      return {
        id: id,
        unitId: unitId,
        question: safeSheetText_(item.question),
        optionA: safeSheetText_(item.optionA),
        optionB: safeSheetText_(item.optionB),
        optionC: safeSheetText_(item.optionC),
        optionD: safeSheetText_(item.optionD),
        correctAnswer: item.correctAnswer,
        explanation: safeSheetText_(item.explanation),
        difficulty: item.difficulty,
        order: order,
        status: 'draft',
        updatedAt: now,
        externalId: safeSheetText_(item.externalId),
        topic: safeSheetText_(item.topic),
        sourceReference: safeSheetText_(item.sourceReference),
        importId: importId
      };
    });

    var headers = SUBJECT_CONTENT_HEADERS.Questions;
    var values = objects.map(function (object) {
      return headers.map(function (header) {
        return object[header] === undefined ? '' : object[header];
      });
    });
    var startRow = questionsSheet.getLastRow() + 1;
    var written = 0;
    try {
      for (var offset = 0; offset < values.length; offset += 500) {
        var chunk = values.slice(offset, offset + 500);
        formatQuestionTextColumns_(questionsSheet, headers, startRow + offset, chunk.length);
        questionsSheet.getRange(startRow + offset, 1, chunk.length, headers.length).setValues(chunk);
        written += chunk.length;
      }
      rebuildQuestionIndexForSpreadsheet_(spreadsheet);
      appendImportHistory_(spreadsheet, {
        id: importId,
        unitId: unitId,
        fileName: fileName,
        totalRows: sourceRows.length,
        importedRows: written,
        rejectedRows: 0,
        status: 'draft',
        createdAt: now,
        completedAt: now
      });
      SpreadsheetApp.flush();
    } catch (error) {
      if (written > 0) {
        questionsSheet.deleteRows(startRow, written);
        rebuildQuestionIndexForSpreadsheet_(spreadsheet);
      }
      if (unit._createdByImporter) removeImporterCreatedUnit_(spreadsheet, unitId);
      appendImportHistory_(spreadsheet, {
        id: importId,
        unitId: unitId,
        fileName: fileName,
        totalRows: sourceRows.length,
        importedRows: 0,
        rejectedRows: sourceRows.length,
        status: 'failed',
        createdAt: now,
        completedAt: new Date().toISOString()
      });
      throw error;
    }

    return {
      ok: true,
      importId: importId,
      importedRows: written,
      status: 'draft',
      unit: {
        id: unitId,
        number: Number(unit.number),
        title: String(unit.title),
        created: Boolean(unit._createdByImporter)
      },
      answerCounts: answerCounts,
      preview: normalized.slice(0, 3).map(function (item) {
        return {
          externalId: item.externalId,
          topic: item.topic,
          question: item.question,
          correctAnswer: item.correctAnswer
        };
      })
    };
  });
}

function publishUnitQuestions(subjectId, unitId) {
  subjectId = clean_(subjectId, 120);
  unitId = clean_(unitId, 120);
  if (!subjectId || !unitId) throw new Error('Select a subject and unit.');

  return withLock_(function () {
    var spreadsheet = subjectContentSpreadsheetForImport_(subjectId);
    var unit = findObjectInSpreadsheet_(spreadsheet, 'Units', 'id', unitId);
    if (!unit || String(unit.subjectId) !== subjectId) throw new Error('Unit not found.');
    var sheet = spreadsheet.getSheetByName('Questions');
    if (!sheet || sheet.getLastRow() < 2) throw new Error('No questions have been imported for this unit.');

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    var columns = {};
    headers.forEach(function (header, index) { columns[header] = index; });
    var errors = [];
    var matching = 0;
    var changed = 0;
    var now = new Date().toISOString();
    values.forEach(function (row, index) {
      if (String(row[columns.unitId]) !== unitId || String(row[columns.status]) === 'archived') return;
      matching += 1;
      var item = {
        externalId: questionImportCellText_(row[columns.externalId], spreadsheet.getSpreadsheetTimeZone()),
        topic: questionImportCellText_(row[columns.topic], spreadsheet.getSpreadsheetTimeZone()),
        question: questionImportCellText_(row[columns.question], spreadsheet.getSpreadsheetTimeZone()),
        optionA: questionImportCellText_(row[columns.optionA], spreadsheet.getSpreadsheetTimeZone()),
        optionB: questionImportCellText_(row[columns.optionB], spreadsheet.getSpreadsheetTimeZone()),
        optionC: questionImportCellText_(row[columns.optionC], spreadsheet.getSpreadsheetTimeZone()),
        optionD: questionImportCellText_(row[columns.optionD], spreadsheet.getSpreadsheetTimeZone()),
        correctAnswer: String(row[columns.correctAnswer] || '').trim().toUpperCase(),
        explanation: questionImportCellText_(row[columns.explanation], spreadsheet.getSpreadsheetTimeZone()),
        difficulty: String(row[columns.difficulty] || '').trim().toLowerCase(),
        sourceReference: String(row[columns.sourceReference] || '').trim()
      };
      var rowErrors = questionFieldErrors_(item);
      if (rowErrors.length) errors.push('Questions row ' + (index + 2) + ': ' + rowErrors.join('; '));
      if (String(row[columns.status]) !== 'active') {
        row[columns.status] = 'active';
        row[columns.updatedAt] = now;
        changed += 1;
      }
    });
    if (!matching) throw new Error('No questions have been imported for this unit.');
    if (errors.length) {
      return { ok: false, errorCount: errors.length, errors: errors.slice(0, 100) };
    }

    if (changed) {
      var statusValues = values.map(function (row) { return [row[columns.status]]; });
      var updatedValues = values.map(function (row) { return [row[columns.updatedAt]]; });
      sheet.getRange(2, columns.status + 1, values.length, 1).setValues(statusValues);
      sheet.getRange(2, columns.updatedAt + 1, values.length, 1).setValues(updatedValues);
    }

    var unitsSheet = spreadsheet.getSheetByName('Units');
    var unitHeaders = unitsSheet.getRange(1, 1, 1, unitsSheet.getLastColumn()).getValues()[0];
    var unitValues = unitsSheet.getRange(unit._row, 1, 1, unitHeaders.length).getValues()[0];
    var unitColumns = {};
    unitHeaders.forEach(function (header, index) { unitColumns[header] = index; });
    var previousQuestionCount = Number(unitValues[unitColumns.questionCount]) || 0;
    var previousStatus = String(unitValues[unitColumns.status] || '');
    var contentChanged = changed > 0 || previousQuestionCount !== matching || previousStatus !== 'active';
    unitValues[unitColumns.questionCount] = matching;
    unitValues[unitColumns.status] = 'active';
    unitValues[unitColumns.updatedAt] = now;
    if (contentChanged) unitValues[unitColumns.version] = (Number(unitValues[unitColumns.version]) || 1) + 1;
    unitsSheet.getRange(unit._row, 1, 1, unitHeaders.length).setValues([unitValues]);

    markUnitImportsPublished_(spreadsheet, unitId, now);
    rebuildQuestionIndexForSpreadsheet_(spreadsheet);
    var announcement = createUnitPublishedAnnouncement_(
      subjectId,
      {
        id: unitId,
        title: String(unitValues[unitColumns.title] || unit.title || ('Unit ' + unit.number)),
        number: Number(unitValues[unitColumns.number]) || Number(unit.number),
        version: Number(unitValues[unitColumns.version]) || 1
      },
      matching,
      now
    );
    invalidateCatalogCaches_();
    SpreadsheetApp.flush();
    return {
      ok: true,
      publishedQuestions: matching,
      newlyPublished: changed,
      version: Number(unitValues[unitColumns.version]) || 1,
      announcementCreated: announcement.created,
      announcement: announcement
    };
  });
}

function createUnitPublishedAnnouncement_(subjectId, unit, questionCount, publishedAt) {
  var subject = findObject_('Subjects', 'id', subjectId);
  if (!subject) throw new Error('The subject metadata could not be found for the announcement.');

  var version = Math.max(1, Number(unit.version) || 1);
  var announcementId = 'unit-published-' + clean_(unit.id, 120) + '-v' + version;
  var subjectName = clean_(subject.name, 100) || 'New subject';
  var unitTitle = clean_(unit.title, 140) || ('Unit ' + (Number(unit.number) || ''));
  var grade = Number(subject.grade) || '';
  var stream = grade >= 11 ? clean_(subject.stream, 20) : '';
  var existing = findObject_('Announcements', 'id', announcementId);
  if (existing) {
    if (existing._row && (!existing.targetId || !existing.actionType)) {
      updateObjectAtRow_('Announcements', existing._row, {
        kind: 'academy',
        actionType: 'quiz',
        targetId: clean_(unit.id, 120),
        actionLabel: 'Open quiz'
      });
    }
    enqueueAnnouncementPush_(announcementId);
    return { id: announcementId, created: false, grade: grade, stream: stream };
  }

  appendObject_('Announcements', {
    id: announcementId,
    title: 'New ' + subjectName + ' quiz available',
    body: 'Grade ' + grade + ' - ' + unitTitle + ' now has ' + questionCount + ' questions ready to practise.',
    audienceGrade: grade,
    audienceStream: stream,
    publishedAt: publishedAt,
    status: 'active',
    kind: 'academy',
    actionType: 'quiz',
    targetId: clean_(unit.id, 120),
    actionLabel: 'Open quiz'
  });
  enqueueAnnouncementPush_(announcementId);
  return { id: announcementId, created: true, grade: grade, stream: stream };
}

function subjectContentSpreadsheetForImport_(subjectId) {
  var source = activeContentSourceForSubject_(subjectId);
  if (!source) {
    throw new Error('This subject does not have a provisioned content spreadsheet.');
  }
  var spreadsheet = SpreadsheetApp.openById(String(source.spreadsheetId));
  ensureSheetWithHeaders_(spreadsheet, 'Units', SUBJECT_CONTENT_HEADERS.Units);
  ensureSheetWithHeaders_(spreadsheet, 'Questions', SUBJECT_CONTENT_HEADERS.Questions);
  ensureSheetWithHeaders_(spreadsheet, 'QuestionIndex', SUBJECT_CONTENT_HEADERS.QuestionIndex);
  ensureSheetWithHeaders_(spreadsheet, 'ImportHistory', SUBJECT_CONTENT_HEADERS.ImportHistory);
  return spreadsheet;
}

function parseQuestionImportCsv_(fileBlob) {
  var fileName = clean_(fileBlob.getName ? fileBlob.getName() : 'questions.csv', 180) || 'questions.csv';
  if (!/\.csv$/i.test(fileName)) throw new Error('The importer accepts UTF-8 CSV files only.');
  var csvText = fileBlob.getDataAsString('UTF-8').replace(/^\uFEFF/, '');
  if (!csvText.trim()) throw new Error('The selected CSV file is empty.');
  var parsed;
  try {
    parsed = Utilities.parseCsv(csvText);
  } catch (error) {
    throw new Error('The CSV could not be parsed. Check quotes, commas, and line endings.');
  }
  if (parsed.length < 2) throw new Error('The CSV must contain a header and at least one question.');
  var headerMap = buildQuestionImportHeaderMap_(parsed[0]);
  var sourceRows = parsed.slice(1).map(function (row, index) {
    return { row: row, line: index + 2 };
  }).filter(function (entry) {
    return entry.row.some(function (value) { return String(value || '').trim() !== ''; });
  });
  if (!sourceRows.length) throw new Error('The CSV does not contain any question rows.');
  if (sourceRows.length > 5000) {
    throw new Error('One import can contain at most 5,000 questions. Split this file into smaller batches.');
  }
  return {
    fileName: fileName,
    headerMap: headerMap,
    sourceRows: sourceRows,
    unitMetadata: questionImportUnitMetadata_(sourceRows, headerMap)
  };
}

function questionImportUnitMetadata_(sourceRows, headerMap) {
  var hasNumber = headerMap.unitNumber !== undefined;
  var hasTitle = headerMap.unitTitle !== undefined;
  if (!hasNumber && !hasTitle) return null;
  if (!hasNumber || !hasTitle) {
    throw new Error('Use both unitNumber and unitTitle columns, or omit both and select an existing unit.');
  }

  var numbers = {};
  var titles = {};
  sourceRows.forEach(function (entry) {
    var rawNumber = String(entry.row[headerMap.unitNumber] || '').trim();
    var rawTitle = clean_(entry.row[headerMap.unitTitle], 300);
    var number = Number(rawNumber);
    if (!Number.isInteger(number) || number < 1 || number > 100) {
      throw new Error('Row ' + entry.line + ': unitNumber must be a whole number from 1 to 100.');
    }
    if (!rawTitle) throw new Error('Row ' + entry.line + ': unitTitle is blank.');
    numbers[String(number)] = number;
    titles[normalizeQuestionText_(rawTitle)] = rawTitle;
  });
  var numberKeys = Object.keys(numbers);
  var titleKeys = Object.keys(titles);
  if (numberKeys.length !== 1 || titleKeys.length !== 1) {
    throw new Error('Each CSV upload must contain questions for exactly one unitNumber and unitTitle.');
  }
  return {
    number: numbers[numberKeys[0]],
    title: titles[titleKeys[0]]
  };
}

function resolveQuestionImportUnit_(spreadsheet, subjectId, selectedUnitId, metadata) {
  var units = objectsFromSpreadsheet_(spreadsheet, 'Units').filter(function (unit) {
    return clean_(unit.subjectId, 120) === subjectId
      && String(unit.status || '').trim().toLowerCase() !== 'archived';
  });
  if (selectedUnitId) {
    var selected = units.filter(function (unit) {
      return clean_(unit.id, 120).toLowerCase() === selectedUnitId.toLowerCase();
    })[0];
    if (!selected) throw new Error('The selected unit does not belong to this subject.');
    if (metadata && Number(selected.number) !== metadata.number) {
      throw new Error(
        'The CSV says Unit ' + metadata.number + ', but the selected destination is Unit '
          + selected.number + '. Select the matching unit or clear the unit selection.'
      );
    }
    return repairEmptyQuestionImporterUnitTitle_(spreadsheet, selected, metadata);
  }

  if (!metadata) {
    throw new Error(
      'Select an existing unit, or include unitNumber and unitTitle columns in the CSV '
        + 'so the importer can create or match it automatically.'
    );
  }
  var matching = units.filter(function (unit) {
    return Number(unit.number) === metadata.number;
  });
  if (matching.length > 1) {
    throw new Error(
      'More than one Unit ' + metadata.number + ' exists for this subject. '
        + 'Fix the duplicate unit rows before importing.'
    );
  }
  if (matching.length === 1) {
    return repairEmptyQuestionImporterUnitTitle_(spreadsheet, matching[0], metadata);
  }

  var unit = {
    id: subjectId + '-u' + metadata.number,
    subjectId: subjectId,
    number: metadata.number,
    title: metadata.title,
    titleAm: metadata.title,
    questionCount: 0,
    version: 1,
    status: 'draft',
    updatedAt: new Date().toISOString()
  };
  var duplicateId = units.some(function (existing) {
    return clean_(existing.id, 120).toLowerCase() === unit.id.toLowerCase();
  });
  if (duplicateId) throw new Error('The generated unit id already exists: ' + unit.id + '.');
  spreadsheet.getSheetByName('Units').appendRow(
    SUBJECT_CONTENT_HEADERS.Units.map(function (header) {
      return unit[header] === undefined ? '' : unit[header];
    })
  );
  unit._createdByImporter = true;
  return unit;
}

function repairEmptyQuestionImporterUnitTitle_(spreadsheet, unit, metadata) {
  if (!metadata || normalizeQuestionText_(unit.title) === normalizeQuestionText_(metadata.title)) {
    return unit;
  }
  var unitId = clean_(unit.id, 120);
  var hasQuestions = objectsFromSpreadsheet_(spreadsheet, 'Questions').some(function (question) {
    return clean_(question.unitId, 120) === unitId;
  });
  if (hasQuestions) {
    throw new Error(
      'Unit ' + unit.number + ' already contains questions under the title "' + unit.title
        + '", but the CSV says "' + metadata.title + '".'
    );
  }
  var sheet = spreadsheet.getSheetByName('Units');
  var titleColumn = SUBJECT_CONTENT_HEADERS.Units.indexOf('title') + 1;
  var titleAmColumn = SUBJECT_CONTENT_HEADERS.Units.indexOf('titleAm') + 1;
  var updatedAtColumn = SUBJECT_CONTENT_HEADERS.Units.indexOf('updatedAt') + 1;
  sheet.getRange(unit._row, titleColumn).setValue(metadata.title);
  if (!clean_(unit.titleAm, 300) || normalizeQuestionText_(unit.titleAm) === normalizeQuestionText_(unit.title)) {
    sheet.getRange(unit._row, titleAmColumn).setValue(metadata.title);
    unit.titleAm = metadata.title;
  }
  sheet.getRange(unit._row, updatedAtColumn).setValue(new Date().toISOString());
  unit.title = metadata.title;
  return unit;
}

function removeImporterCreatedUnit_(spreadsheet, unitId) {
  var unit = findObjectInSpreadsheet_(spreadsheet, 'Units', 'id', unitId);
  if (unit && unit._row >= 2) {
    spreadsheet.getSheetByName('Units').deleteRow(unit._row);
  }
}

function buildQuestionImportHeaderMap_(headers) {
  var map = {};
  headers.forEach(function (header, index) {
    var key = String(header || '').replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    var canonical = QUESTION_IMPORT_HEADER_ALIASES[key];
    if (!canonical) return;
    if (map[canonical] !== undefined) throw new Error('The CSV contains duplicate columns for ' + canonical + '.');
    map[canonical] = index;
  });
  var missing = QUESTION_IMPORT_REQUIRED_FIELDS.filter(function (field) {
    return map[field] === undefined;
  });
  if (missing.length) throw new Error('Missing required CSV columns: ' + missing.join(', ') + '.');
  return map;
}

function readQuestionImportRow_(row, headerMap) {
  function value(field) {
    return headerMap[field] === undefined ? '' : String(row[headerMap[field]] || '').trim();
  }
  function mathValue(field) {
    return normalizeImportedMathEscapes_(value(field));
  }
  return {
    externalId: value('externalId').slice(0, 160),
    topic: value('topic').slice(0, 200),
    question: mathValue('question'),
    optionA: mathValue('optionA'),
    optionB: mathValue('optionB'),
    optionC: mathValue('optionC'),
    optionD: mathValue('optionD'),
    correctAnswer: value('correctAnswer').toUpperCase(),
    explanation: mathValue('explanation'),
    difficulty: (value('difficulty') || 'medium').toLowerCase(),
    sourceReference: value('sourceReference').slice(0, 300)
  };
}

function questionFieldErrors_(item) {
  var errors = [];
  if (!item.question) errors.push('question is blank');
  if (item.question.length > 5000) errors.push('question exceeds 5,000 characters');
  var options = [item.optionA, item.optionB, item.optionC, item.optionD];
  if (options.some(function (option) { return !option; })) errors.push('all four options are required');
  if (options.some(function (option) { return option.length > 3000; })) errors.push('an option exceeds 3,000 characters');
  var uniqueOptions = {};
  options.forEach(function (option) { uniqueOptions[normalizeQuestionText_(option)] = true; });
  if (Object.keys(uniqueOptions).length !== 4) errors.push('options must be distinct');
  if (['A', 'B', 'C', 'D'].indexOf(item.correctAnswer) < 0) errors.push('correctAnswer must be A, B, C, or D');
  if (!item.explanation) errors.push('explanation is blank');
  if (item.explanation.length > 10000) errors.push('explanation exceeds 10,000 characters');
  if (['easy', 'medium', 'hard'].indexOf(item.difficulty) < 0) errors.push('difficulty must be easy, medium, or hard');
  [item.question].concat(options).concat([item.explanation]).forEach(function (value) {
    if (!hasBalancedMathDelimiters_(value)) errors.push('contains unmatched $ equation delimiters');
    if (hasNestedMathDelimiters_(value)) errors.push('contains a $ delimiter inside an unfinished LaTeX group');
  });
  return errors.filter(function (message, index, all) { return all.indexOf(message) === index; });
}

function hasBalancedMathDelimiters_(value) {
  var count = 0;
  var escaped = false;
  String(value || '').split('').forEach(function (character) {
    if (character === '$' && !escaped) count += 1;
    escaped = character === '\\' && !escaped;
    if (character !== '\\') escaped = false;
  });
  return count % 2 === 0;
}

function hasNestedMathDelimiters_(value) {
  var source = String(value || '');
  var inMath = false;
  var braceDepth = 0;
  for (var index = 0; index < source.length; index += 1) {
    var character = source[index];
    var escaped = index > 0 && source[index - 1] === '\\' && (index < 2 || source[index - 2] !== '\\');
    if (character === '$' && !escaped) {
      var display = source[index + 1] === '$';
      if (!inMath) {
        inMath = true;
        braceDepth = 0;
      } else {
        if (braceDepth > 0) return true;
        inMath = false;
      }
      if (display) index += 1;
      continue;
    }
    if (!inMath || escaped) continue;
    if (character === '{') braceDepth += 1;
    if (character === '}') braceDepth = Math.max(0, braceDepth - 1);
  }
  return false;
}

function normalizeImportedMathEscapes_(value) {
  var normalized = String(value || '').replace(/\\\\/g, '\\');
  var nestedRomanUnit = /\$\\mathrm\{([^$]*)\$\\mathrm\{([^$}]*)\}\$([^}]*)\}\$/g;
  var previous = '';
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(nestedRomanUnit, function (_match, before, inner, after) {
      return '$\\mathrm{' + before + inner + after + '}$';
    });
  }
  return normalized;
}

function normalizeQuestionText_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function safeSheetText_(value) {
  var text = String(value || '').replace(/\u0000/g, '');
  return /^[=+@]/.test(text) ? "'" + text : text;
}

function questionImportCellText_(value, timezone) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timezone || Session.getScriptTimeZone(), 'd/M');
  }
  return String(value || '').trim();
}

function repairAllQuestionFractionDates() {
  var master = SpreadsheetApp.getActiveSpreadsheet();
  if (!master) throw new Error('Open the Zemen Academy master spreadsheet first.');
  var spreadsheets = [master];
  var seen = {};
  seen[master.getId()] = true;
  contentSourceRecords_().filter(function (source) {
    return source.status === 'active' && source.spreadsheetId;
  }).forEach(function (source) {
    var id = String(source.spreadsheetId);
    if (seen[id]) return;
    spreadsheets.push(SpreadsheetApp.openById(id));
    seen[id] = true;
  });

  var repairedCells = 0;
  var updatedUnits = 0;
  spreadsheets.forEach(function (spreadsheet) {
    var result = repairQuestionFractionDatesInSpreadsheet_(spreadsheet);
    repairedCells += result.repairedCells;
    updatedUnits += result.updatedUnits;
  });
  invalidateCatalogCaches_();
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    'Fraction repair complete',
    repairedCells + ' date-formatted question cell(s) repaired across '
      + spreadsheets.length + ' spreadsheet(s).\n'
      + updatedUnits + ' affected unit version(s) were incremented.\n\n'
      + 'Students should sync content or update the downloaded unit.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return { repairedCells: repairedCells, updatedUnits: updatedUnits, spreadsheets: spreadsheets.length };
}

function repairQuestionFractionDatesInSpreadsheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName('Questions');
  if (!sheet || sheet.getLastRow() < 2) return { repairedCells: 0, updatedUnits: 0 };
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowCount = sheet.getLastRow() - 1;
  var unitColumn = headers.indexOf('unitId');
  if (unitColumn < 0) throw new Error(spreadsheet.getName() + ': Questions is missing unitId.');
  var unitIds = sheet.getRange(2, unitColumn + 1, rowCount, 1).getDisplayValues();
  var affectedUnits = {};
  var repairedCells = 0;
  ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'].forEach(function (header) {
    var column = headers.indexOf(header);
    if (column < 0) return;
    var range = sheet.getRange(2, column + 1, rowCount, 1);
    var values = range.getValues();
    var changed = false;
    values.forEach(function (row, index) {
      var value = row[0];
      if (Object.prototype.toString.call(value) !== '[object Date]' || isNaN(value.getTime())) return;
      row[0] = Utilities.formatDate(value, spreadsheet.getSpreadsheetTimeZone(), 'd/M');
      affectedUnits[String(unitIds[index][0])] = true;
      repairedCells += 1;
      changed = true;
    });
    range.setNumberFormat('@');
    if (changed) range.setValues(values);
  });

  var affectedIds = Object.keys(affectedUnits).filter(Boolean);
  if (!affectedIds.length) return { repairedCells: repairedCells, updatedUnits: 0 };
  var unitsSheet = spreadsheet.getSheetByName('Units');
  if (!unitsSheet || unitsSheet.getLastRow() < 2) {
    throw new Error(spreadsheet.getName() + ': affected questions exist but Units is missing.');
  }
  var unitHeaders = unitsSheet.getRange(1, 1, 1, unitsSheet.getLastColumn()).getValues()[0];
  var idColumn = unitHeaders.indexOf('id');
  var versionColumn = unitHeaders.indexOf('version');
  var updatedAtColumn = unitHeaders.indexOf('updatedAt');
  if (idColumn < 0 || versionColumn < 0 || updatedAtColumn < 0) {
    throw new Error(spreadsheet.getName() + ': Units is missing id, version, or updatedAt.');
  }
  var unitRowCount = unitsSheet.getLastRow() - 1;
  var rows = unitsSheet.getRange(2, 1, unitRowCount, unitHeaders.length).getValues();
  var affectedLookup = {};
  affectedIds.forEach(function (id) { affectedLookup[id] = true; });
  var updatedUnits = 0;
  var now = new Date().toISOString();
  rows.forEach(function (row) {
    if (!affectedLookup[String(row[idColumn])]) return;
    row[versionColumn] = Math.max(1, Number(row[versionColumn]) || 1) + 1;
    row[updatedAtColumn] = now;
    updatedUnits += 1;
  });
  unitsSheet.getRange(2, 1, unitRowCount, unitHeaders.length).setValues(rows);
  rebuildQuestionIndexForSpreadsheet_(spreadsheet);
  return { repairedCells: repairedCells, updatedUnits: updatedUnits };
}

function nextQuestionId_(unitId, order, existingIds) {
  var candidateOrder = Number(order) || 1;
  var id;
  do {
    id = unitId + '-q' + String(candidateOrder).padStart(5, '0');
    candidateOrder += 1;
  } while (existingIds[id.toLowerCase()]);
  return id;
}

function appendImportHistory_(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName('ImportHistory');
  var headers = SUBJECT_CONTENT_HEADERS.ImportHistory;
  sheet.appendRow(headers.map(function (header) {
    return record[header] === undefined ? '' : record[header];
  }));
}

function markUnitImportsPublished_(spreadsheet, unitId, completedAt) {
  var sheet = spreadsheet.getSheetByName('ImportHistory');
  if (!sheet || sheet.getLastRow() < 2) return;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  var unitColumn = headers.indexOf('unitId');
  var statusColumn = headers.indexOf('status');
  var completedColumn = headers.indexOf('completedAt');
  var changed = false;
  rows.forEach(function (row) {
    if (String(row[unitColumn]) === unitId && String(row[statusColumn]) === 'draft') {
      row[statusColumn] = 'published';
      row[completedColumn] = completedAt;
      changed = true;
    }
  });
  if (changed) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}
