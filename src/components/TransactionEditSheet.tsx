import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Save, Copy, Paperclip, FileText, Loader2, X, CreditCard, Calendar, Tag as TagIcon, Sparkles } from "lucide-react";
import { Transaction, Category, Account, Tag } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { format } from "date-fns";
import { useSettings, CURRENCIES, type Currency } from "@/lib/settings-store";
import { ResponsiveSheet } from "./ResponsiveSheet";
import { uploadReceipt } from "@/services/storage.service";
import { formatThousandsInput, parseThousandsInput } from "@/lib/utils";

interface TransactionEditSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Omit<Transaction, "id">>) => void;
  onDelete: (id: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onDuplicate?: (tx: Transaction) => void;
  accounts: Account[];
  categories: Category[];
  tags?: Tag[];
}

export function TransactionEditSheet({
  transaction,
  open,
  onClose,
  onUpdate,
  onDelete,
  onDeleteGroup,
  onDuplicate,
  accounts,
  categories,
}: TransactionEditSheetProps) {
  const { t, currencySymbol } = useSettings();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("ARS");
  const [date, setDate] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [accountChanged, setAccountChanged] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(formatThousandsInput(transaction.amount));
      setDescription(transaction.description || "");
      setType(transaction.type);
      setSelectedCategory(transaction.category);
      setSelectedAccount(transaction.accountId);
      const acc = accounts.find(a => a.id === transaction.accountId);
      setSelectedCurrency(transaction.currency || (acc?.currency as Currency) || "ARS");
      setDate(format(transaction.date, "yyyy-MM-dd'T'HH:mm"));
      setReceiptUrl(transaction.receiptUrl);
      setConfirmDelete(false);
    }
  }, [transaction, accounts]);

  const filteredCats = categories.filter((c) => c.type === type && !c.archived);
  const currentAccount = accounts.find((a) => a.id === selectedAccount);

  const triggerHaptic = (duration = 10) => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(duration);
      }
    } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingReceipt(true);
      const url = await uploadReceipt(file);
      setReceiptUrl(url);
      triggerHaptic(15);
    } catch (err) {
      console.error("Error al subir comprobante:", err);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSave = () => {
    const parsedAmount = parseThousandsInput(amount);
    if (!transaction || !selectedCategory || isNaN(parsedAmount) || parsedAmount <= 0) return;
    triggerHaptic(12);
    onUpdate(transaction.id, {
      amount: parsedAmount,
      description: description.trim() || selectedCategory.name,
      type,
      category: selectedCategory,
      accountId: selectedAccount,
      currency: selectedCurrency,
      date: new Date(date),
      receiptUrl,
    });
    onClose();
  };

  const handleDeleteSingle = () => {
    if (!transaction) return;
    triggerHaptic(20);
    onDelete(transaction.id);
    onClose();
  };

  const handleDeletePlan = () => {
    if (!transaction || !transaction.installmentInfo?.groupId) return;
    triggerHaptic(25);
    if (onDeleteGroup) {
      onDeleteGroup(transaction.installmentInfo.groupId);
    } else {
      onDelete(transaction.id);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!transaction) return;
    triggerHaptic(10);
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    handleDeleteSingle();
  };

  const isInstallment = !!transaction?.installmentInfo?.groupId;
  const isFormValid = !!selectedCategory && !isNaN(parseThousandsInput(amount)) && parseThousandsInput(amount) > 0;

  const titleRight = (
    <div className="flex items-center gap-1">
      {onDuplicate && (
        <button
          type="button"
          onClick={() => {
            if (transaction) {
              triggerHaptic(10);
              onDuplicate(transaction);
              onClose();
            }
          }}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all"
          title={t("txedit.duplicateLabel")}
          aria-label={t("txedit.duplicateLabel")}
        >
          <Copy className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        className={`p-2 rounded-full active:scale-95 transition-all ${
          confirmDelete
            ? "bg-destructive/15 text-destructive"
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        }`}
        title={t("txedit.deleteLabel")}
        aria-label={t("txedit.deleteLabel")}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={t("txedit.title")} titleRight={titleRight}>
      {transaction && (
        <div className="flex flex-col">
          <div className="px-5 pb-6 space-y-4">
            {/* Modal de confirmación de eliminación con animación suave */}
            <AnimatePresence>
              {confirmDelete && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 shadow-xs"
                >
                  <p className="text-[13px] text-destructive font-semibold mb-2.5 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("txedit.deleteConfirm")}
                  </p>
                  {isInstallment ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteSingle}
                        className="w-full h-10 rounded-xl bg-destructive/20 text-destructive text-[13px] font-semibold hover:bg-destructive/30 active:scale-[0.98] transition-all"
                      >
                        {t("txedit.deleteInstallmentOnly")} ({transaction.installmentInfo?.current}/{transaction.installmentInfo?.total})
                      </button>
                      <button
                        type="button"
                        onClick={handleDeletePlan}
                        className="w-full h-10 rounded-xl bg-destructive text-destructive-foreground text-[13px] font-semibold active:scale-[0.98] transition-transform shadow-xs"
                      >
                        {t("txedit.deleteInstallmentPlan")} · {transaction.installmentInfo?.total} cuotas
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="w-full h-9 rounded-xl bg-secondary/80 text-foreground text-[12px] font-medium mt-1 active:scale-[0.98] transition-all"
                      >
                        {t("txedit.cancel")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 h-9 rounded-xl bg-secondary/80 text-foreground text-[13px] font-medium active:scale-[0.98] transition-all"
                      >
                        {t("txedit.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSingle}
                        className="flex-1 h-9 rounded-xl bg-destructive text-destructive-foreground text-[13px] font-semibold active:scale-[0.98] transition-all shadow-xs"
                      >
                        {t("txedit.confirm")}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* HERO AMOUNT DISPLAY & TIPO */}
            <div className="hero-balance-surface p-4 rounded-2xl relative overflow-hidden flex flex-col items-center">
              {/* Type toggle pill & Currency selector */}
              <div className="flex items-center justify-between w-full mb-3 relative z-10 px-1">
                {transaction?.isTransfer || transaction?.isCardPayment ? (
                  <div className="inline-flex px-3 py-1 rounded-full bg-secondary/80 border border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {transaction.isTransfer ? t("nav.transfer") : "Pago de Tarjeta"}
                  </div>
                ) : (
                  <div className="inline-flex p-1 rounded-full bg-secondary/60 border border-border/40 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        setType("expense");
                        if (selectedCategory?.type !== "expense") {
                          setSelectedCategory(null);
                        }
                      }}
                      className={`px-4 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
                        type === "expense"
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("quickadd.expense")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        setType("income");
                        if (selectedCategory?.type !== "income") {
                          setSelectedCategory(null);
                        }
                      }}
                      className={`px-4 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
                        type === "income"
                          ? "bg-card text-emerald-500 shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("quickadd.income")}
                    </button>
                  </div>
                )}

                {/* Selector táctil de divisa para la transacción */}
                <div className="flex items-center gap-0.5 bg-secondary/60 p-0.5 rounded-full border border-border/40 shadow-2xs">
                  {CURRENCIES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        setSelectedCurrency(c.value);
                      }}
                      className={`min-w-[32px] h-6 px-1.5 flex items-center justify-center text-[10px] font-mono-data font-bold rounded-full transition-all active:scale-95 ${
                        selectedCurrency === c.value
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={`${t("txedit.currencyTitle").replace("{currency}", c.value)}`}
                    >
                      {c.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount hero input */}
              <div className="flex items-center justify-center w-full relative z-10 gap-1.5">
                <span className="text-2xl sm:text-3xl font-mono-data font-semibold text-muted-foreground select-none">
                  {type === "expense" ? "-" : "+"} {CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || currencySymbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(formatThousandsInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full max-w-[240px] text-3xl sm:text-4xl font-mono-data font-bold text-foreground bg-transparent text-center border-none outline-none placeholder:text-muted-foreground/30 focus:ring-0 tracking-tight"
                />
              </div>

              {currentAccount && (
                <span className="text-[11px] font-mono-data text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentAccount.color}`} />
                  {t("txedit.balanceLabel").replace("{symbol}", currencySymbol).replace("{balance}", currentAccount.balance.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }))}
                </span>
              )}
            </div>

            {/* TARJETA DE CUOTAS (SI APLICA) */}
            {isInstallment && transaction.installmentInfo && (
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[13px] font-semibold text-foreground block">
                        {t("txedit.installmentTitle")}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono-data">
                        {t("txedit.installmentSubtitle").replace("{current}", String(transaction.installmentInfo.current)).replace("{total}", String(transaction.installmentInfo.total))}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono-data text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {Math.round((transaction.installmentInfo.current / transaction.installmentInfo.total) * 100)}{t("txedit.installmentPaid")}
                  </span>
                </div>

                <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(transaction.installmentInfo.current / transaction.installmentInfo.total) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/40 font-mono-data">
                  <span>{t("txedit.installmentPlanTotal").replace("{total}", String(transaction.installmentInfo.total))}</span>
                  <span>{t("txedit.installmentRemaining").replace("{remaining}", String(Math.max(0, transaction.installmentInfo.total - transaction.installmentInfo.current)))}</span>
                </div>
              </div>
            )}

            {/* CAMPOS PRINCIPALES (DESCRIPCIÓN Y FECHA) */}
            <div className="space-y-3">
              <div className="relative">
                <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1 font-display">
                  {t("txedit.description")}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("txedit.descPlaceholder")}
                  className="w-full h-11 px-3.5 rounded-xl bg-secondary/40 border border-border/60 text-foreground text-[14px] placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-secondary/60 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1 font-display">
                  {t("txedit.dateTime")}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-secondary/40 border border-border/60 text-foreground text-[13px] font-mono-data focus:border-primary/60 focus:bg-secondary/60 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SELECTOR DE CATEGORÍAS (SCROLL HORIZONTAL TÁCTIL O GRILLA COMPACTA) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block font-display">
                  {t("quickadd.category")}
                </label>
                {selectedCategory && (
                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory.color}`} />
                    {selectedCategory.name}
                  </span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x -mx-1 px-1">
                {filteredCats.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(6);
                        setSelectedCategory(cat);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium shrink-0 transition-all active:scale-95 ${
                        isSelected
                          ? "bg-card text-foreground ring-2 ring-primary border-primary/30 shadow-xs"
                          : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/40"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg ${cat.color} flex items-center justify-center shrink-0`}>
                        <CategoryIcon name={cat.icon || "circle-dot"} className="w-3 h-3 text-white" />
                      </div>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECTOR DE CUENTAS */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block font-display">
                  {t("quickadd.account")}
                </label>
                {currentAccount && (
                  <span className="text-[11px] text-muted-foreground font-mono-data">
                    {t("txedit.balanceLabel").replace("{symbol}", currencySymbol).replace("{balance}", currentAccount.balance.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }))}
                  </span>
                )}
              </div>
              <div className={`flex gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x -mx-1 px-1 rounded-xl transition-all duration-300 ${accountChanged ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
                {accounts.map((acc) => {
                  const isSelected = selectedAccount === acc.id;
                  const isLocked = transaction?.isTransfer || transaction?.isCardPayment;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={isLocked && !isSelected}
                      onClick={() => {
                        triggerHaptic(6);
                        if (acc.id !== selectedAccount) {
                          setSelectedAccount(acc.id);
                          setAccountChanged(true);
                          setTimeout(() => setAccountChanged(false), 600);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium shrink-0 transition-all active:scale-95 ${
                        isSelected
                          ? "bg-card text-foreground ring-2 ring-primary border-primary/30 shadow-xs"
                          : isLocked
                          ? "opacity-40 cursor-not-allowed bg-secondary/20 text-muted-foreground border border-border/20"
                          : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/40"
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${acc.color}`} />
                      <span>{acc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COMPROBANTE / RECIBO (MICRO-CARD ELEGANTE) */}
            <div className="p-3 rounded-2xl bg-secondary/20 border border-border/40 space-y-2">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block font-display">
                {t("txedit.receiptSection")}
              </span>
              {receiptUrl ? (
                <div className="flex items-center justify-between gap-3 bg-card p-2.5 rounded-xl border border-border/60 shadow-2xs">
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline truncate"
                  >
                    <FileText className="w-4 h-4 shrink-0 text-primary" />
                    <span className="truncate font-medium">{t("txedit.viewReceipt")}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setReceiptUrl(undefined);
                    }}
                    className="p-1 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title={t("txedit.removeFile")}
                    aria-label={t("txedit.removeFile")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-border/70 hover:border-primary/50 bg-secondary/10 hover:bg-secondary/30 text-xs text-muted-foreground cursor-pointer transition-all active:scale-[0.99]">
                  {uploadingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="font-medium text-foreground">{t("txedit.uploadingReceipt")}</span>
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{t("txedit.attachReceipt")}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingReceipt}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* STICKY BOTTOM ACTION BAR */}
          <div className="sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-border/50 px-5 py-3 pb-safe z-20">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isFormValid}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] shadow-sm disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t("txedit.saveChanges")}
            </button>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}
