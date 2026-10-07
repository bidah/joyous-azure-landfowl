import { useColorScheme } from 'react-native';

const light = {
  dark: false,
  bg: '#FBFAF7',
  card: '#FFFFFF',
  ink: '#1C1B19',
  muted: '#9A968E',
  faint: '#ECE9E3',
  accent: '#E2583E',
};

const dark: typeof light = {
  dark: true,
  bg: '#111110',
  card: '#1A1918',
  ink: '#EDEBE6',
  muted: '#6F6B64',
  faint: '#262523',
  accent: '#FF7A5C',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const serif = 'ui-serif';
