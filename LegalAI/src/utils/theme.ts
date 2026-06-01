/*
 * theme.ts — Centralized design tokens for the entire app.
 *
 * PURPOSE: Every color, font size, spacing value, and border radius
 * used across the app is defined here. This prevents "magic numbers"
 * scattered across screen files and ensures visual consistency.
 *
 * DESIGN DECISIONS:
 * - Dark-mode-first palette — legal apps feel more professional in dark mode.
 * - Gold/amber accent on deep navy — evokes trust, authority, and premium feel.
 * - Exported as plain objects (not a theme provider) for simplicity in MVP.
 */

/* ─── COLOR PALETTE ─── */
// All colors are grouped by usage so developers know which to pick.
export const COLORS = {
  /* Primary background — deep navy blue for the main app background */
  background: '#0B1120',

  /* Surface — slightly lighter navy for cards, modals, and elevated elements */
  surface: '#141E33',

  /* Surface variant — used for input fields, secondary cards, hover states */
  surfaceVariant: '#1C2A45',

  /* Primary accent — warm gold for buttons, highlights, and active states */
  primary: '#D4A846',

  /* Primary variant — slightly muted gold for pressed/secondary accent */
  primaryVariant: '#B8922E',

  /* Text colors — high contrast white for readability on dark backgrounds */
  textPrimary: '#FFFFFF',       // Main body text — maximum contrast
  textSecondary: '#A0AEC0',     // Subtitles, hints — softer gray-blue
  textMuted: '#5A6A85',         // Disabled text, timestamps — very subtle

  /* Status colors — standard semantic colors for feedback */
  success: '#48BB78',   // Green — successful actions (doc uploaded, etc.)
  error: '#FC8181',     // Soft red — errors and destructive actions
  warning: '#F6AD55',   // Orange — caution states

  /* Border color — subtle divider between sections */
  border: '#1E2D4A',

  /* Overlay — semi-transparent black for modals and dialogs */
  overlay: 'rgba(0, 0, 0, 0.6)',
};

/* ─── TYPOGRAPHY ─── */
// Font sizes follow a consistent scale (small → title).
// We use the system font stack for now — keeps the bundle small.
export const FONTS = {
  /* Largest text — screen titles, hero headings */
  title: 28,

  /* Section headings within a screen */
  heading: 22,

  /* Sub-headings, card titles */
  subheading: 18,

  /* Standard body text — paragraphs, descriptions */
  body: 16,

  /* Smaller text — labels, captions, metadata */
  caption: 14,

  /* Smallest text — timestamps, fine print */
  small: 12,

  /* Font weights as named constants */
  weightBold: '700' as const,     // Titles and emphasis
  weightSemiBold: '600' as const, // Sub-headings and buttons
  weightRegular: '400' as const,  // Body text
  weightLight: '300' as const,    // Subtle labels
};

/* ─── SPACING ─── */
// Consistent spacing scale based on multiples of 4px.
// This creates a visual rhythm throughout the app.
export const SPACING = {
  xs: 4,   // Tiny gaps — icon padding, inline elements
  sm: 8,   // Small gaps — between text lines, compact lists
  md: 16,  // Medium gaps — between sections, card padding
  lg: 24,  // Large gaps — screen padding, section separators
  xl: 32,  // Extra large — hero sections, major separators
  xxl: 48, // Maximum — top/bottom screen padding
};

/* ─── BORDER RADIUS ─── */
// Rounded corners add a modern, friendly feel to the UI.
export const RADIUS = {
  sm: 8,    // Subtle rounding — input fields, small buttons
  md: 12,   // Standard rounding — cards, containers
  lg: 16,   // Pronounced rounding — large cards, tiles
  xl: 24,   // Pill-shaped — tags, badges
  full: 999, // Fully circular — avatars, FABs
};
