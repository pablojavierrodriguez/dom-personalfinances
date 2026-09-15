import { useState } from "react";
import { Plus, Trash2, AlertTriangle, Sparkles, TrendingUp, Calendar, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Budget, Category, Transaction } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { useSettings } from "@/lib/settings-store";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { calculateBudgetMetrics, calculateSuggestedBudget, calculateEffectiveBudgetAmount } from "@/lib/budget-utils";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { generateUUID } from "@/services/sync-queue.service";
import { formatThousandsInput, parseThousandsInput } from "@/lib/utils";

interface BudgetManagerProps {
  selectedDate?: Date;
  budgets: Budget[];
  categories: Category[];
  transactions?: Transaction[];
  getBudgetSpent: (categoryId: string, month: number, year: number) => number;
  getAllActiveCategories: (type?: "income" | "expense") => Category[];
  onAdd: (budget: Budget) => void;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
  onDelete: (id: string) => void;
}

export function BudgetManager({
  selectedDate,
  budgets, categories, transactions = [], getBudgetSpent, getAllActiveCategories,
  onAdd, onUpdate, onDelete,
}: BudgetManagerProps) {
  const { maskAmount } = usePrivacy();
  const { formatAmount: baseFormatAmount, t } = useSettings();
  const formatAmount = (n: number, opts?: any) => maskAmount(baseFormatAmount(n, opts));
  const [showForm, setShowForm] = useState(false);
  const [selectedCat, setSelectedCat] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [enableRollover, setEnableRollover] = useState(false);

  const effectiveDate = selectedDate || new Date();
  const month = effectiveDate.getMonth();
  const year = effectiveDate.getFullYear();
  const currentBudgets = budgets.filter(b => b.month === month && b.year === year);
  const expenseCategories = getAllActiveCategories("expense");

  const handleSuggest = () => {
    if (!selectedCat) return;
    const suggested = calculateSuggestedBudget(transactions, selectedCat, 3, effectiveDate);
    if (suggested > 0) {
      setLimitAmount(formatThousandsInput(suggested));
    }
  };

  const handleAdd = () => {
    const parsedLimit = parseThousandsInput(limitAmount);
    if (!selectedCat || !parsedLimit) return;

    // UX-M4: Control de duplicados. Si ya existe un presupuesto para este categoryId en el período, actualizarlo
    const existing = currentBudgets.find(b => b.categoryId === selectedCat);
    if (existing) {
      onUpdate(existing.id, { amount: parsedLimit, enableRollover });
      setSelectedCat("");
      setLimitAmount("");
      setEnableRollover(false);
      setShowForm(false);
      return;
    }

    // Computar remanente del mes previo si tiene rollover habilitado
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevBudget = budgets.find(b => b.categoryId === selectedCat && b.month === prevMonth && b.year === prevYear);
    let initialAccumulated = 0;
    if (enableRollover && prevBudget) {
      const prevSpent = getBudgetSpent(selectedCat, prevMonth, prevYear);
      initialAccumulated = Math.max(0, prevBudget.amount - prevSpent);
    }

    onAdd({
      id: generateUUID(),
      categoryId: selectedCat,
      amount: parsedLimit,
      month, year,
      enableRollover,
      accumulatedRollover: initialAccumulated,
    });
    setSelectedCat("");
    setLimitAmount("");
    setEnableRollover(false);
    setShowForm(false);
  };

  const totalBudgeted = currentBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = currentBudgets.reduce((s, b) => s + getBudgetSpent(b.categoryId, month, year), 0);

  return (
    <div className="pt-4 pb-4">
      <div className="px-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-display font-semibold text-foreground">{t("budget.title")}</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t("budget.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-xs shrink-0"
          title={t("budget.newBudget")}
          aria-label={t("budget.newBudget")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="mx-4 mb-4 p-4 rounded-[16px] bg-card border border-border/50 shadow-sm">
          <label className="text-[12px] text-muted-foreground font-medium mb-2 block">{t("budget.category")}</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {expenseCategories.filter(c => !currentBudgets.some(b => b.categoryId === c.id)).map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] transition-colors ${
                  selectedCat === cat.id ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30" : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
                }`}>
                <div className={`w-4 h-4 rounded-[5px] ${cat.color} flex items-center justify-center`}>
                  <CategoryIcon name={cat.icon || "circle-dot"} className="w-2.5 h-2.5 text-white" />
                </div>
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-1">
            <label className="text-[12px] text-muted-foreground font-medium">{t("budget.limit")}</label>
            {selectedCat && (
              <button
                type="button"
                onClick={handleSuggest}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                <span>{t("budget.suggested")}</span>
              </button>
            )}
          </div>

          <input type="text" inputMode="decimal" value={limitAmount} onChange={e => setLimitAmount(formatThousandsInput(e.target.value))}
            placeholder="0,00"
            className="w-full h-10 px-3 rounded-[10px] bg-input border border-border text-foreground font-mono-data text-[14px] mb-3 focus:outline-none focus:ring-1 focus:ring-ring" />

          {/* Rollover Dinámico Switch */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40 mb-3">
            <div>
              <span className="text-[13px] font-medium text-foreground block">{t("budget.rolloverTitle")}</span>
              <span className="text-[11px] text-muted-foreground">{t("budget.rolloverDesc")}</span>
            </div>
            <Switch checked={enableRollover} onCheckedChange={setEnableRollover} />
          </div>

          <button onClick={handleAdd} disabled={!selectedCat || !parseThousandsInput(limitAmount)}
            className="w-full h-10 rounded-[10px] bg-primary text-primary-foreground text-[14px] font-medium disabled:opacity-40 active:scale-[0.99] transition-all">
            {t("common.save")}
          </button>
        </motion.div>
      )}

      {/* Summary */}
      {currentBudgets.length > 0 && (
        <div className="mx-4 mb-4 p-4 rounded-[16px] bg-card border border-border/50">
          <div className="flex justify-between text-[13px] mb-2">
            <span className="text-muted-foreground">{t("budget.monthTotal")}</span>
            <span className="text-foreground font-medium">{formatAmount(totalBudgeted)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">{t("budget.monthSpent")}</span>
            <span className={`font-medium ${totalSpent > totalBudgeted ? "text-destructive" : "text-foreground"}`}>
              {formatAmount(totalSpent)}
            </span>
          </div>
        </div>
      )}

      {/* Budget items */}
      <div className="px-4 space-y-3">
        {currentBudgets.length === 0 && !showForm && (
          <p className="text-center text-[13px] text-muted-foreground py-8">{t("budget.noBudgets")}</p>
        )}
        {currentBudgets.map(budget => {
          const cat = categories.find(c => c.id === budget.categoryId);
          if (!cat) return null;
          const spent = getBudgetSpent(budget.categoryId, month, year);

          const { effectiveAmount, rolloverAmount } = calculateEffectiveBudgetAmount(
            budget.amount,
            budget.enableRollover,
            budget.accumulatedRollover || 0
          );

          const metrics = calculateBudgetMetrics(spent, effectiveAmount, effectiveDate);

          let progressColor = "bg-primary";
          if (metrics.status === "danger") progressColor = "bg-destructive";
          else if (metrics.status === "warning") progressColor = "bg-amber-500";

          return (
            <motion.div key={budget.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-[16px] bg-card border border-border/50">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-[10px] ${cat.color} flex items-center justify-center shrink-0 shadow-xs`}>
                    <CategoryIcon name={cat.icon || "circle-dot"} className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[14px] font-semibold text-foreground truncate block leading-snug">{cat.name}</span>
                      {budget.enableRollover && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          Rollover {rolloverAmount > 0 && `(+${formatAmount(rolloverAmount)})`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(budget.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 active:scale-95"
                  title={t("budget.delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative mb-2">
                <Progress value={metrics.percentageSpent} className={`h-2 ${progressColor}`} />
              </div>

              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-muted-foreground">
                  {t("budget.spent")}: {formatAmount(spent)} ({Math.round(metrics.percentageSpent)}%)
                </span>
                <span className={metrics.isOverBudget ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {metrics.isOverBudget
                    ? `${t("budget.over")} ${formatAmount(spent - effectiveAmount)}`
                    : `${t("budget.remaining")}: ${formatAmount(effectiveAmount - spent)}`
                  }
                </span>
              </div>

              {/* Dynamic Burn Rate & Daily Allowance info */}
              {!metrics.isOverBudget && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-secondary/30 px-2.5 py-1.5 rounded-[8px] border border-border/40 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-primary shrink-0" />
                    <span>{t("budget.dailyRemaining")}: <strong className="text-foreground">{formatAmount(metrics.dailyAllowanceRemaining)}</strong></span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{metrics.daysRemaining} {t("budget.daysLeft")}</span>
                </div>
              )}

              {/* Warning badges */}
              {metrics.isPaceWarning && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-[8px]">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("budget.alertPace")}</span>
                </div>
              )}
              {metrics.isOverBudget && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-destructive bg-destructive/10 px-2.5 py-1 rounded-[8px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("budget.alert100")}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Mini budget widget for dashboard
export function BudgetSummaryWidget({
  budgets, categories, getBudgetSpent,
}: {
  budgets: Budget[]; categories: Category[];
  getBudgetSpent: (categoryId: string, month: number, year: number) => number;
}) {
  const { maskAmount } = usePrivacy();
  const { formatAmount: baseFormatAmount, t } = useSettings();
  const formatAmount = (n: number, opts?: any) => maskAmount(baseFormatAmount(n, opts));
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const current = budgets.filter(b => b.month === month && b.year === year);

  if (current.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h2 className="text-[13px] text-muted-foreground font-medium mb-3 font-display">{t("dash.budgetSummary")}</h2>
      <div className="space-y-2">
        {current.slice(0, 3).map(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          if (!cat) return null;
          const spent = getBudgetSpent(b.categoryId, month, year);
          const { effectiveAmount } = calculateEffectiveBudgetAmount(
            b.amount,
            b.enableRollover,
            b.accumulatedRollover || 0
          );
          const metrics = calculateBudgetMetrics(spent, effectiveAmount, now);
          return (
            <div key={b.id} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-[6px] ${cat.color} flex items-center justify-center flex-shrink-0`}>
                <CategoryIcon name={cat.icon || "circle-dot"} className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-[12px] mb-0.5">
                  <span className="text-foreground truncate">{cat.name}</span>
                  <span className="text-muted-foreground">{formatAmount(spent)} / {formatAmount(effectiveAmount)}</span>
                </div>
                <Progress value={metrics.percentageSpent} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
