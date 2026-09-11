import { useContext } from 'react';
import { ThemeContextValue } from '@/context/theme-context-value';

export function useTheme() {
  const context = useContext(ThemeContextValue);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
}
