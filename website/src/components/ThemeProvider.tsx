"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useSettingsStore } from "@/store/useSettingsStore"; // 🔥 Import the new store

export default function ThemeProvider() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>(null);

  // 🔥 Grab the setter function
  const setCurrencySymbol = useSettingsStore((state) => state.setCurrencySymbol);

  useEffect(() => {
    api.get("/web/settings").then(res => {
      if (res.data.success && res.data.settings) {
        setSettings(res.data.settings);
        document.title = res.data.settings.store_name || "OmniStore";

        // 🔥 Instantly save the database currency symbol to the global app state!
        if (res.data.settings.currency_symbol) {
          setCurrencySymbol(res.data.settings.currency_symbol);
        }
      }
    }).catch(console.error);
  }, [setCurrencySymbol]);

  if (!settings) return null;

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --theme-primary: ${settings.theme_primary};
        --theme-navbar: ${settings.theme_navbar};
        --theme-sidebar: ${settings.theme_sidebar};
        --theme-background: ${settings.theme_background};
        --theme-card: ${settings.theme_card};
        --theme-text: ${settings.theme_text};
        --theme-sidebar-text: ${settings.theme_sidebar_text};
        --theme-label: ${settings.theme_label};
        --theme-sub-text: ${settings.theme_sub_text};
      }

      body, .bg-gray-50 { background-color: var(--theme-background) !important; }
      nav, header { background-color: var(--theme-navbar) !important; border-color: var(--theme-sidebar) !important; }
      aside { background-color: var(--theme-sidebar) !important; border-color: var(--theme-sidebar) !important; }
      .bg-white { background-color: var(--theme-card) !important; border-color: var(--theme-sidebar) !important; }

      .text-gray-900, .text-gray-800 { color: var(--theme-text) !important; }
      .text-gray-700 { color: var(--theme-label) !important; }
      .text-gray-600, .text-gray-500, .text-gray-400 { color: var(--theme-sub-text) !important; }
      aside .text-gray-500, aside .text-gray-900, aside a { color: var(--theme-sidebar-text) !important; }

      .text-blue-600 { color: var(--theme-primary) !important; }
      .bg-blue-600 { background-color: var(--theme-primary) !important; }
      .hover\\:bg-blue-700:hover { background-color: var(--theme-primary) !important; filter: brightness(0.85); }
      .border-blue-600 { border-color: var(--theme-primary) !important; }
      .ring-blue-600 { --tw-ring-color: var(--theme-primary) !important; }
      .border-gray-100, .border-gray-200 { border-color: var(--theme-sidebar) !important; }
    `}} />
  );
}