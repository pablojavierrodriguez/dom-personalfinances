import { useState, useMemo } from "react";
import { useSettings } from "@/lib/settings-store";
import { Transaction, Account, Category } from "@/lib/types";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Download, PiggyBank, Calendar, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { generateTransactionsCsv, downloadCsvFile, generateTransactionsExcel, downloadExcelFile } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CashFlowForecast } from "./CashFlowForecast";
import { RecurringTransaction, BillReminder } from "@/lib/types";
import { CategoryExpensePieCard } from "./CategoryExpensePieCard";

type DateRangePreset = "this_month" | "last_month" | "last_3_months" | "this_year" | "all";

interface ReportsPageProps {
  transactions: Transaction[];
  categories?: Category[];
  accounts?: Account[];
  monthlyExpenses: number;
  monthlyIncome: number;
  recurringTxs?: RecurringTransaction[];
  bills?: BillReminder[];
  getMonthlyTrend: () => { month: string; income: number; expenses: number }[];
  getLastMonthExpenses: () => number;
}

export function ReportsPage({
  transactions,
  categories = [],
  accounts = [],
  monthlyExpenses,
  monthlyIncome,
  recurringTxs = [],
  bills = [],
  getMonthlyTrend,
  getLastMonthExpenses,
}: ReportsPageProps) {
  const { formatAmount, t } = useSettings();
  const [dateRange, setDateRange] = useState<DateRangePreset>("this_month");

  const trend = getMonthlyTrend();
  const lastMonthExp = getLastMonthExpenses();
  const delta = lastMonthExp > 0 ? ((monthlyExpenses - lastMonthExp) / lastMonthExp) * 100 : 0;

  // Filtrado de transacciones según el rango seleccionado
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
      if (dateRange === "this_month") {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
      if (dateRange === "last_month") {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return txDate.getMonth() === lastMonthDate.getMonth() && txDate.getFullYear() === lastMonthDate.getFullYear();
      }
      if (dateRange === "last_3_months") {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return txDate >= threeMonthsAgo && txDate <= now;
      }
      if (dateRange === "this_year") {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }, [transactions, dateRange]);

  // Cálculos dinámicos para el rango seleccionado
  const rangeIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "income" && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const rangeExpenses = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "expense" && !t.isCardPayment && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const rangeBalance = rangeIncome - rangeExpenses;

  // Tasa de ahorro: ((Ingresos - Gastos) / Ingresos) * 100 (solo si ingresos > 0)
  const savingsRate = rangeIncome > 0 ? Math.max(-100, Math.min(100, ((rangeIncome - rangeExpenses) / rangeIncome) * 100)) : 0;

  const chartData = trend.map((m) => ({
    ...m,
    balance: m.income - m.expenses,
  }));

  const getAccountsMap = () => {
    return accounts.reduce<Record<string, string>>((acc, a) => {
      acc[a.id] = a.name;
      return acc;
    }, {});
  };

  // Exportar a Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const accountsMap = getAccountsMap();
      const excelBuffer = generateTransactionsExcel(filteredTransactions, accountsMap);
      const filename = `dom_transacciones_${dateRange}_${new Date().toISOString().split("T")[0]}.xlsx`;
      downloadExcelFile(excelBuffer, filename);
      toast.success(t("report.exportSuccessExcel"));
    } catch {
      toast.error(t("report.exportErrorExcel"));
    }
  };

  // Exportar a CSV (.csv)
  const handleExportCsv = () => {
    try {
      const accountsMap = getAccountsMap();
      const csvContent = generateTransactionsCsv(filteredTransactions, accountsMap);
      const filename = `dom_transacciones_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`;
      downloadCsvFile(csvContent, filename);
      toast.success(t("report.exportSuccessCsv"));
    } catch {
      toast.error(t("report.exportErrorCsv"));
    }
  };

  return (
    <div className="pt-4 pb-28 md:pb-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-display font-semibold text-foreground">{t("report.title")}</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t("report.subtitle")}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 self-start sm:self-auto border-border text-foreground hover:bg-secondary active:scale-95 transition-all text-[12px] font-medium"
              aria-label={t("report.exportCsv")}
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>{t("report.export") || "Exportar"}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={handleExportExcel}
              className="gap-2.5 cursor-pointer text-xs py-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Excel (.xlsx)</span>
                <span className="text-[10px] text-muted-foreground">{t("reports.exportXlsxDesc")}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportCsv}
              className="gap-2.5 cursor-pointer text-xs py-2"
            >
              <FileText className="w-4 h-4 text-sky-500" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">CSV (.csv)</span>
                <span className="text-[10px] text-muted-foreground">{t("reports.exportCsvDesc")}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Date Range Selector */}
      <div className="px-4 mb-4 flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
          <Calendar className="w-3 h-3" />
          {t("report.filterRange")}:
        </span>
        {[
          { key: "this_month", label: t("report.rangeThisMonth") },
          { key: "last_month", label: t("report.rangeLastMonth") },
          { key: "last_3_months", label: t("report.rangeLast3Months") },
          { key: "this_year", label: t("report.rangeThisYear") },
          { key: "all", label: t("report.rangeAll") },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setDateRange(item.key as DateRangePreset)}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all whitespace-nowrap border shrink-0 ${
              dateRange === item.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border/60 hover:bg-secondary"
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="w-6 shrink-0" aria-hidden="true" />
      </div>

      {/* Executive Summary Card */}
      <div className="mx-4 mb-4 p-4 rounded-[16px] bg-card border border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium text-foreground">
            {dateRange === "this_month" ? t("report.monthSummary") : "Resumen del período"}
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono-data">
            {filteredTransactions.length} tx
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <span className="text-[11px] text-muted-foreground">{t("report.income")}</span>
            <p className="font-mono-data text-[15px] font-semibold text-primary">{formatAmount(rangeIncome)}</p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">{t("report.expenses")}</span>
            <p className="font-mono-data text-[15px] font-semibold text-foreground">{formatAmount(rangeExpenses)}</p>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground">{t("report.balance")}</span>
            <p
              className={`font-mono-data text-[15px] font-semibold ${
                rangeBalance >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {formatAmount(rangeBalance, { sign: rangeBalance >= 0 ? "+" : "-" })}
            </p>
          </div>
        </div>

        {/* Savings rate meter */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-emerald-500" />
            <span className="text-[12px] font-medium text-foreground">{t("report.savingsRate")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  savingsRate >= 20 ? "bg-emerald-500" : savingsRate > 0 ? "bg-amber-500" : "bg-destructive"
                }`}
                style={{ width: `${Math.max(0, savingsRate)}%` }}
              />
            </div>
            <span
              className={`font-mono-data text-[13px] font-semibold ${
                savingsRate >= 20 ? "text-emerald-500" : savingsRate > 0 ? "text-amber-500" : "text-destructive"
              }`}
            >
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {dateRange === "this_month" && lastMonthExp > 0 && (
          <div className="mt-3 flex items-center gap-1 text-[12px] pt-1">
            {delta > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-destructive" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-primary" />
            )}
            <span className={delta > 0 ? "text-destructive" : "text-primary"}>
              {Math.abs(delta).toFixed(1)}% {delta > 0 ? t("report.moreSpent") : t("report.lessSpent")}
            </span>
          </div>
        )}
      </div>

      {/* Proyección de Flujo de Caja (P9 Cash Flow Forecast) */}
      <div className="mx-4">
        <CashFlowForecast
          accounts={accounts}
          transactions={transactions}
          recurringTxs={recurringTxs}
          bills={bills}
        />
      </div>

      {/* Trend chart */}
      <div className="mx-4 mb-4 p-4 rounded-[16px] bg-card border border-border/50 shadow-sm">
        <h3 className="text-[13px] font-medium text-foreground mb-3">
          {t("report.trend")} · {t("report.months6")}
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [formatAmount(value), ""]}
            />
            <Bar dataKey="income" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(0 84% 60%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cash flow */}
      <div className="mx-4 mb-4 p-4 rounded-[16px] bg-card border border-border/50 shadow-sm">
        <h3 className="text-[13px] font-medium text-foreground mb-3">{t("report.cashFlow")}</h3>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [formatAmount(value), ""]}
            />
            <Line type="monotone" dataKey="balance" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Gastos por Categoría y Subcategoría (Estilo Mobills / Wallet) */}
      <CategoryExpensePieCard
        transactions={filteredTransactions}
        categories={categories}
      />
    </div>
  );
}
