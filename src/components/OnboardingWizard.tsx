import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Globe, DollarSign, Wallet, Sparkles, Zap } from "lucide-react";
import { useSettings, CURRENCIES, type Currency } from "@/lib/settings-store";
import type { Language } from "@/lib/i18n";
import { DOMSymbol } from "@/components/ui/DOMSymbol";

const STEPS = ["welcome", "language", "currency", "rules", "ready"] as const;
type Step = typeof STEPS[number];

export function OnboardingWizard({
  onComplete,
  onProvisionDefaultRules,
}: {
  onComplete: () => void;
  onProvisionDefaultRules?: () => Promise<any>;
}) {
  const { settings, updateSettings, t } = useSettings();
  const [step, setStep] = useState<Step>("welcome");
  const [selectedLang, setSelectedLang] = useState<Language>(settings.language);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(settings.currency);
  const [enableDefaultRules, setEnableDefaultRules] = useState(true);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) {
      if (step === "language") updateSettings({ language: selectedLang });
      if (step === "currency") updateSettings({ currency: selectedCurrency });
      setStep(STEPS[i + 1]);
    } else {
      if (enableDefaultRules && onProvisionDefaultRules) {
        onProvisionDefaultRules().catch(console.error);
      }
      localStorage.setItem("onboarding-complete", "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    if (enableDefaultRules && onProvisionDefaultRules) {
      onProvisionDefaultRules().catch(console.error);
    }
    localStorage.setItem("onboarding-complete", "true");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
        <motion.div
          className="h-full gradient-primary"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm px-6 flex flex-col items-center"
        >
          {step === "welcome" && (
            <>
              <DOMSymbol size={64} variant="badge" className="mb-6 shadow-2xl" />
              <h1 className="text-2xl font-bold font-brand text-foreground text-center mb-1">
                DOM
              </h1>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider text-center mb-3">
                {selectedLang === "es"
                  ? "El dominio no se conquista. Se administra."
                  : "Dominion is not conquered. It is managed."}
              </p>
              <p className="text-muted-foreground text-center text-sm mb-8">
                {selectedLang === "es"
                  ? "Gestioná tus recursos con claridad, proyectá con certeza y decidí con propósito."
                  : "Manage your resources with clarity, project with certainty, and decide with purpose."}
              </p>
            </>
          )}

          {step === "language" && (
            <>
              <div className="empty-state-icon mb-2">
                <Globe className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold font-display text-foreground text-center mb-1">
                {selectedLang === "es" ? "Elegí tu idioma" : "Choose your language"}
              </h2>
              <p className="text-muted-foreground text-center text-sm mb-6">
                {selectedLang === "es" ? "Podés cambiarlo después" : "You can change this later"}
              </p>
              <div className="w-full space-y-3">
                {([
                  { value: "es" as Language, label: "🇦🇷 Español", desc: "Español (Argentina)" },
                  { value: "en" as Language, label: "🇺🇸 English", desc: "English (US)" },
                ]).map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => setSelectedLang(lang.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                      selectedLang === lang.value
                        ? "bg-primary/10 ring-2 ring-primary"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <span className="text-2xl">{lang.label.split(" ")[0]}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{lang.label.split(" ")[1]}</div>
                      <div className="text-xs text-muted-foreground">{lang.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "currency" && (
            <>
              <div className="empty-state-icon mb-2">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold font-display text-foreground text-center mb-1">
                {selectedLang === "es" ? "¿Cuál es tu moneda?" : "What's your currency?"}
              </h2>
              <p className="text-muted-foreground text-center text-sm mb-6">
                {selectedLang === "es" ? "Todos los montos se mostrarán en esta moneda" : "All amounts will display in this currency"}
              </p>
              <div className="w-full space-y-3">
                {CURRENCIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedCurrency(c.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                      selectedCurrency === c.value
                        ? "bg-primary/10 ring-2 ring-primary"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <span className="text-xl font-mono-data font-bold text-foreground">{c.symbol}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{c.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedLang === "es"
                          ? { ARS: "Peso argentino", USD: "Dólar estadounidense", EUR: "Euro" }[c.value]
                          : { ARS: "Argentine Peso", USD: "US Dollar", EUR: "Euro" }[c.value]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "rules" && (
            <>
              <div className="empty-state-icon mb-2">
                <Zap className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold font-display text-foreground text-center mb-1">
                {selectedLang === "es" ? "Reglas de Automatización" : "Automation Rules"}
              </h2>
              <p className="text-muted-foreground text-center text-sm mb-6">
                {selectedLang === "es"
                  ? "Auto-categorizá extractos bancarios y movimientos comunes con reglas configurables."
                  : "Auto-categorize bank statements and common transactions with configurable rules."}
              </p>
              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={() => setEnableDefaultRules(true)}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all border text-left ${
                    enableDefaultRules
                      ? "bg-primary/10 border-primary ring-1 ring-primary"
                      : "bg-secondary/40 border-border/50 hover:bg-secondary/70"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${enableDefaultRules ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
                      {enableDefaultRules && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedLang === "es" ? "Activar reglas recomendadas (Recomendado)" : "Enable recommended rules (Recommended)"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLang === "es"
                        ? "Sueldos, Supermercados, Combustible, Servicios y Pagos de Tarjeta. Podrás modificarlas o borrarlas cuando quieras."
                        : "Salary, Groceries, Fuel, Utilities, and Card Payments. You can customize or delete them anytime."}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEnableDefaultRules(false)}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all border text-left ${
                    !enableDefaultRules
                      ? "bg-primary/10 border-primary ring-1 ring-primary"
                      : "bg-secondary/40 border-border/50 hover:bg-secondary/70"
                  }`}
                >
                  <div className="pt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!enableDefaultRules ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
                      {!enableDefaultRules && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedLang === "es" ? "Empezar en blanco (Sin reglas)" : "Start blank (No rules)"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLang === "es"
                        ? "Configurarás tus propias reglas de automatización manualmente más adelante."
                        : "Configure your own automation rules manually later."}
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {step === "ready" && (
            <>
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6 fab-glow">
                <Wallet className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold font-display text-foreground text-center mb-2">
                {selectedLang === "es" ? "¡Todo listo!" : "All set!"}
              </h2>
              <p className="text-muted-foreground text-center text-sm mb-4">
                {selectedLang === "es"
                  ? "Tu app está configurada. Empezá a registrar tus finanzas ahora."
                  : "Your app is configured. Start tracking your finances now."}
              </p>
            </>
          )}

          <button
            onClick={next}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base mt-8 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform fab-glow"
          >
            {step === "ready"
              ? (selectedLang === "es" ? "Comenzar" : "Get Started")
              : (selectedLang === "es" ? "Siguiente" : "Next")}
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Skip */}
      {step !== "ready" && (
        <button
          onClick={handleSkip}
          className="absolute bottom-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {selectedLang === "es" ? "Omitir" : "Skip"}
        </button>
      )}
    </div>
  );
}
