import { KATEX_CSS } from '@/utils/katexCss.generated';
import { renderMathFragment } from '@/utils/math';

export interface PaperHtmlColors {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  outline: string;
  accent: string;
}

function paperLine(line: string) {
  const heading = line.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const level = Math.min(3, heading[1]!.length + 1);
    return `<h${level}>${renderMathFragment(heading[2]!)}</h${level}>`;
  }
  if (!line.trim()) return '<div class="space" aria-hidden="true"></div>';
  const question = /^(?:\d+[.)]|[A-D][.)])\s+/.test(line.trim());
  return `<p${question ? ' class="question-line"' : ''}>${renderMathFragment(line)}</p>`;
}

export function renderPastPaperDocument(content: string, colors: PaperHtmlColors) {
  const body = content.replace(/\r\n?/g, '\n').split('\n').map(paperLine).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    ${KATEX_CSS}
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: ${colors.background}; color: ${colors.foreground}; }
    body {
      padding: 18px 18px 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 16px; line-height: 1.58; overflow-wrap: break-word; user-select: none; -webkit-user-select: none;
    }
    #paper { width: 100%; max-width: 820px; margin: 0 auto; }
    h2, h3, h4 { margin: 22px 0 10px; line-height: 1.3; color: ${colors.foreground}; }
    h2 { font-size: 23px; } h3 { font-size: 20px; } h4 { font-size: 18px; }
    p { margin: 0 0 9px; }
    .question-line {
      margin: 12px 0; padding: 13px 14px; border: 1px solid ${colors.outline}; border-radius: 14px;
      background: ${colors.surface};
    }
    .space { height: 8px; }
    .math-inline { display: inline-block; max-width: 100%; vertical-align: -0.18em; line-height: 1.24; white-space: nowrap; }
    .math-display { display: block; max-width: 100%; margin: 10px 0; padding: 5px 2px; text-align: center; overflow-x: auto; }
    math { color: inherit; font-size: 1.14em; font-family: "STIX Two Math", "Cambria Math", "Noto Sans Math", serif; }
    annotation { display: none !important; }
    .math-fallback { color: inherit; }
    @media (max-width: 380px) { body { padding: 14px 13px 32px; font-size: 15px; } .question-line { padding: 11px 12px; } }
  </style>
</head>
<body><main id="paper">${body}</main>
<script>
  document.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  document.addEventListener('copy', function (event) { event.preventDefault(); });
</script>
</body>
</html>`;
}
