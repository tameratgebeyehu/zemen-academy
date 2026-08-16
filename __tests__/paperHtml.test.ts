import { expect, test } from '@jest/globals';

import { renderPastPaperDocument } from '@/utils/paperHtml';

const colors = {
  background: '#ffffff', surface: '#f5f5f5', foreground: '#111111',
  muted: '#555555', outline: '#dddddd', accent: '#00695c',
};

test('renders headings and offline KaTeX mathematics in one secure document', () => {
  const html = renderPastPaperDocument(
    '# Section A\n1. Simplify $\\frac{3}{4}+\\sqrt{9}$.\nA. $\\frac{15}{4}$',
    colors,
  );
  expect(html).toContain('<h2>Section A</h2>');
  expect(html).toContain('class="question-line"');
  expect(html).toContain('class="mfrac"');
  expect(html).toContain('sqrt');
  expect(html).toContain("addEventListener('copy'");
  expect(html).not.toContain('https://');
});
