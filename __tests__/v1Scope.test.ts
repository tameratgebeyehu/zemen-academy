import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  V1_AMHARIC_UI_ENABLED,
  V1_DEFAULT_LANGUAGE,
  V1_PAST_PAPERS_ENABLED,
  V1_SUPPORTED_LANGUAGES,
} from '@/config';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('locks the Version 1 feature surface to reviewed English quiz and note content', () => {
  expect(V1_PAST_PAPERS_ENABLED).toBe(false);
  expect(V1_AMHARIC_UI_ENABLED).toBe(false);
  expect(V1_DEFAULT_LANGUAGE).toBe('en');
  expect(V1_SUPPORTED_LANGUAGES).toEqual(['en']);
});

test('does not expose direct Past Papers or Amharic selection entry points', () => {
  const home = source('src/screens/home/HomeScreen.tsx');
  expect(home).not.toContain("navigation.navigate('PastPapers')");
  expect(home).toContain('label="Quizzes"');
  expect(home).toContain("navigation.navigate('Main', { screen: 'QuizzesTab' })");
  expect(source('src/screens/onboarding/SetupScreen.tsx')).not.toContain("setLanguage('am')");
  expect(source('src/screens/profile/ProfileScreen.tsx')).not.toContain("value: 'am'");
  expect(source('src/navigation/RootNavigator.tsx')).toContain('V1_PAST_PAPERS_ENABLED ?');
  const downloads = source('src/screens/downloads/DownloadsScreen.tsx');
  expect(downloads).toContain('V1_PAST_PAPERS_ENABLED');
  expect(downloads).toContain('label="Quizzes"');
  expect(downloads).toContain('label="Notes"');
});
