import type { NavigatorScreenParams } from '@react-navigation/native';

import type { QuizContentType, QuizMode } from '@/types';

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
  AnnouncementDetail: { announcementId: string };
  PastPapers: undefined;
  PastPaperDetails: { paperId: string };
  PaperViewer: { paperId: string };
  Units: { subjectId: string };
  QuizDetails: { unitId: string };
  ExamRules: { unitId: string; mode: QuizMode; contentType?: QuizContentType };
  QuizPlayer: { unitId: string; mode: QuizMode; contentType?: QuizContentType };
  Results: { attemptId: string };
  Progress: undefined;
  Timetable: undefined;
  Notes: undefined;
  NoteViewer: { noteId: string; version: number };
  HelpCenter: undefined;
  PrivacyCenter: undefined;
  About: undefined;
  Premium: undefined;
};
