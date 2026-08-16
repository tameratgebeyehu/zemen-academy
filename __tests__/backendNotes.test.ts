import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

import { expect, test } from '@jest/globals';

test('installs and exposes the dedicated notes API contract', () => {
  const setup = readFileSync(resolve(process.cwd(), 'backend', 'Setup.gs'), 'utf8');
  const code = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');

  expect(setup).toContain("Notes: ['id', 'grade', 'stream', 'subjectId', 'unitId', 'title'");
  expect(code).toContain("case 'notes': return notes_(payload);");
  expect(code).toContain("case 'note': return note_(payload);");
  expect(code).toContain("if (noteAccessTier_(note) === 'premium') requirePremiumAccess_(payload.token);");
  expect(code).toContain('body = String(item.body || \'\').slice(0, 45000)');
});

test('provides a guarded spreadsheet note editor and publishing workflow', () => {
  const setup = readFileSync(resolve(process.cwd(), 'backend', 'Setup.gs'), 'utf8');
  const importer = readFileSync(resolve(process.cwd(), 'backend', 'NotesImporter.gs'), 'utf8');

  expect(setup).toContain("ui.createMenu('Zemen Notes')");
  expect(setup).toContain(".addItem('Publish current note', 'publishNoteEditorDraft')");
  expect(setup).toContain('function validateNoteEditor_(note)');
  expect(setup).toContain('if (unitId) resolveUnitContent_(unitId, subjectId);');
  expect(setup).toContain("note.status = 'active';");
  expect(setup).toContain('invalidateNoteCaches_(note, existing);');
  expect(setup).toContain("sheet.getRange(3, 2, NOTE_EDITOR_FIELDS.length, 1).setNumberFormat('@')");
  expect(setup).toContain("if (name === 'Notes' || name === 'NoteDrafts')");
  expect(setup).toContain('function formatNoteTextColumns_');
  expect(setup).toContain(".addItem('Import active notes sheet as Draft', 'importActiveNotesSheetAsDraft')");
  expect(importer).toContain('function normalizeNoteStructure_');
  expect(importer).toContain('function noteSummaryFromBody_');
  expect(importer).toContain('function publishNoteDrafts_');
});

test('auto-detects note metadata and assigns access by unit number', () => {
  const importer = readFileSync(resolve(process.cwd(), 'backend', 'NotesImporter.gs'), 'utf8');
  const sandbox: Record<string, unknown> = {};
  runInNewContext(importer, sandbox);

  const detect = sandbox.noteMetadataFromExternalId_ as (id: string) => Record<string, unknown>;
  expect({ ...detect('NOTE-G10-MATH-U1-001') }).toEqual({
    grade: 10,
    stream: '',
    subjectName: 'Mathematics',
    unitNumber: 1,
  });
  expect({ ...detect('NOTE-G11-NAT-PHYS-U2-001') }).toEqual({
    grade: 11,
    stream: 'Natural',
    subjectName: 'Physics',
    unitNumber: 2,
  });

  expect(importer).toContain("var NOTE_IMPORT_HEADERS = ['externalId', 'unitTitle', 'summary', 'body'];");
  expect(importer).toContain("var tier = unitNumber === 1 ? 'free' : 'premium';");
  expect(importer).toContain("var missing = ['externalId', 'body']");
  expect(importer).toContain('function resolveNoteImportUnit_');
  expect(importer).toContain('use exactly one note row per unit');
  expect(importer).toContain("status: 'archived'");

  const normalize = sandbox.normalizeNoteStructure_ as (body: string, title: string) => { body: string };
  expect(normalize('## What it means\n\nA relation connects two sets.', '1.1 Relations').body).toContain('## What it means');
  expect(normalize('## Common mistakes\n\n- First mistake\n- Second mistake', '1.1 Relations').body).toContain('- First mistake\n\n- Second mistake');
});
