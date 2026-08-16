import type { Grade, NoteDownload, PaperDownload, Stream, UnitDownload } from '@/types';
import { paperAccessTier, unitAccessTier } from '@/utils/access';

export interface DownloadProfile {
  grade: Grade;
  stream?: Stream;
}

export function matchesDownloadProfile(
  profile: DownloadProfile,
  content: { grade?: Grade; stream?: Stream },
): boolean {
  if (content.grade !== profile.grade) return false;
  if (profile.grade < 11) return true;
  return !content.stream || content.stream === profile.stream;
}

export function unitDownloadMatchesProfile(download: UnitDownload, profile: DownloadProfile): boolean {
  return matchesDownloadProfile(profile, download.subject);
}

export function noteDownloadMatchesProfile(download: NoteDownload, profile: DownloadProfile): boolean {
  return matchesDownloadProfile(profile, download.note);
}

export function paperDownloadMatchesProfile(download: PaperDownload, profile: DownloadProfile): boolean {
  return matchesDownloadProfile(profile, download.paper);
}

export function retainFreeDownloads(downloads: {
  unitDownloads: UnitDownload[];
  noteDownloads: NoteDownload[];
  paperDownloads: PaperDownload[];
}): Pick<typeof downloads, 'unitDownloads' | 'noteDownloads' | 'paperDownloads'> {
  return {
    unitDownloads: downloads.unitDownloads.filter((download) => unitAccessTier(download.unit) === 'free'),
    noteDownloads: downloads.noteDownloads.filter((download) => download.note.accessTier === 'free'),
    paperDownloads: downloads.paperDownloads.filter((download) => paperAccessTier(download.paper) === 'free'),
  };
}
