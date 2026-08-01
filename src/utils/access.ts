import type { ContentAccessTier, PastPaper, Unit, User } from '@/types';

export function unitAccessTier(unit: Unit): ContentAccessTier {
  if (unit.accessTier === 'free' || unit.accessTier === 'premium') return unit.accessTier;
  return unit.number === 1 ? 'free' : 'premium';
}

export function paperAccessTier(paper: PastPaper): ContentAccessTier {
  return paper.accessTier === 'free' ? 'free' : 'premium';
}

export function canAccessUnit(user: User | null, unit: Unit): boolean {
  return unitAccessTier(unit) === 'free' || Boolean(user?.isPremium);
}

export function canAccessPaper(user: User | null, paper: PastPaper): boolean {
  return paperAccessTier(paper) === 'free' || Boolean(user?.isPremium);
}
