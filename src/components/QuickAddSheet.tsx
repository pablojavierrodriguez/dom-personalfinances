import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Delete, Paperclip, Loader2, FileText, X, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { Category, Account, Tag } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { useSettings, CURRENCIES, Currency } from "@/lib/settings-store";
import { ResponsiveSheet } from "./ResponsiveSheet";
import { uploadReceipt } from "@/services/storage.service";
import { toast } from "sonner";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    amount: number,
    description: string,
    category: Category,
    type: "income" | "expense",
    accountId: string,
    extras?: { tags?: string[]; note?: string; installments?: number; receiptUrl?: string; currency?: Currency; date?: Date }
  ) => void;
  accounts: Account[];
  categories: Category[];
  tags?: Tag[];
  initialType?: "expense" | "income";
  getTransactionCountByCategory?: (categoryId: string) => number;
  onTransferRequest?: () => void;
}

export function QuickAddSheet({ open, onClose, onSubmit, accounts, categories, tags = [], initialType = "expense", getTransactionCountByCategory, onTransferRequest }: QuickAddSheetProps) {
  const { currencySymbol, settings, t } = useSettings();
  const [amount, setAmount] = useState("0");
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [step, setStep] = useState<"amount" | "details">("amount");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState(() => accounts[0]?.id ?? "");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    const acc = accounts.find(a => a.id === accounts[0]?.id);
    return (acc?.currency as Currency) || settings.currency || "ARS";
  });
  const [description, setDescription] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [installments, setInstallments] = useState(1);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Sincronizar cuenta seleccionada si aún no hay una válida o la actual fue archivada
  useEffect(() => {
    const valid = accounts.find(a => a.id === selectedAccount);
    if (!valid && accounts.length > 0) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  // Sincronizar moneda por defecto si el usuario cambia de cuenta
  useEffect(() => {
    const acc = accounts.find(a => a.id === selectedAccount);
    if (acc?.currency) {
      setSelectedCurrency(acc.currency as Currency);
    }
  }, [selectedAccount, accounts]);

  // Sincronizar con el tipo inicial al abrirse desde el Speed Dial
  useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  const selectedAccObj = accounts.find(a => a.id === selectedAccount);
  const isCreditCard = selectedAccObj?.type === "credit";
  const activeCurrencySymbol = CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || currencySymbol;

  const filteredCats = useMemo(() => {
    const cats = categories.filter(c => c.type === type && !c.archived);
    if (!getTransactionCountByCategory) return cats;
    return [...cats].sort((a, b) => {
      const countA = getTransactionCountByCategory(a.id);
      const countB = getTransactionCountByCategory(b.id);
      return countB - countA;
    });
  }, [categories, type, getTransactionCountByCategory]);

  // Smart chips: las 4 categorías más populares para selección instantánea
  const topCategories = useMemo(() => filteredCats.slice(0, 4), [filteredCats]);

  const triggerHaptic = (duration = 10) => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(duration);
      }
    } catch {}
  };

  const evaluateExpression = (expr: string): string => {
    try {
      // Sanitizar expresión: permitir solo números, +, - y punto decimal
      const sanitized = expr.replace(/[^0-9+\-.]/g, "");
      if (!sanitized || /[+\-.]$/.test(sanitized)) return expr;
      // Evaluar suma o resta simple sin librerías externas
      const tokens = sanitized.match(/([+-]?[0-9.]+)/g);
      if (!tokens) return expr;
      const total = tokens.reduce((acc, curr) => acc + parseFloat(curr), 0);
      return isNaN(total) ? expr : (Math.round(total * 100) / 100).toString();
    } catch {
      return expr;
    }
  };

  const handleKey = (key: string) => {
    triggerHaptic(8);
    if (key === "del") {
      setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
    } else if (key === "=") {
      setAmount(prev => evaluateExpression(prev));
    } else if (key === "+" || key === "-") {
      setAmount(prev => {
        if (prev.endsWith("+") || prev.endsWith("-")) {
          return prev.slice(0, -1) + key;
        }
        return prev + key;
      });
    } else if (key === ".") {
      setAmount(prev => {
        const parts = prev.split(/[+\-]/);
        const lastPart = parts[parts.length - 1];
        if (!lastPart.includes(".")) return prev + ".";
        return prev;
      });
    } else {
      setAmount(prev => prev === "0" ? key : prev + key);
    }
  };

  const handleQuickCategorySubmit = (cat: Category) => {
    const finalAmount = parseFloat(evaluateExpression(amount));
    if (isNaN(finalAmount) || finalAmount <= 0) return;
    // Leer la cuenta directamente de props para evitar stale closures del estado
    const effectiveAccountId =
      (selectedAccount && accounts.find(a => a.id === selectedAccount)?.id) ||
      accounts[0]?.id;
    if (!effectiveAccountId) return;
    triggerHaptic(15);
    // Capturar la moneda antes de resetear
    const currencySnapshot = selectedCurrency;
    onSubmit(finalAmount, cat.name, cat, type, effectiveAccountId, { currency: currencySnapshot });
    // Resetear en microtask para no interferir con la llamada async de onSubmit
    Promise.resolve().then(() => resetAndClose());
  };

  const handleNext = () => {
    triggerHaptic(12);
    if (parseFloat(amount) > 0) setStep("details");
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

  const handleSubmit = () => {
    if (!selectedCategory) {
      toast.error(t("quickadd.selectCategoryError") || "Selecciona una categoría para continuar");
      return;
    }
    const effectiveAccountId = selectedAccount || accounts[0]?.id;
    if (!effectiveAccountId) {
      toast.error(t("quickadd.noAccountError") || "Debes registrar al menos una cuenta antes de agregar transacciones");
      return;
    }
    const parsedDate = parseLocalDate(formDate);
    const extras: { installments?: number; receiptUrl?: string; currency?: Currency; date?: Date } = {
      currency: selectedCurrency,
      date: parsedDate,
    };
    if (type === "expense" && installments > 1) {
      extras.installments = installments;
    }
    if (receiptUrl) {
      extras.receiptUrl = receiptUrl;
    }
    triggerHaptic(25);
    onSubmit(parseFloat(amount), description || selectedCategory.name, selectedCategory, type, effectiveAccountId, extras);
    resetAndClose();
  };

  const resetAndClose = () => {
    setAmount("0");
    setType(initialType);  // Respetar el tipo del contexto (income/expense) al resetear
    setStep("amount");
    setSelectedCategory(null);
    setDescription("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setInstallments(1);
    setReceiptUrl(undefined);
    setUploadingReceipt(false);
    onClose();
  };

  const keys = [
    "7", "8", "9", "+",
    "4", "5", "6", "-",
    "1", "2", "3", "=",
    ".", "0", "del"
  ];

  const typeToggle = (
    <div className="flex bg-secondary rounded-full p-0.5">
      <button
        type="button"
        onClick={() => setType("expense")}
        className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${type === "expense" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
      >
        {t("quickadd.expense")}
      </button>
      <button
        type="button"
        onClick={() => setType("income")}
        className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${type === "income" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
      >
        {t("quickadd.income")}
      </button>
      {onTransferRequest && (
        <button
          type="button"
          onClick={() => {
            resetAndClose();
            onTransferRequest();
          }}
          className="px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors text-muted-foreground hover:text-foreground"
        >
          {t("nav.transfer")}
        </button>
      )}
    </div>
  );

  return (
    <ResponsiveSheet open={open} onClose={resetAndClose} title={typeToggle}>
      <AnimatePresence mode="wait">
        {step === "amount" ? (
          <motion.div key="amount" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Amount display con selector de moneda */}
            <div className={`pt-2 pb-3 mb-2 rounded-2xl mx-4 border transition-colors ${
              type === "expense"
                ? "bg-destructive/10 border-destructive/20"
                : "bg-primary/10 border-primary/20"
            }`}>
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {type === "expense" ? t("quickadd.moneyOut") : t("quickadd.moneyIn")}
                </span>
                {/* Selector táctil de divisa para el gasto */}
                <div className="flex items-center gap-0.5 bg-background/60 p-0.5 rounded-full border border-border/40">
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
                      title={t("quickadd.registerIn").replace("{currency}", c.value)}
                    >
                      {c.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                {type === "expense" ? (
                  <ArrowUpRight className="w-6 h-6 text-destructive shrink-0" />
                ) : (
                  <ArrowDownLeft className="w-6 h-6 text-primary shrink-0" />
                )}
                <span className={`font-mono-data text-[40px] font-semibold tracking-tight ${type === "expense" ? "text-destructive" : "text-primary"}`}>
                  {type === "expense" ? "-" : "+"}{activeCurrencySymbol}{amount}
                </span>
              </div>
            </div>

            {/* Smart Chips: Guardado en 1 toque para categorías frecuentes */}
            {parseFloat(amount) > 0 && topCategories.length > 0 && (
              <div className="px-4 pb-3 flex items-center justify-center gap-1.5 overflow-x-auto">
                {topCategories.map(cat => (
                  <button
                    key={`quick-${cat.id}`}
                    onClick={() => handleQuickCategorySubmit(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-foreground text-xs font-medium border border-border/40 active:scale-95 transition-all shadow-sm"
                  >
                    <div className={`w-3.5 h-3.5 rounded-full ${cat.color} flex items-center justify-center`}>
                      <CategoryIcon name={cat.icon || "circle-dot"} className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Teclado numérico tipo calculadora con operadores */}
            <div className="grid grid-cols-4 gap-1 px-4 pb-3">
              {keys.map(key => {
                const isOp = key === "+" || key === "-" || key === "=";
                return (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    className={`h-13 rounded-[12px] flex items-center justify-center font-medium active:scale-95 transition-all ${
                      isOp
                        ? "bg-primary/20 text-primary text-[20px] font-semibold hover:bg-primary/30"
                        : "bg-secondary/50 text-foreground text-[19px] hover:bg-secondary/80"
                    } ${key === "del" ? "col-span-2" : ""}`}
                    style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.05) inset" }}
                  >
                    {key === "del" ? <Delete className="w-5 h-5" /> : key}
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-6">
              <button
                onClick={handleNext}
                disabled={isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
                className="w-full h-12 rounded-[12px] bg-primary text-primary-foreground font-medium text-[15px] disabled:opacity-40 transition-opacity active:scale-[0.98]"
              >
                {t("quickadd.next")}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 pb-6">
            <div className="text-center py-3">
              <span className={`font-mono-data text-[28px] ${type === "income" ? "text-primary" : "text-foreground"}`}>
                {type === "expense" ? "-" : "+"}{activeCurrencySymbol}{amount}
              </span>
            </div>
            <input
              type="text"
              placeholder={t("quickadd.descPlaceholder")}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full h-12 px-4 rounded-[12px] bg-input border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:border-muted-foreground outline-none transition-colors mb-3"
            />

            {/* Selector de fecha rápido y táctil (Hoy, Mañana, Otra fecha) */}
            <div className="mb-4 bg-secondary/30 p-2.5 rounded-[12px] border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {t("quickadd.dateLabel").replace("{type}", type === "expense" ? t("quickadd.expense_type") : t("quickadd.income_type"))}
                </span>
                <span className="text-[11px] font-mono-data text-muted-foreground">
                  {formDate === format(new Date(), "yyyy-MM-dd")
                    ? t("quickadd.today")
                    : formDate === format(addDays(new Date(), 1), "yyyy-MM-dd")
                    ? t("quickadd.scheduledTomorrow")
                    : formDate > format(new Date(), "yyyy-MM-dd")
                    ? t("quickadd.programmed")
                    : t("quickadd.pastDate")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(6);
                    setFormDate(format(new Date(), "yyyy-MM-dd"));
                  }}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                    formDate === format(new Date(), "yyyy-MM-dd")
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {t("quickadd.today")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(6);
                    setFormDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                  }}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                    formDate === format(addDays(new Date(), 1), "yyyy-MM-dd")
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {t("quickadd.tomorrow")}
                </button>
                <div className="relative flex-1 min-w-[130px]">
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        triggerHaptic(6);
                        setFormDate(e.target.value);
                      }
                    }}
                    className="w-full h-8 px-2.5 rounded-[8px] bg-secondary/80 border border-border/70 text-foreground text-[12px] font-mono-data outline-none focus:border-primary transition-colors cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-muted-foreground font-medium">{t("quickadd.category")}</span>
              {selectedCategory && (
                <span className="text-[12px] font-semibold text-primary flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedCategory.color}`} />
                  {selectedCategory.name}
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto pr-1 mb-5 touch-pan-y overscroll-contain">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2.5">
                {filteredCats.map(cat => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        setSelectedCategory(cat);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all border text-center active:scale-95 ${
                        isSelected
                          ? "bg-secondary text-foreground border-primary ring-2 ring-primary/40 shadow-md scale-[1.02]"
                          : "bg-secondary/60 hover:bg-secondary/90 text-foreground/80 hover:text-foreground border-border/70 hover:border-border"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-full ${cat.color} flex items-center justify-center text-white mb-2 shadow-md shrink-0 transition-transform ${isSelected ? "scale-105" : ""}`}>
                        <CategoryIcon name={cat.icon || "circle-dot"} className="w-5 h-5 text-white stroke-[2.3]" />
                      </div>
                      <span className={`text-[12px] leading-tight text-center line-clamp-2 w-full px-0.5 ${isSelected ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="text-[12px] text-muted-foreground font-medium mb-2 block">{t("quickadd.account")}</span>
            {accounts.length === 0 ? (
              <div className="p-3 mb-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 text-amber-500 text-xs flex items-center justify-between">
                <span>No tienes cuentas creadas aún.</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTransferRequest?.();
                  }}
                  className="font-semibold underline ml-2 shrink-0"
                >
                  Crear cuenta
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccount(acc.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
                      selectedAccount === acc.id
                        ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    <div className={`category-dot ${acc.color}`} />
                    {acc.name}
                  </button>
                ))}
              </div>
            )}
            {isCreditCard && type === "expense" && (
              <div className="mb-4 bg-secondary/30 p-3 rounded-[12px] border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-muted-foreground font-medium">{t("quickadd.installmentsCount")}</span>
                  {installments > 1 && (
                    <span className="text-[11px] font-mono-data text-muted-foreground">
                      {installments}x {currencySymbol}{(parseFloat(amount) / installments).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 6, 9, 12, 18, 24].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallments(n)}
                      className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                        installments === n
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {n === 1 ? t("quickadd.oncePayment") : t("quickadd.installmentCount").replace("{n}", String(n))}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Receipt Upload & Preview in QuickAdd */}
            <div className="mb-6 p-3 rounded-[12px] bg-secondary/30 border border-border/40">
              <span className="text-[12px] text-muted-foreground font-medium mb-2 block">{t("quickadd.receipt")}</span>
              {receiptUrl ? (
                <div className="flex items-center justify-between gap-3 bg-background/80 p-2.5 rounded-[8px] border border-border/60">
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-primary underline truncate">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t("quickadd.viewReceipt")}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setReceiptUrl(undefined)}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-[8px] border border-dashed border-border hover:border-primary/50 text-xs text-muted-foreground cursor-pointer transition-colors">
                  {uploadingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>{t("quickadd.uploadingReceipt")}</span>
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span>{t("quickadd.attachReceipt")}</span>
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

            <div className="flex gap-3">
              <button onClick={() => setStep("amount")} className="flex-1 h-12 rounded-[12px] bg-secondary text-foreground font-medium text-[15px] active:scale-[0.98] transition-transform">
                {t("quickadd.back")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedCategory || uploadingReceipt}
                className="flex-[2] h-12 rounded-[12px] bg-primary text-primary-foreground font-medium text-[15px] disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                {t("quickadd.save")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveSheet>
  );
}
