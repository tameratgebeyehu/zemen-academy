import type { StudyNote, Unit, User } from '@/types';

export interface StudyNoteUnitGroup {
  key: string;
  number: number | null;
  title: string;
  notes: StudyNote[];
}

export type StudyNoteBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; number: string; text: string };

export function studyNoteCacheKey(ownerId: string, noteId: string, version: number): string {
  return `@zemen-academy/note-v2:${ownerId}:${noteId}:${version}`;
}

export function canAccessStudyNote(user: User | null, note: Pick<StudyNote, 'accessTier'>): boolean {
  return note.accessTier === 'free' || Boolean(user?.isPremium);
}

export function noteSubunitNumber(note: Pick<StudyNote, 'title'>): string | null {
  return note.title.trim().match(/^(\d+(?:\.\d+)+)\b/)?.[1] ?? null;
}

export function studyNoteUnitNumber(note: Pick<StudyNote, 'id' | 'title'>): number | null {
  const fromId = note.id.toUpperCase().match(/(?:^|-)U(\d+)(?:-|$)/)?.[1];
  const fromTitle = note.title.match(/^\s*Unit\s+(\d+)\b/i)?.[1];
  const value = Number(fromId ?? fromTitle);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function resolveStudyNoteUnit(note: StudyNote, units: Unit[]): Unit | undefined {
  const direct = note.unitId ? units.find((unit) => unit.id === note.unitId) : undefined;
  if (direct) return direct;
  const detectedNumber = studyNoteUnitNumber(note);
  return detectedNumber ? units.find((unit) => unit.number === detectedNumber) : undefined;
}

function compareSectionNumbers(left: string | null, right: string | null): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

export function groupStudyNotesByUnit(notes: StudyNote[], units: Unit[]): StudyNoteUnitGroup[] {
  const groups = new Map<string, StudyNoteUnitGroup>();

  notes.forEach((note) => {
    const unit = resolveStudyNoteUnit(note, units);
    const detectedNumber = studyNoteUnitNumber(note);
    const titleFromUnitNote = note.title.match(/^\s*Unit\s+\d+\s*:\s*(.+)$/i)?.[1]?.trim();
    const key = unit?.id ?? (detectedNumber ? `unit-${detectedNumber}` : note.unitId ?? 'general');
    const existing = groups.get(key) ?? {
      key,
      number: unit?.number ?? detectedNumber,
      title: unit?.title ?? titleFromUnitNote ?? (detectedNumber ? `Unit ${detectedNumber}` : 'General notes'),
      notes: [],
    };
    existing.notes.push(note);
    groups.set(key, existing);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      notes: [...group.notes].sort((left, right) => (
        compareSectionNumbers(noteSubunitNumber(left), noteSubunitNumber(right))
        || left.title.localeCompare(right.title)
      )),
    }))
    .sort((left, right) => (
      (left.number ?? Number.MAX_SAFE_INTEGER) - (right.number ?? Number.MAX_SAFE_INTEGER)
      || left.title.localeCompare(right.title)
    ));
}

function splitLegacyList(section: string): string[] {
  if (/^[-*•]\s+/.test(section)) return section.split(/\s+(?=[-*•]\s+)/).filter(Boolean);
  if (/^\d+[.)]\s+/.test(section)) return section.split(/\s+(?=\d+[.)]\s+)/).filter(Boolean);
  return [section];
}

export function parseStudyNoteBody(body: string): StudyNoteBlock[] {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean)
    .flatMap(splitLegacyList)
    .map((section): StudyNoteBlock => {
      const heading = section.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        return { type: 'heading', level: heading[1]!.length as 1 | 2 | 3, text: heading[2]!.trim() };
      }
      const bullet = section.match(/^[-*•]\s+(.+)$/);
      if (bullet) return { type: 'bullet', text: bullet[1]!.trim() };
      const numbered = section.match(/^(\d+)[.)]\s+(.+)$/);
      if (numbered) return { type: 'numbered', number: numbered[1]!, text: numbered[2]!.trim() };
      return { type: 'paragraph', text: section };
    });
}
