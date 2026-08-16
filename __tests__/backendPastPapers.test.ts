import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@jest/globals';

test('installs a validated draft and publish workflow for past papers', () => {
  const setup = readFileSync(resolve(process.cwd(), 'backend', 'Setup.gs'), 'utf8');
  const code = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
  const importer = readFileSync(resolve(process.cwd(), 'backend', 'PastPaperImporter.gs'), 'utf8');

  expect(setup).toContain("ui.createMenu('Zemen Past Papers')");
  expect(setup).toContain(".addItem('Publish active imported entrance exam', 'publishActivePastPaperSheet')");
  expect(setup).toContain('PastPaperQuestions:');
  expect(importer).toContain('function importActivePastPaperSheetAsDraft()');
  expect(importer).toContain('function publishActivePastPaperSheet()');
  expect(importer).toContain("status: 'draft'");
  expect(importer).toContain("questionSheet.getRange(item._row, statusColumn).setValue('active')");
  expect(importer).toContain('invalidatePastPaperCaches_(paper, existing);');
  expect(setup).toContain("if (name === 'PastPapers')");
  expect(code).toContain("if (paperAccessTier_(paper) === 'premium') requirePremiumAccess_(payload.token);");
  expect(code).toContain("objects_('PastPaperQuestions').filter");
  expect(code).toContain('questions: questions');
});
