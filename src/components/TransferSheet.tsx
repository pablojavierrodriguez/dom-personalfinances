import { useState, useMemo } from "react";
import { Account } from "@/lib/types";
import { ArrowDown, ArrowLeftRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings-store";
import { Currency } from "@/lib/settings-types";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { formatThousandsInput, parseThousandsInput } from "@/lib/utils";
import { ResponsiveSheet } from "./ResponsiveSheet";

interface TransferSheetProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  onTransfer: (fromId: string, toId: string, amount: number, targetAmount?: number) => void;
}

export function TransferSheet({ open, onClose, accounts, onTransfer }: TransferSheetProps) {
  const { t } = useSettings();
  const { formatInCurrency, convert } = useCurrencyConversion();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [targetAmountManual, setTargetAmountManual] = useState("");

  const nonCardAccounts = accounts.filter((a) => a.type !== "credit" && !a.archived);
  const fromAccount = nonCardAccounts.find((a) => a.id === fromId);
  const toAccount = nonCardAccounts.find((a) => a.id === toId);

  const fromCurr = (fromAccount?.currency as Currency) || "ARS";
  const toCurr = (toAccount?.currency as Currency) || "ARS";
  const isBiMonetary = Boolean(fromAccount && toAccount && fromCurr !== toCurr);

  const parsedAmount = parseThousandsInput(amount) || 0;

  // Si son de distinta divisa, calcular monto convertido sugerido
  const suggestedTargetAmount = useMemo(() => {
    if (!isBiMonetary || parsedAmount <= 0) return parsedAmount;
    return convert(parsedAmount, fromCurr, toCurr);
  }, [isBiMonetary, parsedAmount, fromCurr, toCurr, convert]);

  const effectiveTargetAmount = targetAmountManual !== "" ? (parseThousandsInput(targetAmountManual) || 0) : suggestedTargetAmount;

  const valid = fromId && toId && fromId !== toId && parsedAmount > 0 && (!isBiMonetary || effectiveTargetAmount > 0);

  const handleSubmit = () => {
    if (!valid) return;
    onTransfer(fromId, toId, parsedAmount, isBiMonetary ? effectiveTargetAmount : undefined);
    toast.success(`${t("transfer.success")} ${formatInCurrency(parsedAmount, fromCurr)}`);
    setFromId("");
    setToId("");
    setAmount("");
    setTargetAmountManual("");
    onClose();
  };

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          {t("transfer.title")}
        </span>
      }
    >
      <div className="px-5 pb-6 space-y-4">
        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("transfer.from")}</label>
          <select
            value={fromId}
            onChange={(e) => {
              setFromId(e.target.value);
              setTargetAmountManual("");
            }}
            className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-[14px] text-foreground border-none outline-none"
          >
            <option value="">{t("transfer.selectAccount")}</option>
            {nonCardAccounts
              .filter((a) => a.id !== toId)
              .map((a) => {
                const cur = (a.currency as Currency) || "ARS";
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} ({cur}) - {formatInCurrency(a.balance, cur)}
                  </option>
                );
              })}
          </select>
        </div>

        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("transfer.to")}</label>
          <select
            value={toId}
            onChange={(e) => {
              setToId(e.target.value);
              setTargetAmountManual("");
            }}
            className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-[14px] text-foreground border-none outline-none"
          >
            <option value="">{t("transfer.selectAccount")}</option>
            {nonCardAccounts
              .filter((a) => a.id !== fromId)
              .map((a) => {
                const cur = (a.currency as Currency) || "ARS";
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} ({cur}) - {formatInCurrency(a.balance, cur)}
                  </option>
                );
              })}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider">
              {t("transfer.amount")} {fromAccount && `(${fromCurr})`}
            </label>
            {fromAccount && (
              <span className="text-[11px] text-muted-foreground">
                Disponible: {formatInCurrency(fromAccount.balance, fromCurr)}
              </span>
            )}
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(formatThousandsInput(e.target.value))}
            placeholder="0,00"
            className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-[14px] text-foreground font-mono-data border-none outline-none"
          />
        </div>

        {/* Soporte Multi-Moneda / Bimonetario */}
        {isBiMonetary && parsedAmount > 0 && (
          <div className="p-3 bg-secondary/50 rounded-xl space-y-2 border border-border/40">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-primary animate-spin-slow" />
                {t("transfer.bimonetaryConversion")} ({fromCurr} → {toCurr})
              </span>
              <span>{t("transfer.implicitRate")}</span>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                {t("transfer.amountToCredit").replace("{account}", toAccount?.name || "").replace("{currency}", toCurr)}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={targetAmountManual !== "" ? targetAmountManual : formatThousandsInput(suggestedTargetAmount)}
                onChange={(e) => setTargetAmountManual(formatThousandsInput(e.target.value))}
                className="w-full bg-background rounded-lg px-3 py-2 text-[13px] text-foreground font-mono-data border border-border outline-none focus:border-primary"
              />
            </div>
          </div>
        )}

        {valid && fromAccount && toAccount && (
          <div className="bg-secondary/50 rounded-xl p-3 text-[12px] text-muted-foreground space-y-1">
            <div>
              {fromAccount.name}: {formatInCurrency(fromAccount.balance, fromCurr)} →{" "}
              {formatInCurrency(fromAccount.balance - parsedAmount, fromCurr)}
            </div>
            <div>
              {toAccount.name}: {formatInCurrency(toAccount.balance, toCurr)} →{" "}
              {formatInCurrency(toAccount.balance + effectiveTargetAmount, toCurr)}
            </div>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!valid}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40 transition-opacity"
        >
          {t("transfer.confirm")}
        </motion.button>
      </div>
    </ResponsiveSheet>
  );
}
