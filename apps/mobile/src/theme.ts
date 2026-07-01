// Haze design tokens — ported verbatim from design/Mira.dc.html :root.
// Light-only. The whole design system; no UI-kit dependency.
import { Platform } from 'react-native';

export const colors = {
  // surfaces
  bg: '#ffffff',
  bgElev: '#ffffff',
  bgSidebar: '#fafafa',
  bgInset: '#f4f4f5',
  // bg-frame is a radial gradient in CSS; we render it with LinearGradient (top→bottom approx)
  frame: ['#f6f5fc', '#fbf6f6', '#ffffff'] as const,
  // lines
  border: '#ebebed',
  borderStrong: '#d4d4d8',
  // text
  text: '#18181b',
  textMuted: '#6b6b70',
  textSubtle: '#9c9ca1',
  // accent (cool indigo)
  accent: '#5A5FE0',
  accentFg: '#ffffff',
  accentSoft: '#ECEDFC',
  accentDeep: '#4346C0',
  // glass
  glassSmokeBg: 'rgba(236,236,245,0.45)',
  glassLightBg: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.55)',
  glassText: '#2C2C3C',
  // status
  stProgress: '#b8791c',
  stDone: '#1f9d6b',
  stBlocked: '#d14343',
  stWarm: '#b8791c',
  // chat bubbles
  bubbleThem: '#f4f4f5',
  bubbleThemFg: '#18181b',
} as const;

export const radius = { sm: 10, md: 14, lg: 16, xl: 24, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// font: design uses Inter; system font until expo-font loads Inter (Phase 2 ponytail
// skip — visually close on iOS/SF). ponytail: system font, add expo-font Inter if brand insists.
export const font = {
  family: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  // weights mirror the Inter 400/500/600 the doc loads
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
} as const;

// RN shadow approximations of the CSS box-shadows.
export const shadow = {
  card: {
    shadowColor: '#18181b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  soft: {
    shadowColor: '#18181b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  pop: {
    shadowColor: '#18181b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
  },
  glass: {
    shadowColor: 'rgba(60,50,95,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const theme = { colors, radius, space, font, shadow } as const;
export type Theme = typeof theme;
