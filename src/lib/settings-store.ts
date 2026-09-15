import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import { createTranslator, type TranslationKey, type Language } from "./i18n";
import { useAuth } from "./auth-context";
import { fetchRemoteSettings, saveRemoteSettings } from "@/services/settings.service";
import React from "react";

export * from "./settings-types";
import {
  Currency,
  ChartType,
  ThemeMode,
  HomeSection,
  AppSettings,
  DEFAULT_HOME_SECTIONS,
  CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  DEFAULT_SETTINGS,
} from "./settings-types";

export type SettingsContextType = {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleHomeSection: (sectionId: string) => void;
  reorderHomeSections: (newSections: HomeSection[]) => void;
  resetHomeSections: () => void;
  resetSettings: () => void;
  currencySymbol: string;
  convertAmount: (arsAmount: number) => number;
  formatAmount: (arsAmount: number, opts?: { sign?: string; abs?: boolean }) => string;
  t: (key: TranslationKey) => string;
  isSectionEnabled: (id: string) => boolean;
  exchangeRates: Record<Currency, number>;
  updateExchangeRate: (currency: Currency, rate: number) => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("app-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasStreamlined = localStorage.getItem("dom-dashboard-streamlined-v2");
        if (!hasStreamlined) {
          localStorage.setItem("dom-dashboard-streamlined-v2", "true");
          const next = { ...DEFAULT_SETTINGS, ...parsed, homeSections: DEFAULT_HOME_SECTIONS };
          try {
            localStorage.setItem("app-settings", JSON.stringify(next));
          } catch {}
          return next;
        }

        // Merge with new default sections and preserve custom order & fields
        const savedSections = (parsed.homeSections || []) as HomeSection[];
        const mergedSections: HomeSection[] = DEFAULT_HOME_SECTIONS.map((def, defaultIdx) => {
          const existing = savedSections.find(s => s.id === def.id);
          if (!existing) return { ...def, order: def.order ?? defaultIdx };
          return {
            ...def,
            ...existing,
            enabled: typeof existing.enabled === "boolean" ? existing.enabled : def.enabled,
            order: typeof existing.order === "number" ? existing.order : (def.order ?? defaultIdx),
            category: def.category,
            column: def.column,
          };
        }).sort((a, b) => a.order - b.order);
        return { ...DEFAULT_SETTINGS, ...parsed, homeSections: mergedSections };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const isInitialSyncRef = useRef(true);

  // Sincronizar desde Supabase al autenticarse el usuario
  useEffect(() => {
    if (!user) {
      isInitialSyncRef.current = true;
      return;
    }

    let isMounted = true;
    fetchRemoteSettings()
      .then(remoteSettings => {
        if (!isMounted || !remoteSettings) return;
        setSettings(remoteSettings);
        localStorage.setItem("app-settings", JSON.stringify(remoteSettings));
      })
      .catch(err => {
        console.error("Error loading settings from Supabase:", err);
      })
      .finally(() => {
        if (isMounted) {
          isInitialSyncRef.current = false;
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const remoteSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSettings = useCallback((next: AppSettings) => {
    localStorage.setItem("app-settings", JSON.stringify(next));
    if (user) {
      if (remoteSaveTimeoutRef.current) {
        clearTimeout(remoteSaveTimeoutRef.current);
      }
      remoteSaveTimeoutRef.current = setTimeout(() => {
        saveRemoteSettings(next).catch(err => {
          console.error("Error persisting settings to Supabase:", err);
        });
      }, 500);
    }
  }, [user]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const toggleHomeSection = useCallback((sectionId: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        homeSections: prev.homeSections.map(s =>
          s.id === sectionId ? { ...s, enabled: !s.enabled } : s
        ),
      };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const reorderHomeSections = useCallback((newSections: HomeSection[]) => {
    // Normalizar índices de orden
    const indexed = newSections.map((s, idx) => ({ ...s, order: idx }));
    setSettings(prev => {
      const next = { ...prev, homeSections: indexed };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const resetHomeSections = useCallback(() => {
    setSettings(prev => {
      const next = { ...prev, homeSections: DEFAULT_HOME_SECTIONS };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const resetSettings = useCallback(() => {
    localStorage.removeItem("app-settings");
    setSettings(DEFAULT_SETTINGS);
    if (user) {
      saveRemoteSettings(DEFAULT_SETTINGS).catch(err => {
        console.error("Error resetting settings in Supabase:", err);
      });
    }
  }, [user]);

  const updateExchangeRate = useCallback((currency: Currency, rate: number) => {
    setSettings(prev => {
      const rates = { ...(prev.customExchangeRates || DEFAULT_EXCHANGE_RATES), [currency]: rate };
      const next = { ...prev, customExchangeRates: rates };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const value = useMemo<SettingsContextType>(() => {
    const sym = CURRENCIES.find(c => c.value === settings.currency)?.symbol ?? "$";
    const rates = {
      ...DEFAULT_EXCHANGE_RATES,
      ...(settings.customExchangeRates || {}),
    };
    const rate = rates[settings.currency] ?? 1;
    const t = createTranslator(settings.language);

    const convertAmount = (ars: number) => ars * rate;

    const formatAmount = (ars: number, opts?: { sign?: string; abs?: boolean }) => {
      const converted = Math.abs(ars) * rate;
      const formatted = converted.toLocaleString("es-AR", {
        minimumFractionDigits: settings.showDecimals ? 2 : 0,
        maximumFractionDigits: settings.showDecimals ? 2 : 0,
      });
      const sign = opts?.sign ?? "";
      return `${sign}${sym}${formatted}`;
    };

    const isSectionEnabled = (id: string) =>
      settings.homeSections.find(s => s.id === id)?.enabled ?? true;

    return {
      settings, updateSettings, toggleHomeSection, reorderHomeSections, resetHomeSections, resetSettings,
      currencySymbol: sym, convertAmount, formatAmount, t, isSectionEnabled,
      exchangeRates: rates, updateExchangeRate,
    };
  }, [settings, updateSettings, toggleHomeSection, reorderHomeSections, resetHomeSections, resetSettings, updateExchangeRate]);

  return React.createElement(SettingsContext.Provider, { value }, children);
}

const fallbackTranslator = createTranslator("es");

const fallbackSettingsContext: SettingsContextType = {
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  toggleHomeSection: () => {},
  reorderHomeSections: () => {},
  resetHomeSections: () => {},
  resetSettings: () => {},
  currencySymbol: "$",
  convertAmount: (a) => a,
  formatAmount: (a) => a.toLocaleString("es-AR", { minimumFractionDigits: 2 }),
  t: fallbackTranslator,
  isSectionEnabled: () => true,
  exchangeRates: DEFAULT_EXCHANGE_RATES,
  updateExchangeRate: () => {},
};

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  return ctx || fallbackSettingsContext;
}

export function useSettingsStore() {
  return useSettings();
}
