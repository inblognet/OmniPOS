import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_THEME } from '../db/db';

export const ThemeManager: React.FC = () => {
  const settings = useLiveQuery(() => db.settings.get(1));
  const theme = settings?.theme ? { ...DEFAULT_THEME, ...settings.theme } : DEFAULT_THEME;

  // Helper to convert Hex to RGB for opacity tricks
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '37, 99, 235';
  };

  return (
    <style>{`
      :root {
        --color-primary: ${theme.primaryColor};
        --color-primary-rgb: ${hexToRgb(theme.primaryColor)};

        --color-bg: ${theme.backgroundColor};
        --color-nav: ${theme.navbarColor};
        --color-sidebar: ${theme.sidebarColor};
        --color-sidebar-text: ${theme.sidebarTextColor};

        --color-card: ${theme.cardColor};
        --color-text: ${theme.textColor};
        --color-sub-text: ${theme.subTextColor};
        --color-label: ${theme.labelColor};
      }

      /* 1. APP BACKGROUND (Fixes "App Background" setting) */
      /* Override the gray classes used in MainLayout so they listen to your setting */
      body, .bg-gray-100, .bg-gray-50, .min-h-screen {
        background-color: var(--color-bg) !important;
      }

      /* 2. CONTENT CARDS (Fixes "Content Cards" setting) */
      /* Override .bg-white so your Dashboard/Settings cards change color */
      .bg-white {
        background-color: var(--color-card) !important;
        color: var(--color-text) !important;
      }

      /* 3. SIDEBAR */
      aside {
        background-color: var(--color-sidebar) !important;
        color: var(--color-sidebar-text) !important;
        border-right: 1px solid rgba(0,0,0,0.05);
      }

      /* Sidebar Icons & Links */
      aside span, aside svg, aside a {
        color: var(--color-sidebar-text) !important;
      }

      /* Sidebar Active State */
      aside .bg-blue-50 {
         background-color: rgba(var(--color-primary-rgb), 0.1) !important;
         color: var(--color-primary) !important;
      }
      aside .bg-blue-50 svg {
         color: var(--color-primary) !important;
      }

      /* 4. TOP NAVIGATION BAR */
      /* Target specifically to avoid getting overwritten by generic white rules */
      header.bg-white, nav.bg-white, .border-b {
        background-color: var(--color-nav) !important;
        border-color: rgba(0,0,0,0.05) !important;
      }

      /* 5. PRIMARY BUTTONS */
      button.bg-blue-600, .bg-blue-500, .bg-primary {
        background-color: var(--color-primary) !important;
        color: #ffffff !important; /* Always white text on primary buttons */
      }
      button.bg-blue-600:hover {
        opacity: 0.9;
      }

      /* 6. INPUTS (Keep them readable!) */
      /* Inputs will follow the card color but maintain a border */
      input, select, textarea {
        background-color: var(--color-card) !important;
        color: var(--color-text) !important;
        border-color: #d1d5db;
      }
      input:focus, select:focus, textarea:focus {
        border-color: var(--color-primary) !important;
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2) !important;
        outline: none;
      }

      /* 7. TEXT COLORS */
      h1, h2, h3, h4, h5, h6, .font-bold {
        color: var(--color-text) !important;
      }

      /* Sub-text and Labels */
      p.text-gray-500, span.text-gray-500, .text-gray-600, .text-sm.text-gray-500 {
        color: var(--color-sub-text) !important;
      }
      label {
        color: var(--color-label) !important;
      }

    `}</style>
  );
};