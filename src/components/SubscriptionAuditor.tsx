import { useState, useMemo } from "react";
import {
  DetectedSubscription,
  SubscriptionVerdict,
  saveSubscriptionVerdict,
  detectSubscriptions,
} from "@/lib/subscription-detector";
import { Transaction, RecurringTransaction, BillReminder } from "@/lib/types";
import { useSettings } from "@/lib/settings-store";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { ResponsiveSheet } from "./ResponsiveSheet";
import { CategoryIcon } from "./CategoryIcon";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  TrendingDown,
  ArrowRight,
  Flame,
  Check,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubscriptionAuditorProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  recurringTxs?: RecurringTransaction[];
  bills?: BillReminder[];
  onOpenCreateBill?: (name: string, amount: number) => void;
}

type FilterTab = "all" | "leaks" | "review" | "essential" | "unreviewed";

export function SubscriptionAuditor({
  open,
  onClose,
  transactions,
  recurringTxs = [],
  bills = [],
  onOpenCreateBill,
}: SubscriptionAuditorProps) {
  const { formatAmount: baseFormatAmount, t } = useSettings();
  const { maskAmount } = usePrivacy();
  const formatAmount = (n: number, opts?: any) => maskAmount(baseFormatAmount(n, opts));

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [verdictOverrides, setVerdictOverrides] = useState<Record<string, SubscriptionVerdict>>({});

  // Detectar suscripciones a partir de los datos actuales
  const detectedList = useMemo(() => {
    const list = detectSubscriptions(transactions, recurringTxs, bills);
    return list.map((item) => {
      if (verdictOverrides[item.id]) {
        return { ...item, verdict: verdictOverrides[item.id] };
      }
      return item;
    });
  }, [transactions, recurringTxs, bills, verdictOverrides]);

  // Manejador para clasificar una suscripción
  const handleSetVerdict = (sub: DetectedSubscription, verdict: SubscriptionVerdict) => {
    navigator.vibrate?.(12);
    saveSubscriptionVerdict(sub.id, verdict);
    setVerdictOverrides((prev) => ({ ...prev, [sub.id]: verdict }));
  };

  // Métricas consolidadas de impacto
  const metrics = useMemo(() => {
    let totalMonthlyCommitted = 0;
    let totalMonthlyLeaks = 0;
    let totalLeakOpportunity3Y = 0;
    let totalLeakOpportunity5Y = 0;
    let leaksCount = 0;
    let reviewCount = 0;

    detectedList.forEach((s) => {
      totalMonthlyCommitted += s.monthlyAmount;
      if (s.verdict === "leak" || s.verdict === "review") {
        totalMonthlyLeaks += s.monthlyAmount;
        totalLeakOpportunity3Y += s.opportunityCost3Y;
        totalLeakOpportunity5Y += s.opportunityCost5Y;
      }
      if (s.verdict === "leak") leaksCount++;
      if (s.verdict === "review") reviewCount++;
    });

    return {
      totalMonthlyCommitted,
      totalMonthlyLeaks,
      totalLeakOpportunity3Y,
      totalLeakOpportunity5Y,
      leaksCount,
      reviewCount,
    };
  }, [detectedList]);

  // Filtrado de la lista
  const filteredList = useMemo(() => {
    if (activeFilter === "all") return detectedList;
    if (activeFilter === "leaks") return detectedList.filter((s) => s.verdict === "leak");
    if (activeFilter === "review") return detectedList.filter((s) => s.verdict === "review");
    if (activeFilter === "essential") return detectedList.filter((s) => s.verdict === "essential");
    if (activeFilter === "unreviewed") return detectedList.filter((s) => s.verdict === "unreviewed");
    return detectedList;
  }, [detectedList, activeFilter]);

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={t("auditor.title")}>
      <div className="p-4 space-y-4">
        {/* Cabecera descriptiva */}
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground px-1">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t("auditor.subtitle")}</span>
        </div>

        {/* Hero Card: Shock de Consciencia Patrimonial */}
        <div className="card-surface relative overflow-hidden bg-gradient-to-br from-card to-secondary/30 border border-border/60 p-4 rounded-[16px]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">
                {t("auditor.monthlyLeaks")}
              </span>
              <div className="text-2xl font-display font-bold text-foreground font-mono-data">
                {formatAmount(metrics.totalMonthlyLeaks)}
                <span className="text-xs text-muted-foreground font-normal ml-1.5">/ mes</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          {metrics.totalMonthlyLeaks > 0 && (
            <div className="pt-3 border-t border-border/40 mt-2 space-y-1.5">
              <div className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("auditor.opportunityCostDesc")}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="p-2 rounded-xl bg-background/50 border border-border/40 text-center">
                  <div className="text-[11px] text-muted-foreground">{t("auditor.at3Y")}</div>
                  <div className="text-sm font-semibold font-mono-data text-emerald-400">
                    {formatAmount(metrics.totalLeakOpportunity3Y)}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-background/50 border border-border/40 text-center">
                  <div className="text-[11px] text-muted-foreground">{t("auditor.at5Y")}</div>
                  <div className="text-sm font-semibold font-mono-data text-emerald-400">
                    {formatAmount(metrics.totalLeakOpportunity5Y)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selector de Filtros (Chips Táctiles) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
              activeFilter === "all"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("auditor.all")} ({detectedList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("leaks")}
            className={`h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
              activeFilter === "leaks"
                ? "bg-rose-500 text-white font-semibold shadow-sm"
                : "bg-secondary/60 text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            🔴 {t("auditor.leaks")} ({metrics.leaksCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("review")}
            className={`h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
              activeFilter === "review"
                ? "bg-amber-500 text-white font-semibold shadow-sm"
                : "bg-secondary/60 text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            🟡 {t("auditor.review")} ({metrics.reviewCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("essential")}
            className={`h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
              activeFilter === "essential"
                ? "bg-emerald-500 text-white font-semibold shadow-sm"
                : "bg-secondary/60 text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            🟢 {t("auditor.essential")}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unreviewed")}
            className={`h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
              activeFilter === "unreviewed"
                ? "bg-secondary text-foreground font-semibold ring-1 ring-border"
                : "bg-secondary/40 text-muted-foreground"
            }`}
          >
            {t("auditor.unreviewed")}
          </button>
        </div>

        {/* Lista de Suscripciones Detectadas */}
        {filteredList.length === 0 ? (
          <div className="text-center py-10 px-4 card-surface rounded-[16px] border border-border/40">
            <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{t("auditor.emptyFilter")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {t("auditor.noSubscriptionsDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filteredList.map((sub) => {
                const isLeak = sub.verdict === "leak";
                const isReview = sub.verdict === "review";
                const isEssential = sub.verdict === "essential";

                return (
                  <motion.div
                    key={sub.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`card-surface rounded-[14px] p-3.5 border transition-colors ${
                      isLeak
                        ? "border-rose-500/30 bg-rose-500/[0.03]"
                        : isReview
                        ? "border-amber-500/30 bg-amber-500/[0.03]"
                        : isEssential
                        ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    {/* Fila 1: Identidad y Monto */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          {sub.category ? (
                            <CategoryIcon name={sub.category.icon} className={`w-4 h-4 ${sub.category.color}`} />
                          ) : (
                            <Zap className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">
                            {sub.normalizedName}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                            <span>{sub.frequency === "monthly" ? "Mensual" : sub.frequency === "weekly" ? "Semanal" : "Anual"}</span>
                            <span>•</span>
                            <span>{sub.occurrencesCount} {sub.occurrencesCount === 1 ? "registro" : "registros"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[15px] font-semibold font-mono-data text-foreground">
                          {formatAmount(sub.monthlyAmount)}
                          <span className="text-[11px] text-muted-foreground font-normal ml-1">/mes</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono-data">
                          {formatAmount(sub.annualCost)}/año
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Proyección de Costo de Oportunidad a 3 años */}
                    <div className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg bg-secondary/30 mb-3 border border-border/30">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-amber-400" />
                        <span>{t("auditor.opportunityAt3Y")}</span>
                      </span>
                      <span className="font-mono-data font-medium text-foreground">
                        {formatAmount(sub.opportunityCost3Y)}
                      </span>
                    </div>

                    {/* Fila 3: Acciones Ergonómicas Táctiles (Toque ≥ 44px) */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSetVerdict(sub, "essential")}
                        className={`h-11 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          isEssential
                            ? "bg-emerald-500 text-white font-semibold shadow-sm"
                            : "bg-secondary/40 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400"
                        }`}
                        title={t("auditor.verdictEssential")}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{t("auditor.verdictEssential")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetVerdict(sub, "review")}
                        className={`h-11 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          isReview
                            ? "bg-amber-500 text-white font-semibold shadow-sm"
                            : "bg-secondary/40 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400"
                        }`}
                        title={t("auditor.verdictReview")}
                      >
                        <HelpCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate">{t("auditor.verdictReview")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetVerdict(sub, "leak")}
                        className={`h-11 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          isLeak
                            ? "bg-rose-500 text-white font-semibold shadow-sm"
                            : "bg-secondary/40 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
                        }`}
                        title={t("auditor.verdictLeak")}
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="truncate">{t("auditor.verdictLeak")}</span>
                      </button>
                    </div>

                    {/* Acciones Rápidas si es fuga o requiere recordatorio */}
                    {isLeak && onOpenCreateBill && !sub.isExistingObligation && (
                      <div className="mt-2.5 pt-2 border-t border-border/30 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenCreateBill(sub.normalizedName, sub.monthlyAmount);
                            onClose();
                          }}
                          className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <span>{t("auditor.createReminder")}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
