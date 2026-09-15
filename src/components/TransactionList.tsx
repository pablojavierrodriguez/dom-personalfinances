import { Transaction, Account, getStatementPeriod, getPaymentDueDate } from "@/lib/types";
import { useState, useMemo, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo, animate } from "framer-motion";
import { format, isToday, isYesterday, isFuture, differenceInCalendarDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { CategoryIcon } from "./CategoryIcon";
import { Trash2, Pencil, ArrowLeftRight, CreditCard, ChevronDown, DollarSign, Calculator, Clock } from "lucide-react";
import { useSettings, Currency } from "@/lib/settings-store";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { EmptyState } from "./EmptyState";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  title?: string;
  transactions: Transaction[];
  accounts?: Account[];
  onSelect?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  onPayStatement?: (cardId: string, amount: number) => void;
}

const SwipeableTransaction = memo(function SwipeableTransaction({
  tx,
  account,
  currentCurrency,
  convert,
  formatInCurrency,
  onSelect,
  onDelete,
  showAccountChip,
  isHint,
}: {
  tx: Transaction;
  account?: Account;
  currentCurrency: Currency;
  convert: (amount: number, from: Currency, to: Currency) => number;
  formatInCurrency: (amount: number, currency: Currency, opts?: { sign?: string; abs?: boolean }) => string;
  onSelect?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  showAccountChip?: boolean;
  isHint?: boolean;
}) {
  const { maskAmount } = usePrivacy();
  const { t, settings } = useSettings();
  const activeLocale = settings.language === "en" ? enUS : es;
  const [isPendingDelete, setIsPendingDelete] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executedRef = useRef(false);

  useEffect(() => {
    return () => {
      // Cleanup: SOLO cancelar el timer pendiente.
      // NUNCA llamar onDelete aquí: si el componente se desmonta por navegación
      // (cambio de tab, apertura de modal), el timer se cancela de forma segura.
      // El delete real ocurre únicamente desde el timer expirado o el onDismiss del toast.
      // (BUG-A10 fix: el comportamiento anterior borraba transacciones al navegar)
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
    };
  }, []);


  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-120, -60], [1, 0]);
  const editOpacity = useTransform(x, [60, 120], [0, 1]);

  useEffect(() => {
    if (isHint) {
      const controls = animate(x, [0, -28, 0], {
        duration: 0.8,
        ease: "easeInOut",
        delay: 0.15,
      });
      return () => controls.stop();
    }
  }, [isHint, x]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -100 && onDelete) {
      setIsPendingDelete(true);
      executedRef.current = false;
      deleteTimerRef.current = setTimeout(() => {
        if (!executedRef.current) {
          executedRef.current = true;
          onDelete(tx.id);
        }
      }, 4000);

      toast(t("tx.deleted").replace("{desc}", tx.description), {
        action: {
          label: t("common.undo"),
          onClick: () => {
            executedRef.current = true;
            if (deleteTimerRef.current) {
              clearTimeout(deleteTimerRef.current);
              deleteTimerRef.current = null;
            }
            setIsPendingDelete(false);
          },
        },
        duration: 4000,
        onDismiss: () => {
          if (!executedRef.current) {
            executedRef.current = true;
            if (deleteTimerRef.current) {
              clearTimeout(deleteTimerRef.current);
              deleteTimerRef.current = null;
            }
            onDelete(tx.id);
          }
        },
      });
    } else if (info.offset.x > 100 && onSelect) {
      onSelect(tx);
    }
  };

  if (isPendingDelete) {
    return null;
  }

  // Moneda original de la transacción (o de su cuenta si no la tiene)
  const txCurrency: Currency = tx.currency || (account?.currency as Currency) || "ARS";
  const isDifferentCurrency = txCurrency !== currentCurrency;
  // Monto convertido a la divisa activa de la aplicación
  const displayedAmount = convert(tx.amount, txCurrency, currentCurrency);
  const sign = tx.type === "income" ? "+" : "-";

  const formattedDate = isToday(tx.date)
    ? format(tx.date, "h:mm a")
    : isYesterday(tx.date)
    ? `${t("common.yesterday")} ${format(tx.date, "h:mm a")}`
    : format(tx.date, "d MMM", { locale: activeLocale });

  const showCategoryName = tx.category.name.trim().toLowerCase() !== tx.description.trim().toLowerCase();

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <motion.div style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-destructive/10 rounded-r-xl">
        <Trash2 className="w-4 h-4 text-destructive" />
      </motion.div>
      {/* Edit background */}
      <motion.div style={{ opacity: editOpacity }}
        className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-primary/10 rounded-l-xl">
        <Pencil className="w-4 h-4 text-primary" />
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="transaction-row bg-transparent hover:bg-secondary/30 transition-colors relative z-10 cursor-grab active:cursor-grabbing px-2.5 py-2.5"
        onClick={() => onSelect?.(tx)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
          <div className={`w-9 h-9 rounded-xl ${tx.category.color} flex items-center justify-center flex-shrink-0 shadow-xs`}>
            <CategoryIcon name={tx.category.icon || "circle-dot"} className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <span className="text-sm text-foreground font-medium truncate block leading-tight">
              {tx.description}
            </span>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0 mt-0.5 overflow-hidden">
              {showCategoryName && (
                <span className="truncate max-w-[120px] shrink-0 font-medium text-foreground/80">
                  {tx.category.name}
                </span>
              )}
              {showCategoryName && <span className="text-muted-foreground/40 shrink-0">·</span>}
              <span className="text-muted-foreground/70 text-xs shrink-0">
                {formattedDate}
              </span>
              {showAccountChip && account && (
                <span className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md bg-secondary/80 border border-border/40 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${account.color} shrink-0`} />
                  <span className="text-muted-foreground font-medium truncate max-w-[95px]">
                    {account.name}
                  </span>
                </span>
              )}
              {isFuture(tx.date) && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 font-semibold text-xs tracking-tight shrink-0">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  {differenceInCalendarDays(tx.date, new Date()) === 1
                    ? t("common.tomorrow")
                    : differenceInCalendarDays(tx.date, new Date()) > 1
                    ? t("common.inDays").replace("{days}", String(differenceInCalendarDays(tx.date, new Date())))
                    : t("common.scheduled")}
                </span>
              )}
              {tx.installmentInfo && (
                <span className="text-primary font-medium shrink-0 text-xs font-mono-data">
                  ({tx.installmentInfo.current}/{tx.installmentInfo.total})
                </span>
              )}
              {tx.receiptUrl && (
                <span className="text-primary/70 shrink-0 text-xs" title={t("tx.hasReceipt")}>
                  📎
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 justify-center">
          <span className={`font-mono-data text-sm tracking-tight font-semibold tabular-nums ${tx.type === "income" ? "text-primary" : "text-foreground"}`}>
            {maskAmount(formatInCurrency(displayedAmount, currentCurrency, { sign }))}
          </span>
          {isDifferentCurrency && (
            <span className="font-mono-data text-xs text-muted-foreground/80 leading-none mt-0.5 tabular-nums">
              orig. {formatInCurrency(tx.amount, txCurrency)}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
});

// Fila de resumen de tarjeta de crédito que se ve exactamente como cualquier otro gasto
function StatementGroupRow({
  group,
  formatAmount,
  onSelect,
  isExpanded,
  onToggleExpand,
  onPay,
}: {
  group: {
    id: string;
    account: Account;
    periodEnd: Date;
    total: number;
    txs: Transaction[];
  };
  formatAmount: (n: number, opts?: { sign?: string }) => string;
  onSelect?: (tx: Transaction) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPay?: (cardId: string, amount: number) => void;
}) {
  const { t, settings } = useSettings();
  const activeLocale = settings.language === "en" ? enUS : es;
  const { account, periodEnd, total, txs } = group;

  return (
    <div className="mb-0">
      <div
        className="transaction-row bg-transparent hover:bg-secondary/30 transition-colors cursor-pointer active:bg-secondary/40 select-none flex items-center justify-between px-2.5 py-2.5"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
          <div className={`w-9 h-9 rounded-xl ${account.color} flex items-center justify-center flex-shrink-0 text-white shadow-xs`}>
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-foreground font-medium truncate block leading-snug">
                {t("cards.statement")} {account.name}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium shrink-0 font-mono-data">
                {txs.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <span className="truncate">{t("card.closingDayLabel")} {format(periodEnd, "d MMM", { locale: activeLocale })} · {txs.length} {t("cards.charges")}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
            </span>
          </div>
        </div>
        <span className="font-mono-data text-sm tracking-tight text-foreground shrink-0 font-semibold tabular-nums">
          {formatAmount(total, { sign: "-" })}
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-6 pr-2 py-1 bg-secondary/15 border-l-2 border-border/70 my-1 rounded-r-xl divide-y divide-border/20"
          >
            {txs.map(tx => (
              <div
                key={tx.id}
                onClick={() => onSelect?.(tx)}
                className="py-2.5 px-2 flex items-center justify-between cursor-pointer hover:bg-secondary/40 rounded-lg transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <div className={`w-6 h-6 rounded-md ${tx.category.color} flex items-center justify-center text-white flex-shrink-0`}>
                    <CategoryIcon name={tx.category.icon || "circle-dot"} className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-foreground font-medium block truncate">{tx.description}</span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {tx.category.name} · {format(tx.date, "d MMM", { locale: activeLocale })}
                      {tx.installmentInfo && ` (${tx.installmentInfo.current}/${tx.installmentInfo.total})`}
                    </span>
                  </div>
                </div>
                <span className="font-mono-data text-sm text-foreground shrink-0 tabular-nums font-medium">
                  {formatAmount(tx.amount, { sign: "-" })}
                </span>
              </div>
            ))}
            {onPay && total > 0 && (
              <div className="py-2.5 px-2 flex items-center justify-between bg-primary/5 rounded-lg mt-1 gap-2">
                <span className="text-xs text-muted-foreground font-medium truncate">{t("tx.settleStatementPrompt")}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPay(account.id, total);
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium active:scale-95 transition-all shadow-xs shrink-0 font-mono-data"
                  aria-label={`${t("card.pay")} ${formatAmount(total)}`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{t("card.pay")} {formatAmount(total)}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type ListItem =
  | { kind: "transaction"; tx: Transaction }
  | {
      kind: "statement";
      id: string;
      account: Account;
      periodEnd: Date;
      total: number;
      txs: Transaction[];
    };

export function TransactionList({ title, transactions, accounts = [], onSelect, onDelete, onPayStatement }: TransactionListProps) {
  const { formatAmount: baseFormatAmount, t, settings, updateSettings } = useSettings();
  const { convert, formatInCurrency, calculateConsolidatedTransactions } = useCurrencyConversion();
  const { maskAmount } = usePrivacy();
  const formatAmount = (n: number, opts?: { sign?: string }) => maskAmount(baseFormatAmount(n, opts));
  const [viewMode, setViewMode] = useState<"detailed" | "grouped">("detailed");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const currentCurrency = settings.currency || "ARS";
  const activeLocale = settings.language === "en" ? enUS : es;
  const accountsMap = useMemo(() => new Map<string, Account>(accounts.map(a => [a.id, a])), [accounts]);
  const showAccountChip = useMemo(() => accounts.filter(a => !a.archived).length > 1, [accounts]);

  const [hintTxId, setHintTxId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const shown = localStorage.getItem("swipe-hint-shown");
      if (!shown && transactions.length > 0) {
        const timer = setTimeout(() => {
          setHintTxId(transactions[0].id);
          localStorage.setItem("swipe-hint-shown", "1");
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage availability issues
    }
  }, [transactions.length]);

  const showSubtotals = settings.showDailySubtotals ?? false;

  const toggleSubtotals = () => {
    updateSettings({ showDailySubtotals: !showSubtotals });
  };

  const creditCardAccountIds = new Set(
    accounts.filter(a => a.type === "credit").map(a => a.id)
  );

  const hasCreditCards = accounts.some(a => a.type === "credit");
  const hasCreditTransactions = transactions.some(
    tx => creditCardAccountIds.has(tx.accountId)
  );
  const showGroupingToggle = hasCreditCards || hasCreditTransactions;

  const toggleCardExpand = (groupId: string) => {
    setExpandedCards(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // 1. Modo desglosado estándar (por fecha ordenada)
  const detailedGroups = useMemo(() => {
    const map = new Map<string, { date: Date; label: string; txs: Transaction[] }>();
    for (const tx of transactions) {
      const key = format(tx.date, "yyyy-MM-dd");
      let entry = map.get(key);
      if (!entry) {
        const label = isToday(tx.date)
          ? t("common.today") || "Hoy"
          : isYesterday(tx.date)
          ? t("common.yesterday") || "Ayer"
          : format(tx.date, "d 'de' MMMM, yyyy", { locale: activeLocale });
        entry = { date: tx.date, label, txs: [] };
        map.set(key, entry);
      }
      entry.txs.push(tx);
    }
    return Array.from(map.entries())
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
      .map(([key, value]) => ({ key, ...value }));
  }, [transactions, activeLocale, t]);

  // 2. Modo agrupado por resumen de tarjeta de crédito
  const timelineGroups = useMemo(() => {
    const statementGroupsMap = new Map<string, {
      id: string;
      account: Account;
      periodEnd: Date;
      total: number;
      txs: Transaction[];
    }>();

    const nonCardTransactions: Transaction[] = [];

    for (const tx of transactions) {
      const isCreditExpense = creditCardAccountIds.has(tx.accountId) && tx.type === "expense" && !tx.isCardPayment;
      if (isCreditExpense) {
        const account = accounts.find(a => a.id === tx.accountId) || {
          id: tx.accountId,
          name: "Credit Card",
          balance: 0,
          type: "credit" as const,
          color: "bg-red-400",
        };

        const closingDay = account.closingDay || 15;
        const { periodEnd } = getStatementPeriod(closingDay, tx.date);
        const statementKey = `${account.id}-${periodEnd.getFullYear()}-${periodEnd.getMonth()}-${periodEnd.getDate()}`;

        let group = statementGroupsMap.get(statementKey);
        if (!group) {
          group = {
            id: statementKey,
            account,
            periodEnd,
            total: 0,
            txs: [],
          };
          statementGroupsMap.set(statementKey, group);
        }
        group.txs.push(tx);
        const txCurr: Currency = tx.currency || (account.currency as Currency) || "ARS";
        const accCurr: Currency = (account.currency as Currency) || "ARS";
        group.total += convert(tx.amount, txCurr, accCurr);
      } else {
        nonCardTransactions.push(tx);
      }
    }

    const map = new Map<string, { date: Date; label: string; items: ListItem[] }>();

    for (const group of statementGroupsMap.values()) {
      const key = format(group.periodEnd, "yyyy-MM-dd");
      let entry = map.get(key);
      if (!entry) {
        const label = isToday(group.periodEnd)
          ? t("common.today") || "Hoy"
          : isYesterday(group.periodEnd)
          ? t("common.yesterday") || "Ayer"
          : format(group.periodEnd, "d 'de' MMMM, yyyy", { locale: activeLocale });
        entry = { date: group.periodEnd, label, items: [] };
        map.set(key, entry);
      }
      entry.items.push({ kind: "statement", ...group });
    }

    for (const tx of nonCardTransactions) {
      const key = format(tx.date, "yyyy-MM-dd");
      let entry = map.get(key);
      if (!entry) {
        const label = isToday(tx.date)
          ? t("common.today") || "Hoy"
          : isYesterday(tx.date)
          ? t("common.yesterday") || "Ayer"
          : format(tx.date, "d 'de' MMMM, yyyy", { locale: activeLocale });
        entry = { date: tx.date, label, items: [] };
        map.set(key, entry);
      }
      entry.items.push({ kind: "transaction", tx });
    }

    return Array.from(map.entries())
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
      .map(([key, value]) => ({ key, ...value }));
  }, [transactions, creditCardAccountIds, accounts, convert, activeLocale, t]);

  if (transactions.length === 0) {
    return (
      <div className="px-4 pb-4">
        <EmptyState
          icon={ArrowLeftRight}
          title={t("common.noData")}
          description={t("tx.title")}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 w-full max-w-full">
      <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
        <h2 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider font-display shrink-0">{title || t("tx.title")}</h2>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Botón integrado de subtotales diarios con label y ergonomía táctil */}
          <button
            onClick={toggleSubtotals}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-medium transition-all active:scale-95 min-h-[36px]",
              showSubtotals
                ? "bg-primary/15 text-primary border-primary/40 shadow-xs"
                : "bg-secondary/60 text-muted-foreground border-border/50 hover:text-foreground hover:bg-secondary"
            )}
            title={showSubtotals ? t("tx.hideSubtotals") || "Ocultar subtotales" : t("tx.showSubtotals") || "Ver subtotales"}
            aria-label={showSubtotals ? t("tx.hideSubtotals") || "Ocultar subtotales" : t("tx.showSubtotals") || "Ver subtotales"}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline text-xs">{t("tx.subtotals") || "Subtotales"}</span>
          </button>

          {showGroupingToggle && (
            <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border/50 text-xs h-8">
              <button
                onClick={() => setViewMode("detailed")}
                className={cn(
                  "h-7 px-2.5 rounded-md font-medium transition-colors flex items-center justify-center text-xs active:scale-95",
                  viewMode === "detailed"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("tx.viewDetailed")}
              </button>
              <button
                onClick={() => setViewMode("grouped")}
                className={cn(
                  "h-7 px-2.5 rounded-md font-medium transition-colors flex items-center justify-center text-xs active:scale-95",
                  viewMode === "grouped"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("tx.viewGrouped")}
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "detailed" ? (
        // Modo desglosado estándar
        detailedGroups.map((group) => {
          const dayExpensesTxs = group.txs.filter(t => t.type === "expense");
          const dayIncomeTxs = group.txs.filter(t => t.type === "income");
          const dayExpenses = calculateConsolidatedTransactions(dayExpensesTxs, currentCurrency, accountsMap);
          const dayIncome = calculateConsolidatedTransactions(dayIncomeTxs, currentCurrency, accountsMap);

          return (
            <div key={group.key} className="mb-4">
              <div className="flex items-center justify-between py-1 px-1 mb-1.5 min-h-[26px] min-w-0">
                <span className="text-xs text-muted-foreground/80 font-semibold uppercase tracking-wider font-display truncate">
                  {group.label}
                </span>
                {showSubtotals && (
                  <div className="flex items-center gap-2 text-xs font-mono-data font-semibold shrink-0 tabular-nums">
                    {dayIncome > 0 && (
                      <span className="text-primary">+{maskAmount(formatInCurrency(dayIncome, currentCurrency))}</span>
                    )}
                    {dayExpenses > 0 && (
                      <span className="text-muted-foreground">-{maskAmount(formatInCurrency(dayExpenses, currentCurrency))}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="card-surface p-1.5 divide-y divide-border/40">
                {group.txs.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 6) * 0.015, duration: 0.15 }}
                  >
                    <SwipeableTransaction
                      tx={tx}
                      account={accountsMap.get(tx.accountId)}
                      currentCurrency={currentCurrency}
                      convert={convert}
                      formatInCurrency={formatInCurrency}
                      onSelect={onSelect}
                      onDelete={onDelete}
                      showAccountChip={showAccountChip}
                      isHint={hintTxId === tx.id}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        // Modo agrupado por resumen con idénticos contenedores, márgenes y alturas
        timelineGroups.map((group) => (
          <div key={group.key} className="mb-4">
            <div className="flex items-center justify-between py-1 px-1 mb-1.5 min-h-[26px] min-w-0">
              <span className="text-xs text-muted-foreground/80 font-semibold uppercase tracking-wider font-display truncate">
                {group.label}
              </span>
            </div>
            <div className="card-surface p-1.5 divide-y divide-border/40">
              {group.items.map((item, i) => (
                <motion.div
                  key={item.kind === "statement" ? item.id : item.tx.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.015, duration: 0.15 }}
                >
                  {item.kind === "statement" ? (
                    <StatementGroupRow
                      group={item}
                      formatAmount={formatAmount}
                      onSelect={onSelect}
                      isExpanded={!!expandedCards[item.id]}
                      onToggleExpand={() => toggleCardExpand(item.id)}
                      onPay={onPayStatement}
                    />
                  ) : (
                    <SwipeableTransaction
                      tx={item.tx}
                      account={accountsMap.get(item.tx.accountId)}
                      currentCurrency={currentCurrency}
                      convert={convert}
                      formatInCurrency={formatInCurrency}
                      onSelect={onSelect}
                      onDelete={onDelete}
                      showAccountChip={showAccountChip}
                      isHint={hintTxId === item.tx.id}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
