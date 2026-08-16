import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@jest/globals';

const code = readFileSync(resolve(process.cwd(), 'backend', 'Code.gs'), 'utf8');
const setup = readFileSync(resolve(process.cwd(), 'backend', 'Setup.gs'), 'utf8');

test('routes authenticated study-plan reads and writes', () => {
  expect(code).toContain("case 'studyPlan': return studyPlan_(payload)");
  expect(code).toContain("case 'syncStudyPlan': return syncStudyPlan_(payload)");
  expect(code).toContain('var session = requireSession_(payload.token);');
  expect(code).toContain('function normalizeStudyPlan_');
  expect(code).toContain("serialized.length > 45000");
});

test('installs and protects the per-user StudyPlans sheet', () => {
  expect(setup).toContain("StudyPlans: ['userId', 'planJson', 'updatedAt']");
  expect(setup).toMatch(/SECURITY_SENSITIVE_SHEETS[\s\S]*'StudyPlans'/);
  expect(setup).toContain(".addItem('Install timetable sync storage', 'installStudyPlanSync')");
  expect(setup).toContain('function installStudyPlanSync()');
});
