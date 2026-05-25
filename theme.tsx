import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

export type ThemeMode = 'light' | 'dark';

export type BlurTint = 'light' | 'dark' | 'extraLight' | 'regular' | 'prominent';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  mapBg: string;
  overlay: string;
  mapImage: string;
  blurTint?: BlurTint;
}

const lightColors: ThemeColors = {
  bg: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475569',
  border: '#CBD5E1',
  primary: '#4F46E5',
  accent: '#0891B2',
  danger: '#E11D48',
  warning: '#D97706',
  success: '#059669',
  mapBg: '#E2E8F0',
  overlay: 'rgba(255,255,255,0.9)',
  mapImage: 'https://d64gsuwffb70l.cloudfront.net/69e43134a8db4876dc9c7901_1776562617983_59f54a7f.jpg',
  blurTint: 'light',
};

const darkColors: ThemeColors = {
  bg: '#020617', // Deep Midnight
  surface: 'rgba(15, 23, 42, 0.7)',
  surfaceElevated: '#0F172A',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: 'rgba(51, 65, 85, 0.5)',
  primary: '#A855F7', // Electric Violet
  accent: '#22D3EE',  // Cyber Cyan
  danger: '#F43F5E',
  warning: '#FB7185',
  success: '#10B981',
  mapBg: '#020617',
  overlay: 'rgba(2, 6, 23, 0.85)',
  mapImage: 'https://d64gsuwffb70l.cloudfront.net/69e43134a8db4876dc9c7901_1776562635068_40f13a74.jpg',
  blurTint: 'dark',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  toggle: () => {},
});

export function ThemeProvider(props: { children: ReactNode }) {
  const _modeState = useState<ThemeMode>('dark');
  const mode = _modeState[0];
  const setMode = _modeState[1];

  const colors = mode === 'light' ? lightColors : darkColors;

  const toggle = useCallback(() => {
    setMode((prev) => {
      const nextMode = prev === 'light' ? 'dark' : 'light';
      console.log(`[Theme] Toggling: ${prev} -> ${nextMode}`);
      return nextMode;
    });
  }, []);

  useEffect(() => {
    async function syncNav() {
      if (Platform.OS === 'android') {
        try {
          // Optimization: Run these in parallel and catch individual errors
          await Promise.allSettled([
            SystemUI.setBackgroundColorAsync(colors.bg),
            NavigationBar.setButtonStyleAsync(mode === 'light' ? 'dark' : 'light'),
            NavigationBar.setVisibilityAsync('visible'),
          ]);
          console.log(`[Theme] Android Nav & System synced for ${mode} mode`);
        } catch (e) {
          console.log('[Theme] Nav sync ignored');
        }
      }
    }
    syncNav();
  }, [mode]);

  const value = useMemo(() => ({ mode, colors, toggle }), [mode, colors, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
