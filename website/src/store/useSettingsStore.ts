"use client";
import { create } from "zustand";

interface SettingsStore {
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  currencySymbol: "$", // Default fallback
  setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),
}));