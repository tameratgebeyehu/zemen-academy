import type { NavigatorScreenParams } from '@react-navigation/native';

import type { QuizMode } from '@/types';

export type MainTabParamList = {
  HomeTab: undefined;
  QuizzesTab: undefined;
  DownloadsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Intro: undefined;
  Auth: undefined;
  ForgotPassword: undefined;
  Setup: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Search: undefined;
  Announcements: undefined;
  PastPapers: undefined;
  PaperViewer: { paperId: string };
  Units: { subjectId: string };
  QuizDetails: { unitId: string };
  ExamRules: { unitId: string; mode: QuizMode };
  QuizPlayer: { unitId: string; mode: QuizMode };
  Results: { attemptId: string };
  Progress: undefined;
  About: undefined;
  Premium: undefined;
};
