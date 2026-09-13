import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CACHE_KEYS,
  GLOBAL_QUEUE_KEY,
  getCachedData,
  setCachedData,
  enqueueGlobalSyncOp,
  getPendingGlobalSyncCount,
  syncPendingGlobalQueue,
  generateUUID,
} from "@/services/sync-queue.service";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    delete: vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null }),
      },
      from: vi.fn().mockReturnValue(queryBuilder),
    },
  };
});

// Mock auth context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    session: {},
    loading: false,
    signOut: vi.fn(),
  }),
}));

const mockInsertTransaction = vi.fn();
const mockUpdateAccountRemote = vi.fn();

vi.mock("@/services/transactions.service", () => ({
  fetchTransactions: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertTransaction: vi.fn().mockImplementation((tx) => mockInsertTransaction(tx)),
  insertTransactionsBatch: vi.fn().mockImplementation(() => Promise.resolve()),
  updateTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteTransactionsByGroupIdRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/accounts.service", () => ({
  fetchAccounts: vi.fn().mockImplementation(() => Promise.resolve([
    { id: "acc-1", name: "Caja de Ahorro", balance: 100000, type: "savings", color: "bg-emerald-500", currency: "ARS" },
  ])),
  insertAccount: vi.fn().mockImplementation((acc) => Promise.resolve({ ...acc, id: "acc-new" })),
  updateAccountRemote: vi.fn().mockImplementation((id, updates) => mockUpdateAccountRemote(id, updates)),
  deleteAccountRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/categories.service", () => ({
  fetchCategories: vi.fn().mockImplementation(() => Promise.resolve([
    { id: "cat-1", name: "Supermercado", color: "bg-orange-500", type: "expense" },
  ])),
  insertCategory: vi.fn().mockImplementation((cat) => Promise.resolve({ ...cat, id: "cat-new" })),
  updateCategoryRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteCategoryRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  seedDefaultCategoriesRemote: vi.fn().mockImplementation(() => Promise.resolve([])),
}));

vi.mock("@/services/planning.service", () => ({
  fetchBudgets: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertBudget: vi.fn().mockImplementation((b) => Promise.resolve(b)),
  updateBudgetRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteBudgetRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  fetchGoals: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertGoal: vi.fn().mockImplementation((g) => Promise.resolve(g)),
  updateGoalRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteGoalRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  fetchBills: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertBill: vi.fn().mockImplementation((b) => Promise.resolve(b)),
  updateBillRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteBillRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  fetchRecurringTransactions: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertRecurringTransaction: vi.fn().mockImplementation((r) => Promise.resolve(r)),
  updateRecurringTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteRecurringTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/tags.service", () => ({
  fetchTags: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertTag: vi.fn().mockImplementation((t) => Promise.resolve(t)),
  updateTagRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteTagRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/rules.service", () => ({
  fetchRules: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertRule: vi.fn().mockImplementation((r) => Promise.resolve(r)),
  insertRulesBatch: vi.fn().mockImplementation((rules) => Promise.resolve(rules)),
  updateRuleRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteRuleRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  createDefaultRulesTemplates: vi.fn().mockImplementation(() => []),
}));

describe("P27: Global Offline-First Sync Engine & Resilient Outbox", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("instant 0ms hydration: reads and writes to local cache properly", () => {
    const cachedAccounts = [
      { id: "acc-cached-1", name: "Efectivo", balance: 5000, type: "cash", color: "bg-emerald-500", currency: "ARS" },
    ];
    setCachedData(CACHE_KEYS.ACCOUNTS, cachedAccounts);

    const retrieved = getCachedData<any[]>(CACHE_KEYS.ACCOUNTS, []);
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].name).toBe("Efectivo");
    expect(retrieved[0].balance).toBe(5000);
  });

  it("generates RFC4122 compliant UUID v4 on client", () => {
    const uuid = generateUUID();
    expect(uuid).toBeDefined();
    // Regex for standard UUID v4 format
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("enqueues operations into global sync outbox and preserves FIFO order", () => {
    expect(getPendingGlobalSyncCount()).toBe(0);

    enqueueGlobalSyncOp({
      type: "insert_transaction",
      payload: {
        id: "tx-offline-1",
        amount: 2500,
        description: "Almacén Don Mario",
        date: new Date().toISOString(),
        type: "expense",
        accountId: "acc-1",
        currency: "ARS",
      },
    });

    enqueueGlobalSyncOp({
      type: "update_account_balance",
      id: "acc-1",
      balance: 97500,
    });

    expect(getPendingGlobalSyncCount()).toBe(2);

    const queue = JSON.parse(localStorage.getItem(GLOBAL_QUEUE_KEY) || "[]");
    expect(queue).toHaveLength(2);
    expect(queue[0].type).toBe("insert_transaction");
    expect(queue[1].type).toBe("update_account_balance");
  });

  it("drains and processes outbox queue when syncPendingGlobalQueue is executed", async () => {
    mockInsertTransaction.mockResolvedValueOnce({ id: "tx-offline-1" });
    mockUpdateAccountRemote.mockResolvedValueOnce(undefined);

    enqueueGlobalSyncOp({
      type: "insert_transaction",
      payload: {
        id: "tx-offline-1",
        amount: 1200,
        description: "Farmacia",
        date: new Date().toISOString(),
        type: "expense",
        accountId: "acc-1",
        currency: "ARS",
      },
    });

    enqueueGlobalSyncOp({
      type: "update_account_balance",
      id: "acc-1",
      balance: 98800,
    });

    expect(getPendingGlobalSyncCount()).toBe(2);

    const result = await syncPendingGlobalQueue();
    expect(result.processed).toBe(2);
    expect(result.remaining).toBe(0);
    expect(getPendingGlobalSyncCount()).toBe(0);
  });

  it("retains failed operations in outbox if sync fails remotely", async () => {
    // Simulate Supabase failure on upsert
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any).mockReturnValueOnce({
      upsert: vi.fn().mockResolvedValue({ error: new Error("Server 500 Error") }),
    });

    enqueueGlobalSyncOp({
      type: "insert_transaction",
      payload: {
        id: "tx-fail-1",
        amount: 9999,
        description: "Intento fallido",
        date: new Date().toISOString(),
        type: "expense",
        accountId: "acc-1",
        currency: "ARS",
      },
    });

    expect(getPendingGlobalSyncCount()).toBe(1);

    const result = await syncPendingGlobalQueue();
    expect(result.processed).toBe(0);
    expect(result.remaining).toBe(1);
    expect(getPendingGlobalSyncCount()).toBe(1);
  });

  it("universal outbox: drains account, category, budget, goal, bill, recurring, tag, and rule operations", async () => {
    enqueueGlobalSyncOp({
      type: "insert_account",
      payload: {
        id: "acc-offline-1",
        name: "Banco Galicia USD",
        balance: 1500,
        type: "savings",
        color: "bg-amber-500",
        currency: "USD",
      },
    });

    enqueueGlobalSyncOp({
      type: "insert_category",
      payload: {
        id: "cat-offline-1",
        name: "Mascotas",
        color: "bg-emerald-500",
        type: "expense",
      },
    });

    enqueueGlobalSyncOp({
      type: "insert_budget",
      payload: {
        id: "b-offline-1",
        categoryId: "cat-offline-1",
        amount: 45000,
        month: 8,
        year: 2026,
      },
    });

    enqueueGlobalSyncOp({
      type: "insert_goal",
      payload: {
        id: "g-offline-1",
        name: "Fondo Emergencia",
        targetAmount: 500000,
        currentAmount: 100000,
        color: "bg-sky-500",
      },
    });

    enqueueGlobalSyncOp({
      type: "insert_bill",
      payload: {
        id: "bill-offline-1",
        name: "Internet Fibertel",
        amount: 28000,
        dueDate: new Date().toISOString(),
        isPaid: false,
      },
    });

    enqueueGlobalSyncOp({
      type: "insert_recurring",
      payload: {
        id: "rec-offline-1",
        amount: 8500,
        description: "Netflix",
        accountId: "acc-offline-1",
        type: "expense",
        frequency: "monthly",
        nextDate: new Date().toISOString(),
        isPaused: false,
      },
    });

    enqueueGlobalSyncOp({
      type: "insert_tag",
      payload: {
        id: "tag-offline-1",
        name: "Vacaciones",
        color: "bg-pink-500",
      },
    });

    enqueueGlobalSyncOp({
      type: "insert_rule",
      payload: {
        id: "rule-offline-1",
        name: "Auto-categorizar veterinaria",
        isActive: true,
        priority: 50,
        conditions: [],
        actions: {},
      },
    });

    expect(getPendingGlobalSyncCount()).toBe(8);

    const result = await syncPendingGlobalQueue();
    expect(result.processed).toBe(8);
    expect(result.remaining).toBe(0);
    expect(getPendingGlobalSyncCount()).toBe(0);
  });
});
