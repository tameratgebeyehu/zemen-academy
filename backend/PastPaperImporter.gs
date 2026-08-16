var PAST_PAPER_IMPORT_HEADERS = [
  'stream', 'subjectName', 'externalId', 'year', 'paperTitle', 'topic',
  'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer',
  'explanation', 'difficulty', 'sourceReference', 'accessTier'
];

function createBlankPastPaperImportSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || masterSpreadsheet_();
  var sheet = createTimestampedImportSheet_(spreadsheet, 'Entrance Exam Import', PAST_PAPER_IMPORT_HEADERS);
  sheet.getRange(2, 1, 4999, PAST_PAPER_IMPORT_HEADERS.length).setNumberFormat('@').setWrap(true);
  sheet.getRange(2, 1, 4999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Natural', 'Social'], true).build()
  );
  sheet.getRange(2, 12, 4999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['A', 'B', 'C', 'D'], true).build()
  );
  sheet.getRange(2, 14, 4999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['easy', 'medium', 'hard'], true).build()
  );
  sheet.getRange(2, 16, 4999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['free', 'premium'], true).build()
  );
  sheet.activate();
  return sheet.getName();
}

function importActivePastPaperSheetAsDraft() {
  var ui = SpreadsheetApp.getUi();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  if (!sheet) throw new Error('Select the imported entrance-exam CSV tab first.');
  try {
    var parsed = parsePastPaperImportSheet_(sheet);
    var confirmation = ui.alert(
      'Import entrance exam as Draft?',
      (parsed.paper.stream || 'Shared across both streams') + ' · ' + parsed.paper.subjectName + '\n'
        + parsed.paper.year + ' · ' + parsed.paper.title + '\n'
        + parsed.questions.length + ' reviewed questions\n\n'
        + 'Students will not see this paper until you publish it.',
      ui.ButtonSet.YES_NO
    );
    if (confirmation !== ui.Button.YES) return { cancelled: true };

    var result = withLock_(function () { return writePastPaperDraft_(parsed, sheet.getName()); });
    PropertiesService.getUserProperties().setProperty(
      pastPaperImportStateKey_(spreadsheet, sheet), JSON.stringify(result)
    );
    sheet.setTabColor('#D97706');
    sheet.getRange(1, 1).setNote(
      result.questionCount + ' questions imported as Draft. Use Zemen Past Papers → Publish active imported entrance exam.'
    );
    ui.alert(
      'Draft import complete',
      result.questionCount + ' questions are staged for review. Nothing is visible to students yet.',
      ui.ButtonSet.OK
    );
    return result;
  } catch (error) {
    ui.alert('Entrance-exam import failed', error && error.message ? error.message : String(error), ui.ButtonSet.OK);
    return { ok: false };
  }
}

function publishActivePastPaperSheet() {
  var ui = SpreadsheetApp.getUi();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getActiveSheet();
  if (!sheet) throw new Error('Select the CSV tab that you imported as Draft.');
  var raw = PropertiesService.getUserProperties().getProperty(pastPaperImportStateKey_(spreadsheet, sheet));
  if (!raw) {
    ui.alert('Import this tab as Draft before publishing it.');
    return { ok: false };
  }
  try {
    var state = JSON.parse(raw);
    var draftRows = objects_('PastPaperQuestions').filter(function (item) {
      return String(item.importId) === String(state.importId)
        && String(item.paperId) === String(state.paperId)
        && String(item.status).toLowerCase() === 'draft';
    });
    if (!draftRows.length || draftRows.length !== Number(state.questionCount)) {
      throw new Error('The staged question count changed. Import this CSV as Draft again before publishing.');
    }
    var confirmation = ui.alert(
      'Publish entrance exam?',
      state.title + '\n' + state.questionCount + ' questions\n\n'
        + 'This replaces the currently published version of the same paper.',
      ui.ButtonSet.YES_NO
    );
    if (confirmation !== ui.Button.YES) return { cancelled: true };

    var result = withLock_(function () { return publishPastPaperDraft_(state); });
    sheet.setTabColor('#16A34A');
    sheet.getRange(1, 1).setNote(
      'Published as version ' + result.version + ' on ' + result.updatedAt + '.'
    );
    ui.alert(
      'Entrance exam published',
      result.questionCount + ' questions are now available in Instant and Exam modes.',
      ui.ButtonSet.OK
    );
    return result;
  } catch (error) {
    ui.alert('Publish failed', error && error.message ? error.message : String(error), ui.ButtonSet.OK);
    return { ok: false };
  }
}

function parsePastPaperImportSheet_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('The active sheet has no question rows.');
  var headerMap = importHeaderMap_(values[0], PAST_PAPER_IMPORT_HEADERS);
  var timezone = sheet.getParent().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  var rows = [];
  values.slice(1).forEach(function (row, index) {
    if (!row.some(function (cell) { return String(cell || '').trim() !== ''; })) return;
    var item = {};
    PAST_PAPER_IMPORT_HEADERS.forEach(function (header) {
      item[header] = questionImportCellText_(row[headerMap[header]], timezone);
    });
    rows.push({ line: index + 2, item: item });
  });
  if (!rows.length) throw new Error('The active sheet has no question rows.');
  if (rows.length > 5000) throw new Error('Import at most 5,000 questions at a time.');

  var first = rows[0].item;
  var stream = clean_(first.stream, 20);
  if (stream && ['Natural', 'Social'].indexOf(stream) < 0) throw new Error('stream must be Natural, Social, or blank for a shared paper.');
  var subjectName = pastPaperImportText_(first.subjectName, 160);
  var title = pastPaperImportText_(first.paperTitle, 180);
  var year = Number(String(first.year || '').replace(/[^0-9]/g, ''));
  var accessTier = clean_(first.accessTier || 'premium', 20).toLowerCase();
  if (!subjectName) throw new Error('subjectName is required.');
  if (!title) throw new Error('paperTitle is required.');
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('year must be four digits, for example 2018.');
  if (['free', 'premium'].indexOf(accessTier) < 0) throw new Error('accessTier must be free or premium.');

  var externalIds = {};
  var prompts = {};
  var questions = rows.map(function (entry, order) {
    var item = entry.item;
    var rowStream = clean_(item.stream, 20);
    if (rowStream !== stream || pastPaperImportText_(item.subjectName, 160).toLowerCase() !== subjectName.toLowerCase()
      || Number(String(item.year || '').replace(/[^0-9]/g, '')) !== year
      || pastPaperImportText_(item.paperTitle, 180).toLowerCase() !== title.toLowerCase()) {
      throw new Error('Row ' + entry.line + ': stream, subjectName, year, and paperTitle must match every row in one file.');
    }
    var externalId = validatedIdentifier_(item.externalId, 'external question');
    var question = normalizeImportedMathEscapes_(pastPaperImportText_(item.question, 12000));
    var options = ['optionA', 'optionB', 'optionC', 'optionD'].map(function (key) {
      return normalizeImportedMathEscapes_(pastPaperImportText_(item[key], 6000));
    });
    var correctAnswer = clean_(item.correctAnswer, 1).toUpperCase();
    var explanation = normalizeImportedMathEscapes_(pastPaperImportText_(item.explanation, 16000));
    var difficulty = clean_(item.difficulty || 'hard', 20).toLowerCase();
    var promptKey = question.toLowerCase().replace(/\s+/g, ' ');
    if (!question || options.some(function (option) { return !option; }) || !explanation) {
      throw new Error('Row ' + entry.line + ': question, four options, and explanation are required.');
    }
    if (['A', 'B', 'C', 'D'].indexOf(correctAnswer) < 0) throw new Error('Row ' + entry.line + ': correctAnswer must be A, B, C, or D.');
    if (['easy', 'medium', 'hard'].indexOf(difficulty) < 0) throw new Error('Row ' + entry.line + ': difficulty must be easy, medium, or hard.');
    if ((new Set(options.map(function (option) { return option.toLowerCase().replace(/\s+/g, ' '); }))).size !== 4) {
      throw new Error('Row ' + entry.line + ': all four choices must be different.');
    }
    if (externalIds[externalId.toLowerCase()]) throw new Error('Row ' + entry.line + ': duplicate externalId.');
    if (prompts[promptKey]) throw new Error('Row ' + entry.line + ': duplicate question text.');
    externalIds[externalId.toLowerCase()] = true;
    prompts[promptKey] = true;
    return {
      externalId: externalId, question: question,
      optionA: options[0], optionB: options[1], optionC: options[2], optionD: options[3],
      correctAnswer: correctAnswer, explanation: explanation, difficulty: difficulty,
      order: order + 1, topic: pastPaperImportText_(item.topic, 240),
      sourceReference: pastPaperImportText_(item.sourceReference, 1000)
    };
  });
  return {
    paper: { stream: stream, subjectName: subjectName, year: year, title: title, accessTier: accessTier },
    questions: questions
  };
}

function writePastPaperDraft_(parsed, fileName) {
  var subjectId = 'entrance-' + slugQuestionImporterPart_(parsed.paper.subjectName);
  var paperId = pastPaperStableId_(parsed.paper, subjectId);
  var importId = 'PAPER-IMPORT-' + Utilities.getUuid();
  var now = new Date().toISOString();
  var incomingIds = {};
  parsed.questions.forEach(function (question) { incomingIds[question.externalId.toLowerCase()] = true; });
  var collision = objects_('PastPaperQuestions').filter(function (item) {
    return incomingIds[String(item.id || '').toLowerCase()] && String(item.paperId) !== paperId;
  })[0];
  if (collision) throw new Error('Question ID ' + collision.id + ' is already used by another entrance paper.');
  deletePastPaperQuestionRows_(function (item) {
    return String(item.paperId) === paperId && String(item.status).toLowerCase() === 'draft';
  });
  var sheet = sheet_('PastPaperQuestions');
  var rows = parsed.questions.map(function (question) {
    var record = {
      id: validatedIdentifier_(question.externalId, 'question'), paperId: paperId,
      question: pastPaperSafeSheetText_(question.question),
      optionA: pastPaperSafeSheetText_(question.optionA), optionB: pastPaperSafeSheetText_(question.optionB),
      optionC: pastPaperSafeSheetText_(question.optionC), optionD: pastPaperSafeSheetText_(question.optionD),
      correctAnswer: question.correctAnswer, explanation: pastPaperSafeSheetText_(question.explanation),
      difficulty: question.difficulty, order: question.order, status: 'draft', updatedAt: now,
      externalId: question.externalId, topic: pastPaperSafeSheetText_(question.topic),
      sourceReference: pastPaperSafeSheetText_(question.sourceReference), importId: importId
    };
    return SHEET_HEADERS.PastPaperQuestions.map(function (header) { return record[header] === undefined ? '' : record[header]; });
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SHEET_HEADERS.PastPaperQuestions.length).setValues(rows);
  var existing = findObject_('PastPapers', 'id', paperId);
  if (!existing) {
    appendObject_('PastPapers', {
      id: paperId, title: parsed.paper.title, grade: '', stream: parsed.paper.stream,
      subjectId: subjectId, year: parsed.paper.year, version: 1, content: '', downloadUrl: '',
      status: 'draft', updatedAt: now, accessTier: parsed.paper.accessTier, questionCount: rows.length,
      subjectName: parsed.paper.subjectName, subjectIcon: entranceSubjectIcon_(parsed.paper.subjectName)
    });
  }
  SpreadsheetApp.flush();
  return {
    ok: true, importId: importId, paperId: paperId, title: parsed.paper.title,
    questionCount: rows.length, fileName: fileName,
    stream: parsed.paper.stream, subjectId: subjectId, subjectName: parsed.paper.subjectName, year: parsed.paper.year,
    accessTier: parsed.paper.accessTier
  };
}

function publishPastPaperDraft_(state) {
  var now = new Date().toISOString();
  var draftRows = objects_('PastPaperQuestions').filter(function (item) {
    return String(item.paperId) === String(state.paperId)
      && String(item.importId) === String(state.importId)
      && String(item.status).toLowerCase() === 'draft';
  });
  if (!draftRows.length) throw new Error('No staged questions were found.');
  var questionSheet = sheet_('PastPaperQuestions');
  var statusColumn = SHEET_HEADERS.PastPaperQuestions.indexOf('status') + 1;
  var updatedColumn = SHEET_HEADERS.PastPaperQuestions.indexOf('updatedAt') + 1;
  draftRows.forEach(function (item) {
    questionSheet.getRange(item._row, statusColumn).setValue('active');
    questionSheet.getRange(item._row, updatedColumn).setValue(now);
  });
  deletePastPaperQuestionRows_(function (item) {
    return String(item.paperId) === String(state.paperId)
      && String(item.status).toLowerCase() === 'active'
      && String(item.importId) !== String(state.importId);
  });
  var existing = findObject_('PastPapers', 'id', state.paperId);
  var paper = {
    id: state.paperId, title: state.title, grade: '', stream: state.stream || '',
    subjectId: state.subjectId, year: state.year,
    version: existing && String(existing.status).toLowerCase() === 'active' ? Math.max(1, Number(existing.version) || 1) + 1 : 1,
    content: '', downloadUrl: '', status: 'active', updatedAt: now,
    accessTier: state.accessTier || 'premium', questionCount: draftRows.length,
    subjectName: state.subjectName || state.subjectId, subjectIcon: entranceSubjectIcon_(state.subjectName)
  };
  if (existing) updateObjectAtRow_('PastPapers', existing._row, paper);
  else appendObject_('PastPapers', paper);
  invalidatePastPaperCaches_(paper, existing);
  SpreadsheetApp.flush();
  return { ok: true, id: paper.id, version: paper.version, questionCount: draftRows.length, updatedAt: now };
}

function deletePastPaperQuestionRows_(predicate) {
  var rows = objects_('PastPaperQuestions').filter(predicate).map(function (item) { return item._row; });
  var sheet = sheet_('PastPaperQuestions');
  rows.sort(function (left, right) { return right - left; }).forEach(function (row) { sheet.deleteRow(row); });
  return rows.length;
}

function pastPaperStableId_(paper, subjectId) {
  return validatedIdentifier_([
    'ENTRANCE', paper.stream || 'ALL', paper.year, subjectId
  ].join('-').toUpperCase().replace(/[^A-Z0-9._:-]+/g, '-').slice(0, 120), 'past paper');
}

function pastPaperImportStateKey_(spreadsheet, sheet) {
  return 'PAST_PAPER_IMPORT:' + spreadsheet.getId() + ':' + sheet.getSheetId();
}

function importHeaderMap_(sourceHeaders, requiredHeaders) {
  var map = {};
  sourceHeaders.forEach(function (header, index) {
    map[String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = index;
  });
  var result = {};
  var missing = [];
  requiredHeaders.forEach(function (header) {
    var index = map[header.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (index === undefined) missing.push(header);
    else result[header] = index;
  });
  if (missing.length) throw new Error('Missing required column(s): ' + missing.join(', ') + '.');
  return result;
}

function createTimestampedImportSheet_(spreadsheet, prefix, headers) {
  var base = prefix + ' ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd HHmm');
  var name = base;
  var suffix = 2;
  while (spreadsheet.getSheetByName(name)) { name = base + ' ' + suffix; suffix += 1; }
  var sheet = spreadsheet.insertSheet(name);
  if (sheet.getMaxRows() < 5000) sheet.insertRowsAfter(sheet.getMaxRows(), 5000 - sheet.getMaxRows());
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#111113');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, Math.min(7, headers.length), 125);
  if (headers.length > 7) sheet.setColumnWidths(8, headers.length - 7, 230);
  return sheet;
}

function pastPaperImportText_(value, maxLength) {
  return String(value === undefined || value === null ? '' : value).replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function pastPaperSafeSheetText_(value) {
  var text = String(value || '').replace(/\u0000/g, '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function entranceSubjectIcon_(subjectName) {
  var name = String(subjectName || '').toLowerCase();
  if (name.indexOf('physics') >= 0) return 'atom';
  if (name.indexOf('chem') >= 0) return 'flask-outline';
  if (name.indexOf('bio') >= 0) return 'leaf';
  if (name.indexOf('math') >= 0) return 'calculator-variant-outline';
  if (name.indexOf('history') >= 0) return 'pillar';
  if (name.indexOf('geo') >= 0) return 'earth';
  if (name.indexOf('econom') >= 0) return 'chart-line';
  if (name.indexOf('english') >= 0) return 'alphabetical-variant';
  return 'clipboard-text-outline';
}
