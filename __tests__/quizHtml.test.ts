import { expect, test } from '@jest/globals';

import type { Question } from '@/types';
import {
  createQuizPlayerUpdateScript,
  renderQuizPlayerDocument,
  renderQuizPlayerShell,
  renderQuizReviewDocument,
  type QuizHtmlColors,
} from '@/utils/quizHtml';

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
  expect(html).toContain('class="katex"');
  expect(html).not.toContain('ResizeObserver');
  expect(html).not.toContain('scrollIntoView');
  expect(html).not.toContain('https://');
});

test('renders feedback and review equations without raw red renderer errors', () => {
  const player = renderQuizPlayerDocument({ question, selected: 0, revealAnswer: true, locked: true, colors });
  const review = renderQuizReviewDocument({ question, answer: 0, colors });
  expect(player).toContain('Not quite');
  expect(player).toContain('Correct answer: B');
  expect(player).toContain('Why?');
  expect(player).not.toContain('View explanation');
  expect(player).toContain("feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest'");
  expect(player).toContain('role="status"');
  expect(player).not.toContain('tabindex="-1"');
  expect(player).not.toContain('feedback.focus');
  expect(player.match(/data-answer=/g)).toHaveLength(4);
  expect(player).toContain('class="option correct"');
  expect(review).toContain('Correct answer');
  expect(review).toContain('Explanation');
  expect(review).toContain("type: 'height'");
  expect(review).toContain('ResizeObserver');
  expect(review).not.toContain('math-error');
});

test('keeps the heavy math shell reusable while question updates stay small', () => {
  const shell = renderQuizPlayerShell(colors);
  const update = createQuizPlayerUpdateScript({
    question,
    selected: 1,
    revealAnswer: true,
    locked: true,
  });
  expect(shell).toContain('__zemenSetQuizQuestion');
  expect(shell).toContain('KaTeX_Main');
  expect(update).toContain('__zemenSetQuizQuestion');
  expect(update).toContain('Correct answer: B');
  expect(update).not.toContain('KaTeX_Main');
  expect(update.length).toBeLessThan(shell.length / 10);
});

test('renders Grade 10 structured notation with responsive math classes', () => {
  const mathematicsQuestion: Question = {
    ...question,
    id: 'math-g10-u1-001',
    prompt: 'Simplify $\\frac{x^{3}\\sqrt[3]{x^{2}}}{x_{1}}$ and identify $\\overline{AB}$.',
    options: [
      '$x^{\\frac{8}{3}}$',
      '$x^{\\frac{11}{3}}$',
      '$x^{5}$',
      '$\\sqrt{x}$',
    ],
    explanation: 'Use $\\sqrt[3]{x^{2}}=x^{\\frac{2}{3}}$ and the index law $x^a x^b=x^{a+b}$.',
  };
  const html = renderQuizPlayerDocument({
    question: mathematicsQuestion,
    selected: null,
    revealAnswer: false,
    locked: false,
    colors,
  });
  expect(html).toContain('class="mfrac"');
  expect(html).toContain('class="root"');
  expect(html).toContain('class="msupsub"');
  expect(html).toContain('overline');
  expect(html).toContain('math-structured');
  expect(html).toContain('overflow-x: auto');
});

test('renders legacy Unicode radicals as structured roots in the quiz player', () => {
  const legacyRadicalQuestion: Question = {
    ...question,
    id: 'math-g9-legacy-root',
    prompt: 'For positive integer n, √(18n) is an integer multiple of √2.',
    options: ['9', '12', '6', '18'],
  };
  const html = renderQuizPlayerDocument({
    question: legacyRadicalQuestion,
    selected: null,
    revealAnswer: false,
    locked: false,
    colors,
  });
  expect(html.match(/class="mord sqrt"/g)).toHaveLength(2);
  expect(html).not.toContain('<span class="math-fallback">');
});

test('escapes spreadsheet text before placing it in the local document', () => {
  const unsafe = { ...question, prompt: '<script>alert("bad")</script> $x=1$' };
  const html = renderQuizReviewDocument({ question: unsafe, answer: null, colors });
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>alert');
});
