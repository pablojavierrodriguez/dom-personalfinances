import { useState, useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { Account, Transaction, RecurringTransaction, BillReminder } from "@/lib/types";
import { calculateCashFlowForecast } from "@/lib/cashflow-forecast";
import { parseThousandsInput } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { createTranslator } from "@/lib/i18n";

interface CashFlowForecastProps {
  accounts: Account[];
  transactions: Transaction[];
  recurringTxs: RecurringTransaction[];
  bills: BillReminder[];
}

export function CashFlowForecast({ accounts, transactions, recurringTxs, bills }: CashFlowForecastProps) {
  const { maskAmount } = usePrivacy();
  const { formatAmount: baseFormatAmount, t, settings, exchangeRates } = useSettings();
  const formatAmount = (n: number, opts?: any) => maskAmount(baseFormatAmount(n, opts));
  const [daysAhead, setDaysAhead] = useState<30 | 60 | 90>(30);
  const [simulatedAmount, setSimulatedAmount] = useState("");
  const [showSim, setShowSim] = useState(false);

  const forecast = useMemo(() => {
    const simAmount = parseThousandsInput(simulatedAmount) || 0;
    const simDate = new Date();
    simDate.setDate(simDate.getDate() + 15);

    const rates = {
      ...exchangeRates,
      ...(settings.customExchangeRates || {}),
    };

    return calculateCashFlowForecast(accounts, transactions, recurringTxs, bills, {
      daysAhead,
      targetCurrency: settings.currency,
      exchangeRates: rates,
      simulatedExpense: simAmount > 0 ? { amount: simAmount, date: simDate, name: t("cashflow.simulatedExpense") } : undefined,
    });
  }, [accounts, transactions, recurringTxs, bills, daysAhead, simulatedAmount, settings.currency, settings.customExchangeRates, exchangeRates, t]);

  const minBalance = forecast.lowestBalance;
  const isCritical = forecast.hasDeficitRisk;

  return (
    <div className="card-surface p-4 rounded-2xl mb-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-display font-semibold text-foreground">
              {t("cashflow.title")}
            </h3>
            {isCritical ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[11px] font-semibold">
                <AlertTriangle className="w-3 h-3" /> {t("cashflow.deficitRisk")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3" /> {t("cashflow.healthyLiquidity")}
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("cashflow.subtitle")}
          </p>
        </div>

        {/* Days Filter */}
        <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl self-start sm:self-auto">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDaysAhead(d)}
              className={`px-2.5 py-1 text-[12px] font-mono-data rounded-lg transition-colors ${
                daysAhead === d
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-2.5 bg-secondary/40 rounded-xl">
          <span className="text-[11px] text-muted-foreground block">{t("cashflow.startingBalance")}</span>
          <span className="font-mono-data text-[15px] font-semibold text-foreground">
            {formatAmount(forecast.startingBalance)}
          </span>
        </div>

        <div className="p-2.5 bg-secondary/40 rounded-xl">
          <span className="text-[11px] text-muted-foreground block">{t("cashflow.minProjected")}</span>
          <span
            className={`font-mono-data text-[15px] font-semibold ${
              minBalance < 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            {formatAmount(minBalance)}
          </span>
        </div>

        <div className="p-2.5 bg-secondary/40 rounded-xl">
          <span className="text-[11px] text-muted-foreground block">{t("cashflow.expectedIncome")}</span>
          <span className="font-mono-data text-[15px] font-semibold text-emerald-400">
            +{formatAmount(forecast.totalIncomeExpected)}
          </span>
        </div>

        <div className="p-2.5 bg-secondary/40 rounded-xl">
          <span className="text-[11px] text-muted-foreground block">{t("cashflow.committedExpenses")}</span>
          <span className="font-mono-data text-[15px] font-semibold text-foreground">
            -{formatAmount(forecast.totalExpensesExpected)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecast.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastColorSafe" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="forecastColorDanger" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="dayLabel"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(forecast.points.length / 6)}
            />
            <YAxis
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={46}
              tickCount={4}
              tickFormatter={(v) => {
                if (v === 0) return "$0";
                const abs = Math.abs(v);
                if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                if (abs >= 10_000) return `$${(v / 1_000).toFixed(0)}k`;
                if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
                return `$${Math.round(v)}`;
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload;
                return (
                  <div className="bg-popover/95 border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
                    <span className="font-semibold text-foreground block">{pt.date}</span>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{t("cashflow.estimatedBalance")}</span>
                      <span
                        className={`font-mono-data font-bold ${
                          pt.balance < 0 ? "text-destructive" : "text-emerald-400"
                        }`}
                      >
                        {formatAmount(pt.balance)}
                      </span>
                    </div>
                    {pt.events.length > 0 && (
                      <div className="pt-1 border-t border-border/50 text-[11px] space-y-0.5">
                        {pt.events.map((ev: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-muted-foreground">
                            <span className="truncate max-w-[130px]">{ev.name}</span>
                            <span
                              className={`font-mono-data ${
                                ev.type === "in" ? "text-emerald-400" : "text-destructive"
                              }`}
                            >
                              {ev.type === "in" ? "+" : "-"}
                              {formatAmount(ev.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.6} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isCritical ? "#ef4444" : "#10b981"}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={isCritical ? "url(#forecastColorDanger)" : "url(#forecastColorSafe)"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Simulator Toggle */}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
        <button
          onClick={() => setShowSim((prev) => !prev)}
          className="text-[12px] text-primary hover:underline font-medium flex items-center gap-1"
        >
          {showSim ? t("cashflow.hideSimulator") : t("cashflow.showSimulator")}
        </button>

        {showSim && (
          <div className="flex items-center gap-2">
            <div className="w-32">
              <MoneyInput
                placeholder={t("cashflow.amountPlaceholder")}
                value={simulatedAmount}
                onChange={(val) => setSimulatedAmount(val)}
                className="h-8 text-[12px]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
