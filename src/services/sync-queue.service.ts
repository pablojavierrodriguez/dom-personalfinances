import { supabase } from "@/integrations/supabase/client";
import { isValidUuid } from "@/services/transactions.service";
import { repairNonUuidEntities } from "@/lib/storage-migration";

export const GLOBAL_QUEUE_KEY = "dom-global-sync-queue";
export const LEGACY_GLOBAL_QUEUE_KEY = "dominus-global-sync-queue";
export const HISTORIC_GLOBAL_QUEUE_KEY = "impero-global-sync-queue";

export const CACHE_KEYS = {
  ACCOUNTS: "dom-cache-accounts",
  CATEGORIES: "dom-cache-categories",
  TRANSACTIONS: "dom-cache-transactions",
  BUDGETS: "dom-cache-budgets",
  GOALS: "dom-cache-goals",
  BILLS: "dom-cache-bills",
  RECURRING: "dom-cache-recurring",
  RULES: "dom-transaction-rules",
  TAGS: "dom-cache-tags",
} as const;

export const LEGACY_CACHE_KEYS = {
  ACCOUNTS: "impero-cache-accounts",
  CATEGORIES: "impero-cache-categories",
  TRANSACTIONS: "impero-cache-transactions",
  BUDGETS: "impero-cache-budgets",
  GOALS: "impero-cache-goals",
  BILLS: "impero-cache-bills",
  RECURRING: "impero-cache-recurring",
  RULES: "impero-transaction-rules",
  TAGS: "impero-cache-tags",
} as const;

export type GlobalSyncOperation =
  // Transactions
  | {
      type: "insert_transaction";
      payload: {
        id: string;
        amount: number;
        description: string;
        categoryId?: string | null;
        date: string; // ISO String
        type: "income" | "expense";
        accountId: string;
        currency: string;
        isCardPayment?: boolean;
        isTransfer?: boolean;
        tags?: string[];
        note?: string;
        receiptUrl?: string;
        recurringId?: string;
        installmentInfo?: {
          current: number;
          total: number;
          groupId: string;
        };
      };
    }
  | {
      type: "update_transaction";
      id: string;
      payload: {
        amount?: number;
        description?: string;
        categoryId?: string | null;
        date?: string;
        type?: "income" | "expense";
        accountId?: string;
        currency?: string;
        tags?: string[];
        note?: string;
      };
    }
  | {
      type: "delete_transaction";
      id: string;
    }
  // Accounts
  | {
      type: "insert_account";
      payload: {
        id: string;
        name: string;
        balance: number;
        type: string;
        color: string;
        icon?: string | null;
        archived?: boolean;
        creditLimit?: number | null;
        closingDay?: number | null;
        paymentDay?: number | null;
        brand?: string | null;
        customBrandName?: string | null;
        currency?: string;
        creditCardViewMode?: string;
      };
    }
  | {
      type: "update_account";
      id: string;
      payload: Record<string, any>;
    }
  | {
      type: "update_account_balance";
      id: string;
      balance: number;
    }
  | {
      type: "delete_account";
      id: string;
    }
  // Categories
  | {
      type: "insert_category";
      payload: {
        id: string;
        name: string;
        color: string;
        type: string;
        icon?: string | null;
        parentId?: string | null;
        archived?: boolean;
        order?: number;
      };
    }
  | {
      type: "update_category";
      id: string;
      payload: Record<string, any>;
    }
  | {
      type: "delete_category";
      id: string;
    }
  // Budgets
  | {
      type: "insert_budget";
      payload: {
        id: string;
        categoryId: string;
        amount: number;
        month: number;
        year: number;
        enableRollover?: boolean;
        accumulatedRollover?: number;
      };
    }
  | {
      type: "update_budget";
      id: string;
      payload: Record<string, any>;
    }
  | {
      type: "delete_budget";
      id: string;
    }
  // Goals
  | {
      type: "insert_goal";
      payload: {
        id: string;
        name: string;
        targetAmount: number;
        currentAmount: number;
        color: string;
        icon?: string | null;
        deadline?: string | null;
      };
    }
  | {
      type: "update_goal";
      id: string;
      payload: Record<string, any>;
    }
  | {
      type: "delete_goal";
      id: string;
    }
  // Bills
  | {
      type: "insert_bill";
      payload: {
        id: string;
        name: string;
        amount: number;
        dueDate: string; // ISO string
        frequency?: string;
        category?: string | null;
        categoryId?: string | null;
        accountId?: string | null;
        isPaid: boolean;
        autoDebit?: boolean;
        reminderDays?: number;
      };
    }
  | {
      type: "update_bill";
      id: string;
      payload: Record<string, any>;
    }
  | {
      type: "delete_bill";
      id: string;
    }
  // Recurring
  | {
      type: "insert_recurring";
      payload: {
        id: string;
        amount: number;
        description: string;
        categoryId?: string | null;
        accountId: string;
        type: "income" | "expense";
        frequency: string;
        nextDate: string; // ISO string
        startDate?: string;
        isPaused: boolean;
        autoProcess?: boolean;
      };
    }
  | {
      type: "update_recurring";
      id: string;
      payload: Record<string, any>;
    }
  | {
      type: "delete_recurring";
      id: string;
    }
  // Tags
  | {
      type: "insert_tag";
      payload: {
        id: string;
        name: string;
        color?: string | null;
      };
    }
  | {
      type: "delete_tag";
      id: string;
    }
  // Rules
  | {
      type: "insert_rule";
      payload: {
        id: string;
        name: string;
        isActive: boolean;
        priority: number;
        conditions: any[];
        actions: any;
      };
    }
  | {
      type: "update_rule";
      id: string;
      payload: Record<string, any>;
    }
  | {
      type: "delete_rule";
      id: string;
    };

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCachedData<T>(key: string, fallback: T): T {
  try {
    let raw = localStorage.getItem(key);
    if (!raw && key.startsWith("dom-")) {
      const domLegacy = key.replace(/^dom-/, "dominus-");
      raw = localStorage.getItem(domLegacy);
      if (!raw) {
        const imperoLegacy = key.replace(/^dom-/, "impero-");
        raw = localStorage.getItem(imperoLegacy);
      }
    }
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error setting cache for ${key}:`, err);
  }
}

export function getPendingGlobalSyncCount(): number {
  try {
    const raw =
      localStorage.getItem(GLOBAL_QUEUE_KEY) ??
      localStorage.getItem(LEGACY_GLOBAL_QUEUE_KEY) ??
      localStorage.getItem(HISTORIC_GLOBAL_QUEUE_KEY);
    if (!raw) return 0;
    const queue = JSON.parse(raw);
    return Array.isArray(queue) ? queue.length : 0;
  } catch {
    return 0;
  }
}

export function getGlobalSyncQueue(): GlobalSyncOperation[] {
  try {
    const raw =
      localStorage.getItem(GLOBAL_QUEUE_KEY) ??
      localStorage.getItem(LEGACY_GLOBAL_QUEUE_KEY) ??
      localStorage.getItem(HISTORIC_GLOBAL_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGlobalSyncQueue(queue: GlobalSyncOperation[]): void {
  try {
    localStorage.setItem(GLOBAL_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("Error saving global sync queue:", err);
  }
}

export function enqueueGlobalSyncOp(op: GlobalSyncOperation): void {
  const queue = getGlobalSyncQueue();
  queue.push(op);
  saveGlobalSyncQueue(queue);
}

export async function syncPendingGlobalQueue(): Promise<{ processed: number; remaining: number }> {
  repairNonUuidEntities();
  const queue = getGlobalSyncQueue();
  if (queue.length === 0) return { processed: 0, remaining: 0 };

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) {
    // Si no hay usuario autenticado, no podemos despachar a Supabase
    return { processed: 0, remaining: queue.length };
  }

  const remaining: GlobalSyncOperation[] = [];
  let processed = 0;

  for (const op of queue) {
    try {
      // 1. TRANSACTIONS
      if (op.type === "insert_transaction") {
        const p = op.payload;
        const isValidCat = p.categoryId && isValidUuid(p.categoryId) && p.categoryId !== "uncategorized";

        const { error } = await supabase.from("transactions").upsert({
          id: p.id,
          user_id: userId,
          amount: p.amount,
          description: p.description,
          category_id: isValidCat ? p.categoryId : null,
          date: p.date,
          type: p.type,
          account_id: p.accountId,
          currency: p.currency || "ARS",
          is_card_payment: p.isCardPayment || false,
          is_transfer: p.isTransfer || false,
          tag_ids: p.tags || [],
          note: p.note || null,
          receipt_url: p.receiptUrl || null,
          recurring_id: p.recurringId || null,
          installment_current: p.installmentInfo?.current || null,
          installment_total: p.installmentInfo?.total || null,
          installment_group_id: p.installmentInfo?.groupId || null,
        }, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_transaction") {
        const p = op.payload;
        const updatePayload: Record<string, any> = {};
        if (p.amount !== undefined) updatePayload.amount = p.amount;
        if (p.description !== undefined) updatePayload.description = p.description;
        if (p.categoryId !== undefined) {
          updatePayload.category_id = p.categoryId && isValidUuid(p.categoryId) && p.categoryId !== "uncategorized"
            ? p.categoryId
            : null;
        }
        if (p.date !== undefined) updatePayload.date = p.date;
        if (p.type !== undefined) updatePayload.type = p.type;
        if (p.accountId !== undefined) updatePayload.account_id = p.accountId;
        if (p.currency !== undefined) updatePayload.currency = p.currency;
        if (p.tags !== undefined) updatePayload.tag_ids = p.tags;
        if (p.note !== undefined) updatePayload.note = p.note;

        const { error } = await supabase
          .from("transactions")
          .update(updatePayload as any)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_transaction") {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 2. ACCOUNTS
      else if (op.type === "insert_account") {
        const p = op.payload;
        const safeBalance = p.type === "credit" ? -Math.abs(p.balance) : p.balance;
        const { error } = await supabase.from("accounts").upsert({
          id: p.id,
          user_id: userId,
          name: p.name,
          balance: safeBalance,
          type: p.type,
          color: p.color,
          icon: p.icon || null,
          archived: p.archived || false,
          credit_limit: p.creditLimit || null,
          closing_day: p.closingDay || null,
          payment_day: p.paymentDay || null,
          brand: p.brand || null,
          custom_brand_name: p.customBrandName || null,
          currency: p.currency || "ARS",
          credit_card_view_mode: p.creditCardViewMode || "statement_cycles",
        }, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_account") {
        const { error } = await supabase
          .from("accounts")
          .update(op.payload as any)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "update_account_balance") {
        const { error } = await supabase
          .from("accounts")
          .update({ balance: op.balance })
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_account") {
        const { error } = await supabase
          .from("accounts")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 3. CATEGORIES
      else if (op.type === "insert_category") {
        const p = op.payload;
        const { error } = await supabase.from("categories").upsert({
          id: p.id,
          user_id: userId,
          name: p.name,
          color: p.color,
          type: p.type,
          icon: p.icon || null,
          parent_id: p.parentId || null,
          archived: p.archived || false,
          sort_order: p.order || 0,
        }, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_category") {
        const { error } = await supabase
          .from("categories")
          .update(op.payload as any)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_category") {
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 4. BUDGETS
      else if (op.type === "insert_budget") {
        const p = op.payload;
        const { error } = await supabase.from("budgets").upsert({
          id: p.id,
          user_id: userId,
          category_id: p.categoryId,
          amount: p.amount,
          month: p.month,
          year: p.year,
          enable_rollover: p.enableRollover ?? false,
          accumulated_rollover: p.accumulatedRollover ?? 0,
        }, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_budget") {
        const { error } = await supabase
          .from("budgets")
          .update(op.payload as any)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_budget") {
        const { error } = await supabase
          .from("budgets")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 5. GOALS
      else if (op.type === "insert_goal") {
        const p = op.payload;
        const { error } = await supabase.from("goals").upsert({
          id: p.id,
          user_id: userId,
          name: p.name,
          target_amount: p.targetAmount,
          current_amount: p.currentAmount,
          color: p.color,
          icon: p.icon || null,
          deadline: p.deadline || null,
        }, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_goal") {
        const { error } = await supabase
          .from("goals")
          .update(op.payload as any)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_goal") {
        const { error } = await supabase
          .from("goals")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 6. BILL REMINDERS
      else if (op.type === "insert_bill") {
        const p = op.payload;
        const { error } = await supabase.from("bill_reminders").upsert({
          id: p.id,
          user_id: userId,
          name: p.name,
          amount: p.amount,
          due_date: p.dueDate,
          frequency: p.frequency || "monthly",
          category_id: p.categoryId || (p as any).category || null,
          account_id: p.accountId || null,
          status: p.isPaid ? "paid" : "pending",
          auto_pay: p.autoDebit ?? false,
        } as any, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_bill") {
        const { error } = await supabase
          .from("bill_reminders")
          .update(op.payload as any)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_bill") {
        const { error } = await supabase
          .from("bill_reminders")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 7. RECURRING TRANSACTIONS
      else if (op.type === "insert_recurring") {
        const p = op.payload;
        const { error } = await supabase.from("recurring_transactions").upsert({
          id: p.id,
          user_id: userId,
          amount: p.amount,
          description: p.description,
          category_id: p.categoryId || null,
          account_id: p.accountId,
          type: p.type,
          frequency: p.frequency,
          start_date: (p as any).startDate || p.nextDate,
          next_date: p.nextDate,
          paused: p.isPaused ?? false,
        } as any, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_recurring") {
        const { error } = await supabase
          .from("recurring_transactions")
          .update(op.payload as any)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_recurring") {
        const { error } = await supabase
          .from("recurring_transactions")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 8. TAGS
      else if (op.type === "insert_tag") {
        const p = op.payload;
        const { error } = await supabase.from("tags").upsert({
          id: p.id,
          user_id: userId,
          name: p.name,
          color: p.color || null,
        }, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_tag") {
        const { error } = await supabase
          .from("tags")
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }

      // 9. RULES
      else if (op.type === "insert_rule") {
        const p = op.payload;
        const { error } = await (supabase.from("transaction_rules" as any) as any).upsert({
          id: p.id,
          user_id: userId,
          name: p.name,
          is_active: p.isActive,
          priority: p.priority || 0,
          conditions: p.conditions || [],
          actions: p.actions || {},
        }, { onConflict: "id" });

        if (error) throw error;
        processed++;
      } else if (op.type === "update_rule") {
        const { error } = await (supabase.from("transaction_rules" as any) as any)
          .update(op.payload)
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      } else if (op.type === "delete_rule") {
        const { error } = await (supabase.from("transaction_rules" as any) as any)
          .delete()
          .eq("id", op.id);

        if (error) throw error;
        processed++;
      }
    } catch (err: any) {
      console.warn("Global sync operation failed, keeping in queue:", op, err);
      remaining.push(op);
    }
  }

  saveGlobalSyncQueue(remaining);
  return { processed, remaining: remaining.length };
}
