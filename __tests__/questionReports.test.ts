import { describe, expect, it } from '@jest/globals';

import { createQuestionReport } from '@/utils/questionReports';

const question = {
  id: 'q-1',
  unitId: 'unit-1',
  prompt: 'What is $v$?',
  options: ['1', '2', '3', '4'] as [string, string, string, string],
  correctAnswer: 2 as const,
  explanation: 'Because.',
  order: 1,
};

describe('createQuestionReport', () => {
  it('creates a stable question snapshot and trims the note', () => {
    const report = createQuestionReport({
      question,
      subjectId: 'physics-9',
      reporterId: 'guest-1',
      isGuest: true,
      mode: 'instant',
      category: 'answer-key',
      note: '  Please check this answer.  ',
      questionNumber: 4,
      selectedAnswer: 1,
      now: new Date('2026-07-31T12:00:00.000Z'),
      random: 'fixed',
    });

    expect(report.id).toBe('report-1785499200000-fixed');
    expect(report.note).toBe('Please check this answer.');
    expect(report.prompt).toBe(question.prompt);
    expect(report.options).toEqual(question.options);
    expect(report.correctAnswer).toBe(2);
  });
});
