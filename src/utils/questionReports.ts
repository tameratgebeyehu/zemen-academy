import type {
  AnswerIndex,
  Question,
  QuestionReport,
  QuestionReportCategory,
  QuizMode,
} from '@/types';

export const QUESTION_REPORT_OPTIONS: ReadonlyArray<{
  value: QuestionReportCategory;
  label: string;
}> = [
  { value: 'answer-key', label: 'The answer key is incorrect' },
  { value: 'question-content', label: 'The question is incorrect or unclear' },
  { value: 'formatting', label: 'An equation or layout is broken' },
  { value: 'options', label: 'An option is missing or duplicated' },
  { value: 'typo', label: 'There is a spelling or typing error' },
  { value: 'other', label: 'Other issue' },
];

interface CreateQuestionReportInput {
  question: Question;
  subjectId: string;
  reporterId: string;
  isGuest: boolean;
  mode: QuizMode;
  category: QuestionReportCategory;
  note?: string;
  questionNumber: number;
  selectedAnswer: AnswerIndex | null;
  now?: Date;
  random?: string;
}

export function createQuestionReport(input: CreateQuestionReportInput): QuestionReport {
  const now = input.now ?? new Date();
  const random = input.random ?? Math.random().toString(36).slice(2, 8);
  return {
    id: `report-${now.getTime()}-${random}`,
    questionId: input.question.id,
    unitId: input.question.unitId,
    subjectId: input.subjectId,
    reporterId: input.reporterId,
    isGuest: input.isGuest,
    mode: input.mode,
    category: input.category,
    note: (input.note ?? '').trim().slice(0, 500),
    questionNumber: input.questionNumber,
    selectedAnswer: input.selectedAnswer,
    correctAnswer: input.question.correctAnswer,
    prompt: input.question.prompt,
    options: input.question.options,
    createdAt: now.toISOString(),
  };
}
