import { expect, test } from '@jest/globals';

import {
  containsMath,
  estimateMathHeight,
  mathDocumentId,
  normalizeMathSource,
  renderMathDocument,
  splitMathSegments,
  toReadableMathText,
} from '@/utils/math';

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

test('renders Unit 3 physics notation as offline MathML', () => {
  const html = renderMathDocument(
    'Displacement is $\\Delta x=x_f-x_i$, so $\\Delta x=5-(-12)=+17\\,\\mathrm{m}$.',
    { color: '#111111', fontSize: 16, lineHeight: 24 },
  );
  expect(html).toContain('<math');
  expect(html).toContain('Δ');
  expect(html).toContain('<msub>');
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
  expect(html).toContain('<math');
  expect(html).not.toContain('<span class="math-fallback">');
});

test('creates readable result summaries across science subjects', () => {
  expect(toReadableMathText('Physics: $v^2=u^2+2as$.')).toBe('Physics: v²=u²+2as.');
  expect(toReadableMathText('Chemistry: $\\mathrm{H_2O}$ and $\\mathrm{CO_2}$.')).toBe('Chemistry: H₂O and CO₂.');
  expect(toReadableMathText('Biology: carbon dioxide is $CO_2$.')).toBe('Biology: carbon dioxide is CO₂.');
});
