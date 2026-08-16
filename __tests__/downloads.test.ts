import { expect, test } from '@jest/globals';

import type { NoteDownload, PaperDownload, UnitDownload } from '@/types';
import {
  noteDownloadMatchesProfile,
  paperDownloadMatchesProfile,
  retainFreeDownloads,
  unitDownloadMatchesProfile,
} from '@/utils/downloads';

const unitDownload = {
  unit: { id: 'unit-1' },
  subject: { id: 'subject-1', grade: 9, stream: undefined },
} as UnitDownload;
const noteDownload = {
  note: { id: 'note-1', grade: 9, stream: undefined },
} as NoteDownload;
const paperDownload = {
  paper: { id: 'paper-1', grade: 12, stream: 'Natural' },
} as PaperDownload;

test('keeps quiz and note downloads inside their original grade', () => {
  expect(unitDownloadMatchesProfile(unitDownload, { grade: 9 })).toBe(true);
  expect(unitDownloadMatchesProfile(unitDownload, { grade: 10 })).toBe(false);
  expect(noteDownloadMatchesProfile(noteDownload, { grade: 9 })).toBe(true);
  expect(noteDownloadMatchesProfile(noteDownload, { grade: 12, stream: 'Natural' })).toBe(false);
});

test('keeps senior-grade downloads inside the selected stream', () => {
  expect(paperDownloadMatchesProfile(paperDownload, { grade: 12, stream: 'Natural' })).toBe(true);
  expect(paperDownloadMatchesProfile(paperDownload, { grade: 12, stream: 'Social' })).toBe(false);
  expect(paperDownloadMatchesProfile(paperDownload, { grade: 11, stream: 'Natural' })).toBe(false);
});

test('removes Premium downloads after confirmed expiry while retaining free learning', () => {
  const freeUnit = {
    ...unitDownload,
    unit: { id: 'unit-free', number: 1, accessTier: 'free' },
  } as UnitDownload;
  const premiumUnit = {
    ...unitDownload,
    unit: { id: 'unit-premium', number: 2, accessTier: 'premium' },
  } as UnitDownload;
  const freeNote = {
    ...noteDownload,
    note: { id: 'note-free', accessTier: 'free' },
  } as NoteDownload;
  const premiumNote = {
    ...noteDownload,
    note: { id: 'note-premium', accessTier: 'premium' },
  } as NoteDownload;

  const retained = retainFreeDownloads({
    unitDownloads: [freeUnit, premiumUnit],
    noteDownloads: [freeNote, premiumNote],
    paperDownloads: [],
  });
  expect(retained.unitDownloads.map((item) => item.unit.id)).toEqual(['unit-free']);
  expect(retained.noteDownloads.map((item) => item.note.id)).toEqual(['note-free']);
});
