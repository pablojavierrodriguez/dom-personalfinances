import { useMemo, useCallback } from "react";
import { Eye, EyeOff, TrendingUp, TrendingDown, Sparkles, CloudOff, RefreshCw } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { Currency, CURRENCIES } from "@/lib/settings-types";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Account, Transaction } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { DashboardSparkline } from "./DashboardSparkline";

interface BalanceHeaderProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  accounts?: Account[];
  transactions?: Transaction[];
  syncStatus?: {
    pendingCount: number;
    isSyncing: boolean;
    onSync: () => void;
  };
}

const HIDDEN = "$ ••••••";

export function BalanceHeader({
  totalBalance,
  monthlyIncome,
  monthlyExpenses,
  accounts = [],
  transactions = [],
  syncStatus,
}: BalanceHeaderProps) {
  const { settings, updateSettings, t } = useSettings();
  const { calculateConsolidatedBalance, calculateConsolidatedTransactions, formatInCurrency, convert } = useCurrencyConversion();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

  // Moneda activa de consolidación (ARS, USD, EUR)
  const currentCurrency = settings.currency || "ARS";
  const accountsMap = useMemo(() => new Map<string, Account>(accounts.map(a => [a.id, a])), [accounts]);

  // Balance patrimonial consolidado según las divisas nativas de cada cuenta
  const effectiveTotal = useMemo(() => {
    if (accounts.length > 0) {
      return calculateConsolidatedBalance(accounts, currentCurrency);
    }
    // Fallback: si no se pasan cuentas, convertir el total directo
    return convert(totalBalance, "ARS", currentCurrency);
  }, [accounts, calculateConsolidatedBalance, currentCurrency, convert, totalBalance]);

  const effectiveIncome = useMemo(() => {
    if (transactions.length > 0) {
      const incTxs = transactions.filter(t => t.type === "income" && !t.isCardPayment && !t.isTransfer);
      return calculateConsolidatedTransactions(incTxs, currentCurrency, accountsMap);
    }
    return convert(monthlyIncome, "ARS", currentCurrency);
  }, [transactions, calculateConsolidatedTransactions, currentCurrency, accountsMap, monthlyIncome, convert]);

  const effectiveExpenses = useMemo(() => {
    if (transactions.length > 0) {
      const expTxs = transactions.filter(t => t.type === "expense" && !t.isCardPayment && !t.isTransfer);
      return calculateConsolidatedTransactions(expTxs, currentCurrency, accountsMap);
    }
    return convert(monthlyExpenses, "ARS", currentCurrency);
  }, [transactions, calculateConsolidatedTransactions, currentCurrency, accountsMap, monthlyExpenses, convert]);

  // Curvas de tendencia acumulada para los sparklines de fondo
  const { incomePoints, expensePoints } = useMemo(() => {
    if (transactions.length === 0) {
      return {
        incomePoints: [0, 0, 0, 0, 0],
        expensePoints: [0, 0, 0, 0, 0],
      };
    }

    const sorted = [...transactions]
      .filter(t => !t.isCardPayment && !t.isTransfer)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const daysMap = new Map<string, { inc: number; exp: number }>();
    for (const tx of sorted) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = daysMap.get(key) || { inc: 0, exp: 0 };
      const txCurr = tx.currency || (tx.accountId ? accountsMap.get(tx.accountId)?.currency : undefined) || "ARS";
      const convertedAmount = convert(tx.amount, txCurr, currentCurrency);
      if (tx.type === "income") {
        entry.inc += convertedAmount;
      } else {
        entry.exp += convertedAmount;
      }
      daysMap.set(key, entry);
    }

    const sortedDays = Array.from(daysMap.keys()).sort();
    if (sortedDays.length === 0) {
      return {
        incomePoints: [0, 0, 0],
        expensePoints: [0, 0, 0],
      };
    }

    let runningInc = 0;
    let runningExp = 0;
    const incSeries: number[] = [0];
    const expSeries: number[] = [0];

    for (const day of sortedDays) {
      const val = daysMap.get(day)!;
      runningInc += val.inc;
      runningExp += val.exp;
      incSeries.push(runningInc);
      expSeries.push(runningExp);
    }

    return {
      incomePoints: incSeries,
      expensePoints: expSeries,
    };
  }, [transactions, accountsMap, convert, currentCurrency]);

  const fmt = useCallback(
    (n: number) => formatInCurrency(n, currentCurrency),
    [formatInCurrency, currentCurrency]
  );

  const handleCurrencyChange = (curr: Currency) => {
    updateSettings({ currency: curr });
  };

  return (
    <div className="px-4 pt-0 pb-1">
      <div className="hero-balance-surface p-4 sm:p-5 relative overflow-hidden">
        {/* Glow de fondo temático en esquina superior derecha */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        {/* Fila superior: Título del balance + Selector de divisas + Botón Privacidad */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] text-muted-foreground font-medium font-display">
              {t("balance.title")}
            </h2>
            <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 theme-pill-btn border border-border/40">
              {CURRENCIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => handleCurrencyChange(c.value)}
                  className={`min-w-[32px] h-6 px-1.5 flex items-center justify-center text-[10px] font-mono-data font-bold theme-pill-btn transition-all active:scale-95 ${
                    currentCurrency === c.value
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  title={`Consolidar balance en ${c.value}`}
                >
                  {c.value}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {syncStatus && (syncStatus.pendingCount > 0 || syncStatus.isSyncing) && (
              <button
                onClick={syncStatus.onSync}
                disabled={syncStatus.isSyncing}
                className="flex items-center gap-1 px-2 py-1 theme-pill-btn text-[10px] font-medium transition-all active:scale-95 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
                title={t("common.pendingSyncTooltip")}
              >
                {syncStatus.isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{t("common.syncing") || "Sincronizando..."}</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3 h-3" />
                    <span>{syncStatus.pendingCount} {t("common.pending") || "pendientes"}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={togglePrivacyMode}
              className="p-1.5 theme-pill-btn text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              aria-label={isPrivacyMode ? t("balance.show") : t("balance.hide")}
              title={isPrivacyMode ? t("balance.show") : t("balance.hide")}
            >
              {isPrivacyMode ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Monto Principal Consolidado */}
        <div className="mt-2.5 mb-4 relative z-10">
          {!isPrivacyMode ? (
            <AnimatedNumber
              key={currentCurrency}
              value={effectiveTotal}
              formatter={fmt}
              className="font-mono-data text-[34px] sm:text-[38px] font-bold text-foreground tracking-tight leading-none drop-shadow-xs"
            />
          ) : (
            <span className="font-mono-data text-[34px] sm:text-[38px] font-bold text-foreground tracking-tight leading-none select-none">
              {HIDDEN}
            </span>
          )}
        </div>

        {/* Cápsulas de Métricas (Ingresos y Gastos) */}
        <div className="grid grid-cols-2 gap-2.5 relative z-10 pt-2 border-t border-border/40">
          {/* Ingresos */}
          <div className="relative overflow-hidden flex flex-col justify-between p-3 rounded-xl bg-secondary/40 border border-border/30">
            <div className="absolute inset-x-0 bottom-0 h-7 opacity-40 pointer-events-none">
              <DashboardSparkline data={incomePoints} color="hsl(var(--primary))" gradientId="spark-income" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-1">
                <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-2.5 h-2.5 text-primary" />
                </div>
                <span className="truncate">{t("balance.income")}</span>
              </div>
              <span className="font-mono-data text-sm sm:text-base font-semibold text-primary truncate block tabular-nums">
                {!isPrivacyMode ? `+${formatInCurrency(effectiveIncome, currentCurrency)}` : HIDDEN}
              </span>
            </div>
          </div>

          {/* Gastos */}
          <div className="relative overflow-hidden flex flex-col justify-between p-3 rounded-xl bg-secondary/40 border border-border/30">
            <div className="absolute inset-x-0 bottom-0 h-7 opacity-40 pointer-events-none">
              <DashboardSparkline data={expensePoints} color="hsl(var(--destructive))" gradientId="spark-expenses" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-1">
                <div className="w-3.5 h-3.5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-2.5 h-2.5 text-destructive" />
                </div>
                <span className="truncate">{t("balance.expenses")}</span>
              </div>
              <span className="font-mono-data text-sm sm:text-base font-semibold text-foreground truncate block tabular-nums">
                {!isPrivacyMode ? `-${formatInCurrency(effectiveExpenses, currentCurrency)}` : HIDDEN}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
