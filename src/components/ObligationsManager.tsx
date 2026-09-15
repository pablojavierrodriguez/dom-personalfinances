import { useState, useMemo } from "react";
import {
  BillReminder,
  Account,
  Category,
  RecurringTransaction,
  type RecurrenceFrequency,
} from "@/lib/types";
import { useSettings } from "@/lib/settings-store";
import { format } from "date-fns";
import { parseLocalDate, parseThousandsInput } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { generateUUID } from "@/services/sync-queue.service";
import { CategoryIcon } from "./CategoryIcon";
import { ResponsiveSheet } from "./ResponsiveSheet";
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Pencil,
  Zap,
  Repeat,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { SubscriptionAuditor } from "./SubscriptionAuditor";
import { Transaction } from "@/lib/types";

interface ObligationsManagerProps {
  bills: BillReminder[];
  recurringTxs: RecurringTransaction[];
  accounts: Account[];
  categories: Category[];
  transactions?: Transaction[];
  initialSubTab?: "bills" | "recurring";
  onAddBill: (bill: BillReminder) => void;
  onUpdateBill: (id: string, updates: Partial<BillReminder>) => void;
  onDeleteBill: (id: string) => void;
  onMarkBillPaid: (id: string, accountId: string) => void;
  getPendingBills: () => BillReminder[];
  onAddRecurring: (rtx: RecurringTransaction) => void;
  onUpdateRecurring: (id: string, updates: Partial<RecurringTransaction>) => void;
  onDeleteRecurring: (id: string) => void;
  onToggleRecurringPause: (id: string) => void;
}

type FilterType = "all" | "pending" | "auto" | "paused";

interface UnifiedObligationItem {
  origin: "bill" | "recurring";
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  frequency: RecurrenceFrequency;
  category?: Category;
  accountId?: string;
  autoPay: boolean;
  status: "pending" | "paid" | "overdue" | "active" | "paused";
  type: "expense" | "income";
  paused?: boolean;
  rawBill?: BillReminder;
  rawRecurring?: RecurringTransaction;
}

const FREQUENCIES: RecurrenceFrequency[] = [
  "once",
  "monthly",
  "weekly",
  "biweekly",
  "yearly",
];

export function ObligationsManager({
  bills,
  recurringTxs,
  accounts,
  categories,
  transactions = [],
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onMarkBillPaid,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  onToggleRecurringPause,
}: ObligationsManagerProps) {
  const { maskAmount } = usePrivacy();
  const { formatAmount: baseFormatAmount, t } = useSettings();
  const formatAmount = (n: number, opts?: any) => maskAmount(baseFormatAmount(n, opts));
  const [filter, setFilter] = useState<FilterType>("all");

  // Sheet de creación / edición
  const [sheetOpen, setSheetOpen] = useState(false);
  const [auditorOpen, setAuditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedObligationItem | null>(null);

  // Estados del formulario en sheet
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formFreq, setFreq] = useState<RecurrenceFrequency>("monthly");
  const [formAutoPay, setAutoPay] = useState(false);
  const [formCatId, setCatId] = useState("");
  const [formAccId, setAccId] = useState(accounts[0]?.id ?? "");
  const [formType, setFormType] = useState<"expense" | "income">("expense");

  // Estados de acciones directas en la lista
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAccId, setPayAccId] = useState(accounts[0]?.id ?? "");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const freqLabel = (f: RecurrenceFrequency) => t(`recurring.${f}` as any);

  // Unificar bills y recurringTxs en una sola lista cronológica
  const unifiedItems = useMemo(() => {
    const list: UnifiedObligationItem[] = [];

    // 1. Vencimientos / Compromisos directos (bills)
    for (const b of bills) {
      const cat = categories.find((c) => c.id === b.categoryId);
      list.push({
        origin: "bill",
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDate: new Date(b.dueDate),
        frequency: b.frequency,
        category: cat,
        accountId: b.accountId,
        autoPay: b.autoPay || false,
        status: b.status,
        type: "expense",
        rawBill: b,
      });
    }

    // 2. Recurrentes periódicas
    for (const r of recurringTxs) {
      list.push({
        origin: "recurring",
        id: r.id,
        name: r.description,
        amount: r.amount,
        dueDate: new Date(r.nextDate),
        frequency: r.frequency,
        category: r.category,
        accountId: r.accountId,
        autoPay: true, // Recurrente tradicional funciona como debito/ingreso auto en su fecha
        status: r.paused ? "paused" : "active",
        type: r.type,
        paused: r.paused,
        rawRecurring: r,
      });
    }

    // Ordenar cronológicamente por fecha de próximo vencimiento / impacto
    return list.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [bills, recurringTxs, categories]);

  // Contadores para badges informativos
  const pendingCount = bills.filter((b) => b.status !== "paid").length;
  const autoCount = unifiedItems.filter(
    (i) => i.autoPay && i.status !== "paused" && i.status !== "paid"
  ).length;

  // Filtrado reactivo
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (filter === "pending") {
        return item.origin === "bill" && item.status !== "paid";
      }
      if (filter === "auto") {
        return item.autoPay && item.status !== "paused" && item.status !== "paid";
      }
      if (filter === "paused") {
        return item.status === "paused" || item.paused === true;
      }
      return true; // "all"
    });
  }, [unifiedItems, filter]);

  // Handlers para abrir modal de creación o edición
  const handleOpenNew = () => {
    setEditingItem(null);
    setFormName("");
    setFormAmount("");
    setFormDueDate(format(new Date(), "yyyy-MM-dd"));
    setFreq("monthly");
    setAutoPay(false);
    setCatId(categories.find((c) => c.type === "expense")?.id || "");
    setAccId(accounts[0]?.id || "");
    setFormType("expense");
    setSheetOpen(true);
  };

  const handleOpenEdit = (item: UnifiedObligationItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormAmount(item.amount.toString());
    setFormDueDate(format(item.dueDate, "yyyy-MM-dd"));
    setFreq(item.frequency);
    setAutoPay(item.autoPay);
    setCatId(item.category?.id || "");
    setAccId(item.accountId || accounts[0]?.id || "");
    setFormType(item.type);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingItem(null);
  };

  const handleSaveForm = () => {
    const parsed = parseThousandsInput(formAmount);
    if (!formName.trim() || !parsed) return;
    const targetDate = parseLocalDate(formDueDate);
    const selectedAcc = accounts.find((a) => a.id === formAccId) || accounts[0];
    const cat = categories.find((c) => c.id === formCatId);

    if (editingItem) {
      if (editingItem.origin === "bill") {
        onUpdateBill(editingItem.id, {
          name: formName.trim(),
          amount: parsed,
          dueDate: targetDate,
          frequency: formFreq,
          categoryId: formCatId || undefined,
          accountId: formAccId,
          autoPay: formAutoPay,
        });
      } else {
        onUpdateRecurring(editingItem.id, {
          description: formName.trim(),
          amount: parsed,
          nextDate: targetDate,
          frequency: formFreq,
          category: cat,
          accountId: formAccId,
          type: formType,
          currency: (selectedAcc?.currency as any) || "ARS",
        });
      }
    } else {
      // Alta nueva:
      // Si el usuario marcó autoPay y es recurrente periódica (y no 'once'),
      // se registra como recurring_transaction. De lo contrario, como bill_reminder.
      if (formAutoPay && formFreq !== "once") {
        onAddRecurring({
          id: generateUUID(),
          amount: parsed,
          description: formName.trim(),
          category: cat || {
            id: "general",
            name: "General",
            color: "bg-blue-500",
            type: formType,
            icon: "circle-dot",
          },
          type: formType,
          accountId: formAccId || selectedAcc?.id || "",
          frequency: formFreq,
          startDate: targetDate,
          nextDate: targetDate,
          paused: false,
          currency: (selectedAcc?.currency as any) || "ARS",
        });
      } else {
        onAddBill({
          id: generateUUID(),
          name: formName.trim(),
          amount: parsed,
          dueDate: targetDate,
          frequency: formFreq,
          categoryId: formCatId || undefined,
          accountId: formAccId || selectedAcc?.id || "",
          status: "pending",
          autoPay: formAutoPay,
        });
      }
    }

    handleCloseSheet();
  };

  const handleDeleteItem = (item: UnifiedObligationItem) => {
    if (item.origin === "bill") {
      onDeleteBill(item.id);
    } else {
      onDeleteRecurring(item.id);
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="pt-2 pb-8 max-w-2xl mx-auto">
      {/* Header unificado con botón de agregar */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-display font-semibold text-foreground">
            {t("nav.obligations")}
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("obligations.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAuditorOpen(true)}
            className="h-8 px-2.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-[12px] font-medium flex items-center gap-1.5 border border-border/50 shadow-xs active:scale-95 transition-all"
            title={t("auditor.title")}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t("auditor.openAuditor")}</span>
            <span className="sm:hidden">Auditor</span>
          </button>
          <button
            onClick={handleOpenNew}
            className="h-8 px-3 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium flex items-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("common.new")}</span>
          </button>
        </div>
      </div>

      {/* Chips de filtro rápido con scroll horizontal fluido y padding de respiro */}
      <div className="px-4 mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-colors ${
            filter === "all"
              ? "bg-foreground text-background"
              : "bg-secondary/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("common.all")} ({unifiedItems.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
            filter === "pending"
              ? "bg-destructive text-destructive-foreground"
              : "bg-secondary/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>{t("obligations.pendingPayment")}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("auto")}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
            filter === "auto"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>{t("obligations.autoDebits")}</span>
          {autoCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-bold">
              {autoCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("paused")}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
            filter === "paused"
              ? "bg-amber-500 text-white"
              : "bg-secondary/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pause className="w-3 h-3" />
          <span>{t("obligations.paused")}</span>
        </button>
        <div className="w-6 shrink-0" aria-hidden="true" />
      </div>

      {/* Listado unificado cronológico */}
      <div className="px-4 space-y-2.5 pb-28 md:pb-8">
        {filteredItems.length === 0 && (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/60 bg-card/40 backdrop-blur-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Repeat className="w-6 h-6 opacity-70" />
            </div>
            <p className="text-[14px] font-semibold text-foreground font-display">
              {t("obligations.noCommitmentsInView")}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              {t("obligations.tapNewHint")}
            </p>
          </div>
        )}

        {filteredItems.map((item) => {
          const acc = accounts.find((a) => a.id === item.accountId);
          const isOverdue = item.status === "overdue";
          const isPaid = item.status === "paid";
          const isPaused = item.status === "paused" || item.paused;

          return (
            <motion.div
              key={`${item.origin}-${item.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-[16px] bg-card border transition-all ${
                isPaid
                  ? "opacity-60 border-border/40 bg-card/60"
                  : isOverdue
                  ? "border-destructive/40 bg-destructive/5"
                  : isPaused
                  ? "opacity-65 border-border/40"
                  : "border-border/60 hover:border-border"
              }`}
            >
              {/* Fila principal: Ícono + Título/Cuenta a la izquierda, Monto destacado a la derecha */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.category ? (
                    <div
                      className={`w-9 h-9 rounded-[11px] ${item.category.color} flex items-center justify-center shrink-0 shadow-xs`}
                    >
                      <CategoryIcon
                        name={item.category.icon || "circle-dot"}
                        className="w-4 h-4 text-white"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-[11px] bg-secondary flex items-center justify-center shrink-0 text-muted-foreground shadow-xs">
                      <Repeat className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[14px] font-semibold text-foreground truncate block leading-snug">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                      <span>{freqLabel(item.frequency)}</span>
                      {acc && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${acc.color}`} />
                            <span className="truncate">{acc.name}</span>
                            {acc.type === "credit" && (
                              <span className="text-[10px] text-primary/80 font-normal shrink-0">
                                {acc.paymentDay
                                  ? t("obligations.dayLabel").replace("{day}", String(acc.paymentDay))
                                  : t("obligations.cardLabel")}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-mono-data text-[15px] font-bold tracking-tight block ${
                      item.type === "income" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {formatAmount(item.amount, {
                      sign: item.type === "income" ? "+" : "-",
                    })}
                  </span>
                </div>
              </div>

              {/* Fila intermedia: Badges de Workflow y Fecha de vencimiento */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {/* Workflow Badge */}
                {item.autoPay ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] bg-primary/10 text-primary border border-primary/20 font-medium">
                    <Zap className="w-3 h-3 shrink-0" /> {t("obligations.badgeAuto")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] bg-secondary text-muted-foreground font-medium">
                    <Clock className="w-3 h-3 shrink-0" /> {t("obligations.badgeManual")}
                  </span>
                )}

                {/* Due Date Chip */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium ${
                  isOverdue
                    ? "bg-destructive/10 text-destructive border border-destructive/25"
                    : isPaid
                    ? "bg-secondary/70 text-muted-foreground"
                    : "bg-secondary/70 text-foreground/85"
                }`}>
                  {isPaid ? t("obligations.paidPrefix") : isOverdue ? t("obligations.overduePrefix") : t("obligations.duePrefix")}
                  {format(item.dueDate, "d MMM yyyy")}
                </span>
              </div>

              {/* Barra inferior de estado y acciones */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                <div>
                  {isPaid && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <Check className="w-3 h-3" /> {t("obligations.statusPaid")}
                    </span>
                  )}
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                      <AlertCircle className="w-3 h-3" /> {t("obligations.statusOverdue")}
                    </span>
                  )}
                  {isPaused && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500">
                      <Pause className="w-3 h-3" /> {t("obligations.statusPaused")}
                    </span>
                  )}
                  {!isPaid && !isOverdue && !isPaused && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Clock className="w-3 h-3 text-amber-500" /> {t("obligations.statusUpcoming")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón Pagar en pagos manuales pendientes */}
                  {item.origin === "bill" && item.status !== "paid" && (
                    payingId === item.id ? (
                      <div className="flex items-center gap-1 mr-1">
                        <select
                          value={payAccId}
                          onChange={(e) => setPayAccId(e.target.value)}
                          className="h-7 text-[11px] bg-secondary border border-border/60 rounded-lg px-2 text-foreground focus:outline-none"
                        >
                          {accounts
                            .filter((a) => a.type !== "credit" && !a.archived)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => {
                            onMarkBillPaid(item.id, payAccId);
                            setPayingId(null);
                          }}
                          className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>{t("common.confirm")}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (item.accountId) setPayAccId(item.accountId);
                          setPayingId(item.id);
                        }}
                        className="h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors mr-1"
                      >
                        {t("obligations.markPaid")}
                      </button>
                    )
                  )}

                  {/* Pausar / Reanudar si es recurrente */}
                  {item.origin === "recurring" && (
                    <button
                      onClick={() => onToggleRecurringPause(item.id)}
                      title={item.paused ? t("obligations.resume") : t("obligations.pause")}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {item.paused ? (
                        <Play className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Pause className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </button>
                  )}

                  {/* Editar en Sheet */}
                  <button
                    onClick={() => handleOpenEdit(item)}
                    title={t("common.edit")}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Eliminar con confirmación compacta */}
                  {confirmDeleteId === `${item.origin}-${item.id}` ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 rounded text-[11px] text-muted-foreground hover:bg-muted"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="px-2 py-0.5 rounded text-[11px] bg-destructive text-destructive-foreground font-medium"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(`${item.origin}-${item.id}`)}
                      title={t("common.delete")}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal / Sheet ergonómico y único para Crear y Editar */}
      <ResponsiveSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        title={
          editingItem
            ? t("obligations.editTitle")
            : t("obligations.newTitle")
        }
      >
        <div className="px-5 pb-6 pt-2 space-y-4">
          {/* Tipo: Ingreso o Gasto */}
          <div className="flex justify-center">
            <div className="flex bg-secondary rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setFormType("expense")}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  formType === "expense"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                {t("quickadd.expense")}
              </button>
              <button
                type="button"
                onClick={() => setFormType("income")}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  formType === "income"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                {t("quickadd.income")}
              </button>
            </div>
          </div>

          {/* Nombre / Descripción */}
          <div>
            <label className="text-[12px] text-muted-foreground font-medium mb-1 block">
              {t("obligations.nameLabel")}
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t("obligations.namePlaceholder")}
              className="w-full h-11 px-3 rounded-[12px] bg-input border border-border text-foreground text-[14px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Importe */}
          <div>
            <label className="text-[12px] text-muted-foreground font-medium mb-1 block">
              {t("txedit.amount")}
            </label>
            <MoneyInput
              value={formAmount}
              onChange={(val) => setFormAmount(val)}
              placeholder="0,00"
            />
          </div>

          {/* Fecha de vencimiento / impacto */}
          <div>
            <label className="text-[12px] text-muted-foreground font-medium mb-1 block">
              {t("obligations.dueDateLabel")}
            </label>
            <input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="w-full h-11 px-3 rounded-[12px] bg-input border border-border text-foreground text-[14px] focus:outline-none"
            />
          </div>

          {/* Frecuencia */}
          <div>
            <label className="text-[12px] text-muted-foreground font-medium mb-2 block">
              {t("recurring.frequency")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFreq(f)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    formFreq === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {freqLabel(f)}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Toggle: Débito Automático vs Pago Manual */}
          <div className="p-3.5 rounded-[14px] bg-secondary/50 border border-border/50 flex items-center justify-between">
            <div className="pr-3">
              <div className="flex items-center gap-1.5">
                <Zap
                  className={`w-4 h-4 ${
                    formAutoPay ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="text-[13px] font-medium text-foreground">
                  {t("obligations.autoDebit")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formAutoPay
                  ? t("obligations.autoPayDesc")
                  : t("obligations.manualPayDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoPay((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
                formAutoPay ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-background shadow-xs transition-transform ${
                  formAutoPay ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-[12px] text-muted-foreground font-medium mb-2 block">
              {t("quickadd.category")}
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {categories
                .filter((c) => c.type === formType && !c.archived)
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCatId(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                      formCatId === cat.id
                        ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30 font-medium"
                        : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-[5px] ${cat.color} flex items-center justify-center`}
                    >
                      <CategoryIcon
                        name={cat.icon || "circle-dot"}
                        className="w-2.5 h-2.5 text-white"
                      />
                    </div>
                    {cat.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Cuenta o Tarjeta */}
          <div>
            <label className="text-[12px] text-muted-foreground font-medium mb-2 block">
              {t("quickadd.account")}
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccId(acc.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                    formAccId === acc.id
                      ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30 font-medium"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${acc.color}`} />
                  <span>{acc.name}</span>
                  {acc.type === "credit" && (
                    <span className="text-[10px] text-muted-foreground">
                      {t("obligations.cardLabel")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={handleCloseSheet}
              className="flex-1 h-12 rounded-[12px] bg-secondary text-foreground font-medium text-[14px] hover:bg-secondary/80 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={!formName.trim() || !parseThousandsInput(formAmount)}
              className="flex-[2] h-12 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </ResponsiveSheet>

      <SubscriptionAuditor
        open={auditorOpen}
        onClose={() => setAuditorOpen(false)}
        transactions={transactions}
        recurringTxs={recurringTxs}
        bills={bills}
        onOpenCreateBill={(name, amount) => {
          setFormName(name);
          setFormAmount(amount.toString());
          setFormDueDate(format(new Date(), "yyyy-MM-dd"));
          setFreq("monthly");
          setSheetOpen(true);
        }}
      />
    </div>
  );
}
