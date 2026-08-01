import katex from 'katex';

export type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; display: boolean };

export function normalizeMathSource(source: string) {
  let normalized = source.replace(/\\\\/g, '\\');
  const nestedRomanUnit = /\$\\mathrm\{([^$]*)\$\\mathrm\{([^$}]*)\}\$([^}]*)\}\$/g;
  let previous = '';
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(
      nestedRomanUnit,
      (_match, before: string, inner: string, after: string) => `$\\mathrm{${before}${inner}${after}}$`,
    );
  }
  return normalized;
}

function isEscaped(source: string, index: number) {
  let slashes = 0;
  for (let position = index - 1; position >= 0 && source[position] === '\\'; position -= 1) {
    slashes += 1;
  }
  return slashes % 2 === 1;
}

function findClosingDelimiter(source: string, start: number, delimiter: '$' | '$$') {
  for (let position = start; position < source.length; position += 1) {
    if (source[position] !== '$' || isEscaped(source, position)) continue;
    if (delimiter === '$$' && source.slice(position, position + 2) === '$$') return position;
    if (delimiter === '$' && source[position + 1] !== '$') return position;
  }
  return -1;
}

export function splitMathSegments(source: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let textStart = 0;
  let position = 0;

  while (position < source.length) {
    if (source[position] !== '$' || isEscaped(source, position)) {
      position += 1;
      continue;
    }
    const delimiter: '$' | '$$' = source[position + 1] === '$' ? '$$' : '$';
    const mathStart = position + delimiter.length;
    const closing = findClosingDelimiter(source, mathStart, delimiter);
    if (closing < 0) {
      position += delimiter.length;
      continue;
    }
    if (position > textStart) {
      segments.push({ type: 'text', value: source.slice(textStart, position) });
    }
    segments.push({
      type: 'math',
      value: source.slice(mathStart, closing).trim(),
      display: delimiter === '$$',
    });
    position = closing + delimiter.length;
    textStart = position;
  }

  if (textStart < source.length) segments.push({ type: 'text', value: source.slice(textStart) });
  if (!segments.length) segments.push({ type: 'text', value: source });
  return segments;
}

export function containsMath(source: string) {
  return splitMathSegments(source).some((segment) => segment.type === 'math');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSegment(segment: MathSegment) {
  if (segment.type === 'text') {
    return escapeHtml(segment.value).replace(/\r?\n/g, '<br>');
  }
  try {
    const math = katex.renderToString(segment.value, {
      displayMode: segment.display,
      output: 'mathml',
      throwOnError: true,
      strict: 'ignore',
      trust: false,
    });
    return segment.display
      ? `<div class="math-display">${math}</div>`
      : `<span class="math-inline">${math}</span>`;
  } catch {
    return `<span class="math-fallback">${escapeHtml(readableFormula(segment.value))}</span>`;
  }
}

export function renderMathFragment(source: string) {
  return splitMathSegments(normalizeMathSource(source)).map(renderSegment).join('');
}

const superscriptCharacters: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
};

const subscriptCharacters: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ',
  m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ',
  u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

function convertScript(value: string, characters: Record<string, string>, prefix: '^' | '_') {
  const converted = [...value].map((character) => characters[character]).join('');
  return converted.length === value.length ? converted : `${prefix}${value.length > 1 ? `(${value})` : value}`;
}

function readableFormula(value: string) {
  return value
    .replace(/\\left|\\right/g, '')
    .replace(/\\(?:mathrm|text)\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\(?:vec|overline)\{([^{}]*)\}/g, '$1')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\rho/g, 'ρ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\pm/g, '±')
    .replace(/\\degree/g, '°')
    .replace(/\\,/g, ' ')
    .replace(/\^\{([^{}]+)\}/g, (_match, script: string) => convertScript(script, superscriptCharacters, '^'))
    .replace(/\^([+\-]?\d+)/g, (_match, script: string) => convertScript(script, superscriptCharacters, '^'))
    .replace(/_\{([^{}]+)\}/g, (_match, script: string) => convertScript(script, subscriptCharacters, '_'))
    .replace(/_([A-Za-z0-9])/g, (_match, script: string) => convertScript(script, subscriptCharacters, '_'))
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/([Δθαβ])\s+([A-Za-z])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toReadableMathText(source: string) {
  return splitMathSegments(normalizeMathSource(source))
    .map((segment) => segment.type === 'text' ? segment.value : readableFormula(segment.value))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mathDocumentId(source: string) {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `math-${(hash >>> 0).toString(36)}`;
}

export function estimateMathHeight(source: string, lineHeight: number, charactersPerLine = 30) {
  const segments = splitMathSegments(source);
  let inlineLength = 0;
  let lines = 0;

  for (const segment of segments) {
    if (segment.type === 'math' && segment.display) {
      if (inlineLength > 0) {
        lines += Math.max(1, Math.ceil(inlineLength / charactersPerLine));
        inlineLength = 0;
      }
      lines += Math.max(2, Math.ceil(readableFormula(segment.value).length / charactersPerLine));
      continue;
    }

    const value = segment.type === 'text' ? segment.value : readableFormula(segment.value);
    const parts = value.split(/\r?\n/);
    parts.forEach((part, index) => {
      inlineLength += part.length;
      if (index < parts.length - 1) {
        lines += Math.max(1, Math.ceil(inlineLength / charactersPerLine));
        inlineLength = 0;
      }
    });
  }

  if (inlineLength > 0 || lines === 0) lines += Math.max(1, Math.ceil(inlineLength / charactersPerLine));
  return Math.ceil(lines * lineHeight + 4);
}

export interface MathDocumentOptions {
  color: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: string | number;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function renderMathDocument(source: string, options: MathDocumentOptions) {
  const content = renderMathFragment(source);
  const align = options.textAlign && options.textAlign !== 'auto' ? options.textAlign : 'left';
  const documentId = mathDocumentId(source);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    html, body { margin: 0; padding: 0; background: transparent; color: ${options.color}; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: ${options.fontSize}px;
      line-height: ${options.lineHeight}px;
      font-weight: ${String(options.fontWeight ?? '400')};
      text-align: ${align};
      overflow-wrap: anywhere;
    }
    #content { width: 100%; }
    .math-inline { display: inline; white-space: nowrap; }
    .math-display { display: block; max-width: 100%; margin: 8px 0; text-align: center; overflow: hidden; }
    math { color: ${options.color}; font-size: 1.08em; }
    math[display="block"] { display: block; max-width: 100%; margin: 0 auto; }
    annotation { display: none !important; }
    .math-fallback { color: inherit; font-family: inherit; }
  </style>
</head>
<body>
  <div id="content">${content}</div>
  <script>
    (function () {
      var lastHeight = 0;
      function reportHeight() {
        var content = document.getElementById('content');
        var height = Math.max(1, Math.ceil(content.getBoundingClientRect().height));
        if (height !== lastHeight && window.ReactNativeWebView) {
          lastHeight = height;
          window.ReactNativeWebView.postMessage(JSON.stringify({ id: '${documentId}', height: height }));
        }
      }
      reportHeight();
      requestAnimationFrame(reportHeight);
      window.addEventListener('load', reportHeight);
      if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(document.getElementById('content'));
    })();
  </script>
</body>
</html>`;
}
