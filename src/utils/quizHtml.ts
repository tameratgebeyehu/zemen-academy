import type { AnswerIndex, Question } from '@/types';
import { renderMathFragment } from '@/utils/math';

export interface QuizHtmlColors {
  surface: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  error: string;
  errorContainer: string;
  onErrorContainer: string;
}

const letters = ['A', 'B', 'C', 'D'] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeScriptString(value: string) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function baseStyles(colors: QuizHtmlColors) {
  return `
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: transparent; }
    body {
      color: ${colors.onSurface};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.48;
      -webkit-text-size-adjust: 100%;
      overflow-wrap: anywhere;
    }
    math { color: inherit; font-size: 1.08em; }
    math[display="block"] { display: block; max-width: 100%; margin: 8px auto; overflow-x: auto; overflow-y: hidden; }
    annotation { display: none !important; }
    .math-inline { display: inline; white-space: nowrap; }
    .math-display { display: block; max-width: 100%; margin: 8px 0; text-align: center; overflow-x: auto; overflow-y: hidden; }
    .math-fallback { color: inherit; font-family: inherit; }
    .scrollable { overscroll-behavior: contain; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
  `;
}

function documentShell(colors: QuizHtmlColors, styles: string, body: string, script = '') {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>${baseStyles(colors)}${styles}</style>
</head>
<body>${body}${script ? `<script>${script}</script>` : ''}</body>
</html>`;
}

interface PlayerDocumentOptions {
  question: Question;
  selected: AnswerIndex | null;
  revealAnswer: boolean;
  locked: boolean;
  colors: QuizHtmlColors;
}

export function renderQuizPlayerDocument({
  question,
  selected,
  revealAnswer,
  locked,
  colors,
}: PlayerDocumentOptions) {
  const options = question.options.map((option, index) => {
    const chosen = selected === index;
    const correct = revealAnswer && index === question.correctAnswer;
    const incorrect = revealAnswer && chosen && index !== question.correctAnswer;
    const classes = ['option', chosen ? 'selected' : '', correct ? 'correct' : '', incorrect ? 'incorrect' : '']
      .filter(Boolean)
      .join(' ');
    const stateIcon = correct ? '&#10003;' : incorrect ? '&times;' : '';
    return `<button class="${classes}" type="button" role="radio" aria-checked="${chosen}" aria-disabled="${locked}" data-answer="${index}" ${locked ? 'disabled' : ''}>
      <span class="letter">${letters[index]}</span>
      <span class="option-copy">${renderMathFragment(option)}</span>
      <span class="option-state" aria-hidden="true">${stateIcon}</span>
    </button>`;
  }).join('');

  const feedback = revealAnswer
    ? `<section id="answer-feedback" class="feedback ${selected === question.correctAnswer ? 'feedback-correct' : 'feedback-wrong'}" role="status" aria-live="polite">
        <div class="feedback-result">
          <strong>${selected === question.correctAnswer ? 'Correct' : 'Not quite'}</strong>
          <span>Correct answer: ${letters[question.correctAnswer]}</span>
        </div>
        <div class="reasoning-label">Why?</div>
        <div class="feedback-copy">${renderMathFragment(question.explanation)}</div>
      </section>`
    : '';

  const styles = `
    html, body { overflow-x: hidden; overflow-y: auto; overscroll-behavior-y: contain; }
    #quiz { width: 100%; min-height: 100%; padding: 2px 2px 18px; }
    .prompt {
      width: 100%; margin-bottom: 12px; padding: 13px 14px;
      border: 1px solid ${colors.outlineVariant}; border-radius: 16px;
      background: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant};
      font-size: 18px; line-height: 1.46; font-weight: 700;
    }
    .options { display: flex; flex-direction: column; gap: 8px; padding: 1px; }
    .option {
      width: 100%; min-height: 54px; display: grid;
      grid-template-columns: 38px minmax(0, 1fr) 23px; align-items: center; gap: 10px;
      padding: 8px 11px; border: 1px solid ${colors.outlineVariant}; border-radius: 14px;
      background: ${colors.surface}; color: ${colors.onSurface}; text-align: left;
      font: inherit; line-height: 1.42; -webkit-tap-highlight-color: transparent;
    }
    .option:active:not(:disabled) { transform: scale(.992); background: ${colors.surfaceVariant}; }
    .option:disabled { opacity: 1; }
    .letter {
      width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
      border: 1.5px solid ${colors.outline}; border-radius: 11px; font-size: 14px; font-weight: 800;
    }
    .option-copy { min-width: 0; }
    .option-state { color: ${colors.primary}; font-size: 22px; font-weight: 900; text-align: center; }
    .option.selected { border-color: ${colors.primary}; background: ${colors.primaryContainer}; color: ${colors.onPrimaryContainer}; }
    .option.selected .letter, .option.correct .letter { border-color: ${colors.primary}; }
    .option.incorrect { border-color: ${colors.error}; background: ${colors.errorContainer}; color: ${colors.onErrorContainer}; }
    .option.incorrect .letter { border-color: ${colors.error}; }
    .option.incorrect .option-state { color: ${colors.error}; }
    .feedback {
      margin-top: 12px; padding: 13px 14px; border-radius: 15px;
      border: 1px solid ${colors.outlineVariant};
    }
    .feedback-result {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding-bottom: 9px; margin-bottom: 9px; border-bottom: 1px solid ${colors.outlineVariant};
    }
    .feedback-result strong { font-size: 16px; }
    .feedback-result span { font-size: 13px; font-weight: 750; }
    .reasoning-label { margin-bottom: 4px; font-size: 12px; line-height: 1.2; font-weight: 850; letter-spacing: .6px; text-transform: uppercase; opacity: .72; }
    .feedback-copy { font-size: 15px; line-height: 1.46; }
    .feedback-correct { background: ${colors.primaryContainer}; color: ${colors.onPrimaryContainer}; border-color: ${colors.primary}; }
    .feedback-wrong { background: ${colors.errorContainer}; color: ${colors.onErrorContainer}; border-color: ${colors.error}; }
    @media (max-height: 700px) {
      #quiz { padding-bottom: 12px; }
      .prompt { margin-bottom: 9px; padding: 10px 12px; font-size: 17px; line-height: 1.4; }
      .options { gap: 6px; }
      .option { min-height: 50px; padding: 6px 10px; }
      .letter { width: 34px; height: 34px; }
      .feedback { margin-top: 9px; padding: 10px 12px; }
      .feedback-copy { font-size: 14px; line-height: 1.42; }
    }
    @media (min-width: 700px) {
      #quiz { max-width: 720px; margin: 0 auto; }
    }
  `;
  const body = `<main id="quiz">
    <section class="prompt">${renderMathFragment(question.prompt)}</section>
    <section class="options" role="radiogroup" aria-label="Answer choices">${options}</section>
    ${feedback}
  </main>`;
  const script = `
    (function () {
      var questionId = ${safeScriptString(question.id)};
      document.querySelectorAll('[data-answer]').forEach(function (button) {
        button.addEventListener('click', function () {
          if (!window.ReactNativeWebView || button.disabled) return;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'select', questionId: questionId, answer: Number(button.getAttribute('data-answer'))
          }));
        });
      });
      var feedback = document.getElementById('answer-feedback');
      if (feedback) {
        window.setTimeout(function () {
          feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      }
    })();
  `;
  return documentShell(colors, styles, body, script);
}

interface ReviewDocumentOptions {
  question: Question;
  answer: AnswerIndex | null;
  colors: QuizHtmlColors;
}

export function renderQuizReviewDocument({ question, answer, colors }: ReviewDocumentOptions) {
  const correct = answer === question.correctAnswer;
  const answerContent = answer === null
    ? 'Skipped'
    : `${letters[answer]}. ${renderMathFragment(question.options[answer])}`;
  const correctContent = `${letters[question.correctAnswer]}. ${renderMathFragment(question.options[question.correctAnswer])}`;
  const status = correct ? 'Correct' : answer === null ? 'Skipped' : 'Incorrect';
  const statusClass = correct ? 'correct' : answer === null ? 'skipped' : 'wrong';
  const styles = `
    #review { height: 100%; overflow-y: auto; padding: 2px 4px 10px; }
    .status { display: inline-block; margin-bottom: 12px; padding: 5px 10px; border-radius: 999px; font-size: 13px; font-weight: 800; }
    .status.correct { background: ${colors.primaryContainer}; color: ${colors.onPrimaryContainer}; }
    .status.wrong { background: ${colors.errorContainer}; color: ${colors.onErrorContainer}; }
    .status.skipped { background: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant}; }
    .prompt { margin: 0 0 14px; font-size: 19px; line-height: 1.5; font-weight: 750; }
    .divider { height: 1px; margin: 2px 0 14px; background: ${colors.outlineVariant}; }
    .section { margin-bottom: 11px; padding: 12px 13px; border-radius: 14px; background: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant}; }
    .section.correct-answer { background: ${colors.primaryContainer}; color: ${colors.onPrimaryContainer}; }
    .section.explanation { background: ${colors.surface}; border: 1px solid ${colors.outlineVariant}; color: ${colors.onSurface}; }
    .label { margin-bottom: 5px; font-size: 12px; line-height: 1.2; font-weight: 850; letter-spacing: .6px; text-transform: uppercase; opacity: .72; }
    .copy { font-size: 16px; line-height: 1.48; }
  `;
  const body = `<main id="review" class="scrollable">
    <div class="status ${statusClass}">${status}</div>
    <div class="prompt">${renderMathFragment(question.prompt)}</div>
    <div class="divider"></div>
    <section class="section">
      <div class="label">Your answer</div>
      <div class="copy">${answerContent}</div>
    </section>
    ${correct ? '' : `<section class="section correct-answer">
      <div class="label">Correct answer</div>
      <div class="copy">${correctContent}</div>
    </section>`}
    <section class="section explanation">
      <div class="label">Explanation</div>
      <div class="copy">${renderMathFragment(question.explanation)}</div>
    </section>
  </main>`;
  return documentShell(colors, styles, body);
}
