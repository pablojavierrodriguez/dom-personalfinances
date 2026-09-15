import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Transaction, Account, DEFAULT_ACCOUNTS,
  Category, CATEGORIES, getStatementPeriod, getPreviousStatementPeriod, getOffsetStatementPeriod,
  Budget, Goal, RecurringTransaction, BillReminder, Tag, TransactionRule,
  type RecurrenceFrequency,
} from "./types";
import { Currency, DEFAULT_EXCHANGE_RATES } from "./settings-types";
import { applyRulesToTransaction } from "./rules-engine";
import { useAuth } from "./auth-context";
import { useSettings } from "./settings-store";
import { fetchAccounts, insertAccount, updateAccountRemote, deleteAccountRemote } from "@/services/accounts.service";
import { fetchCategories, insertCategory, updateCategoryRemote, deleteCategoryRemote, seedDefaultCategoriesRemote } from "@/services/categories.service";
import { fetchTransactions, insertTransaction, insertTransactionsBatch, updateTransactionRemote, deleteTransactionRemote, deleteTransactionsByGroupIdRemote, isValidUuid } from "@/services/transactions.service";
import {
  fetchBudgets, insertBudget, updateBudgetRemote, deleteBudgetRemote,
  fetchGoals, insertGoal, updateGoalRemote, deleteGoalRemote,
  fetchBills, insertBill, updateBillRemote, deleteBillRemote,
  fetchRecurringTransactions, insertRecurringTransaction, updateRecurringTransactionRemote, deleteRecurringTransactionRemote
} from "@/services/planning.service";
import { fetchTags, insertTag, updateTagRemote, deleteTagRemote } from "@/services/tags.service";
import { fetchRules, insertRule, insertRulesBatch, updateRuleRemote, deleteRuleRemote, createDefaultRulesTemplates } from "@/services/rules.service";
import { purgeAllUserData as purgeUserDataService } from "@/services/user-data.service";

import {
  CACHE_KEYS,
  GLOBAL_QUEUE_KEY,
  getCachedData,
  setCachedData,
  enqueueGlobalSyncOp,
  syncPendingGlobalQueue,
  getPendingGlobalSyncCount,
  generateUUID,
  getGlobalSyncQueue,
} from "@/services/sync-queue.service";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getNextDate(from: Date, freq: RecurrenceFrequency): Date {
  const d = new Date(from);
  switch (freq) {
    case "once": return d;
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

export function useFinanceStore() {
  const { user } = useAuth();
  const { t } = useSettings();
  const now = new Date();

  // Hidratación instantánea (0ms) desde caché local persistido
  const initialAccounts = getCachedData<Account[]>(CACHE_KEYS.ACCOUNTS, []);
  const initialCategories = getCachedData<Category[]>(CACHE_KEYS.CATEGORIES, []);
  const initialBudgets = getCachedData<Budget[]>(CACHE_KEYS.BUDGETS, []);
  const initialGoals = getCachedData<Goal[]>(CACHE_KEYS.GOALS, []);
  const initialBills = getCachedData<BillReminder[]>(CACHE_KEYS.BILLS, []);
  const initialRecurring = getCachedData<RecurringTransaction[]>(CACHE_KEYS.RECURRING, []);
  const initialTransactions = getCachedData<any[]>(CACHE_KEYS.TRANSACTIONS, []).map((t: any) => ({
    ...t,
    date: new Date(t.date),
  }));

  const [loading, setLoading] = useState(() => initialAccounts.length === 0 && initialCategories.length === 0);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [recurringTxs, setRecurringTxs] = useState<RecurringTransaction[]>(initialRecurring);
  const [bills, setBills] = useState<BillReminder[]>(initialBills);
  const [tags, setTags] = useState<Tag[]>(() => loadJSON("tags", []));
  const [pendingGlobalSyncCount, setPendingGlobalSyncCount] = useState<number>(() => getPendingGlobalSyncCount());
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  const RULES_STORAGE_KEY = "dom-transaction-rules";
  const LEGACY_RULES_STORAGE_KEY = "impero-transaction-rules";
  const OLD_LEGACY_RULES_STORAGE_KEY = "m3-transaction-rules";

  const [rules, setRules] = useState<TransactionRule[]>(() => {
    const modern = loadJSON<TransactionRule[] | null>(RULES_STORAGE_KEY, null);
    if (modern !== null) return modern;
    const legacy = loadJSON<TransactionRule[] | null>(LEGACY_RULES_STORAGE_KEY, null);
    if (legacy !== null) return legacy;
    return loadJSON(OLD_LEGACY_RULES_STORAGE_KEY, []);
  });

  const saveRules = useCallback((newRules: TransactionRule[]) => {
    setRules(newRules);
    saveJSON(RULES_STORAGE_KEY, newRules);
  }, []);

  // Cargar datos desde Supabase al autenticarse (Stale-While-Revalidate en segundo plano)
  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setRecurringTxs([]);
      setBills([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      try {
        if (initialAccounts.length === 0 && initialCategories.length === 0) {
          setLoading(true);
        }
        const [accs, cats, bds, gls, bls, remoteTags, remoteRules] = await Promise.all([
          fetchAccounts(),
          fetchCategories(),
          fetchBudgets(),
          fetchGoals(),
          fetchBills(),
          fetchTags().catch((err) => {
            console.warn("Could not fetch remote tags, using local:", err);
            return loadJSON<Tag[]>("tags", []);
          }),
          fetchRules().catch((err) => {
            console.warn("Could not fetch remote rules, using local:", err);
            const modern = loadJSON<TransactionRule[] | null>(RULES_STORAGE_KEY, null);
            if (modern !== null) return modern;
            return loadJSON<TransactionRule[]>(LEGACY_RULES_STORAGE_KEY, []);
          }),
        ]);

        if (!isMounted) return;

        // Preservar cuentas encoladas pendientes de sincronización para que nunca desaparezcan
        const pendingAccountOps = getGlobalSyncQueue().filter(op => op.type === "insert_account");
        const mergedAccs = [...accs];
        for (const op of pendingAccountOps) {
          if (op.type === "insert_account" && op.payload) {
            const p = op.payload;
            if (!mergedAccs.some(a => a.id === p.id)) {
              mergedAccs.push({
                id: p.id,
                name: p.name,
                balance: p.balance,
                type: p.type,
                color: p.color,
                icon: p.icon || undefined,
                archived: p.archived || false,
                creditLimit: p.creditLimit || undefined,
                closingDay: p.closingDay || undefined,
                paymentDay: p.paymentDay || undefined,
                brand: p.brand || undefined,
                customBrandName: p.customBrandName || undefined,
                currency: p.currency || "ARS",
                creditCardViewMode: p.creditCardViewMode || "statement_cycles",
              });
            }
          }
        }

        setAccounts(mergedAccs);
        setCategories(cats);
        setBudgets(bds);
        setGoals(gls);
        setBills(bls);
        setTags(remoteTags);
        setRules(remoteRules);

        // Guardar snapshot actualizado en caché local
        setCachedData(CACHE_KEYS.ACCOUNTS, mergedAccs);
        setCachedData(CACHE_KEYS.CATEGORIES, cats);
        setCachedData(CACHE_KEYS.BUDGETS, bds);
        setCachedData(CACHE_KEYS.GOALS, gls);
        setCachedData(CACHE_KEYS.BILLS, bls);
        setCachedData(CACHE_KEYS.TAGS, remoteTags);
        setCachedData(CACHE_KEYS.RULES, remoteRules);

        // Fetch transactions and recurring transactions with resolved categories
        const [txs, recTxs] = await Promise.all([
          fetchTransactions(cats),
          fetchRecurringTransactions(cats),
        ]);
        if (!isMounted) return;
        setTransactions(txs);
        setRecurringTxs(recTxs);
        setCachedData(CACHE_KEYS.TRANSACTIONS, txs);
        setCachedData(CACHE_KEYS.RECURRING, recTxs);

        // Disparar sincronización de cualquier operación encolada previa
        syncPendingGlobalQueue().then(({ remaining }) => {
          if (isMounted) setPendingGlobalSyncCount(remaining);
        }).catch(console.warn);
      } catch (err) {
        console.warn("Error loading remote data, utilizing instant offline cache:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Auto-sincronización al reconectar
    const handleOnline = () => {
      syncPendingGlobalQueue().then(({ processed, remaining }) => {
        if (isMounted) {
          setPendingGlobalSyncCount(remaining);
          if (processed > 0) {
            toast.success(`${processed} operaciones sincronizadas con la nube`);
            loadData();
          }
        }
      }).catch(console.warn);
    };

    window.addEventListener("online", handleOnline);
    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
    };
  }, [user]);

  // Persist helpers
  const saveBudgets = (b: Budget[]) => { setBudgets(b); saveJSON("budgets", b); };
  const saveGoals = (g: Goal[]) => { setGoals(g); saveJSON("goals", g); };
  const saveBills = (b: BillReminder[]) => { setBills(b); saveJSON("bills", b); };
  const saveTags = (t: Tag[]) => { setTags(t); saveJSON("tags", t); };

  // ===== TRANSACTIONS =====
  const addTransaction = useCallback((
    amount: number, description: string, category: Category,
    type: "income" | "expense", accountId: string,
    extras?: { tags?: string[]; note?: string; installments?: number; receiptUrl?: string; currency?: Currency; date?: Date }
  ) => {
    // Aplicar motor de automatizaciones y reglas (P10)
    const evaluated = applyRulesToTransaction(
      {
        amount,
        description,
        category,
        type,
        accountId,
        tags: extras?.tags,
        note: extras?.note,
      },
      rules,
      categories
    );

    const effDesc = evaluated.description;
    const effCategory = evaluated.category;
    const effTags = evaluated.tags;
    const targetAccount = accounts.find(a => a.id === accountId);
    const txCurrency: Currency = extras?.currency || targetAccount?.currency || "ARS";

    // Calcular impacto en balance (en la moneda de la cuenta)
    const accCurrency: Currency = targetAccount?.currency || "ARS";
    let effectiveAmountForAccount = amount;
    if (txCurrency !== accCurrency) {
      const rateFrom = DEFAULT_EXCHANGE_RATES[txCurrency] ?? 1;
      const rateTo = DEFAULT_EXCHANGE_RATES[accCurrency] ?? 1;
      const amountInArs = rateFrom > 0 ? amount / rateFrom : amount;
      effectiveAmountForAccount = amountInArs * rateTo;
    }

    const currentBalance = targetAccount?.balance ?? 0;
    const balanceDelta = targetAccount?.type === "credit"
      ? (type === "expense" ? effectiveAmountForAccount : -effectiveAmountForAccount)
      : (type === "income" ? effectiveAmountForAccount : -effectiveAmountForAccount);
    const newBalance = currentBalance + balanceDelta;

    // Actualización optimista del balance
    setAccounts(prev => {
      const next = prev.map(acc => {
        if (acc.id === accountId) {
          updateAccountRemote(acc.id, { balance: newBalance }).catch(err => {
            console.warn("[updateAccountRemote] Fallo remoto, encolando balance:", err);
            enqueueGlobalSyncOp({
              type: "update_account_balance",
              id: acc.id,
              balance: newBalance,
            });
            setPendingGlobalSyncCount(getPendingGlobalSyncCount());
          });
          return { ...acc, balance: newBalance };
        }
        return acc;
      });
      setCachedData(CACHE_KEYS.ACCOUNTS, next);
      return next;
    });

    if (extras?.installments && extras.installments > 1) {
      const groupId = Date.now().toString();
      const perInstallment = amount / extras.installments;
      const isCredit = targetAccount?.type === "credit";
      const closingDay = targetAccount?.closingDay || 15;

      const now = new Date();
      // Si la tarjeta cerró este mes (día actual > closingDay), la primera cuota vence en el resumen siguiente (+1 mes)
      const shouldShiftNextMonth = isCredit && now.getDate() > closingDay;

      const newTxsToInsert: Transaction[] = [];
      for (let i = 0; i < extras.installments; i++) {
        const txDate = new Date();
        const monthOffset = (shouldShiftNextMonth ? 1 : 0) + i;
        txDate.setMonth(txDate.getMonth() + monthOffset);
        newTxsToInsert.push({
          id: generateUUID(),
          amount: perInstallment,
          description: `${effDesc} (${i + 1}/${extras.installments})`,
          category: effCategory, date: txDate, type, accountId,
          currency: txCurrency,
          tags: effTags, note: extras?.note, receiptUrl: extras?.receiptUrl,
          installmentInfo: { current: i + 1, total: extras.installments, groupId },
        });
      }

      // Inserción optimista en memoria y caché local
      setTransactions(prev => {
        const next = [...newTxsToInsert, ...prev];
        setCachedData(CACHE_KEYS.TRANSACTIONS, next);
        return next;
      });

      insertTransactionsBatch(newTxsToInsert)
        .catch(err => {
          console.warn("[addTransaction] Sin conexión o fallo remoto en cuotas. Encolando para sync:", err);
          for (const tx of newTxsToInsert) {
            enqueueGlobalSyncOp({
              type: "insert_transaction",
              payload: {
                id: tx.id,
                amount: tx.amount,
                description: tx.description,
                categoryId: tx.category?.id,
                date: tx.date.toISOString(),
                type: tx.type,
                accountId: tx.accountId,
                currency: tx.currency,
                tags: tx.tags,
                note: tx.note,
                receiptUrl: tx.receiptUrl,
                installmentInfo: tx.installmentInfo,
              },
            });
          }
          setPendingGlobalSyncCount(getPendingGlobalSyncCount());
          toast.info(t("toast.offlineInstallmentsSaved"));
        });
    } else {
      // Usar la fecha especificada por el usuario (si existe) o la fecha actual
      const singleTxDate = extras?.date ? new Date(extras.date) : new Date();
      if (!extras?.date && targetAccount?.type === "credit" && type === "expense") {
        const closingDay = targetAccount?.closingDay || 15;
        if (singleTxDate.getDate() > closingDay) {
          singleTxDate.setMonth(singleTxDate.getMonth() + 1);
        }
      }

      if (!accountId) {
        console.error("[addTransaction] ERROR: accountId vacío, abortando insert", { amount, description, type });
        return;
      }

      const clientTxId = generateUUID();
      const newTx: Transaction = {
        id: clientTxId,
        amount, description: effDesc, category: effCategory, date: singleTxDate, type, accountId,
        currency: txCurrency,
        tags: effTags, note: extras?.note, receiptUrl: extras?.receiptUrl,
      };

      // Inserción optimista garantizada en memoria y caché
      setTransactions(prev => {
        const next = [newTx, ...prev];
        setCachedData(CACHE_KEYS.TRANSACTIONS, next);
        return next;
      });

      insertTransaction(newTx)
        .catch(err => {
          console.warn("[addTransaction] Sin conexión o fallo remoto. Encolando para sync diferido:", err);
          enqueueGlobalSyncOp({
            type: "insert_transaction",
            payload: {
              id: clientTxId,
              amount,
              description: effDesc,
              categoryId: effCategory?.id,
              date: singleTxDate.toISOString(),
              type,
              accountId,
              currency: txCurrency,
              tags: effTags,
              note: extras?.note,
              receiptUrl: extras?.receiptUrl,
            },
          });
          setPendingGlobalSyncCount(getPendingGlobalSyncCount());
          toast.info(t("toast.offlineTxSaved"));
        });
    }
  }, [categories, accounts, rules, t]);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    updateTransactionRemote(id, updates).catch(err => {
      console.warn("[updateTransaction] Fallo remoto, encolando:", err);
      enqueueGlobalSyncOp({
        type: "update_transaction",
        id,
        payload: {
          amount: updates.amount,
          description: updates.description,
          categoryId: updates.category?.id,
          date: updates.date ? (typeof updates.date === "string" ? updates.date : updates.date.toISOString()) : undefined,
          type: updates.type,
          accountId: updates.accountId,
          currency: updates.currency,
          tags: updates.tags,
          note: updates.note,
        },
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });

    setTransactions(prev => {
      const prevTx = prev.find(t => t.id === id);
      if (!prevTx) return prev;

      // Las transferencias se gestionan con su propia lógica de doble leg
      if (prevTx.isTransfer) {
        const next = prev.map(t => (t.id === id ? { ...t, ...updates } : t));
        setCachedData(CACHE_KEYS.TRANSACTIONS, next);
        return next;
      }

      const prevAmount = prevTx.amount;
      const prevAccId = prevTx.accountId;
      const prevType = prevTx.type;
      const prevCurrency = prevTx.currency || "ARS";

      const newAmount = updates.amount !== undefined ? updates.amount : prevAmount;
      const newAccId = updates.accountId !== undefined ? updates.accountId : prevAccId;
      const newType = updates.type !== undefined ? updates.type : prevType;
      const newCurrency = updates.currency !== undefined ? updates.currency : prevCurrency;

      const balanceChanged =
        newAmount !== prevAmount ||
        newAccId !== prevAccId ||
        newType !== prevType ||
        newCurrency !== prevCurrency;

      if (balanceChanged) {
        setAccounts(accs => {
          const nextAccs = accs.map(acc => {
            let newBal = acc.balance;
            const accCurrency = (acc.currency as Currency) || "ARS";

            // Paso 1: revertir el impacto de la transacción anterior en la cuenta original
            if (acc.id === prevAccId) {
              let prevEffective = prevAmount;
              if (prevCurrency !== accCurrency) {
                const rateFrom = DEFAULT_EXCHANGE_RATES[prevCurrency] ?? 1;
                const rateTo = DEFAULT_EXCHANGE_RATES[accCurrency] ?? 1;
                const amountInArs = rateFrom > 0 ? prevAmount / rateFrom : prevAmount;
                prevEffective = amountInArs * rateTo;
              }

              const isCredit = acc.type === "credit";
              const revertDelta = isCredit
                ? (prevType === "expense" ? -prevEffective : prevEffective)
                : (prevType === "income" ? -prevEffective : prevEffective);

              newBal = acc.balance + revertDelta;
            }

            // Paso 2: aplicar el nuevo impacto en la cuenta destino
            if (acc.id === newAccId) {
              let newEffective = newAmount;
              if (newCurrency !== accCurrency) {
                const rateFrom = DEFAULT_EXCHANGE_RATES[newCurrency] ?? 1;
                const rateTo = DEFAULT_EXCHANGE_RATES[accCurrency] ?? 1;
                const amountInArs = rateFrom > 0 ? newAmount / rateFrom : newAmount;
                newEffective = amountInArs * rateTo;
              }

              const baseBalance = acc.id === prevAccId ? newBal : acc.balance;
              const isCredit = acc.type === "credit";
              const applyDelta = isCredit
                ? (newType === "expense" ? newEffective : -newEffective)
                : (newType === "income" ? newEffective : -newEffective);

              newBal = baseBalance + applyDelta;
            }

            if (newBal !== acc.balance) {
              updateAccountRemote(acc.id, { balance: newBal }).catch(err => {
                enqueueGlobalSyncOp({ type: "update_account_balance", id: acc.id, balance: newBal });
                setPendingGlobalSyncCount(getPendingGlobalSyncCount());
              });
              return { ...acc, balance: newBal };
            }
            return acc;
          });
          setCachedData(CACHE_KEYS.ACCOUNTS, nextAccs);
          return nextAccs;
        });
      }

      const next = prev.map(t => (t.id === id ? { ...t, ...updates } : t));
      setCachedData(CACHE_KEYS.TRANSACTIONS, next);
      return next;
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    deleteTransactionRemote(id).catch(err => {
      console.warn("[deleteTransaction] Fallo remoto, encolando:", err);
      enqueueGlobalSyncOp({
        type: "delete_transaction",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });

    setTransactions(prev => {
      const tx = prev.find(t => t.id === id);
      if (tx) {
        setAccounts(accs => {
          const nextAccs = accs.map(acc => {
            if (acc.id === tx.accountId) {
              const isCredit = acc.type === "credit";
              const newBal = isCredit
                ? (tx.type === "expense" ? acc.balance - tx.amount : acc.balance + tx.amount)
                : (tx.type === "income" ? acc.balance - tx.amount : acc.balance + tx.amount);
              updateAccountRemote(acc.id, { balance: newBal }).catch(err => {
                enqueueGlobalSyncOp({ type: "update_account_balance", id: acc.id, balance: newBal });
                setPendingGlobalSyncCount(getPendingGlobalSyncCount());
              });
              return { ...acc, balance: newBal };
            }
            return acc;
          });
          setCachedData(CACHE_KEYS.ACCOUNTS, nextAccs);
          return nextAccs;
        });
      }
      const nextTxs = prev.filter(t => t.id !== id);
      setCachedData(CACHE_KEYS.TRANSACTIONS, nextTxs);
      return nextTxs;
    });
  }, []);

  const deleteInstallmentGroup = useCallback((groupId: string) => {
    deleteTransactionsByGroupIdRemote(groupId).catch(err => console.error(err));
    setTransactions(prev => {
      const groupTxs = prev.filter(t => t.installmentInfo?.groupId === groupId);
      if (groupTxs.length > 0) {
        // Calcular total a revertir por cuenta
        // Para cuentas normales: revertir expense suma saldo (change positivo)
        // Para tarjetas de crédito: revertir expense REDUCE la deuda (change negativo)
        const deltas = new Map<string, number>();
        for (const tx of groupTxs) {
          const current = deltas.get(tx.accountId) || 0;
          // change se aplica con acc.balance + delta, así que:
          // crédito+expense → delta negativo (reduce deuda)
          // normal+expense → delta positivo (devuelve saldo)
          // El tipo de cuenta lo resolvemos al aplicar el delta:
          const change = tx.type === "income" ? -tx.amount : tx.amount;
          deltas.set(tx.accountId, current + change);
        }
        setAccounts(accs => accs.map(acc => {
          const delta = deltas.get(acc.id);
          if (delta !== undefined && delta !== 0) {
            // Para tarjetas de crédito: invertir el signo del delta
            // (revertir expense debe REDUCIR la deuda, no aumentarla)
            const creditAdjustedDelta = acc.type === "credit" ? -delta : delta;
            const newBal = acc.balance + creditAdjustedDelta;
            updateAccountRemote(acc.id, { balance: newBal }).catch(console.error);
            return { ...acc, balance: newBal };
          }
          return acc;
        }));
      }
      return prev.filter(t => t.installmentInfo?.groupId !== groupId);
    });
  }, []);

  const duplicateTransaction = useCallback((tx: Transaction) => {
    addTransaction(tx.amount, `${tx.description} (copia)`, tx.category, tx.type, tx.accountId, {
      tags: tx.tags, note: tx.note, receiptUrl: tx.receiptUrl,
    });
  }, [addTransaction]);

  const importTransactions = useCallback(async (newTxs: Transaction[]) => {
    if (newTxs.length === 0) return;

    const toInsert = newTxs.map(t => ({
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date,
      type: t.type,
      accountId: t.accountId,
      isTransfer: t.isTransfer || false,
      isCardPayment: t.isCardPayment || false,
      installmentInfo: t.installmentInfo,
      tags: t.tags,
      note: t.note,
      receiptUrl: t.receiptUrl,
    }));

    await insertTransactionsBatch(toInsert);
    const updatedTransactions = await fetchTransactions(categories);
    setTransactions(updatedTransactions);

    // Calcular impacto neto por cuenta
    const accountDeltas = new Map<string, number>();
    for (const tx of newTxs) {
      const current = accountDeltas.get(tx.accountId) || 0;
      const change = tx.type === "income" ? tx.amount : -tx.amount;
      accountDeltas.set(tx.accountId, current + change);
    }

    // Actualizar balance local y remoto de las cuentas afectadas
    setAccounts(prev =>
      prev.map(acc => {
        const delta = accountDeltas.get(acc.id);
        if (delta !== undefined && delta !== 0) {
          const newBal = acc.type === "credit"
            ? acc.balance - delta // para tarjetas, un gasto incrementa el balance adeudado
            : acc.balance + delta;
          updateAccountRemote(acc.id, { balance: newBal }).catch(console.error);
          return { ...acc, balance: newBal };
        }
        return acc;
      })
    );
  }, [categories]);

  // ===== CATEGORIES =====
  const addCategory = useCallback((cat: Category) => {
    const categoryId = (cat.id && isValidUuid(cat.id)) ? cat.id : generateUUID();
    const newCat = { ...cat, id: categoryId };
    setCategories(prev => {
      const next = [...prev, newCat];
      setCachedData(CACHE_KEYS.CATEGORIES, next);
      return next;
    });

    insertCategory(newCat)
      .catch(err => {
        console.warn("[addCategory] Offline/remote failure, enqueuing:", err);
        enqueueGlobalSyncOp({
          type: "insert_category",
          payload: {
            id: categoryId,
            name: newCat.name,
            color: newCat.color,
            type: newCat.type,
            icon: newCat.icon || null,
            parentId: newCat.parentId || null,
            archived: newCat.archived || false,
            order: newCat.order || 0,
          },
        });
        setPendingGlobalSyncCount(getPendingGlobalSyncCount());
      });
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      setCachedData(CACHE_KEYS.CATEGORIES, next);
      return next;
    });
    setTransactions(prev => {
      const next = prev.map(t => t.category.id === id ? { ...t, category: { ...t.category, ...updates } } : t);
      setCachedData(CACHE_KEYS.TRANSACTIONS, next);
      return next;
    });

    updateCategoryRemote(id, updates).catch(err => {
      console.warn("[updateCategory] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "update_category",
        id,
        payload: updates,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const archiveCategory = useCallback((id: string) => {
    updateCategory(id, { archived: true });
  }, [updateCategory]);

  const unarchiveCategory = useCallback((id: string) => {
    updateCategory(id, { archived: false });
  }, [updateCategory]);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => {
      const next = prev.filter(c => c.id !== id && c.parentId !== id);
      setCachedData(CACHE_KEYS.CATEGORIES, next);
      return next;
    });

    deleteCategoryRemote(id).catch(err => {
      console.warn("[deleteCategory] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_category",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const seedDefaultCategories = useCallback(async () => {
    try {
      const seeded = await seedDefaultCategoriesRemote();
      setCategories(prev => [...prev, ...seeded]);
      toast.success(t("toast.categoriesSeededSuccess"));
    } catch (err) {
      console.error("Error seeding default categories:", err);
      toast.error(t("toast.categoriesSeededError"));
      throw err;
    }
  }, [t]);

  const reassignTransactions = useCallback((fromCategoryId: string, toCategoryId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.category.id === fromCategoryId) {
        const newCat = categories.find(c => c.id === toCategoryId);
        if (newCat) {
          updateTransactionRemote(t.id, { category: newCat }).catch(console.error);
          return { ...t, category: newCat };
        }
      }
      return t;
    }));
  }, [categories]);

  const getTransactionCountByCategory = useCallback((categoryId: string) => transactions.filter(t => t.category.id === categoryId).length, [transactions]);
  const getRootCategories = useCallback((type?: "income" | "expense") => categories.filter(c => !c.parentId && !c.archived && (type ? c.type === type : true)), [categories]);
  const getSubcategories = useCallback((parentId: string) => categories.filter(c => c.parentId === parentId && !c.archived), [categories]);
  const getArchivedCategories = useCallback(() => categories.filter(c => c.archived), [categories]);
  const getAllActiveCategories = useCallback((type?: "income" | "expense") => categories.filter(c => !c.archived && (type ? c.type === type : true)), [categories]);

  // ===== ACCOUNTS =====
  const addAccount = useCallback((account: Account) => {
    const accountId = (account.id && isValidUuid(account.id)) ? account.id : generateUUID();
    const newAcc = { ...account, id: accountId };
    setAccounts(prev => {
      const next = [...prev, newAcc];
      setCachedData(CACHE_KEYS.ACCOUNTS, next);
      return next;
    });

    insertAccount(newAcc)
      .catch(err => {
        console.warn("[addAccount] Offline/remote failure, enqueuing:", err);
        enqueueGlobalSyncOp({
          type: "insert_account",
          payload: {
            id: accountId,
            name: newAcc.name,
            balance: newAcc.balance,
            type: newAcc.type,
            color: newAcc.color,
            icon: newAcc.icon || null,
            archived: newAcc.archived || false,
            creditLimit: newAcc.creditLimit || null,
            closingDay: newAcc.closingDay || null,
            paymentDay: newAcc.paymentDay || null,
            brand: newAcc.brand || null,
            customBrandName: newAcc.customBrandName || null,
            currency: newAcc.currency || "ARS",
            creditCardViewMode: newAcc.creditCardViewMode || "statement_cycles",
          },
        });
        setPendingGlobalSyncCount(getPendingGlobalSyncCount());
      });
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      setCachedData(CACHE_KEYS.ACCOUNTS, next);
      return next;
    });

    updateAccountRemote(id, updates).catch(err => {
      console.warn("[updateAccount] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "update_account",
        id,
        payload: updates,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const archiveAccount = useCallback((id: string) => {
    updateAccount(id, { archived: true });
  }, [updateAccount]);

  const unarchiveAccount = useCallback((id: string) => {
    updateAccount(id, { archived: false });
  }, [updateAccount]);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== id);
      setCachedData(CACHE_KEYS.ACCOUNTS, next);
      return next;
    });

    deleteAccountRemote(id).catch(err => {
      console.warn("[deleteAccount] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_account",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const adjustAccountBalance = useCallback((accountId: string, newBalance: number) => {
    setAccounts(prev => {
      const account = prev.find(a => a.id === accountId);
      if (!account) return prev;
      const diff = newBalance - account.balance;
      if (diff === 0) return prev;
      updateAccountRemote(accountId, { balance: newBalance }).catch(err => {
        enqueueGlobalSyncOp({ type: "update_account_balance", id: accountId, balance: newBalance });
        setPendingGlobalSyncCount(getPendingGlobalSyncCount());
      });
      const next = prev.map(a => a.id === accountId ? { ...a, balance: newBalance } : a);
      setCachedData(CACHE_KEYS.ACCOUNTS, next);
      return next;
    });
  }, []);

  const payCard = useCallback((cardId: string, fromAccountId: string, amount: number) => {
    setAccounts(prev => {
      const card = prev.find(a => a.id === cardId);
      const source = prev.find(a => a.id === fromAccountId);
      if (!card || !source || amount <= 0) return prev;

      const sourceCurrency: Currency = (source.currency as Currency) || "ARS";
      const cardCurrency: Currency = (card.currency as Currency) || "ARS";

      // Si la cuenta fuente tiene moneda diferente a la tarjeta, convertir para reducir
      // la deuda correctamente en la moneda de la tarjeta.
      let amountInCardCurrency = amount;
      if (sourceCurrency !== cardCurrency) {
        const rateFrom = DEFAULT_EXCHANGE_RATES[sourceCurrency] ?? 1;
        const rateTo = DEFAULT_EXCHANGE_RATES[cardCurrency] ?? 1;
        const amountInArs = rateFrom > 0 ? amount / rateFrom : amount;
        amountInCardCurrency = amountInArs * rateTo;
      }

      const paymentCategory = { id: "card-payment", name: "Card Payment", color: "bg-sky-500", type: "expense" as const, icon: "credit-card" };
      const now = new Date();

      // Persistir ambas transacciones en Supabase
      const txsToInsert: Omit<Transaction, "id">[] = [
        {
          amount,
          description: `Pago tarjeta: ${card.name}`,
          category: paymentCategory,
          date: now,
          type: "expense",
          accountId: fromAccountId,
          currency: sourceCurrency,
          isCardPayment: true,
        },
        {
          amount: amountInCardCurrency,
          description: `Pago recibido desde ${source.name}`,
          category: { ...paymentCategory, type: "income" as const },
          date: now,
          type: "income",
          accountId: cardId,
          currency: cardCurrency,
          isCardPayment: true,
        },
      ];

      insertTransactionsBatch(txsToInsert)
        .then(() => fetchTransactions(categories).then(setTransactions))
        .catch(err => console.error("Error inserting card payment transactions:", err));

      // Actualizar balances:
      // - Cuenta fuente: pierde el monto pagado (en su moneda)
      // - Tarjeta: la deuda se REDUCE (balance - amountInCardCurrency)
      return prev.map(a => {
        if (a.id === fromAccountId) {
          const newBal = a.balance - amount;
          updateAccountRemote(a.id, { balance: newBal }).catch(console.error);
          return { ...a, balance: newBal };
        }
        if (a.id === cardId) {
          // Para crédito: balance positivo = deuda adeudada. Pagar reduce la deuda.
          const newBal = a.balance - amountInCardCurrency;
          updateAccountRemote(a.id, { balance: newBal }).catch(console.error);
          return { ...a, balance: newBal };
        }
        return a;
      });
    });
  }, [categories]);

  const transferBetweenAccounts = useCallback((fromAccountId: string, toAccountId: string, amount: number, targetAmount?: number) => {
    setAccounts(prev => {
      const from = prev.find(a => a.id === fromAccountId);
      const to = prev.find(a => a.id === toAccountId);
      if (!from || !to || amount <= 0) return prev;
      const creditAmount = (targetAmount !== undefined && targetAmount > 0) ? targetAmount : amount;
      const transferCategory: Category = { id: "transfer", name: "Transfer", color: "bg-sky-500", type: "expense", icon: "arrow-left-right" };
      const fromCurrency = (from.currency as Currency) || "ARS";
      const toCurrency = (to.currency as Currency) || "ARS";
      const now = new Date();

      const txsToInsert: Omit<Transaction, "id">[] = [
        {
          amount,
          description: `Transfer to ${to.name}`,
          category: { ...transferCategory, type: "expense" },
          date: now,
          type: "expense",
          accountId: fromAccountId,
          currency: fromCurrency,
          isTransfer: true,
        },
        {
          amount: creditAmount,
          description: `Transfer from ${from.name}`,
          category: { ...transferCategory, type: "income" },
          date: now,
          type: "income",
          accountId: toAccountId,
          currency: toCurrency,
          isTransfer: true,
        },
      ];

      insertTransactionsBatch(txsToInsert)
        .then(() => fetchTransactions(categories).then(setTransactions))
        .catch(err => console.error("Error inserting transfer transactions:", err));

      return prev.map(a => {
        if (a.id === fromAccountId) {
          const newBal = a.balance - amount;
          updateAccountRemote(a.id, { balance: newBal }).catch(console.error);
          return { ...a, balance: newBal };
        }
        if (a.id === toAccountId) {
          const newBal = a.balance + creditAmount;
          updateAccountRemote(a.id, { balance: newBal }).catch(console.error);
          return { ...a, balance: newBal };
        }
        return a;
      });
    });
  }, [categories]);

  const getStatementTransactions = useCallback((cardId: string, period: "current" | "previous" | number = "current") => {
    const card = accounts.find(a => a.id === cardId);
    if (!card || !card.closingDay) return [];
    const offset = typeof period === "number" ? period : (period === "previous" ? -1 : 0);
    const { periodStart, periodEnd } = getOffsetStatementPeriod(card.closingDay, offset);
    return transactions.filter(t =>
      t.accountId === cardId && t.type === "expense" && !t.isCardPayment && t.date >= periodStart && t.date <= periodEnd
    );
  }, [accounts, transactions]);

  const getActiveAccounts = useCallback(() => accounts.filter(a => !a.archived), [accounts]);
  const getArchivedAccounts = useCallback(() => accounts.filter(a => a.archived), [accounts]);
  const getCreditCards = useCallback(() => accounts.filter(a => a.type === "credit" && !a.archived), [accounts]);
  const getTransactionsByAccount = useCallback((accountId: string) => transactions.filter(t => t.accountId === accountId), [transactions]);
  const getNonCardAccounts = useCallback(() => accounts.filter(a => a.type !== "credit" && !a.archived), [accounts]);

  /**
   * Calcula el balance "real" de una cuenta sumando todas sus transacciones almacenadas,
   * con conversión de moneda correcta. Sirve para detectar y corregir inconsistencias.
   * Retorna null si la cuenta no existe.
   */
  const recalculateAccountBalance = useCallback((accountId: string): number | null => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return null;

    const accountCurrency = (account.currency as Currency) || "ARS";
    const accountTxs = transactions.filter(t => t.accountId === accountId);

    let computed = 0;
    for (const tx of accountTxs) {
      const txCur = (tx.currency as Currency) || accountCurrency;
      let amt = tx.amount;
      if (txCur !== accountCurrency) {
        const rateFrom = DEFAULT_EXCHANGE_RATES[txCur] ?? 1;
        const rateTo = DEFAULT_EXCHANGE_RATES[accountCurrency] ?? 1;
        amt = (rateFrom > 0 ? amt / rateFrom : amt) * rateTo;
      }
      if (account.type === "credit") {
        computed += tx.type === "expense" ? amt : -amt;
      } else {
        computed += tx.type === "income" ? amt : -amt;
      }
    }
    return computed;
  }, [accounts, transactions]);

  /**
   * Sincroniza el balance almacenado de UNA cuenta con el derivado de sus transacciones.
   * Útil para reparar inconsistencias históricas.
   */
  const syncAccountBalance = useCallback((accountId: string) => {
    const computed = recalculateAccountBalance(accountId);
    if (computed === null) return;
    setAccounts(prev => prev.map(a => {
      if (a.id === accountId) {
        updateAccountRemote(a.id, { balance: computed }).catch(console.error);
        return { ...a, balance: computed };
      }
      return a;
    }));
  }, [recalculateAccountBalance]);

  /**
   * Sincroniza el balance de TODAS las cuentas desde sus transacciones.
   */
  const syncAllAccountBalances = useCallback(() => {
    setAccounts(prev => prev.map(a => {
      const computed = recalculateAccountBalance(a.id);
      if (computed === null) return a;
      updateAccountRemote(a.id, { balance: computed }).catch(console.error);
      return { ...a, balance: computed };
    }));
  }, [recalculateAccountBalance]);

  // ===== BUDGETS =====
  const addBudget = useCallback((budget: Budget) => {
    const budgetId = (budget.id && isValidUuid(budget.id)) ? budget.id : generateUUID();
    const newBudget = { ...budget, id: budgetId };
    setBudgets(prev => {
      const next = [...prev, newBudget];
      setCachedData(CACHE_KEYS.BUDGETS, next);
      return next;
    });

    insertBudget(newBudget).catch(err => {
      console.warn("[addBudget] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "insert_budget",
        payload: {
          id: budgetId,
          categoryId: newBudget.categoryId,
          amount: newBudget.amount,
          month: newBudget.month,
          year: newBudget.year,
          enableRollover: newBudget.enableRollover,
          accumulatedRollover: newBudget.accumulatedRollover,
        },
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const updateBudget = useCallback((id: string, updates: Partial<Budget>) => {
    setBudgets(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updates } : b);
      setCachedData(CACHE_KEYS.BUDGETS, next);
      return next;
    });

    updateBudgetRemote(id, updates).catch(err => {
      console.warn("[updateBudget] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "update_budget",
        id,
        payload: updates,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => {
      const next = prev.filter(b => b.id !== id);
      setCachedData(CACHE_KEYS.BUDGETS, next);
      return next;
    });

    deleteBudgetRemote(id).catch(err => {
      console.warn("[deleteBudget] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_budget",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const getBudgetSpent = useCallback((categoryId: string, month: number, year: number) => {
    return transactions
      .filter(t => t.category.id === categoryId && t.type === "expense" && !t.isCardPayment && !t.isTransfer && t.date.getMonth() === month && t.date.getFullYear() === year)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const getCurrentMonthBudgets = useCallback(() => {
    const m = now.getMonth();
    const y = now.getFullYear();
    return budgets.filter(b => b.month === m && b.year === y);
  }, [budgets, now]);

  // ===== GOALS =====
  const addGoal = useCallback((goal: Goal) => {
    const goalId = (goal.id && isValidUuid(goal.id)) ? goal.id : generateUUID();
    const newGoal = { ...goal, id: goalId };
    setGoals(prev => {
      const next = [newGoal, ...prev];
      setCachedData(CACHE_KEYS.GOALS, next);
      return next;
    });

    insertGoal(newGoal).catch(err => {
      console.warn("[addGoal] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "insert_goal",
        payload: {
          id: goalId,
          name: newGoal.name,
          targetAmount: newGoal.targetAmount,
          currentAmount: newGoal.currentAmount,
          color: newGoal.color,
          icon: newGoal.icon || null,
          deadline: newGoal.deadline ? newGoal.deadline.toISOString() : null,
        },
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals(prev => {
      const next = prev.map(g => g.id === id ? { ...g, ...updates } : g);
      setCachedData(CACHE_KEYS.GOALS, next);
      return next;
    });

    updateGoalRemote(id, updates).catch(err => {
      console.warn("[updateGoal] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "update_goal",
        id,
        payload: updates,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      const next = prev.filter(g => g.id !== id);
      setCachedData(CACHE_KEYS.GOALS, next);
      return next;
    });

    deleteGoalRemote(id).catch(err => {
      console.warn("[deleteGoal] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_goal",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const contributeToGoal = useCallback((id: string, amount: number, accountId?: string) => {
    let goalName = "Meta de Ahorro";
    setGoals(prev => {
      const next = prev.map(g => {
        if (g.id !== id) return g;
        goalName = g.name;
        const nextAmt = g.currentAmount + amount;
        const completed = nextAmt >= g.targetAmount;
        updateGoalRemote(id, { currentAmount: nextAmt, completed }).catch(err => {
          enqueueGlobalSyncOp({ type: "update_goal", id, payload: { currentAmount: nextAmt, completed } });
          setPendingGlobalSyncCount(getPendingGlobalSyncCount());
        });
        return { ...g, currentAmount: nextAmt, completed };
      });
      setCachedData(CACHE_KEYS.GOALS, next);
      return next;
    });

    if (accountId) {
      const goalCat = categories.find(c => c.id === "savings" || c.id === "investments") || {
        id: "savings",
        name: "Ahorro / Metas",
        color: "bg-emerald-500",
        type: "expense" as const,
        icon: "piggy-bank",
      };
      addTransaction(amount, `Aporte a meta: ${goalName}`, goalCat, "expense", accountId);
    }
  }, [categories, addTransaction]);

  const withdrawFromGoal = useCallback((id: string, amount: number, accountId?: string) => {
    let goalName = "Meta de Ahorro";
    setGoals(prev => {
      const next = prev.map(g => {
        if (g.id !== id) return g;
        goalName = g.name;
        const nextAmt = Math.max(0, g.currentAmount - amount);
        const completed = nextAmt >= g.targetAmount;
        updateGoalRemote(id, { currentAmount: nextAmt, completed }).catch(err => {
          enqueueGlobalSyncOp({ type: "update_goal", id, payload: { currentAmount: nextAmt, completed } });
          setPendingGlobalSyncCount(getPendingGlobalSyncCount());
        });
        return { ...g, currentAmount: nextAmt, completed };
      });
      setCachedData(CACHE_KEYS.GOALS, next);
      return next;
    });

    if (accountId) {
      const goalCat = categories.find(c => c.id === "savings" || c.id === "investments") || {
        id: "savings",
        name: "Ahorro / Metas",
        color: "bg-emerald-500",
        type: "income" as const,
        icon: "piggy-bank",
      };
      addTransaction(amount, `Retiro de meta: ${goalName}`, goalCat, "income", accountId);
    }
  }, [categories, addTransaction]);

  // ===== BILLS =====
  const addBill = useCallback((bill: BillReminder) => {
    const billId = (bill.id && isValidUuid(bill.id)) ? bill.id : generateUUID();
    const newBill = { ...bill, id: billId };
    setBills(prev => {
      const next = [...prev, newBill];
      setCachedData(CACHE_KEYS.BILLS, next);
      return next;
    });

    insertBill(newBill).catch(err => {
      console.warn("[addBill] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "insert_bill",
        payload: {
          id: billId,
          name: newBill.name,
          amount: newBill.amount,
          dueDate: newBill.dueDate.toISOString(),
          frequency: newBill.frequency,
          categoryId: newBill.categoryId || null,
          category: newBill.categoryId || null,
          accountId: newBill.accountId || null,
          isPaid: newBill.status === "paid",
          autoDebit: newBill.autoPay,
        },
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const updateBill = useCallback((id: string, updates: Partial<BillReminder>) => {
    setBills(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updates } : b);
      setCachedData(CACHE_KEYS.BILLS, next);
      return next;
    });

    updateBillRemote(id, updates).catch(err => {
      console.warn("[updateBill] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "update_bill",
        id,
        payload: updates,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBills(prev => {
      const next = prev.filter(b => b.id !== id);
      setCachedData(CACHE_KEYS.BILLS, next);
      return next;
    });

    deleteBillRemote(id).catch(err => {
      console.warn("[deleteBill] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_bill",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const markBillPaid = useCallback((id: string, accountId: string) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    // Create expense transaction
    const cat = categories.find(c => c.id === bill.categoryId) ||
      { id: "bills", name: "Servicios/Facturas", color: "bg-red-400", type: "expense" as const, icon: "file-text" };
    
    addTransaction(bill.amount, bill.name, cat, "expense", accountId);

    // Update bill: mark paid and advance due date (if recurring)
    const isOnce = bill.frequency === "once";
    const nextDue = isOnce ? new Date(bill.dueDate) : getNextDate(new Date(bill.dueDate), bill.frequency);
    updateBillRemote(id, { status: "paid", dueDate: nextDue }).catch(err => {
      enqueueGlobalSyncOp({ type: "update_bill", id, payload: { status: "paid", dueDate: nextDue.toISOString() } });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
    setBills(prev => {
      const next = prev.map(b => b.id === id ? { ...b, status: "paid" as const, dueDate: nextDue } : b);
      setCachedData(CACHE_KEYS.BILLS, next);
      return next;
    });
  }, [bills, categories, addTransaction]);

  const getPendingBills = useCallback(() => {
    const now = new Date();
    // Solo mostrar bills NO pagadas (las pagadas van al historial, no a pendientes)
    return bills
      .filter(b => b.status !== "paid")
      .map(b => {
        const due = new Date(b.dueDate);
        const status = due < now ? "overdue" : "pending";
        return { ...b, status } as BillReminder;
      });
  }, [bills]);

  // ===== RECURRING TRANSACTIONS =====
  const addRecurringTx = useCallback((rtx: RecurringTransaction) => {
    const rtxId = (rtx.id && isValidUuid(rtx.id)) ? rtx.id : generateUUID();
    const newRtx = { ...rtx, id: rtxId };
    setRecurringTxs(prev => {
      const next = [...prev, newRtx];
      setCachedData(CACHE_KEYS.RECURRING, next);
      return next;
    });

    insertRecurringTransaction(newRtx).catch(err => {
      console.warn("[addRecurringTx] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "insert_recurring",
        payload: {
          id: rtxId,
          amount: newRtx.amount,
          description: newRtx.description,
          categoryId: newRtx.category.id !== "uncategorized" ? newRtx.category.id : null,
          accountId: newRtx.accountId,
          type: newRtx.type,
          frequency: newRtx.frequency,
          nextDate: newRtx.nextDate.toISOString(),
          isPaused: newRtx.paused,
          autoProcess: false,
        },
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const updateRecurringTx = useCallback((id: string, updates: Partial<RecurringTransaction>) => {
    setRecurringTxs(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      setCachedData(CACHE_KEYS.RECURRING, next);
      return next;
    });

    updateRecurringTransactionRemote(id, updates).catch(err => {
      console.warn("[updateRecurringTx] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "update_recurring",
        id,
        payload: updates,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const deleteRecurringTx = useCallback((id: string) => {
    setRecurringTxs(prev => {
      const next = prev.filter(r => r.id !== id);
      setCachedData(CACHE_KEYS.RECURRING, next);
      return next;
    });

    deleteRecurringTransactionRemote(id).catch(err => {
      console.warn("[deleteRecurringTx] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_recurring",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const toggleRecurringPause = useCallback((id: string) => {
    setRecurringTxs(prev => {
      const target = prev.find(r => r.id === id);
      if (!target) return prev;
      const nextPaused = !target.paused;
      updateRecurringTransactionRemote(id, { paused: nextPaused }).catch(err => {
        enqueueGlobalSyncOp({ type: "update_recurring", id, payload: { paused: nextPaused } });
        setPendingGlobalSyncCount(getPendingGlobalSyncCount());
      });
      const next = prev.map(r => r.id === id ? { ...r, paused: nextPaused } : r);
      setCachedData(CACHE_KEYS.RECURRING, next);
      return next;
    });
  }, []);

  const processRecurring = useCallback(() => {
    const now = new Date();
    setRecurringTxs(prev => {
      let anyUpdated = false;
      const nextList = prev.map(r => {
        if (r.paused) return r;
        let currentDate = new Date(r.nextDate);
        if (currentDate > now) return r;

        anyUpdated = true;
        if (r.frequency === "once") {
          addTransaction(r.amount, r.description, r.category, r.type, r.accountId, {
            tags: r.tags,
            currency: r.currency,
          });
          updateRecurringTransactionRemote(r.id, { paused: true }).catch(console.error);
          return { ...r, paused: true };
        }

        // Avanzar e insertar transacciones hasta que la próxima fecha supere el momento actual
        // Limitado a un máximo de 24 iteraciones de seguridad para evitar loops infinitos
        let iterations = 0;
        while (currentDate <= now && iterations < 24) {
          addTransaction(r.amount, r.description, r.category, r.type, r.accountId, {
            tags: r.tags,
            currency: r.currency,
          });
          currentDate = getNextDate(currentDate, r.frequency);
          iterations++;
        }

        updateRecurringTransactionRemote(r.id, { nextDate: currentDate }).catch(console.error);
        return { ...r, nextDate: currentDate };
      });

      return anyUpdated ? nextList : prev;
    });

    // Procesar vencimientos con débito automático (autoPay === true) que alcanzaron su fecha
    setBills(prevBills => {
      let anyBillUpdated = false;
      const nextBills = prevBills.map(bill => {
        if (!bill.autoPay || bill.status === "paid") return bill;
        const due = new Date(bill.dueDate);
        if (due > now) return bill;

        anyBillUpdated = true;
        const cat = categories.find(c => c.id === bill.categoryId) ||
          { id: "bills", name: "Servicios/Facturas", color: "bg-red-400", type: "expense" as const, icon: "file-text" };
        const targetAccId = bill.accountId || accounts[0]?.id;
        if (targetAccId) {
          addTransaction(bill.amount, bill.name, cat, "expense", targetAccId);
        }

        const isOnce = bill.frequency === "once";
        const nextDue = isOnce ? due : getNextDate(due, bill.frequency);
        updateBillRemote(bill.id, { status: "paid", dueDate: nextDue }).catch(console.error);
        return { ...bill, status: "paid" as const, dueDate: nextDue };
      });

      return anyBillUpdated ? nextBills : prevBills;
    });
  }, [addTransaction, categories, accounts]);

  // ===== TAGS =====
  const addTag = useCallback((tag: Tag) => {
    const tagId = (tag.id && isValidUuid(tag.id)) ? tag.id : generateUUID();
    const newTag = { ...tag, id: tagId };
    setTags(prev => {
      const updated = [...prev.filter(t => t.id !== tagId), newTag];
      setCachedData(CACHE_KEYS.TAGS, updated);
      saveJSON("tags", updated);
      return updated;
    });

    insertTag(newTag).catch(err => {
      console.warn("[addTag] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "insert_tag",
        payload: {
          id: tagId,
          name: newTag.name,
          color: newTag.color || null,
        },
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    updateTagRemote(id, updates).catch(err => console.error("Error updating remote tag:", err));
    setTags(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      setCachedData(CACHE_KEYS.TAGS, updated);
      saveJSON("tags", updated);
      return updated;
    });
  }, []);

  const deleteTag = useCallback((id: string) => {
    setTags(prev => {
      const updated = prev.filter(t => t.id !== id);
      setCachedData(CACHE_KEYS.TAGS, updated);
      saveJSON("tags", updated);
      return updated;
    });

    deleteTagRemote(id).catch(err => {
      console.warn("[deleteTag] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_tag",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const getTransactionCountByTag = useCallback((tagId: string) => {
    return transactions.filter(t => t.tags?.includes(tagId)).length;
  }, [transactions]);

  // ===== COMPUTED =====
  const totalBalance = accounts.filter(a => !a.archived).reduce((sum, acc) => sum + acc.balance, 0);

  // Usar new Date() en cada evaluación para que los valores reflejen el día real
  // aunque la app quede abierta sobre la medianoche o cambio de mes
  const _now = new Date();

  const monthlyExpenses = transactions
    .filter(t => t.type === "expense" && !t.isCardPayment && !t.isTransfer && t.date.getMonth() === _now.getMonth() && t.date.getFullYear() === _now.getFullYear())
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyIncome = transactions
    .filter(t => t.type === "income" && !t.isCardPayment && !t.isTransfer && t.date.getMonth() === _now.getMonth() && t.date.getFullYear() === _now.getFullYear())
    .reduce((sum, t) => sum + t.amount, 0);

  const todaySpent = transactions
    .filter(t => t.type === "expense" && !t.isCardPayment && t.date.toDateString() === _now.toDateString())
    .reduce((sum, t) => sum + t.amount, 0);

  const weekSpent = (() => {
    const weekStart = new Date(_now);
    weekStart.setDate(_now.getDate() - _now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return transactions
      .filter(t => t.type === "expense" && !t.isCardPayment && !t.isTransfer && t.date >= weekStart)
      .reduce((sum, t) => sum + t.amount, 0);
  })();

  // Monthly data for last 6 months
  const getMonthlyTrend = useCallback(() => {
    const today = new Date();
    const months: { month: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthTxs = transactions.filter(t => t.date.getMonth() === m && t.date.getFullYear() === y && !t.isCardPayment && !t.isTransfer);
      months.push({
        month: d.toLocaleString("default", { month: "short" }),
        income: monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expenses: monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    return months;
  }, [transactions]);

  const getLastMonthExpenses = useCallback(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const m = lastMonth.getMonth();
    const y = lastMonth.getFullYear();
    return transactions
      .filter(t => t.type === "expense" && !t.isCardPayment && !t.isTransfer && t.date.getMonth() === m && t.date.getFullYear() === y)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // ===== RULES ENGINE (P10) =====
  const addRule = useCallback((rule: TransactionRule) => {
    const ruleId = (rule.id && isValidUuid(rule.id)) ? rule.id : generateUUID();
    const newRule = { ...rule, id: ruleId };
    setRules(prev => {
      const updated = [...prev.filter(r => r.id !== ruleId), newRule];
      setCachedData(CACHE_KEYS.RULES, updated);
      saveJSON(RULES_STORAGE_KEY, updated);
      return updated;
    });

    insertRule(newRule).catch(err => {
      console.warn("[addRule] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "insert_rule",
        payload: {
          id: ruleId,
          name: newRule.name,
          isActive: newRule.isActive,
          priority: newRule.priority || 0,
          conditions: newRule.conditions || [],
          actions: newRule.actions || {},
        },
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<TransactionRule>) => {
    setRules(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      setCachedData(CACHE_KEYS.RULES, updated);
      saveJSON(RULES_STORAGE_KEY, updated);
      return updated;
    });

    updateRuleRemote(id, updates).catch(err => {
      console.warn("[updateRule] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "update_rule",
        id,
        payload: updates,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => {
      const updated = prev.filter(r => r.id !== id);
      setCachedData(CACHE_KEYS.RULES, updated);
      saveJSON(RULES_STORAGE_KEY, updated);
      return updated;
    });

    deleteRuleRemote(id).catch(err => {
      console.warn("[deleteRule] Offline/remote failure, enqueuing:", err);
      enqueueGlobalSyncOp({
        type: "delete_rule",
        id,
      });
      setPendingGlobalSyncCount(getPendingGlobalSyncCount());
    });
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules(prev => {
      const target = prev.find(r => r.id === id);
      const nextActive = target ? !target.isActive : true;
      updateRuleRemote(id, { isActive: nextActive }).catch(err => {
        enqueueGlobalSyncOp({ type: "update_rule", id, payload: { is_active: nextActive } });
        setPendingGlobalSyncCount(getPendingGlobalSyncCount());
      });
      const updated = prev.map(r => r.id === id ? { ...r, isActive: nextActive } : r);
      setCachedData(CACHE_KEYS.RULES, updated);
      saveJSON(RULES_STORAGE_KEY, updated);
      return updated;
    });
  }, []);

  const applyRulesRetroactively = useCallback(() => {
    setTransactions(prev => {
      return prev.map(tx => {
        const evaluated = applyRulesToTransaction(
          {
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            type: tx.type,
            accountId: tx.accountId,
            tags: tx.tags,
            note: tx.note,
          },
          rules,
          categories
        );
        return {
          ...tx,
          category: evaluated.category,
          description: evaluated.description,
          tags: evaluated.tags,
        };
      });
    });
  }, [rules, categories]);

  const provisionDefaultRules = useCallback(async () => {
    if (categories.length === 0) return { created: [], deletedCount: 0 };

    // 1. Limpieza de duplicados existentes en el estado actual
    const seenNames = new Set<string>();
    const duplicateIdsToDelete: string[] = [];
    const dedupedCurrentRules: TransactionRule[] = [];

    for (const rule of rules) {
      const norm = rule.name.trim().toLowerCase();
      if (seenNames.has(norm)) {
        duplicateIdsToDelete.push(rule.id);
      } else {
        seenNames.add(norm);
        dedupedCurrentRules.push(rule);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await Promise.allSettled(duplicateIdsToDelete.map(id => deleteRuleRemote(id)));
    }

    // 2. Determinar cuáles de las plantillas base realmente faltan
    const templates = createDefaultRulesTemplates(categories);
    const missingTemplates = templates.filter(
      (t) => !seenNames.has(t.name.trim().toLowerCase())
    );

    let created: TransactionRule[] = [];
    if (missingTemplates.length > 0) {
      try {
        created = await insertRulesBatch(missingTemplates);
      } catch (err) {
        console.error("Error provisioning default rules remotely:", err);
        created = missingTemplates.map((t, i) => ({
          ...t,
          id: `rule-local-${Date.now()}-${i}`,
        }));
      }
    }

    // 3. Consolidar estado local si hubo inserciones o eliminaciones de duplicados
    if (created.length > 0 || duplicateIdsToDelete.length > 0) {
      const updated = [...dedupedCurrentRules, ...created];
      setRules(updated);
      saveJSON(RULES_STORAGE_KEY, updated);
    }

    return { created, deletedCount: duplicateIdsToDelete.length };
  }, [categories, rules]);

  const syncGlobalQueue = useCallback(async () => {
    setIsGlobalSyncing(true);
    try {
      const { processed, remaining } = await syncPendingGlobalQueue();
      setPendingGlobalSyncCount(remaining);
      if (processed > 0) {
        toast.success(t("toast.syncProcessedSuccess").replace("{count}", String(processed)));
      }
      return { processed, remaining };
    } catch (err) {
      console.error("Manual sync failed:", err);
      toast.error(t("toast.syncFailed"));
      throw err;
    } finally {
      setIsGlobalSyncing(false);
    }
  }, [t]);

  const purgeAllUserData = useCallback(async () => {
    try {
      await purgeUserDataService(user?.id);

      // Limpiar estados locales en React a cero absoluto
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setBudgets([]);
      setGoals([]);
      setBills([]);
      setRecurringTxs([]);
      setTags([]);
      setRules([]);
      setPendingGlobalSyncCount(0);
      setIsGlobalSyncing(false);

      // Limpiar caché local y colas offline
      Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem(GLOBAL_QUEUE_KEY);
      localStorage.removeItem("onboarding-complete");

      toast.success(t("toast.purgeSuccess"));
    } catch (err) {
      console.error("[finance-store] Error al purgar datos del usuario:", err);
      toast.error(t("toast.purgeError"));
      throw err;
    }
  }, [user?.id, t]);

  const refetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [accs, cats, bds, gls, bls, remoteTags, remoteRules] = await Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchBudgets(),
        fetchGoals(),
        fetchBills(),
        fetchTags().catch(() => loadJSON<Tag[]>("tags", [])),
        fetchRules().catch(() => {
          const modern = loadJSON<TransactionRule[] | null>(RULES_STORAGE_KEY, null);
          if (modern !== null) return modern;
          return loadJSON<TransactionRule[]>(LEGACY_RULES_STORAGE_KEY, []);
        }),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setBudgets(bds);
      setGoals(gls);
      setBills(bls);
      setTags(remoteTags);
      setRules(remoteRules);

      setCachedData(CACHE_KEYS.ACCOUNTS, accs);
      setCachedData(CACHE_KEYS.CATEGORIES, cats);
      setCachedData(CACHE_KEYS.BUDGETS, bds);
      setCachedData(CACHE_KEYS.GOALS, gls);
      setCachedData(CACHE_KEYS.BILLS, bls);
      setCachedData(CACHE_KEYS.TAGS, remoteTags);
      setCachedData(CACHE_KEYS.RULES, remoteRules);

      const [txs, recTxs] = await Promise.all([
        fetchTransactions(cats),
        fetchRecurringTransactions(cats),
      ]);
      setTransactions(txs);
      setRecurringTxs(recTxs);
      setCachedData(CACHE_KEYS.TRANSACTIONS, txs);
      setCachedData(CACHE_KEYS.RECURRING, recTxs);

      await syncPendingGlobalQueue().catch(() => ({ processed: 0, remaining: 0 }));
    } catch (err) {
      console.error("[finance-store] Error en refetchData:", err);
    }
  }, [user?.id]);

  return {
    loading,
    transactions, accounts, categories, budgets, goals, recurringTxs, bills, tags, rules,
    pendingGlobalSyncCount, isGlobalSyncing, syncGlobalQueue, purgeAllUserData, refetchData,
    addTransaction, updateTransaction, deleteTransaction, deleteInstallmentGroup, duplicateTransaction, importTransactions,
    addCategory, updateCategory, archiveCategory, unarchiveCategory, deleteCategory, reassignTransactions, seedDefaultCategories,
    getTransactionCountByCategory, getRootCategories, getSubcategories, getArchivedCategories, getAllActiveCategories,
    addAccount, updateAccount, archiveAccount, unarchiveAccount, deleteAccount, adjustAccountBalance,
    recalculateAccountBalance, syncAccountBalance, syncAllAccountBalances,
    payCard, transferBetweenAccounts, getStatementTransactions,
    getActiveAccounts, getArchivedAccounts, getCreditCards, getNonCardAccounts, getTransactionsByAccount,
    addBudget, updateBudget, deleteBudget, getBudgetSpent, getCurrentMonthBudgets,
    addGoal, updateGoal, deleteGoal, contributeToGoal, withdrawFromGoal,
    addRecurringTx, updateRecurringTx, deleteRecurringTx, toggleRecurringPause, processRecurring,
    addBill, updateBill, deleteBill, markBillPaid, getPendingBills,
    addTag, updateTag, deleteTag, getTransactionCountByTag,
    addRule, updateRule, deleteRule, toggleRule, applyRulesRetroactively, provisionDefaultRules,
    totalBalance, monthlyExpenses, monthlyIncome, todaySpent, weekSpent,
    getMonthlyTrend, getLastMonthExpenses,
  };
}
