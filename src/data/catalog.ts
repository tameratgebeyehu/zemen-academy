import type { Announcement, PastPaper, Question, Subject, Unit } from '@/types';

const UPDATED_AT = '2026-07-01T00:00:00.000Z';

// Production content is published through the protected Google Sheets workflow.
// Keeping these arrays empty prevents placeholder material from appearing as real coursework.
export const bundledSubjects: Subject[] = [];
export const bundledUnits: Unit[] = [];
export const bundledQuestions: Question[] = [];
export const bundledPastPapers: PastPaper[] = [];

export const bundledAnnouncements: Announcement[] = [];

export const introSlides = [
  { icon: 'clipboard-check-outline', title: 'Practice with purpose', body: 'Short, focused quizzes built around entrance-exam preparation.' },
  { icon: 'download-circle-outline', title: 'Study offline', body: 'Download quiz units once and practise without mobile data.' },
  { icon: 'school-outline', title: 'Prepare for the entrance exam', body: 'Use instant feedback or a timed exam experience.' },
  { icon: 'theme-light-dark', title: 'Comfortable day or night', body: 'Choose light, dark, or your phone’s system theme.' },
  { icon: 'shield-star-outline', title: 'Start free', body: 'Guests can try Unit 1. Create an account to sync progress across sessions.' },
] as const;
