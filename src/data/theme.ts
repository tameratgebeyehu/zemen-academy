import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const brand = {
  primary: '#565CE8',
  primaryDeep: '#34359A',
  secondary: '#0C9FB1',
  accent: '#7C4DDB',
  coral: '#F06B78',
  amber: '#E99124',
  success: '#168A63',
  danger: '#C53B4A',
  ink: '#11182B',
  canvas: '#F5F7FD',
};

export const ui = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, hero: 40 },
  radius: { sm: 13, md: 19, lg: 26, xl: 34, pill: 999 },
  contentWidth: 760,
  motion: { fast: 150, standard: 240, emphasized: 380 },
  shadow: {
    light: { shadowColor: '#293267', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 3 },
    dark: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 3 },
  },
};

export function heroPalette(dark: boolean) {
  return dark
    ? {
        background: '#171D4B',
        foreground: '#F9FAFF',
        muted: '#C5CDFB',
        accent: '#58D8E6',
        overlay: 'rgba(142,151,255,0.16)',
        divider: 'rgba(182,190,255,0.22)',
      }
    : {
        background: '#34399D',
        foreground: '#FFFFFF',
        muted: '#D8DCFF',
        accent: '#5CE0E9',
        overlay: 'rgba(255,255,255,0.13)',
        divider: 'rgba(255,255,255,0.22)',
      };
}

const lightSubjectTones = [
  { container: '#E4E8FF', color: '#4E55D6', soft: '#F4F5FF' },
  { container: '#DDF7FA', color: '#087E90', soft: '#F0FBFC' },
  { container: '#E9E1FF', color: '#7148C7', soft: '#F7F3FF' },
  { container: '#DDF5E9', color: '#16815B', soft: '#F0FBF5' },
  { container: '#FFF0D9', color: '#B9670B', soft: '#FFF8ED' },
  { container: '#FFE2E6', color: '#C04758', soft: '#FFF4F5' },
] as const;

const darkSubjectTones = [
  { container: '#272E68', color: '#AAB0FF', soft: '#151A3B' },
  { container: '#123D48', color: '#66D7E4', soft: '#102B34' },
  { container: '#38275B', color: '#C3A5FF', soft: '#281E42' },
  { container: '#173D32', color: '#6ED5AB', soft: '#102C25' },
  { container: '#4A321B', color: '#F5BB6E', soft: '#302516' },
  { container: '#4B252D', color: '#FFA1AF', soft: '#321C22' },
] as const;

function stableToneIndex(key: string): number {
  let value = 0;
  for (let index = 0; index < key.length; index += 1) value = ((value * 31) + key.charCodeAt(index)) >>> 0;
  return value % lightSubjectTones.length;
}

export function subjectPalette(key: string, dark: boolean) {
  const index = stableToneIndex(key);
  const tones = dark ? darkSubjectTones : lightSubjectTones;
  return tones[index] ?? tones[0];
}

export const lightTheme = {
  ...MD3LightTheme,
  roundness: 5,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#E5E8FF',
    onPrimaryContainer: '#232766',
    secondary: brand.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#DDF7FA',
    onSecondaryContainer: '#073D47',
    tertiary: brand.accent,
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#EDE4FF',
    onTertiaryContainer: '#3B236C',
    background: brand.canvas,
    surface: '#FFFFFF',
    surfaceVariant: '#EEF1FA',
    onSurface: brand.ink,
    onSurfaceVariant: '#535D75',
    surfaceDisabled: '#E2E6F0',
    outline: '#737C94',
    outlineVariant: '#DCE1EE',
    error: brand.danger,
    errorContainer: '#FFE2E5',
    onErrorContainer: '#721623',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#F9FAFF',
      level2: '#F3F5FD',
      level3: '#EEF1FA',
      level4: '#E9EDF8',
      level5: '#E4E9F5',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 5,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A8ADFF',
    onPrimary: '#1E235F',
    primaryContainer: '#292F70',
    onPrimaryContainer: '#E5E7FF',
    secondary: '#64D5E2',
    onSecondary: '#00363E',
    secondaryContainer: '#123D48',
    onSecondaryContainer: '#D7F8FC',
    tertiary: '#C4A5FF',
    onTertiary: '#35205F',
    tertiaryContainer: '#3B2B61',
    onTertiaryContainer: '#F0E7FF',
    background: '#080C18',
    surface: '#121827',
    surfaceVariant: '#1C2436',
    onSurface: '#F5F7FF',
    onSurfaceVariant: '#C3CBDE',
    surfaceDisabled: '#252D3E',
    outline: '#8D97AD',
    outlineVariant: '#303A50',
    error: '#FFB2BB',
    errorContainer: '#5B202B',
    onErrorContainer: '#FFDADD',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: '#151C2D',
      level2: '#182033',
      level3: '#1C2538',
      level4: '#20293D',
      level5: '#242E43',
    },
  },
};
