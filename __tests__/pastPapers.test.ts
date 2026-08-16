import { expect, test } from '@jest/globals';

import type { PastPaper, Subject } from '@/types';
import { filterPastPapers, pastPapersForProfile, pastPaperYears } from '@/utils/pastPapers';

const subjects: Subject[] = [
  { id: 'g12-natural-physics', grade: 12, stream: 'Natural', name: 'Physics', nameAm: 'Physics', icon: 'atom', order: 1, updatedAt: '2026-08-09T00:00:00Z' },
  { id: 'g12-social-history', grade: 12, stream: 'Social', name: 'History', nameAm: 'History', icon: 'book', order: 1, updatedAt: '2026-08-09T00:00:00Z' },
];

const papers: PastPaper[] = [
  { id: 'p1', title: 'National Physics Paper', grade: 12, stream: 'Natural', subjectId: 'g12-natural-physics', year: 2018, version: 1, updatedAt: '2026-08-09T00:00:00Z' },
  { id: 'p2', title: 'National Physics Paper', grade: 12, stream: 'Natural', subjectId: 'g12-natural-physics', year: 2017, version: 1, updatedAt: '2026-08-09T00:00:00Z' },
  { id: 'p3', title: 'National History Paper', grade: 12, stream: 'Social', subjectId: 'g12-social-history', year: 2018, version: 1, updatedAt: '2026-08-09T00:00:00Z' },
  { id: 'p4', title: 'National English Paper', subjectId: 'entrance-english', subjectName: 'English', year: 2018, version: 1, updatedAt: '2026-08-09T00:00:00Z' },
];

test('keeps Grade 12 papers inside the selected profile stream', () => {
  expect(pastPapersForProfile(papers, 12, 'Natural').map((paper) => paper.id)).toEqual(['p1', 'p2', 'p4']);
  expect(pastPapersForProfile(papers, 12, 'Social').map((paper) => paper.id)).toEqual(['p3', 'p4']);
  expect(pastPapersForProfile(papers, 9).map((paper) => paper.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
});

test('orders years newest first and filters by year, subject, and search', () => {
  const natural = pastPapersForProfile(papers, 12, 'Natural');
  expect(pastPaperYears(natural)).toEqual([2018, 2017]);
  expect(filterPastPapers(natural, subjects, 2018, 'g12-natural-physics', 'physics').map((paper) => paper.id)).toEqual(['p1']);
  expect(filterPastPapers(natural, subjects, 2017, null, 'history')).toEqual([]);
});
