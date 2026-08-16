import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { StudyNote, Unit } from '@/types';
import { renderStudyNoteHtml } from '@/utils/noteHtml';
import {
  canAccessStudyNote,
  groupStudyNotesByUnit,
  parseStudyNoteBody,
  studyNoteUnitNumber,
  studyNoteCacheKey,
} from '@/utils/notes';

test('isolates cached note bodies by account', () => {
  expect(studyNoteCacheKey('user-a', 'note-1', 2)).not.toBe(studyNoteCacheKey('user-b', 'note-1', 2));
});

test('requires active Premium before opening a cached Premium note', () => {
  expect(canAccessStudyNote(null, { accessTier: 'premium' })).toBe(false);
  expect(canAccessStudyNote({ id: 'u1', name: 'Student', isGuest: false, isPremium: false }, { accessTier: 'premium' })).toBe(false);
  expect(canAccessStudyNote({ id: 'u1', name: 'Student', isGuest: false, isPremium: true }, { accessTier: 'premium' })).toBe(true);
  expect(canAccessStudyNote(null, { accessTier: 'free' })).toBe(true);
});

test('groups one complete note under each textbook unit', () => {
  const unitOne: Unit = {
    id: 'math-g10-u1', subjectId: 'math-g10', number: 1, title: 'Relations and Functions',
    titleAm: '', questionCount: 0, version: 1, updatedAt: '2026-08-10T00:00:00.000Z',
  };
  const unitTwo: Unit = { ...unitOne, id: 'math-g10-u2', number: 2, title: 'Polynomial Functions' };
  const base: StudyNote = {
    id: 'note', grade: 10, subjectId: 'math-g10', unitId: unitOne.id, title: '', titleAm: '',
    summary: '', summaryAm: '', version: 1, accessTier: 'free', updatedAt: '2026-08-10T00:00:00.000Z',
  };
  const groups = groupStudyNotesByUnit([
    { ...base, id: 'unit-two-note', unitId: unitTwo.id, title: 'Unit 2: Polynomial Functions', accessTier: 'premium' },
    { ...base, id: 'NOTE-G10-MATH-U1', unitId: 'legacy-missing-unit', title: 'Unit 1: Relations and Functions' },
  ], [unitOne, unitTwo]);

  expect(groups).toHaveLength(2);
  expect(groups[0]?.title).toBe('Relations and Functions');
  expect(groups[0]?.notes.map((note) => note.id)).toEqual(['NOTE-G10-MATH-U1']);
  expect(studyNoteUnitNumber(groups[0]!.notes[0]!)).toBe(1);
  expect(groups[1]?.title).toBe('Polynomial Functions');
  expect(groups[1]?.notes.map((note) => note.id)).toEqual(['unit-two-note']);
});

test('renders one continuous offline document for all numbered subunits and mathematics', () => {
  const html = renderStudyNoteHtml({
    title: 'Relations and Functions',
    unitLabel: 'Unit 1 • Complete study note',
    summary: 'Learn relations and functions.',
    body: '## 1.1 Relations\n\nA relation connects values.\n\n- Domain\n- Range\n\n## 1.2 Functions\n\nA function maps $x$ to $f(x)$.',
    colors: {
      background: '#ffffff', surface: '#ffffff', surfaceVariant: '#eeeeee', text: '#111111',
      muted: '#666666', primary: '#4444aa', primaryContainer: '#eeeeff', outline: '#dddddd',
    },
  });

  expect(html.match(/<!doctype html>/g)).toHaveLength(1);
  expect(html).toContain('<h2>1.1 Relations</h2>');
  expect(html).toContain('<h2>1.2 Functions</h2>');
  expect(html).toContain('<ul><li>Domain</li><li>Range</li></ul>');
  expect(html).toContain('class="katex"');
  expect(html).toContain('-webkit-user-select: none');
  expect(html).toContain('-webkit-touch-callout: none');
  expect(html).not.toContain('<iframe');
});

test('parses compact headings, legacy bullet runs, and visible numbered steps', () => {
  expect(parseStudyNoteBody([
    '## What it means',
    '',
    'A relation connects inputs and outputs.',
    '',
    '- First fact - Second fact',
    '',
    '1. Choose an input 2. Apply the rule',
  ].join('\n'))).toEqual([
    { type: 'heading', level: 2, text: 'What it means' },
    { type: 'paragraph', text: 'A relation connects inputs and outputs.' },
    { type: 'bullet', text: 'First fact' },
    { type: 'bullet', text: 'Second fact' },
    { type: 'numbered', number: '1', text: 'Choose an input' },
    { type: 'numbered', number: '2', text: 'Apply the rule' },
  ]);
});

test('keeps offline download in the note header and gives the document the reading width', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/screens/study/NoteViewerScreen.tsx'), 'utf8');
  expect(source).toContain('headerRight:');
  expect(source).toContain("{downloaded ? 'Saved' : 'Download'}");
  expect(source).toContain('screen: { paddingHorizontal: 8');
  expect(source).not.toContain('Download once and study anywhere.');
  expect(source).not.toContain('offlineBar:');
});
