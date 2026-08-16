import type { AnswerIndex, Question } from '@/types';
import { KATEX_CSS } from '@/utils/katexCss.generated';
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
      overflow-wrap: break-word;
    }
    math {
      color: inherit; font-size: 1.14em; line-height: 1.2;
      font-family: "STIX Two Math", "Cambria Math", "Noto Sans Math", serif;
    }
    math[display="block"] { display: block; width: max-content; min-width: 100%; margin: 0 auto; }
    annotation { display: none !important; }
    .math-inline {
      display: inline-block; max-width: 100%; vertical-align: -0.18em;
      line-height: 1.24; white-space: nowrap;
    }
    .math-structured { padding: .08em .02em; }
    .math-wide { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
    .math-wide::-webkit-scrollbar { display: none; }
    .math-display {
      display: block; max-width: 100%; margin: 10px 0; padding: 5px 2px;
      text-align: center; overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
    }
    .math-display::-webkit-scrollbar { display: none; }
    .math-fallback { color: inherit; font-family: inherit; }
    .scrollable { overscroll-behavior: contain; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
    @media (max-width: 380px) { math { font-size: 1.1em; } }
  `;
}

function documentShell(colors: QuizHtmlColors, styles: string, body: string, script = '') {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>${KATEX_CSS}${baseStyles(colors)}${styles}</style>
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

function renderPlayerContent({
  question,
  selected,
  revealAnswer,
  locked,
}: Omit<PlayerDocumentOptions, 'colors'>) {
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

  return `<section class="prompt"><span class="prompt-accent" aria-hidden="true"></span><div class="prompt-copy">${renderMathFragment(question.prompt)}</div></section>
    <section class="options" role="radiogroup" aria-label="Answer choices">${options}</section>
    ${feedback}`;
}

function playerStyles(colors: QuizHtmlColors) {
  return `
    html, body { overflow-x: hidden; overflow-y: auto; overscroll-behavior-y: contain; }
    #quiz { width: 100%; min-height: 100%; padding: 2px 2px 20px; }
    .prompt {
      position: relative; width: 100%; margin-bottom: 14px; padding: 16px 16px 16px 19px;
      border: 1px solid ${colors.outlineVariant}; border-radius: 18px;
      background: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant};
      font-size: clamp(17px, 4.6vw, 19px); line-height: 1.5; font-weight: 720;
      overflow: hidden; overflow-wrap: normal; word-break: normal;
    }
    .prompt-accent {
      position: absolute; inset: 13px auto 13px 0; width: 4px; border-radius: 0 6px 6px 0;
      background: ${colors.primary};
    }
    .prompt-copy { min-width: 0; }
    .options { display: flex; flex-direction: column; gap: 9px; padding: 1px; }
    .option {
      width: 100%; min-height: 58px; display: grid;
      grid-template-columns: 40px minmax(0, 1fr) 24px; align-items: center; gap: 11px;
      padding: 9px 12px; border: 1px solid ${colors.outlineVariant}; border-radius: 16px;
      background: ${colors.surface}; color: ${colors.onSurface}; text-align: left;
      font: inherit; line-height: 1.46; -webkit-tap-highlight-color: transparent;
      transition: transform 120ms ease, background-color 120ms ease, border-color 120ms ease;
    }
    .option:active:not(:disabled) { transform: scale(.988); background: ${colors.surfaceVariant}; }
    .option:focus-visible { outline: 3px solid ${colors.primaryContainer}; outline-offset: 1px; }
    .option:disabled { opacity: 1; }
    .letter {
      width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;
      border: 1.5px solid ${colors.outline}; border-radius: 12px; font-size: 14px; font-weight: 850;
    }
    .option-copy { min-width: 0; overflow-wrap: normal; word-break: normal; }
    .option-copy .math-display { margin: 5px 0; text-align: left; }
    .option-copy .math-structured { margin-top: 2px; margin-bottom: 2px; }
    .option-state { color: ${colors.primary}; font-size: 22px; font-weight: 900; text-align: center; }
    .option.selected { border-width: 1.5px; border-color: ${colors.primary}; background: ${colors.primaryContainer}; color: ${colors.onPrimaryContainer}; }
    .option.selected .letter, .option.correct .letter { border-color: ${colors.primary}; }
    .option.incorrect { border-color: ${colors.error}; background: ${colors.errorContainer}; color: ${colors.onErrorContainer}; }
    .option.incorrect .letter { border-color: ${colors.error}; }
    .option.incorrect .option-state { color: ${colors.error}; }
    .feedback {
      margin-top: 14px; padding: 14px 15px; border-radius: 17px;
      border: 1px solid ${colors.outlineVariant};
    }
    .feedback-result {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding-bottom: 9px; margin-bottom: 9px; border-bottom: 1px solid ${colors.outlineVariant};
    }
    .feedback-result strong { font-size: 16px; }
    .feedback-result span { font-size: 13px; font-weight: 750; }
    .reasoning-label { margin-bottom: 4px; font-size: 12px; line-height: 1.2; font-weight: 850; letter-spacing: .6px; text-transform: uppercase; opacity: .72; }
    .feedback-copy { font-size: 15px; line-height: 1.5; overflow-wrap: normal; word-break: normal; }
    .feedback-correct { background: ${colors.primaryContainer}; color: ${colors.onPrimaryContainer}; border-color: ${colors.primary}; }
    .feedback-wrong { background: ${colors.errorContainer}; color: ${colors.onErrorContainer}; border-color: ${colors.error}; }
    @media (max-height: 700px) {
      #quiz { padding-bottom: 12px; }
      .prompt { margin-bottom: 10px; padding: 12px 13px 12px 17px; font-size: 17px; line-height: 1.42; }
      .prompt-accent { inset-block: 10px; }
      .options { gap: 6px; }
      .option { min-height: 52px; padding: 7px 10px; }
      .letter { width: 34px; height: 34px; }
      .feedback { margin-top: 9px; padding: 10px 12px; }
      .feedback-copy { font-size: 14px; line-height: 1.42; }
    }
    @media (min-width: 700px) {
      #quiz { max-width: 760px; margin: 0 auto; padding-inline: 10px; }
      .prompt { padding: 18px 20px 18px 23px; }
      .option { min-height: 62px; padding: 11px 14px; }
    }
    @media (max-width: 360px) {
      .option { grid-template-columns: 34px minmax(0, 1fr) 20px; gap: 8px; padding-inline: 9px; }
      .letter { width: 33px; height: 33px; border-radius: 10px; }
      .feedback-result { align-items: flex-start; flex-direction: column; gap: 3px; }
    }
  `;
}

function playerRuntimeScript() {
  return `
    (function () {
      window.__zemenSetQuizQuestion = function (questionId, content, revealAnswer) {
        var quiz = document.getElementById('quiz');
        if (!quiz) return;
        var previousQuestionId = quiz.getAttribute('data-question-id');
        quiz.setAttribute('data-question-id', questionId);
        quiz.innerHTML = content;
        quiz.querySelectorAll('[data-answer]').forEach(function (button) {
          button.addEventListener('click', function () {
            if (!window.ReactNativeWebView || button.disabled) return;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'select', questionId: questionId, answer: Number(button.getAttribute('data-answer'))
            }));
          });
        });
        if (previousQuestionId && previousQuestionId !== questionId) {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
        if (revealAnswer) {
          var feedback = document.getElementById('answer-feedback');
          if (feedback) {
            var revealFeedback = function () {
              feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            };
            requestAnimationFrame(function () { requestAnimationFrame(revealFeedback); });
            setTimeout(revealFeedback, 120);
          }
        }
      };
    })();
  `;
}

export function createQuizPlayerUpdateScript({
  question,
  selected,
  revealAnswer,
  locked,
}: Omit<PlayerDocumentOptions, 'colors'>) {
  const content = renderPlayerContent({ question, selected, revealAnswer, locked });
  return `window.__zemenSetQuizQuestion && window.__zemenSetQuizQuestion(${safeScriptString(question.id)}, ${safeScriptString(content)}, ${revealAnswer}); true;`;
}

export function renderQuizPlayerShell(colors: QuizHtmlColors) {
  return documentShell(
    colors,
    playerStyles(colors),
    '<main id="quiz" aria-live="polite"></main>',
    playerRuntimeScript(),
  );
}

export function renderQuizPlayerDocument(options: PlayerDocumentOptions) {
  const content = renderPlayerContent(options);
  const body = `<main id="quiz" data-question-id="${escapeHtml(options.question.id)}">${content}</main>`;
  const feedbackRevealScript = options.revealAnswer ? `
      var feedback = document.getElementById('answer-feedback');
      if (feedback) {
        var revealFeedback = function () {
          feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        };
        requestAnimationFrame(function () { requestAnimationFrame(revealFeedback); });
        setTimeout(revealFeedback, 120);
      }
  ` : '';
  const script = `
    (function () {
      var questionId = ${safeScriptString(options.question.id)};
      document.querySelectorAll('[data-answer]').forEach(function (button) {
        button.addEventListener('click', function () {
          if (!window.ReactNativeWebView || button.disabled) return;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'select', questionId: questionId, answer: Number(button.getAttribute('data-answer'))
          }));
        });
      });
      ${feedbackRevealScript}
    })();
  `;
  return documentShell(options.colors, playerStyles(options.colors), body, script);
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
  const styles = `
    html, body { height: auto; min-height: 0; }
    #review { width: 100%; padding: 2px 1px 2px; overflow: hidden; }
    .prompt {
      margin: 0 0 13px; font-size: 18px; line-height: 1.5; font-weight: 730;
      overflow-wrap: normal; word-break: normal;
    }
    .divider { height: 1px; margin: 2px 0 13px; background: ${colors.outlineVariant}; }
    .section { margin-bottom: 10px; padding: 12px 13px; border-radius: 14px; background: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant}; overflow: hidden; }
    .section.correct-answer { background: ${colors.primaryContainer}; color: ${colors.onPrimaryContainer}; }
    .section.explanation { background: ${colors.surface}; border: 1px solid ${colors.outlineVariant}; color: ${colors.onSurface}; }
    .label { margin-bottom: 5px; font-size: 12px; line-height: 1.2; font-weight: 850; letter-spacing: .6px; text-transform: uppercase; opacity: .72; }
    .copy { font-size: 15px; line-height: 1.5; overflow-wrap: normal; word-break: normal; }
    .section:last-child { margin-bottom: 0; }
    @media (max-width: 380px) {
      .prompt { font-size: 17px; }
      .section { padding: 11px 12px; }
    }
  `;
  const body = `<main id="review">
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
  const script = `
    (function () {
      var questionId = ${safeScriptString(question.id)};
      var lastHeight = 0;
      function reportHeight() {
        var review = document.getElementById('review');
        if (!review || !window.ReactNativeWebView) return;
        var height = Math.max(1, Math.ceil(review.getBoundingClientRect().height));
        if (height === lastHeight) return;
        lastHeight = height;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'height', questionId: questionId, height: height
        }));
      }
      reportHeight();
      requestAnimationFrame(reportHeight);
      window.addEventListener('load', reportHeight);
      if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(document.getElementById('review'));
    })();
  `;
  return documentShell(colors, styles, body, script);
}
