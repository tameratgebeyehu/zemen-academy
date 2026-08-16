import type { Grade, PastPaper, Stream, Subject } from '@/types';

export function pastPapersForProfile(
  papers: PastPaper[],
  grade: Grade,
  stream?: Stream,
): PastPaper[] {
  return papers.filter((paper) => grade < 11 || !paper.stream || paper.stream === stream);
}

export function pastPaperYears(papers: PastPaper[]): number[] {
  return [...new Set(papers.map((paper) => paper.year).filter(Number.isFinite))]
    .sort((left, right) => right - left);
}

export function filterPastPapers(
  papers: PastPaper[],
  subjects: Subject[],
  year: number | null,
  subjectId: string | null,
  query: string,
): PastPaper[] {
  const normalized = query.trim().toLowerCase();
  const subjectNames = new Map(subjects.map((subject) => [subject.id, `${subject.name} ${subject.nameAm}`.toLowerCase()]));
  return papers
    .filter((paper) => year === null || paper.year === year)
    .filter((paper) => !subjectId || paper.subjectId === subjectId)
    .filter((paper) => !normalized
      || paper.title.toLowerCase().includes(normalized)
      || `${paper.subjectName ?? ''} ${subjectNames.get(paper.subjectId) ?? ''}`.toLowerCase().includes(normalized))
    .sort((left, right) => left.title.localeCompare(right.title));
}
