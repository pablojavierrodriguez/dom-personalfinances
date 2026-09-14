import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Pencil, Archive, ArchiveRestore, CreditCard, ArrowUpDown, DollarSign, CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Account, CATEGORY_COLORS, ACCOUNT_ICONS, CreditCardBrand, CARD_BRANDS, Transaction, getStatementPeriod, getPreviousStatementPeriod, getOffsetStatementPeriod, getPaymentDueDate } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { format } from "date-fns";
import { useSettings } from "@/lib/settings-store";
import { Currency, CURRENCIES } from "@/lib/settings-types";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { formatThousandsInput, parseThousandsInput } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { usePrivacy } from "@/contexts/PrivacyContext";

interface CreditCardManagerProps {
  accounts: Account[];
  getCreditCards: () => Account[];
  getArchivedAccounts: () => Account[];
  getTransactionsByAccount: (accountId: string) => Transaction[];
  getStatementTransactions: (cardId: string, period: "current" | "previous" | number) => Transaction[];
  getNonCardAccounts: () => Account[];
  onAdd: (account: Account) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onPayCard: (cardId: string, fromAccountId: string, amount: number) => void;
  onSelectTransaction?: (tx: Transaction) => void;
  initialSelectedCardId?: string | null;
  onClearInitialCard?: () => void;
}

type ViewMode = "list" | "create" | "edit" | "detail" | "pay" | "archived";

export function CreditCardManager({
  accounts, getCreditCards, getArchivedAccounts, getTransactionsByAccount,
  getStatementTransactions, getNonCardAccounts,
  onAdd, onUpdate, onArchive, onUnarchive, onPayCard, onSelectTransaction,
  initialSelectedCardId, onClearInitialCard,
}: CreditCardManagerProps) {
  const initialCard = initialSelectedCardId ? accounts.find(a => a.id === initialSelectedCardId) : null;
  const [view, setView] = useState<ViewMode>(initialCard ? "detail" : "list");
  const [editingCard, setEditingCard] = useState<Account | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(initialCard ? initialCard.id : null);
  const detailCard = selectedCardId ? accounts.find(a => a.id === selectedCardId) || null : null;
  const [cycleOffset, setCycleOffset] = useState<number>(0);
  const [detailTab, setDetailTab] = useState<"statement" | "plans">("statement");

  // Form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("bg-red-400");
  const [formIcon, setFormIcon] = useState("credit-card");
  const [formBrand, setFormBrand] = useState<CreditCardBrand>("visa");
  const [formCustomBrand, setFormCustomBrand] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formClosingDay, setFormClosingDay] = useState("15");
  const [formPaymentDay, setFormPaymentDay] = useState("5");
  const [formBalance, setFormBalance] = useState("0");
  const [formCurrency, setFormCurrency] = useState<Currency>("ARS");
  const [formViewMode, setFormViewMode] = useState<"statement_cycles" | "negative_balance">("statement_cycles");

  // Pay state
  const [payAmount, setPayAmount] = useState("");
  const [payFromAccount, setPayFromAccount] = useState("");
  const [payMode, setPayMode] = useState<"total" | "minimum" | "custom">("total");

  const cards = getCreditCards();
  const archivedCards = getArchivedAccounts().filter(a => a.type === "credit");
  const sourceAccounts = getNonCardAccounts();

  const { maskAmount } = usePrivacy();
  const { formatAmount: baseFormatCurrency, t } = useSettings();
  const formatCurrency = (n: number | null | undefined, opts?: any) => maskAmount(baseFormatCurrency(n ?? 0, opts));
  const { convert, formatInCurrency: baseFormatInCurrency } = useCurrencyConversion();
  const formatInCurrency = (amount: number, curr: Currency = "ARS", opts?: { sign?: string; abs?: boolean }) => maskAmount(baseFormatInCurrency(amount, curr, opts));
  const activeCurrencySymbol = CURRENCIES.find(c => c.value === formCurrency)?.symbol || "$";

  const openCreate = () => {
    setFormName("");
    setFormColor("bg-red-400");
    setFormIcon("credit-card");
    setFormBrand("visa");
    setFormCustomBrand("");
    setFormLimit("");
    setFormClosingDay("15");
    setFormPaymentDay("5");
    setFormBalance("0");
    setFormCurrency("ARS");
    setFormViewMode("statement_cycles");
    setEditingCard(null);
    setView("create");
  };

  const openEdit = (card: Account) => {
    setFormName(card.name);
    setFormColor(card.color);
    setFormIcon(card.icon || "credit-card");
    setFormBrand(card.brand || "visa");
    setFormCustomBrand(card.customBrandName || "");
    setFormLimit(card.creditLimit ? formatThousandsInput(card.creditLimit) : "");
    setFormClosingDay((card.closingDay || 15).toString());
    setFormPaymentDay((card.paymentDay || 5).toString());
    setFormCurrency((card.currency as Currency) || "ARS");
    setFormBalance(formatThousandsInput(Math.abs(card.balance)));
    setFormViewMode(card.creditCardViewMode || "statement_cycles");
    setEditingCard(card);
    setView("edit");
  };

  const openDetail = (card: Account) => {
    setSelectedCardId(card.id);
    setCycleOffset(0);
    setView("detail");
  };

  const openPay = (card: Account) => {
    setSelectedCardId(card.id);
    const owed = Math.abs(card.balance);
    setPayAmount(formatThousandsInput(owed));
    setPayFromAccount(sourceAccounts[0]?.id ?? "");
    setPayMode("total");
    setView("pay");
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const closingDay = Math.max(1, Math.min(28, parseInt(formClosingDay) || 15));
    const paymentDay = Math.max(1, Math.min(28, parseInt(formPaymentDay) || 5));
    const creditLimit = parseThousandsInput(formLimit) || 5000;

    if (editingCard) {
      onUpdate(editingCard.id, {
        name: formName.trim(),
        color: formColor,
        icon: formIcon,
        brand: formBrand,
        customBrandName: formBrand === "custom" ? formCustomBrand.trim() : undefined,
        creditLimit,
        closingDay,
        paymentDay,
        creditCardViewMode: formViewMode,
        currency: formCurrency,
      });
    } else {
      const balance = -Math.abs(parseThousandsInput(formBalance) || 0);
      onAdd({
        id: `card-${Date.now()}`,
        name: formName.trim(),
        balance,
        type: "credit",
        color: formColor,
        icon: formIcon,
        brand: formBrand,
        customBrandName: formBrand === "custom" ? formCustomBrand.trim() : undefined,
        creditLimit,
        closingDay,
        paymentDay,
        creditCardViewMode: formViewMode,
        currency: formCurrency,
        archived: false,
      });
    }
    setView("list");
  };

  const handlePay = () => {
    if (!detailCard || !payFromAccount) return;
    const amount = parseThousandsInput(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    onPayCard(detailCard.id, payFromAccount, amount);
    setView("list");
  };

  const getBrandLabel = (card: Account) => {
    if (card.brand === "custom") return card.customBrandName || "Card";
    return CARD_BRANDS.find(b => b.value === card.brand)?.label || "Card";
  };

  return (
    <div className="pt-4 pb-28">
      <div className="px-4 pb-3 flex items-center justify-between">
        {view === "list" ? (
          <>
            <h1 className="text-[20px] font-display font-semibold text-foreground">{t("card.title")}</h1>
            <div className="flex items-center gap-2">
              {archivedCards.length > 0 && (
                <button
                  onClick={() => setView("archived")}
                  className="h-8 w-8 rounded-xl bg-secondary/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center active:scale-95 transition-all shrink-0"
                  title={t("card.viewArchived")}
                  aria-label={t("card.viewArchived")}
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={openCreate}
                className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-xs shrink-0"
                title={t("card.new")}
                aria-label={t("card.new")}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClearInitialCard?.();
                setView("list");
              }}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-[16px] font-display font-semibold text-foreground">
              {view === "create" && t("card.new")}
              {view === "edit" && t("card.edit")}
              {view === "archived" && t("card.archived")}
              {view === "detail" && detailCard?.name}
              {view === "pay" && `${t("card.pay")} ${detailCard?.name}`}
            </h2>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* LIST VIEW */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4">
            {cards.length === 0 && (
              <p className="text-muted-foreground text-[13px] text-center py-8">{t("card.noCards")}</p>
            )}
            {cards.map((card, i) => {
              const cardCurrency = (card.currency as Currency) || "ARS";
              const owed = Math.abs(Math.min(card.balance, 0));
              const limit = card.creditLimit || 0;
              const used = limit > 0 ? (owed / limit) * 100 : 0;

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="mb-3"
                >
                  <div className="card-surface">
                    <div className="card-inner">
                      <div className="flex items-center gap-3 mb-3" onClick={() => openDetail(card)} role="button">
                        <div className={`w-10 h-10 rounded-[12px] ${card.color} flex items-center justify-center`}>
                          <CategoryIcon name={card.icon || "credit-card"} className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] text-foreground font-medium">{card.name}</span>
                            <span className="text-[11px] text-muted-foreground">{getBrandLabel(card)}</span>
                            <span className="text-[10px] font-mono-data font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {cardCurrency}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className={`font-mono-data text-[18px] ${owed > 0 ? "text-destructive" : "text-foreground"}`}>
                              {formatInCurrency(card.balance, cardCurrency)}
                            </span>
                            {limit > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                / {formatInCurrency(limit, cardCurrency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Usage bar */}
                      {limit > 0 && (
                        <div className="mb-3">
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(used, 100)}%` }}
                              className={`h-full rounded-full ${used > 80 ? "bg-destructive" : used > 50 ? "bg-amber-500" : "bg-primary"}`}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {used.toFixed(0)}% utilizado
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Disponible: {formatInCurrency(Math.max(limit - owed, 0), cardCurrency)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Statement info */}
                      {card.closingDay && (
                        <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {t("card.closing").replace("{day}", String(card.closingDay))}
                          </span>
                          <span>·</span>
                          <span>{t("card.due").replace("{day}", String(card.paymentDay))}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => openPay(card)}
                          className="flex-1 h-9 rounded-[10px] bg-primary/10 text-primary text-[13px] font-medium flex items-center justify-center gap-1.5"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> {t("card.pay") || "Pagar"}
                        </button>
                        <button
                          onClick={() => openEdit(card)}
                          className="h-9 w-9 rounded-[10px] bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onArchive(card.id)}
                          className="h-9 w-9 rounded-[10px] bg-secondary flex items-center justify-center text-muted-foreground hover:text-amber-400"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* CREATE / EDIT VIEW */}
        {(view === "create" || view === "edit") && (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.name")}</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder={t("card.namePlaceholder")}
              className="w-full h-11 px-4 rounded-[12px] bg-input border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:border-muted-foreground outline-none transition-colors mb-4"
            />

            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.brand")}</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CARD_BRANDS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setFormBrand(b.value)}
                  className={`px-3 py-2 rounded-full text-[13px] font-medium transition-colors ${
                    formBrand === b.value ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30" : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {formBrand === "custom" && (
              <>
                <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.brandName")}</label>
                <input
                  value={formCustomBrand}
                  onChange={e => setFormCustomBrand(e.target.value)}
                  placeholder={t("card.customBrandPlaceholder")}
                  className="w-full h-11 px-4 rounded-[12px] bg-input border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:border-muted-foreground outline-none transition-colors mb-4"
                />
              </>
            )}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.limit")}</label>
            <div className="mb-4">
              <MoneyInput
                value={formLimit}
                onChange={(val) => setFormLimit(val)}
                placeholder="5.000.000"
              />
            </div>

            {/* Selector de Modo de Visualización (Paramétrico) */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">
              {t("card.viewModeLabel")}
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setFormViewMode("statement_cycles")}
                className={`p-3 rounded-[12px] border text-left transition-all ${
                  formViewMode === "statement_cycles"
                    ? "bg-secondary border-foreground/30 ring-1 ring-foreground/20"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="w-3.5 h-3.5 text-foreground" />
                  <span className="text-[12px] font-medium text-foreground">{t("card.statementCycles")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {t("card.statementCyclesDesc")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormViewMode("negative_balance")}
                className={`p-3 rounded-[12px] border text-left transition-all ${
                  formViewMode === "negative_balance"
                    ? "bg-secondary border-foreground/30 ring-1 ring-foreground/20"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[12px] font-medium text-foreground">{t("card.continuousBalance")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {t("card.continuousDesc")}
                </p>
              </button>
            </div>

            {/* Closing & Payment days */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.closingDayLabel")}</label>
                <input
                  value={formClosingDay}
                  onChange={e => setFormClosingDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="15"
                  className="w-full h-11 px-4 rounded-[12px] bg-input border border-border text-foreground font-mono-data text-[14px] focus:border-muted-foreground outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.paymentDayLabel")}</label>
                <input
                  value={formPaymentDay}
                  onChange={e => setFormPaymentDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="5"
                  className="w-full h-11 px-4 rounded-[12px] bg-input border border-border text-foreground font-mono-data text-[14px] focus:border-muted-foreground outline-none transition-colors"
                />
              </div>
            </div>

            {view === "create" ? (
              <>
                <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.initialBalanceOwed")}</label>
                <div className="mb-4">
                  <MoneyInput
                    value={formBalance}
                    onChange={(val) => setFormBalance(val)}
                    placeholder="0,00"
                  />
                </div>
              </>
            ) : (
              <div className="mb-4 p-3 rounded-[12px] bg-secondary/40 border border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground font-medium">{t("card.recordedBalanceOwed")}</span>
                  <span className="font-mono-data text-[14px] font-semibold text-foreground">
                    {activeCurrencySymbol}{parseFloat(formBalance || "0").toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("card.balanceAutoNote")}
                </p>
              </div>
            )}

            {/* Currency */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.currencyLabel")}</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CURRENCIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormCurrency(c.value)}
                  className={`px-3 py-2 rounded-full text-[13px] font-medium transition-colors ${
                    formCurrency === c.value ? "bg-primary text-primary-foreground font-semibold ring-1 ring-primary/40" : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.value} ({c.symbol})
                </button>
              ))}
            </div>

            {/* Color */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("acct.color")}</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setFormColor(c)}
                  className={`w-8 h-8 rounded-full ${c} transition-all ${
                    formColor === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : ""
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("common.icon")}</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {ACCOUNT_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setFormIcon(ic)}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${
                    formIcon === ic ? `${formColor} text-white ring-1 ring-foreground/30` : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <CategoryIcon name={ic} className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setView("list")} className="flex-1 h-11 rounded-[12px] bg-secondary text-foreground font-medium text-[14px]">
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={!formName.trim()}
                className="flex-[2] h-11 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40"
              >
                {view === "edit" ? t("card.saveChanges") : t("card.createCard")}
              </button>
            </div>
          </motion.div>
        )}

        {/* PAY VIEW */}
        {view === "pay" && detailCard && (
          <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            {/* Card summary header */}
            <div className="card-surface mb-4">
              <div className="card-inner">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[12px] ${detailCard.color} flex items-center justify-center`}>
                    <CategoryIcon name={detailCard.icon || "credit-card"} className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[14px] text-foreground font-medium">{detailCard.name}</span>
                    <div className="text-[12px] text-muted-foreground">
                      {t("card.currentDebt")}: <span className="font-mono-data text-destructive">{formatCurrency(detailCard.balance)}</span>
                    </div>
                  </div>
                </div>
                {detailCard.creditLimit && detailCard.creditLimit > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">{t("card.limit")}</span>
                      <span className="font-mono-data text-foreground">{formatCurrency(detailCard.creditLimit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{t("card.available")}</span>
                      <span className="font-mono-data text-foreground">{formatCurrency(Math.max((detailCard.creditLimit || 0) - Math.abs(detailCard.balance), 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment mode selector */}
            {(() => {
              const owed = Math.abs(Math.min(detailCard.balance, 0));
              const minimumPayment = Math.max(owed * 0.05, Math.min(500, owed));

              const handleModeChange = (mode: "total" | "minimum" | "custom") => {
                setPayMode(mode);
                if (mode === "total") setPayAmount(formatThousandsInput(owed));
                else if (mode === "minimum") setPayAmount(formatThousandsInput(minimumPayment));
                // custom: keep current amount for user to edit
              };

              return (
                <>
                  <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.paymentMode")}</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => handleModeChange("total")}
                      className={`p-2.5 rounded-[12px] border text-center transition-all ${
                        payMode === "total"
                          ? "bg-primary/15 border-primary text-primary font-medium"
                          : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-[11px] block mb-0.5 opacity-80">{t("card.fullPayment")}</span>
                      <span className="text-[12px] font-semibold block font-mono-data truncate">
                        {formatCurrency(owed)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleModeChange("minimum")}
                      className={`p-2.5 rounded-[12px] border text-center transition-all ${
                        payMode === "minimum"
                          ? "bg-primary/15 border-primary text-primary font-medium"
                          : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-[11px] block mb-0.5 opacity-80">{t("card.minimumPayment")}</span>
                      <span className="text-[12px] font-semibold block font-mono-data truncate">
                        {formatCurrency(minimumPayment)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleModeChange("custom")}
                      className={`p-2.5 rounded-[12px] border text-center transition-all ${
                        payMode === "custom"
                          ? "bg-primary/15 border-primary text-primary font-medium"
                          : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-[11px] font-medium block mb-0.5">{t("card.otherAmount")}</span>
                      <span className="text-[13px] font-semibold block">{t("card.custom")}</span>
                    </button>
                  </div>
                </>
              );
            })()}

            {/* Amount input */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.payAmount")}</label>
            <div className="mb-4">
              <MoneyInput
                value={payAmount}
                onChange={(val) => {
                  setPayAmount(val);
                  setPayMode("custom");
                }}
                placeholder="0,00"
              />
            </div>

            {/* Source account selector */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("card.debitFrom")}</label>
            <div className="space-y-1.5 mb-4">
              {sourceAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setPayFromAccount(acc.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-[12px] transition-all text-left ${
                    payFromAccount === acc.id
                      ? "bg-secondary border border-primary/40 ring-1 ring-primary/20"
                      : "bg-secondary/40 border border-border/50 hover:bg-secondary/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${acc.color}`} />
                    <span className="text-[13px] font-medium text-foreground">{acc.name}</span>
                  </div>
                  <span className="font-mono-data text-[12px] text-muted-foreground">{formatCurrency(acc.balance)}</span>
                </button>
              ))}
            </div>

            {/* Remaining balance indicator */}
            {(() => {
              const amount = parseThousandsInput(payAmount) || 0;
              const owed = Math.abs(Math.min(detailCard.balance, 0));
              if (amount <= 0) return null;

              const remaining = owed - amount;
              const isPartial = remaining > 0;
              const isOverpay = remaining < 0;

              return (
                <div className={`mb-4 p-3 rounded-[12px] ${
                  isPartial
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : isOverpay
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-emerald-500/10 border border-emerald-500/20"
                }`}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className={isPartial ? "text-amber-500" : isOverpay ? "text-primary" : "text-emerald-500"}>
                      {isPartial ? "Saldo remanente (se financiará)" : isOverpay ? "Pago excede la deuda" : "Pago total del resumen"}
                    </span>
                    <span className={`font-mono-data font-semibold ${isPartial ? "text-amber-500" : isOverpay ? "text-primary" : "text-emerald-500"}`}>
                      {isPartial ? formatCurrency(-remaining) : isOverpay ? formatCurrency(Math.abs(remaining)) : "✓"}
                    </span>
                  </div>
                  {isPartial && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      La deuda restante de {formatCurrency(remaining)} se acumulará en el próximo resumen.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={() => setView("list")} className="flex-1 h-11 rounded-[12px] bg-secondary text-foreground font-medium text-[14px]">
                Cancelar
              </button>
              <button
                onClick={handlePay}
                disabled={!payFromAccount || isNaN(parseFloat(payAmount)) || parseFloat(payAmount) <= 0}
                className="flex-[2] h-11 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40 inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <DollarSign className="w-4 h-4" />
                Confirmar Pago
              </button>
            </div>
          </motion.div>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && detailCard && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="px-4 mb-4">
              <div className="card-surface">
                <div className="card-inner">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-[14px] ${detailCard.color} flex items-center justify-center`}>
                      <CategoryIcon name={detailCard.icon || "credit-card"} className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] text-foreground font-semibold">{detailCard.name}</span>
                        <span className="text-[11px] text-muted-foreground">{getBrandLabel(detailCard)}</span>
                      </div>
                      <div className="font-mono-data text-[22px] text-destructive">
                        {formatCurrency(detailCard.balance)}
                      </div>
                      {detailCard.creditLimit && (
                        <span className="text-[11px] text-muted-foreground">
                          {t("card.limit")}: {formatCurrency(detailCard.creditLimit)} · {t("card.available")}: {formatCurrency(Math.max((detailCard.creditLimit || 0) - Math.abs(detailCard.balance), 0))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  {detailCard.closingDay && detailCard.paymentDay && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 rounded-[10px] bg-secondary/50">
                        <span className="text-[10px] text-muted-foreground block">{t("card.closingDay")}</span>
                        <span className="text-[13px] text-foreground font-medium">{t("common.day")} {detailCard.closingDay}</span>
                      </div>
                      <div className="p-2 rounded-[10px] bg-secondary/50">
                        <span className="text-[10px] text-muted-foreground block">{t("card.paymentDay")}</span>
                        <span className="text-[13px] text-foreground font-medium">{t("common.day")} {detailCard.paymentDay}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openPay(detailCard)}
                      className="flex-1 h-9 rounded-[10px] bg-primary/10 text-primary text-[13px] font-medium flex items-center justify-center gap-1.5"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> {t("card.pay")}
                    </button>
                    <button
                      onClick={() => openEdit(detailCard)}
                      className="flex-1 h-9 rounded-[10px] bg-secondary text-foreground text-[13px] font-medium flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" /> {t("common.edit")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tabs: Statement vs Active Installment Plans */}
            <div className="px-4 mb-4">
              <div className="flex bg-secondary/80 p-0.5 rounded-xl border border-border/50 text-[12px]">
                <button
                  onClick={() => setDetailTab("statement")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    detailTab === "statement"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("card.statement")}
                </button>
                <button
                  onClick={() => setDetailTab("plans")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    detailTab === "plans"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("card.activePlans")}
                </button>
              </div>
            </div>

            {detailTab === "plans" ? (
              // Vista de Planes de Cuotas Activos
              <div className="px-4">
                {(() => {
                  const cardTxs = getTransactionsByAccount(detailCard.id).filter(
                    t => t.type === "expense" && !t.isCardPayment && t.installmentInfo?.groupId
                  );

                  // Agrupar por groupId
                  const plansMap = new Map<string, {
                    groupId: string;
                    description: string;
                    category: any;
                    totalInstallments: number;
                    txs: Transaction[];
                    installmentAmount: number;
                  }>();

                  for (const tx of cardTxs) {
                    const info = tx.installmentInfo!;
                    let plan = plansMap.get(info.groupId);
                    if (!plan) {
                      // Limpiar el sufijo (X/Y) para el nombre del bien/servicio
                      const cleanDesc = tx.description.replace(/\s*\(\d+\/\d+\)$/, "");
                      plan = {
                        groupId: info.groupId,
                        description: cleanDesc,
                        category: tx.category,
                        totalInstallments: info.total,
                        txs: [],
                        installmentAmount: tx.amount,
                      };
                      plansMap.set(info.groupId, plan);
                    }
                    plan.txs.push(tx);
                  }

                  const plans = Array.from(plansMap.values());

                  if (plans.length === 0) {
                    return (
                      <p className="text-muted-foreground text-[13px] text-center py-8">
                        {t("card.noActivePlans")}
                      </p>
                    );
                  }

                  const now = new Date();

                  return (
                    <div className="space-y-3">
                      {plans.map(plan => {
                        // Cuotas ya pasadas o en este mes vs cuotas restantes a futuro
                        const pastOrCurrentCount = plan.txs.filter(t => t.date <= now).length;
                        const paidInstallments = Math.min(pastOrCurrentCount, plan.totalInstallments);
                        const remainingCount = Math.max(0, plan.totalInstallments - paidInstallments);
                        const remainingAmount = remainingCount * plan.installmentAmount;
                        const progressPct = (paidInstallments / plan.totalInstallments) * 100;

                        return (
                          <div key={plan.groupId} className="card-surface p-3.5 border border-border/70 rounded-[14px]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-[8px] ${plan.category.color} flex items-center justify-center text-white flex-shrink-0`}>
                                  <CategoryIcon name={plan.category.icon || "circle-dot"} className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="text-[14px] text-foreground font-medium block">{plan.description}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {plan.category.name} · {formatCurrency(plan.installmentAmount)} / cuota
                                  </span>
                                </div>
                              </div>
                              <span className="text-[12px] font-semibold text-primary font-mono-data">
                                {paidInstallments}/{plan.totalInstallments}
                              </span>
                            </div>

                            {/* Barra de progreso */}
                            <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
                              <div
                                style={{ width: `${progressPct}%` }}
                                className="h-full rounded-full bg-primary transition-all duration-300"
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {remainingCount > 0 ? `${remainingCount} cuotas restantes` : "Plan finalizado"}
                              </span>
                              <span className="font-mono-data font-medium text-foreground">
                                {t("card.planRemaining")}: {formatCurrency(remainingAmount)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              // Vista tradicional de Resumen de Cuenta
              <>
                {/* Statement period toggle: Solo visible si el usuario eligió modo bancario con ciclos */}
                {/* Statement period toggle: Solo visible si el usuario eligió modo bancario con ciclos */}
                {detailCard.closingDay && detailCard.creditCardViewMode !== "negative_balance" && (
                  <div className="px-4 mb-3">
                    <div className="flex items-center justify-between bg-secondary/30 p-1.5 rounded-xl border border-border/40">
                      <button
                        onClick={() => setCycleOffset(prev => prev - 1)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                        title={t("card.previousStatementTitle")}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] text-foreground font-semibold">
                            {cycleOffset === 0 && t("card.currentStatement")}
                            {cycleOffset === -1 && t("card.previousStatement")}
                            {cycleOffset < -1 && t("card.previousStatementOffset").replace("{offset}", String(cycleOffset))}
                            {cycleOffset === 1 && t("card.nextStatement")}
                            {cycleOffset > 1 && t("card.futureStatementOffset").replace("{offset}", String(cycleOffset))}
                          </span>
                          {cycleOffset !== 0 && (
                            <button
                              onClick={() => setCycleOffset(0)}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
                              title={t("card.currentStatement")}
                            >
                              {t("card.currentStatement")}
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono-data">
                          {(() => {
                            const { periodStart, periodEnd } = getOffsetStatementPeriod(detailCard.closingDay!, cycleOffset);
                            return `${format(periodStart, "MMM d")} – ${format(periodEnd, "MMM d, yyyy")}`;
                          })()}
                        </span>
                      </div>
                      <button
                        onClick={() => setCycleOffset(prev => prev + 1)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                        title={t("card.nextStatement")}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

            {/* Statement transactions */}
            <div className="px-4">
              <h3 className="text-[13px] text-muted-foreground font-medium mb-3">
                {detailCard.closingDay && detailCard.creditCardViewMode !== "negative_balance"
                  ? t("card.statementCharges")
                  : t("card.allTransactionsContinuous")}
              </h3>
              {(() => {
                const txs = (detailCard.closingDay && detailCard.creditCardViewMode !== "negative_balance")
                  ? getStatementTransactions(detailCard.id, cycleOffset)
                  : getTransactionsByAccount(detailCard.id).filter(t => t.type === "expense" && !t.isCardPayment);

                const total = txs.reduce((sum, t) => sum + t.amount, 0);

                if (txs.length === 0) return <p className="text-muted-foreground text-[13px] text-center py-6">{t("card.noChargesInPeriod")}</p>;

                return (
                  <>
                    <div className="mb-3 p-3 rounded-[12px] bg-secondary/50">
                      <span className="text-[12px] text-muted-foreground">{t("card.statementTotal")}</span>
                      <span className="font-mono-data text-[18px] text-destructive ml-2">{formatCurrency(total)}</span>
                    </div>
                    {txs.map(tx => (
                      <div
                        key={tx.id}
                        className={`transaction-row ${onSelectTransaction ? "cursor-pointer active:bg-secondary/50" : ""}`}
                        onClick={() => onSelectTransaction?.(tx)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-[10px] ${tx.category.color} flex items-center justify-center flex-shrink-0`}>
                            <CategoryIcon name={tx.category.icon || "circle-dot"} className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] text-foreground font-medium">{tx.description}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {tx.category.name} · {format(tx.date, "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono-data text-[14px] tracking-tight text-foreground">
                          -{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </>
                );
              })()}

              {/* Payments */}
              {(() => {
                const payments = getTransactionsByAccount(detailCard.id).filter(t => t.isCardPayment && t.type === "income");
                if (payments.length === 0) return null;
                return (
                  <>
                    <h3 className="text-[13px] text-muted-foreground font-medium mb-3 mt-6">{t("card.paymentsMade")}</h3>
                    {payments.map(tx => (
                      <div key={tx.id} className="transaction-row">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[10px] bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] text-foreground font-medium">{tx.description}</span>
                            <span className="text-[11px] text-muted-foreground">{format(tx.date, "MMM d, h:mm a")}</span>
                          </div>
                        </div>
                        <span className="font-mono-data text-[14px] tracking-tight text-primary">
                          +{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </motion.div>
    )}

        {/* ARCHIVED VIEW */}
        {view === "archived" && (
          <motion.div key="archived" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            {archivedCards.length === 0 && (
              <p className="text-muted-foreground text-[13px] text-center py-8">{t("card.noArchived")}</p>
            )}
            {archivedCards.map(card => (
              <div key={card.id} className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-[10px] ${card.color} opacity-50 flex items-center justify-center`}>
                    <CategoryIcon name={card.icon || "credit-card"} className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[14px] text-muted-foreground">{card.name}</span>
                </div>
                <button onClick={() => onUnarchive(card.id)} className="p-2 text-muted-foreground hover:text-primary">
                  <ArchiveRestore className="w-4 h-4" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
