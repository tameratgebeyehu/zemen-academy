import { expect, test } from '@jest/globals';

import type { Question } from '@/types';
import { renderQuizPlayerDocument, renderQuizReviewDocument, type QuizHtmlColors } from '@/utils/quizHtml';

const colors: QuizHtmlColors = {
  surface: '#ffffff',
  surfaceVariant: '#f4f4f4',
  onSurface: '#111111',
  onSurfaceVariant: '#222222',
  outline: '#555555',
  outlineVariant: '#dddddd',
  primary: '#000000',
  primaryContainer: '#e8e8e8',
  onPrimaryContainer: '#111111',
  error: '#b3261e',
  errorContainer: '#f9dedc',
  onErrorContainer: '#410e0b',
};

const question: Question = {
  id: 'physics-2',
  unitId: 'physics-unit-3',
  prompt: 'An object moves from $x_i=-12\\,\\mathrm{m}$ to $x_f=5\\,\\mathrm{m}$.',
  options: ['$-17\\,\\mathrm{m}$', '$+17\\,\\mathrm{m}$', '$+7\\,\\mathrm{m}$', '$-7\\,\\mathrm{m}$'],
  correctAnswer: 1,
  explanation: 'Use $\\Delta x=x_f-x_i=5-(-12)=17\\,\\mathrm{m}$.',
  order: 2,
};

test('renders one bounded player document containing the prompt and all choices', () => {
  const html = renderQuizPlayerDocument({ question, selected: null, revealAnswer: false, locked: false, colors });
  expect(html).toContain('id="quiz"');
  expect(html.match(/data-answer=/g)).toHaveLength(4);
  expect(html).toContain('role="radiogroup"');
  expect(html).toContain('#quiz { width: 100%; min-height: 100%');
  expect(html).not.toContain('max-height: 36%');
  expect(html).toContain('<math');
  expect(html).not.toContain('ResizeObserver');
  expect(html).not.toContain('https://');
});

test('renders feedback and review equations without raw red renderer errors', () => {
  const player = renderQuizPlayerDocument({ question, selected: 0, revealAnswer: true, locked: true, colors });
  const review = renderQuizReviewDocument({ question, answer: 0, colors });
  expect(player).toContain('Not quite');
  expect(player).toContain('Correct answer: B');
  expect(player).toContain('Why?');
  expect(player).not.toContain('View explanation');
  expect(player).toContain('role="status"');
  expect(player).not.toContain('tabindex="-1"');
  expect(player).not.toContain('feedback.focus');
  expect(player.match(/data-answer=/g)).toHaveLength(4);
  expect(player).toContain('class="option correct"');
  expect(review).toContain('Correct answer');
  expect(review).toContain('Explanation');
  expect(review).not.toContain('math-error');
});

test('escapes spreadsheet text before placing it in the local document', () => {
  const unsafe = { ...question, prompt: '<script>alert("bad")</script> $x=1$' };
  const html = renderQuizReviewDocument({ question: unsafe, answer: null, colors });
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>alert');
});
