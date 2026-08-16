import type { Language } from '@/types';

const messages = {
  en: {
    home: 'Home', quizzes: 'Quizzes', downloads: 'Downloads', profile: 'Profile',
    welcome: 'Welcome', continueStudying: 'Continue studying', recentDownloads: 'Recent downloads',
    latestUpdates: 'Latest updates', search: 'Search subjects, units, or papers', pastPapers: 'Past Papers',
    subjects: 'Subjects', units: 'Units', questions: 'questions', download: 'Download', downloaded: 'Downloaded',
    instantMode: 'Instant Mode', examMode: 'Exam Mode', startQuiz: 'Start quiz', continueAsGuest: 'Continue as Guest',
    login: 'Login', signUp: 'Sign Up', name: 'Name', email: 'Email', password: 'Password',
    grade: 'Grade', stream: 'Stream', language: 'Language', reminder: 'Daily reminder', finish: 'Finish setup',
    natural: 'Natural', social: 'Social', english: 'English', amharic: 'Amharic',
    settings: 'Settings', appearance: 'Appearance', system: 'System', light: 'Light', dark: 'Dark',
    about: 'About', logout: 'Logout', storage: 'Storage used',
    delete: 'Delete', noDownloads: 'No downloads yet', correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped',
    score: 'Score', reviewAnswers: 'Review answers', next: 'Next', previous: 'Previous', submit: 'Submit',
    acceptRules: 'I understand and accept the exam rules', noResults: 'No results found',
  },
  am: {
    home: 'መነሻ', quizzes: 'ጥያቄዎች', downloads: 'የወረዱ', profile: 'መገለጫ',
    welcome: 'እንኳን ደህና መጡ', continueStudying: 'ትምህርትዎን ይቀጥሉ', recentDownloads: 'በቅርብ የወረዱ',
    latestUpdates: 'አዲስ መረጃዎች', search: 'ትምህርት፣ ምዕራፍ ወይም ፈተና ይፈልጉ', pastPapers: 'ያለፉ ፈተናዎች',
    subjects: 'ትምህርቶች', units: 'ምዕራፎች', questions: 'ጥያቄዎች', download: 'አውርድ', downloaded: 'ወርዷል',
    instantMode: 'ፈጣን ሁነታ', examMode: 'የፈተና ሁነታ', startQuiz: 'ጥያቄውን ጀምር', continueAsGuest: 'እንደ እንግዳ ቀጥል',
    login: 'ግባ', signUp: 'ተመዝገብ', name: 'ስም', email: 'ኢሜይል', password: 'የይለፍ ቃል',
    grade: 'ክፍል', stream: 'የትምህርት ዘርፍ', language: 'ቋንቋ', reminder: 'የዕለት ማስታወሻ', finish: 'ማዋቀሩን ጨርስ',
    natural: 'ተፈጥሮ ሳይንስ', social: 'ማህበራዊ ሳይንስ', english: 'እንግሊዝኛ', amharic: 'አማርኛ',
    settings: 'ቅንብሮች', appearance: 'ገጽታ', system: 'የስርዓቱ', light: 'ብርሃን', dark: 'ጨለማ',
    about: 'ስለ እኛ', logout: 'ውጣ', storage: 'የተጠቀመው ማከማቻ',
    delete: 'ሰርዝ', noDownloads: 'እስካሁን የወረደ የለም', correct: 'ትክክል', wrong: 'ስህተት', skipped: 'የታለፈ',
    score: 'ውጤት', reviewAnswers: 'መልሶችን ይመልከቱ', next: 'ቀጣይ', previous: 'ቀዳሚ', submit: 'ጨርስ',
    acceptRules: 'የፈተናውን ህጎች ተረድቼ ተቀብያለሁ', noResults: 'ውጤት አልተገኘም',
  },
} as const;

export type TranslationKey = keyof typeof messages.en;

export function translate(language: Language, key: TranslationKey): string {
  return messages[language][key] ?? messages.en[key];
}
