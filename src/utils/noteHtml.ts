import { KATEX_CSS } from '@/utils/katexCss.generated';
import { renderMathFragment } from '@/utils/math';
import { parseStudyNoteBody } from '@/utils/notes';

export interface StudyNoteDocumentInput {
  title: string;
  unitLabel: string;
  summary?: string;
  body: string;
  updatedLabel?: string;
  colors: {
    background: string;
    surface: string;
    surfaceVariant: string;
    text: string;
    muted: string;
    primary: string;
    primaryContainer: string;
    outline: string;
  };
}

function renderBody(body: string): string {
  const blocks = parseStudyNoteBody(body);
  const output: string[] = [];

  for (let index = 0; index < blocks.length;) {
    const block = blocks[index]!;
    if (block.type === 'bullet') {
      const items: string[] = [];
      while (blocks[index]?.type === 'bullet') {
        items.push(`<li>${renderMathFragment(blocks[index]!.text)}</li>`);
        index += 1;
      }
      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (block.type === 'numbered') {
      const items: string[] = [];
      while (index < blocks.length) {
        const numbered = blocks[index];
        if (!numbered || numbered.type !== 'numbered') break;
        items.push(`<li value="${numbered.number}">${renderMathFragment(numbered.text)}</li>`);
        index += 1;
      }
      output.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    if (block.type === 'heading') {
      const tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h2' : 'h3';
      output.push(`<${tag}>${renderMathFragment(block.text)}</${tag}>`);
    } else {
      output.push(`<p>${renderMathFragment(block.text)}</p>`);
    }
    index += 1;
  }

  return output.join('');
}

export function renderStudyNoteHtml(input: StudyNoteDocumentInput): string {
  const { colors } = input;
  const summary = input.summary
    ? `<aside><span class="summary-label">UNIT OVERVIEW</span><p>${renderMathFragment(input.summary)}</p></aside>`
    : '';
  const updated = input.updatedLabel ? `<footer>${renderMathFragment(input.updatedLabel)}</footer>` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    ${KATEX_CSS}
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: ${colors.background}; color: ${colors.text}; }
    body {
      padding: 2px 2px 30px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 17px;
      line-height: 1.58;
      overflow-wrap: anywhere;
      -webkit-font-smoothing: antialiased;
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }
    main { width: 100%; max-width: 760px; margin: 0 auto; }
    header {
      padding: 18px 18px 16px;
      border: 1px solid ${colors.outline};
      border-radius: 22px;
      background: ${colors.surface};
    }
    .unit-label {
      display: inline-block;
      margin-bottom: 9px;
      padding: 5px 10px;
      border-radius: 999px;
      background: ${colors.primaryContainer};
      color: ${colors.primary};
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: 27px; line-height: 1.18; letter-spacing: -.025em; }
    aside {
      margin: 12px 0 16px;
      padding: 14px 16px;
      border-left: 4px solid ${colors.primary};
      border-radius: 16px;
      background: ${colors.primaryContainer};
    }
    aside p { margin: 4px 0 0; color: ${colors.text}; }
    .summary-label { color: ${colors.primary}; font-size: 11px; font-weight: 900; letter-spacing: .1em; }
    article {
      margin-top: 14px;
      padding: 8px 17px 18px;
      border: 1px solid ${colors.outline};
      border-radius: 22px;
      background: ${colors.surface};
    }
    h2 {
      margin: 24px 0 10px;
      padding: 11px 13px;
      border-radius: 14px;
      background: ${colors.primaryContainer};
      color: ${colors.primary};
      font-size: 21px;
      line-height: 1.25;
      letter-spacing: -.015em;
    }
    article > h2:first-child { margin-top: 8px; }
    h3 {
      margin: 20px 0 7px;
      padding-left: 10px;
      border-left: 4px solid ${colors.primary};
      color: ${colors.text};
      font-size: 18px;
      line-height: 1.3;
    }
    p { margin: 7px 0 10px; }
    ul, ol { margin: 7px 0 13px; padding-left: 25px; }
    li { margin: 5px 0; padding-left: 3px; }
    li::marker { color: ${colors.primary}; font-weight: 800; }
    .katex { color: ${colors.text}; font-size: 1.08em; }
    .katex-display { margin: .7em 0; overflow-x: auto; overflow-y: hidden; }
    .math-fallback { color: ${colors.text}; font-family: inherit; }
    footer { padding: 15px 4px 2px; color: ${colors.muted}; font-size: 12px; text-align: center; }
    @media (max-width: 380px) {
      body { font-size: 16px; }
      header { padding: 16px; border-radius: 19px; }
      h1 { font-size: 24px; }
      article { padding: 7px 14px 16px; border-radius: 19px; }
      h2 { font-size: 20px; }
      h3 { font-size: 17px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="unit-label">${renderMathFragment(input.unitLabel)}</span>
      <h1>${renderMathFragment(input.title)}</h1>
    </header>
    ${summary}
    <article>${renderBody(input.body)}</article>
    ${updated}
  </main>
</body>
</html>`;
}
