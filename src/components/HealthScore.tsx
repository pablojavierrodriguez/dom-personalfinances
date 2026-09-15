import { motion } from "framer-motion";
import { Shield, TrendingUp, TrendingDown } from "lucide-react";
import { useSettings } from "@/lib/settings-store";

interface HealthScoreProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  budgetsUsedPct: number; // 0-100 average budget usage
  goalsProgress: number; // 0-100 average goal progress
  pendingBills: number;
  hasBudgets?: boolean;
}

export function HealthScore({
  monthlyIncome,
  monthlyExpenses,
  budgetsUsedPct,
  goalsProgress,
  pendingBills,
  hasBudgets = false,
}: HealthScoreProps) {
  const { t } = useSettings();

  const hasActivity = monthlyIncome > 0 || monthlyExpenses > 0;
  const isNeutralZero = !hasActivity && pendingBills === 0 && goalsProgress === 0;

  // Calculate score 0-100
  let score = 50;

  // 1. Savings ratio bonus (up to +25)
  if (monthlyIncome > 0) {
    const savingsRatio = (monthlyIncome - monthlyExpenses) / monthlyIncome;
    score += Math.min(25, Math.max(-25, savingsRatio * 50));
  } else if (monthlyExpenses > 0) {
    // Si solo hay gastos y 0 ingresos en el mes, penalizar
    score -= 20;
  }

  // 2. Budget discipline (up to +15) - Solo evaluar si el usuario tiene presupuestos activos
  if (hasBudgets) {
    score += budgetsUsedPct <= 80 ? 15 : budgetsUsedPct <= 100 ? 5 : -10;
  }

  // 3. Goals progress (up to +10) - Solo si hay metas con avance
  if (goalsProgress > 0) {
    score += (goalsProgress / 100) * 10;
  }

  // 4. Pending bills penalty
  score -= pendingBills * 3;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const getColor = () => {
    if (isNeutralZero) return "text-muted-foreground";
    if (score >= 75) return "text-primary";
    if (score >= 50) return "text-yellow-500";
    return "text-destructive";
  };

  const getLabel = () => {
    if (isNeutralZero) return "⚖️";
    if (score >= 75) return "💪";
    if (score >= 50) return "👍";
    return "⚠️";
  };

  const getStatusText = () => {
    if (isNeutralZero) return t("health.neutral") || "Neutro";
    if (score >= 75) return t("health.excellent") || "Excelente";
    if (score >= 50) return t("health.good") || "Bueno";
    return t("health.attention") || "Atención";
  };

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="px-4 py-3">
      <h2 className="text-[13px] text-muted-foreground font-medium mb-3 font-display">{t("dash.healthScore")}</h2>
      <div className="card-surface">
        <div className="card-inner flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="36" fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={getColor()}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-mono-data text-lg font-bold ${getColor()}`}>{score}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-foreground mb-1">
              {getLabel()} {getStatusText()}
            </div>
            <div className="space-y-1">
              {hasActivity ? (
                monthlyIncome > monthlyExpenses ? (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <TrendingUp className="w-3 h-3" />
                    <span>{t("health.savingsRate").replace("{rate}", String(Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)))}</span>
                  </div>
                ) : monthlyIncome === monthlyExpenses ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="w-3 h-3" />
                    <span>{t("health.balanced") || "Ingresos y gastos equilibrados"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-destructive">
                    <TrendingDown className="w-3 h-3" />
                    <span>{t("health.spendingMore")}</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <span>{t("health.noActivity") || "Sin movimientos este mes"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
