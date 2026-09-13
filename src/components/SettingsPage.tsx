import { useState } from "react";
import { ChevronRight, RotateCcw, DollarSign, Languages, BarChart3, LayoutGrid, Hash, Eye, Sun, Moon, Monitor, Smartphone, Shield, EyeOff, Palette, Check, LayoutList, Calculator, SlidersHorizontal, User, LogOut, Fingerprint, Lock, Clock, Keyboard, Sparkles, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { purgeAllUserData } from "@/services/user-data.service";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WhatsAppIntegrationModal } from "@/components/WhatsAppIntegrationModal";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { DashboardCardPicker } from "@/components/DashboardCardPicker";
import { useSettings, CURRENCIES, DEFAULT_EXCHANGE_RATES, type Currency, type ChartType, type ThemeMode, type AppTheme } from "@/lib/settings-store";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n";
import { APP_VERSION } from "@/lib/version";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

const THEMES: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

const APP_THEMES: {
  value: AppTheme;
  themeKey: "royalViolet" | "obsidianEmerald" | "cobaltFlow";
  label: string;
  subtitle: string;
  color: string;
  ringColor: string;
  styleTrait: string;
  pillShape: string;
}[] = [
  {
    value: "mobills",
    themeKey: "royalViolet",
    label: "Royal Violet",
    subtitle: "Curvas orgánicas & Violeta neón fluido",
    color: "bg-[#8B5CF6]",
    ringColor: "ring-[#8B5CF6]",
    styleTrait: "Orgánico",
    pillShape: "rounded-full",
  },
  {
    value: "m3",
    themeKey: "obsidianEmerald",
    label: "Obsidian Emerald",
    subtitle: "OLED puro & Minimalismo esmeralda sobrio",
    color: "bg-[#10b981]",
    ringColor: "ring-[#10b981]",
    styleTrait: "Minimalista",
    pillShape: "rounded-[10px]",
  },
  {
    value: "wallet",
    themeKey: "cobaltFlow",
    label: "Cobalt Flow",
    subtitle: "Azul marino suizo & Precisión arquitectónica",
    color: "bg-[#3B82F6]",
    ringColor: "ring-[#3B82F6]",
    styleTrait: "Estructurado",
    pillShape: "rounded-[6px]",
  },
];

interface SettingsPageProps {
  onImportCsv: () => void;
  onOpenReleaseNotes?: () => void;
  onOpenShortcuts?: () => void;
  onPurgeData?: () => Promise<void>;
}

function SettingRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-5 pb-2">
      {children}
    </h3>
  );
}

export function SettingsPage({ onImportCsv, onOpenReleaseNotes, onOpenShortcuts, onPurgeData }: SettingsPageProps) {
  const { settings, updateSettings, toggleHomeSection, resetSettings, currencySymbol, t } = useSettings();
  const {
    isPrivacyMode,
    setPrivacyMode,
    isBiometricsSupported,
    isBiometricLockEnabled,
    setBiometricLockEnabled,
    biometricTimeoutMinutes,
    setBiometricTimeoutMinutes,
    lockApp,
  } = usePrivacy();
  const { user, signOut } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Estados para la doble validación de borrado total de datos
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeConfirmedCheck, setPurgeConfirmedCheck] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  const isPurgeKeywordValid = (text: string) => {
    const clean = text.trim().toUpperCase();
    const keyword = (t("settings.purgeKeyword") || "BORRAR").toUpperCase();
    return clean === keyword || clean === "BORRAR" || clean === "DELETE";
  };

  const handleConfirmPurge = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!purgeConfirmedCheck || !isPurgeKeywordValid(purgeConfirmationText) || isPurging) {
      return;
    }
    setIsPurging(true);
    try {
      if (onPurgeData) {
        await onPurgeData();
      } else {
        await purgeAllUserData(user?.id);
      }
      setIsPurgeModalOpen(false);
      // Redirigir directamente al inicio "/" para entrar al estadio inicial (OnboardingWizard o Dashboard limpio en cero)
      window.location.href = "/";
    } catch (err: any) {
      console.error("[SettingsPage] Error durante la purga de datos:", err);
      toast.error(err?.message || t("toast.purgeError") || "Error al purgar los datos");
      setIsPurging(false);
    }
  };

  return (
    <div className="pt-4 pb-28 md:pb-8">
      <div className="px-4 pb-3">
        <h1 className="text-[20px] font-display font-semibold text-foreground">{t("settings.title")}</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">{t("settings.subtitle")}</p>
      </div>

      <div className="px-4 mb-4">
        <PwaInstallPrompt />
      </div>

      <div className="card-surface mx-4">
        <div className="card-inner space-y-0 divide-y divide-border/50">
          <SectionTitle>{t("settings.general")}</SectionTitle>

          <SettingRow icon={DollarSign} label={t("settings.currency")}>
            <Select value={settings.currency} onValueChange={(v) => updateSettings({ currency: v as Currency })}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.symbol} {t(`currency.${c.value}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow icon={Languages} label={t("settings.language")}>
            <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v as Language })}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value} className="text-xs">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow icon={Eye} label={t("settings.showDecimals")}>
            <Switch checked={settings.showDecimals} onCheckedChange={(v) => updateSettings({ showDecimals: v })} />
          </SettingRow>

          {/* Tipos de cambio de referencia */}
          <div className="py-3 px-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{t("settings.referenceRates") || "Cotizaciones de Referencia (en ARS)"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded-xl bg-background border border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono-data">1 USD =</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={Math.round(1 / ((settings.customExchangeRates?.USD) || DEFAULT_EXCHANGE_RATES.USD))}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1200;
                      updateSettings({
                        customExchangeRates: {
                          ...DEFAULT_EXCHANGE_RATES,
                          ...(settings.customExchangeRates || {}),
                          USD: 1 / val,
                        },
                      });
                    }}
                    className="w-16 h-7 text-xs text-right bg-secondary/50 rounded px-1 text-foreground font-mono-data focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="p-2 rounded-xl bg-background border border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono-data">1 EUR =</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={Math.round(1 / ((settings.customExchangeRates?.EUR) || DEFAULT_EXCHANGE_RATES.EUR))}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1300;
                      updateSettings({
                        customExchangeRates: {
                          ...DEFAULT_EXCHANGE_RATES,
                          ...(settings.customExchangeRates || {}),
                          EUR: 1 / val,
                        },
                      });
                    }}
                    className="w-16 h-7 text-xs text-right bg-secondary/50 rounded px-1 text-foreground font-mono-data focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <SectionTitle>{t("settings.display")}</SectionTitle>

          {/* Visual App Style Theme Selector */}
          <div className="py-3 px-4 border-b border-border/40">
            <div className="flex items-center gap-3 mb-2.5">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-foreground block">{t("settings.visualThemeTitle") || "Estilo visual y sensorial"}</span>
                <span className="text-[11px] text-muted-foreground">{t("settings.visualThemeSubtitle") || "Adapta curvas, sombras, relieves y paleta cromática"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1.5">
              {APP_THEMES.map(theme => {
                const isSelected = (settings.appTheme || "m3") === theme.value;
                const traitLabel = t(`theme.${theme.themeKey}.trait` as any) || theme.styleTrait;
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => updateSettings({ appTheme: theme.value })}
                    className={`flex flex-col justify-between p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40"
                        : "bg-secondary/40 border-border/50 hover:bg-secondary/70 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${theme.color} shrink-0 ring-2 ${isSelected ? theme.ringColor : "ring-transparent"}`} />
                        <span className="text-xs font-semibold text-foreground">{t(`theme.${theme.themeKey}.label` as any) || theme.label}</span>
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground">
                          {traitLabel}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-muted-foreground block mb-2 leading-tight">
                      {t(`theme.${theme.themeKey}.subtitle` as any) || theme.subtitle}
                    </span>

                    {/* Mini-mockup visual de forma y curvatura */}
                    <div className="w-full pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/80">{t("theme.styleLabel") || "Estilo"} {traitLabel}</span>
                      <div className={`h-3 w-12 ${theme.pillShape} border border-border/80 bg-background flex items-center justify-center`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{t("settings.darkMode")}</span>
            </div>
            <div className="flex bg-secondary rounded-full p-0.5">
              {THEMES.map(theme => (
                <button
                  key={theme.value}
                  onClick={() => updateSettings({ theme: theme.value })}
                  className={`p-1.5 rounded-full transition-colors ${
                    settings.theme === theme.value ? "bg-card text-foreground" : "text-muted-foreground"
                  }`}
                  title={theme.label}
                >
                  <theme.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          <SettingRow icon={BarChart3} label={t("settings.chartType")}>
            <Select value={settings.chartType} onValueChange={(v) => updateSettings({ chartType: v as ChartType })}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="donut" className="text-xs">{t("settings.chartDonut")}</SelectItem>
                <SelectItem value="bar" className="text-xs">{t("settings.chartBar")}</SelectItem>
                <SelectItem value="area" className="text-xs">{t("settings.chartArea")}</SelectItem>
                <SelectItem value="none" className="text-xs">{t("settings.chartNone")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow icon={LayoutList} label={t("settings.accountLayout") || "Disposición de Cuentas"}>
            <Select
              value={settings.accountViewMode || "list"}
              onValueChange={(v) => updateSettings({ accountViewMode: v as "list" | "carousel" })}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list" className="text-xs">{t("settings.accountLayoutList") || "Lista ordenada"}</SelectItem>
                <SelectItem value="carousel" className="text-xs">{t("settings.accountLayoutCarousel") || "Carrusel compacto"}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow icon={Calculator} label={t("settings.dailySubtotals") || "Subtotales diarios en historial"}>
            <Switch
              checked={settings.showDailySubtotals ?? false}
              onCheckedChange={(v) => updateSettings({ showDailySubtotals: v })}
            />
          </SettingRow>

          <SettingRow icon={Hash} label={t("settings.dailyBudget")}>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{currencySymbol}</span>
              <input type="number" value={settings.dailyBudget}
                onChange={(e) => updateSettings({ dailyBudget: Number(e.target.value) || 0 })}
                className="w-20 h-8 text-xs text-right bg-background border border-border/50 rounded-md px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </SettingRow>

          <SectionTitle>{t("settings.homeSections")}</SectionTitle>

          {/* Launcher interactivo del Dashboard Card Picker */}
          <div className="p-4 bg-secondary/20 rounded-2xl mx-4 my-2 border border-border/40">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground block font-display truncate">
                    {t("settings.customizeHome") || "Personalizar Inicio"}
                  </span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap block">
                    {settings.homeSections.filter(s => s.enabled).length} / {settings.homeSections.length} {t("settings.widgetsActive") || "widgets activos"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <span>{t("settings.edit") || "Editar"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              {t("settings.customizeHomeSubtitle") || "Elegí y organizá qué widgets, gráficos y datos ver en la pantalla principal."}
            </p>

            {/* Mini pills de widgets activos (máximo 4 + indicador de restantes) */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {settings.homeSections
                .filter(s => s.enabled)
                .slice(0, 4)
                .map(section => (
                  <span
                    key={section.id}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/80 border border-border/50 text-muted-foreground flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="truncate max-w-[120px]">{t(section.labelKey)}</span>
                  </span>
                ))}
              {settings.homeSections.filter(s => s.enabled).length > 4 && (
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium hover:bg-primary/20 transition-colors"
                >
                  +{settings.homeSections.filter(s => s.enabled).length - 4} {t("settings.moreWidgets") || "más"}
                </button>
              )}
            </div>
          </div>

          <DashboardCardPicker
            open={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
          />

          <SectionTitle>{t("settings.integrations") || "Integraciones & Automatización"}</SectionTitle>
          <WhatsAppIntegrationModal />

          <SectionTitle>{t("settings.privacySecurity") || "Privacidad & Seguridad"}</SectionTitle>
          <div className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{t("settings.privacyMode") || "Modo Privacidad"}</span>
                <span className="text-[11px] text-muted-foreground">{t("settings.privacyModeDesc") || "Oculta saldos y montos en pantalla (Atajo: tecla H)"}</span>
              </div>
            </div>
            <Switch checked={isPrivacyMode} onCheckedChange={setPrivacyMode} />
          </div>

          <div className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{t("settings.biometricLock") || "Bloqueo Biométrico"}</span>
                <span className="text-[11px] text-muted-foreground">
                  {isBiometricsSupported
                    ? (t("settings.biometricSupportedDesc") || "Requiere Face ID, Touch ID o huella al reabrir la app")
                    : (t("settings.biometricUnsupportedDesc") || "No disponible en este navegador o dispositivo")}
                </span>
              </div>
            </div>
            <Switch
              disabled={!isBiometricsSupported}
              checked={isBiometricLockEnabled}
              onCheckedChange={async (checked) => {
                const ok = await setBiometricLockEnabled(checked, user?.email || undefined);
                if (ok && checked) {
                  toast.success(t("settings.biometricSuccess") || "Autenticación biométrica activada con éxito");
                } else if (!ok && checked) {
                  toast.error(t("settings.biometricError") || "No se pudo registrar la biometría o fue cancelada");
                }
              }}
            />
          </div>

          {isBiometricLockEnabled && (
            <>
              <div className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{t("settings.biometricTimeout") || "Bloquear por inactividad"}</span>
                    <span className="text-[11px] text-muted-foreground">{t("settings.biometricTimeoutDesc") || "Tiempo en segundo plano antes de bloquear"}</span>
                  </div>
                </div>
                <Select
                  value={String(biometricTimeoutMinutes)}
                  onValueChange={(v) => setBiometricTimeoutMinutes(Number(v))}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-background border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-xs">{t("settings.timeoutImmediate") || "Inmediato"}</SelectItem>
                    <SelectItem value="1" className="text-xs">{t("settings.timeout1Min") || "1 minuto"}</SelectItem>
                    <SelectItem value="3" className="text-xs">{t("settings.timeout3Min") || "3 minutos"}</SelectItem>
                    <SelectItem value="5" className="text-xs">{t("settings.timeout5Min") || "5 minutos"}</SelectItem>
                    <SelectItem value="15" className="text-xs">{t("settings.timeout15Min") || "15 minutos"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="py-2.5 px-4">
                <button
                  type="button"
                  onClick={lockApp}
                  className="w-full py-2 px-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/40 text-foreground text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>{t("settings.lockNow") || "Bloquear pantalla ahora"}</span>
                </button>
              </div>
            </>
          )}

          <SectionTitle>{t("settings.data")}</SectionTitle>

          <button onClick={onImportCsv}
            className="flex items-center justify-between w-full py-3 px-4 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{t("settings.importCsv")}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button onClick={() => {
            localStorage.removeItem("onboarding-complete");
            resetSettings();
          }}
            className="flex items-center justify-between w-full py-3 px-4 hover:bg-destructive/10 transition-colors">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{t("settings.reset")}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsPurgeModalOpen(true)}
            className="flex items-center justify-between w-full py-3 px-4 hover:bg-destructive/10 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Trash2 className="w-4 h-4 text-destructive shrink-0" />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-sm text-destructive font-medium truncate">
                  {t("settings.purgeData") || "Borrar todos los datos y reiniciar"}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {t("settings.purgeDataDesc") || "Elimina transacciones, cuentas y reinicia desde cero"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-destructive/50 group-hover:text-destructive transition-colors shrink-0" />
          </button>

          {user && (
            <>
              <SectionTitle>{t("settings.accountSession") || "Cuenta & Sesión"}</SectionTitle>
              <div className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3 min-w-0">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-foreground truncate">{user.email}</span>
                    <span className="text-[11px] text-muted-foreground">{t("settings.sessionActive") || "Sesión iniciada"}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center justify-between w-full py-3 px-4 hover:bg-destructive/10 transition-colors text-destructive"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">{t("settings.signOut") || "Cerrar sesión"}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-destructive/50" />
              </button>
            </>
          )}

          <SectionTitle>{t("settings.about") || "Acerca de DOM"}</SectionTitle>

          {onOpenReleaseNotes && (
            <button
              type="button"
              onClick={onOpenReleaseNotes}
              className="flex items-center justify-between w-full py-3 px-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{t("command.whatsNew") || "Novedades y Mejoras"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold font-mono">
                  v{APP_VERSION}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          )}

          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="flex items-center justify-between w-full py-3 px-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Keyboard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{t("nav.keyboardShortcuts") || "Atajos de Teclado"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono-data bg-background border border-border/70 rounded text-muted-foreground">
                  ?
                </kbd>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Doble Validación para Borrado Total de Datos */}
      <AlertDialog open={isPurgeModalOpen} onOpenChange={setIsPurgeModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <AlertDialogTitle className="text-base font-semibold text-foreground">
                {t("settings.purgeModalTitle")}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed text-left">
              {t("settings.purgeModalDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            {/* Validación 1: Checkbox explícito */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-destructive/25 bg-destructive/5 cursor-pointer text-left select-none">
              <input
                type="checkbox"
                checked={purgeConfirmedCheck}
                onChange={(e) => setPurgeConfirmedCheck(e.target.checked)}
                className="mt-0.5 rounded border-destructive/40 text-destructive focus:ring-destructive"
              />
              <span className="text-xs text-destructive/90 font-medium leading-tight">
                {t("settings.purgeCheckboxLabel")}
              </span>
            </label>

            {/* Validación 2: Challenge por palabra clave */}
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-medium text-foreground block">
                {t("settings.purgeInputPrompt")}
              </label>
              <input
                type="text"
                value={purgeConfirmationText}
                onChange={(e) => setPurgeConfirmationText(e.target.value)}
                placeholder={t("settings.purgeKeyword")}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isPurging}
              onClick={() => {
                setPurgeConfirmedCheck(false);
                setPurgeConfirmationText("");
              }}
              className="text-xs"
            >
              {t("settings.purgeCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !purgeConfirmedCheck ||
                !isPurgeKeywordValid(purgeConfirmationText) ||
                isPurging
              }
              onClick={handleConfirmPurge}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs gap-1.5 disabled:opacity-50"
            >
              {isPurging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("settings.purging")}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t("settings.purgeConfirmBtn")}</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
