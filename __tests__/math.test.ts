import { expect, test } from '@jest/globals';

import {
  containsMath,
  estimateMathHeight,
  mathDocumentId,
  normalizeMathSource,
  normalizeSpreadsheetFractionText,
  renderMathDocument,
  splitMathSegments,
  toReadableMathText,
} from '@/utils/math';

test('recovers fractions that Google Sheets converted into date strings', () => {
  expect(normalizeSpreadsheetFractionText('Tue Nov 03 2026 00:00:00 GMT+0300 (East Africa Time)')).toBe('3/11');
  expect(normalizeSpreadsheetFractionText('Wed Nov 04 2026 00:00:00 GMT+0300 (East Africa Time)')).toBe('4/11');
  expect(normalizeSpreadsheetFractionText('4/13')).toBe('4/13');
  expect(normalizeMathSource('$\\frac{4}{11}$')).toBe('$\\frac{4}{11}$');
});

test('renders fractions, radicals, and powers through offline KaTeX HTML', () => {
  const html = renderMathDocument(
    'Evaluate $\\frac{3}{11}$, $\\sqrt{5}$, and $x^{2}$.',
    { color: '#111111', fontSize: 16, lineHeight: 24 },
  );
  expect(html).toContain('class="mfrac"');
  expect(html).toContain('sqrt');
  expect(html).toContain('class="msupsub"');
  expect(html).toContain('data:font/woff2;base64');
  expect(html).toContain('font-display:swap');
  expect(html).toContain('document.fonts.ready');
});

test('keeps every coordinate visible inside ordered-pair brackets', () => {
  const html = renderMathDocument(
    'The points $(-1,2)$ and $(4,11)$ are ordered pairs.',
    { color: '#111111', fontSize: 17, lineHeight: 25 },
  );
  expect(html).toContain('>1</span>');
  expect(html).toContain('>2</span>');
  expect(html).toContain('>4</span>');
  expect(html).toContain('>11</span>');
  expect(html).not.toContain('<span class="math-fallback">');
});

test('upgrades legacy Unicode radicals from spreadsheet questions into structured math', () => {
  const prompt = 'For positive integer n, √(18n) is an integer multiple of √2. Which n gives coefficient 9?';
  expect(normalizeMathSource(prompt)).toBe(
    'For positive integer n, $\\sqrt{18n}$ is an integer multiple of $\\sqrt{2}$. Which n gives coefficient 9?',
  );
  expect(containsMath(prompt)).toBe(true);

  const html = renderMathDocument(prompt, { color: '#111111', fontSize: 17, lineHeight: 26 });
  expect(html.match(/class="mord sqrt"/g)).toHaveLength(2);
  expect(html).toContain('class="hide-tail"');
  expect(html).not.toContain('<span class="math-fallback">');
});

test('upgrades indexed roots and powers inside legacy Unicode radicals', () => {
  expect(normalizeMathSource('Simplify ⁴√(b⁶) and ∛8.')).toBe(
    'Simplify $\\sqrt[4]{b^{6}}$ and $\\sqrt[3]{8}$.',
  );
  const html = renderMathDocument('Simplify ⁴√(b⁶).', { color: '#111111', fontSize: 17, lineHeight: 26 });
  expect(html).toContain('class="root"');
  expect(html).toContain('class="msupsub"');
});

test('renders the full Grade 10 mathematics notation contract', () => {
  const html = renderMathDocument(
    'Use $\\frac{a_{1}^{2}}{\\sqrt[3]{b}}$, $0.\\overline{36}$, $\\angle ABC=45^{\\circ}$, and $f:A\\to B$.',
    { color: '#111111', fontSize: 17, lineHeight: 26 },
  );
  expect(html).toContain('class="mfrac"');
  expect(html).toContain('class="root"');
  expect(html).toContain('class="msupsub"');
  expect(html).toContain('overline');
  expect(html).toContain('math-structured');
  expect(html).toContain('STIX Two Math');
  expect(html).not.toContain('<span class="math-fallback">');
});

test('splits inline and display equations without exposing delimiters', () => {
  const segments = splitMathSegments(
    'Velocity is $v = u + at$. Then $$s = ut + \\frac{1}{2}at^2$$.',
  );
  expect(segments).toEqual([
    { type: 'text', value: 'Velocity is ' },
    { type: 'math', value: 'v = u + at', display: false },
    { type: 'text', value: '. Then ' },
    { type: 'math', value: 's = ut + \\frac{1}{2}at^2', display: true },
    { type: 'text', value: '.' },
  ]);
});

test('renders Unit 3 physics notation as offline KaTeX HTML', () => {
  const html = renderMathDocument(
    'Displacement is $\\Delta x=x_f-x_i$, so $\\Delta x=5-(-12)=+17\\,\\mathrm{m}$.',
    { color: '#111111', fontSize: 16, lineHeight: 24 },
  );
  expect(html).toContain('class="katex"');
  expect(html).toContain('Δ');
  expect(html).toContain('class="msupsub"');
  expect(html).not.toContain('$\\Delta');
  expect(html).not.toContain('https://');
  expect(html).toContain(mathDocumentId('Displacement is $\\Delta x=x_f-x_i$, so $\\Delta x=5-(-12)=+17\\,\\mathrm{m}$.'));
});

test('leaves ordinary currency text on the native text path', () => {
  expect(containsMath('The book costs \\$5.')).toBe(false);
  expect(splitMathSegments('Unmatched $ stays readable.')).toEqual([
    { type: 'text', value: 'Unmatched $ stays readable.' },
  ]);
});

test('uses stable space estimates and readable native previews', () => {
  const short = estimateMathHeight('Speed is $v=d/t$.', 24, 30);
  const long = estimateMathHeight('A longer prompt with $\\Delta x=x_f-x_i$ and enough words to wrap onto another line.', 24, 20);
  expect(short).toBeGreaterThanOrEqual(28);
  expect(long).toBeGreaterThan(short);
  expect(toReadableMathText('Find $\\Delta x$ in $\\mathrm{m}$.')).toBe('Find Δx in m.');
});

test('renders malformed TeX as normal-color readable text instead of a red error', () => {
  const html = renderMathDocument('Value: $\\frac{1}{$', { color: '#222222', fontSize: 16, lineHeight: 24 });
  expect(html).toContain('math-fallback');
  expect(html).not.toContain('#B3261E');
  expect(html).not.toContain('math-error');
});

test('repairs double-escaped and nested Unit 2 measurement notation', () => {
  expect(normalizeMathSource('$4.75\\\\,\\\\mathrm{cm}$')).toBe('$4.75\\,\\mathrm{cm}$');
  expect(normalizeMathSource('$\\mathrm{kg\\,$\\mathrm{m/s}$^2}$')).toBe('$\\mathrm{kg\\,m/s^2}$');
  expect(normalizeMathSource('$\\mathrm{$\\mathrm{m/s}$^2}$')).toBe('$\\mathrm{m/s^2}$');

  const html = renderMathDocument(
    'Force uses $\\mathrm{kg\\,$\\mathrm{m/s}$^2}$.',
    { color: '#111111', fontSize: 16, lineHeight: 24 },
  );
  expect(html).toContain('class="katex"');
  expect(html).not.toContain('<span class="math-fallback">');
});

test('creates readable result summaries across science subjects', () => {
  expect(toReadableMathText('Physics: $v^2=u^2+2as$.')).toBe('Physics: v²=u²+2as.');
  expect(toReadableMathText('Chemistry: $\\mathrm{H_2O}$ and $\\mathrm{CO_2}$.')).toBe('Chemistry: H₂O and CO₂.');
  expect(toReadableMathText('Biology: carbon dioxide is $CO_2$.')).toBe('Biology: carbon dioxide is CO₂.');
});
