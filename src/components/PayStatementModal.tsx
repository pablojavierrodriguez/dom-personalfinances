import { useState } from "react";
import { Account } from "@/lib/types";
import { ResponsiveSheet } from "./ResponsiveSheet";
import { DollarSign, CreditCard } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { MoneyInput } from "./ui/MoneyInput";
import { formatThousandsInput, parseThousandsInput } from "@/lib/utils";

interface PayStatementModalProps {
  open: boolean;
  onClose: () => void;
  card: Account | null;
  suggestedAmount: number;
  sourceAccounts: Account[];
  onConfirmPay: (cardId: string, fromAccountId: string, amount: number) => void;
}

export function PayStatementModal({
  open,
  onClose,
  card,
  suggestedAmount,
  sourceAccounts,
  onConfirmPay,
}: PayStatementModalProps) {
  const { formatAmount, t } = useSettings();
  const [payMode, setPayMode] = useState<"total" | "minimum" | "custom">("total");
  const [amount, setAmount] = useState(suggestedAmount > 0 ? formatThousandsInput(suggestedAmount) : "");
  const [fromAccountId, setFromAccountId] = useState(sourceAccounts[0]?.id || "");

  // Calcular pago mínimo de referencia (típico 10% del total o $1.000 como estándar de la industria)
  const minimumAmount = suggestedAmount > 0 ? Math.max(Math.round(suggestedAmount * 0.1), Math.min(1000, suggestedAmount)) : 0;

  if (!card) return null;

  const currentAmountNum = parseThousandsInput(amount);
  const remainingDebt = Math.max(0, suggestedAmount - currentAmountNum);

  const handleSelectMode = (mode: "total" | "minimum" | "custom") => {
    setPayMode(mode);
    if (mode === "total") {
      setAmount(suggestedAmount > 0 ? formatThousandsInput(suggestedAmount) : "");
    } else if (mode === "minimum") {
      setAmount(formatThousandsInput(minimumAmount));
    }
  };

  const handlePay = () => {
    const parsed = parseThousandsInput(amount);
    if (isNaN(parsed) || parsed <= 0 || !fromAccountId) return;
    onConfirmPay(card.id, fromAccountId, parsed);
    onClose();
  };

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={t("card.payStatementModalTitle").replace("{name}", card.name)}>
      <div className="p-4 space-y-4">
        {/* Resumen Card Header */}
        <div className="card-surface">
          <div className="card-inner flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-[12px] ${card.color} flex items-center justify-center text-white`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block">{card.name}</span>
                <span className="text-xs text-muted-foreground">{t("card.payStatementTotalLiquidated")}</span>
              </div>
            </div>
            <span className="font-mono-data text-lg font-semibold text-destructive">
              {formatAmount(suggestedAmount)}
            </span>
          </div>
        </div>

        {/* Modalidades de pago estilo Mobills (Total / Mínimo / Otro) */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {t("card.payStatementMode")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectMode("total")}
              className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                payMode === "total"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary/70"
              }`}
            >
              {t("card.payStatementTotal")}
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode("minimum")}
              className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                payMode === "minimum"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary/70"
              }`}
            >
              {t("card.payStatementMinimum")}
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode("custom")}
              className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                payMode === "custom"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-secondary/40 text-foreground border-border/60 hover:bg-secondary/70"
              }`}
            >
              {t("card.payStatementCustom")}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {t("card.payStatementAmount")}
          </label>
          <MoneyInput
            value={amount}
            onChange={(val) => {
              setAmount(val);
              setPayMode("custom");
            }}
            className="w-full h-11 px-3 rounded-xl bg-input border border-border text-foreground font-mono-data text-base focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Feedback de arrastre de deuda (Si es pago parcial) */}
        {remainingDebt > 0 && currentAmountNum > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
            <div className="flex items-center justify-between font-medium text-amber-500">
              <span>{t("card.payStatementCarryOver")}</span>
              <span className="font-mono-data">{formatAmount(remainingDebt)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("card.payStatementCarryOverDesc")}
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {t("card.payStatementDebitFrom")}
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {sourceAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setFromAccountId(acc.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                  fromAccountId === acc.id
                    ? "bg-secondary border-primary ring-1 ring-primary"
                    : "bg-secondary/40 border-border/60 hover:bg-secondary/70"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${acc.color}`} />
                  <span className="text-xs font-medium text-foreground">{acc.name}</span>
                </div>
                <span className="font-mono-data text-xs text-muted-foreground">
                  {formatAmount(acc.balance)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={!fromAccountId || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-all shadow-sm"
          >
            <DollarSign className="w-4 h-4" />
            {t("card.payStatementConfirm")}
          </button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
