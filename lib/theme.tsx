'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export type ColorTheme = 'lavender-storm' | 'midnight-aurora' | 'rose-gold-noir' | 'ocean-deep' | 'ember-slate';

export const COLOR_THEMES: Record<ColorTheme, { name: string; primary: string; secondary: string; bg: string; description: string }> = {
  'lavender-storm': { name: 'Lavender Storm', primary: '#6C63FF', secondary: '#FF6B35', bg: '#0F0E17', description: 'Introspective · Creative · Default' },
  'midnight-aurora': { name: 'Midnight Aurora', primary: '#00d4a8', secondary: '#f59e0b', bg: '#0a0e17', description: 'Cosmic · Focused · Grounded' },
  'rose-gold-noir': { name: 'Rose Gold Noir', primary: '#e879a0', secondary: '#f4a261', bg: '#0f0a0e', description: 'Elegant · Warm · Personal' },
  'ocean-deep': { name: 'Ocean Deep', primary: '#3b82f6', secondary: '#38bdf8', bg: '#040d18', description: 'Calm · Clear · Analytical' },
  'ember-slate': { name: 'Ember & Slate', primary: '#f97316', secondary: '#fbbf24', bg: '#0c0a08', description: 'Driven · Bold · Motivated' },
};

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('lavender-storm');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    const savedColor = localStorage.getItem('app_color_theme') as ColorTheme | null;
    if (savedColor && savedColor in COLOR_THEMES) setColorThemeState(savedColor);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (colorTheme === 'lavender-storm') {
      document.documentElement.removeAttribute('data-color-theme');
    } else {
      document.documentElement.setAttribute('data-color-theme', colorTheme);
    }
    localStorage.setItem('app_color_theme', colorTheme);
  }, [colorTheme, mounted]);

  // Apply both attributes synchronously on first paint to avoid flash
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') as Theme | null;
    document.documentElement.setAttribute('data-theme', savedTheme ?? 'dark');
    const savedColor = localStorage.getItem('app_color_theme') as ColorTheme | null;
    if (savedColor && savedColor in COLOR_THEMES && savedColor !== 'lavender-storm') {
      document.documentElement.setAttribute('data-color-theme', savedColor);
    }
  }, []);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  const setColorTheme = (t: ColorTheme) => setColorThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark', colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
