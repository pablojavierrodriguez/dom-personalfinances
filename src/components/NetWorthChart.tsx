import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Account, Transaction } from "@/lib/types";
import { useSettings } from "@/lib/settings-store";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { TrendingUp, TrendingDown } from "lucide-react";

interface NetWorthChartProps {
  accounts: Account[];
  transactions: Transaction[];
}

export function NetWorthChart({ accounts, transactions }: NetWorthChartProps) {
  const { formatAmount, t, settings } = useSettings();
  const { calculateConsolidatedBalance } = useCurrencyConversion();
  const { maskAmount } = usePrivacy();
  const [range, setRange] = useState<"30D" | "90D">("30D");

  const currentNetWorth = useMemo(() => {
    return calculateConsolidatedBalance(accounts, settings.currency);
  }, [accounts, calculateConsolidatedBalance, settings.currency]);

  const data = useMemo(() => {
    const days = range === "30D" ? 30 : 90;
    const points: { date: string; label: string; netWorth: number }[] = [];
    const now = new Date();

    let runningBalance = currentNetWorth;
    const dailyDeltaMap = new Map<string, number>();

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const delta = tx.type === "income" ? tx.amount : -tx.amount;
      dailyDeltaMap.set(key, (dailyDeltaMap.get(key) || 0) + delta);
    }

    for (let i = 0; i <= days; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

      points.unshift({
        date: key,
        label,
        netWorth: Math.round(runningBalance),
      });

      const deltaToday = dailyDeltaMap.get(key) || 0;
      runningBalance -= deltaToday;
    }

    return points;
  }, [currentNetWorth, transactions, range]);

  const startVal = data.length > 0 ? data[0].netWorth : 0;
  const endVal = data.length > 0 ? data[data.length - 1].netWorth : 0;
  const diff = endVal - startVal;
  const isPositive = diff >= 0;

  return (
    <div className="px-4 w-full mb-4">
      <div className="card-surface">
        <div className="card-inner">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-[13px] text-muted-foreground font-medium font-display">
              {t("settings.sectionNetWorth") || "Evolución patrimonial"}
            </h2>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono-data text-[22px] font-semibold text-foreground">
                {maskAmount(formatAmount(currentNetWorth))}
              </span>
              <span className={`text-[12px] font-medium flex items-center gap-0.5 ${isPositive ? "text-primary" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPositive ? "+" : ""}{maskAmount(formatAmount(diff))}
              </span>
            </div>
          </div>
          <div className="flex bg-secondary/80 p-0.5 rounded-lg border border-border/40 text-[10px] font-medium">
            <button
              onClick={() => setRange("30D")}
              className={`px-2 py-1 rounded-md transition-colors ${range === "30D" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              30D
            </button>
            <button
              onClick={() => setRange("90D")}
              className={`px-2 py-1 rounded-md transition-colors ${range === "90D" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
            >
              90D
            </button>
          </div>
        </div>

        <div className="h-40 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const val = payload[0].value as number;
                    return (
                      <div className="rounded-lg bg-popover/95 backdrop-blur-md px-2.5 py-1.5 border border-border shadow-md">
                        <span className="text-[10px] text-muted-foreground block">{payload[0].payload.date}</span>
                        <span className="font-mono-data text-xs font-semibold text-foreground">
                          {maskAmount(formatAmount(val))}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#netWorthGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>
);
}
