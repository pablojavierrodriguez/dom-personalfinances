import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFinanceStore } from "@/lib/finance-store";
import { insertTransaction } from "@/services/transactions.service";

// Mock auth context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    session: {},
    loading: false,
    signOut: vi.fn(),
  }),
}));

// Mock supabase services to avoid actual network calls during unit tests
vi.mock("@/services/accounts.service", () => ({
  fetchAccounts: vi.fn().mockImplementation(() => Promise.resolve([
    { id: "acc-1", name: "Caja Ahorro", balance: 50000, type: "savings", color: "bg-sky-500" },
    { id: "acc-2", name: "Visa Gold", balance: 12000, type: "credit", color: "bg-red-400", creditLimit: 100000 },
  ])),
  insertAccount: vi.fn().mockImplementation((acc) => Promise.resolve({ ...acc, id: "new-acc-id" })),
  updateAccountRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteAccountRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/categories.service", () => ({
  fetchCategories: vi.fn().mockImplementation(() => Promise.resolve([
    { id: "cat-1", name: "Alimentación", color: "bg-orange-500", type: "expense" },
    { id: "cat-2", name: "Salario", color: "bg-emerald-500", type: "income" },
  ])),
  insertCategory: vi.fn().mockImplementation((cat) => Promise.resolve({ ...cat, id: "new-cat-id" })),
  updateCategoryRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteCategoryRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/transactions.service", () => ({
  fetchTransactions: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertTransaction: vi.fn().mockImplementation((tx) => Promise.resolve({ ...tx, id: tx.id || "new-tx-id" })),
  insertTransactionsBatch: vi.fn().mockImplementation(() => Promise.resolve()),
  updateTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/planning.service", () => ({
  fetchBudgets: vi.fn().mockImplementation(() => Promise.resolve([
    { id: "b-1", categoryId: "cat-1", amount: 30000, month: new Date().getMonth(), year: new Date().getFullYear() },
  ])),
  insertBudget: vi.fn().mockImplementation((b) => Promise.resolve({ ...b, id: b.id || "new-b-id" })),
  updateBudgetRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteBudgetRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  fetchGoals: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertGoal: vi.fn().mockImplementation((g) => Promise.resolve({ ...g, id: g.id || "new-g-id", createdAt: new Date() })),
  updateGoalRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteGoalRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  fetchBills: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertBill: vi.fn().mockImplementation((b) => Promise.resolve({ ...b, id: b.id || "bill-test" })),
  updateBillRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteBillRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  fetchRecurringTransactions: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertRecurringTransaction: vi.fn().mockImplementation((r) => Promise.resolve({ ...r, id: r.id || "rec-test" })),
  updateRecurringTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteRecurringTransactionRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/tags.service", () => ({
  fetchTags: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertTag: vi.fn().mockImplementation((t) => Promise.resolve({ ...t, id: t.id || "new-tag-id" })),
  updateTagRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteTagRemote: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock("@/services/rules.service", () => ({
  fetchRules: vi.fn().mockImplementation(() => Promise.resolve([])),
  insertRule: vi.fn().mockImplementation((r) => Promise.resolve({ ...r, id: r.id || "new-rule-id" })),
  insertRulesBatch: vi.fn().mockImplementation((rules) =>
    Promise.resolve(rules.map((r: any, i: number) => ({ ...r, id: r.id || `batch-rule-${i}` })))
  ),
  updateRuleRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteRuleRemote: vi.fn().mockImplementation(() => Promise.resolve()),
  createDefaultRulesTemplates: vi.fn().mockImplementation(() => [
    {
      name: "Supermercados y Comestibles",
      isActive: true,
      priority: 90,
      conditions: [{ field: "description", operator: "contains_any", value: "coto" }],
      actions: { setCategoryId: "cat-1" },
    },
    {
      name: "Combustible y Estaciones de Servicio",
      isActive: true,
      priority: 85,
      conditions: [{ field: "description", operator: "contains_any", value: "ypf" }],
      actions: { setCategoryId: "cat-2" },
    },
  ]),
}));

describe("useFinanceStore Unit & Integration Tests", () => {
  it("initializes without runtime errors and provides finance functions", () => {
    const { result } = renderHook(() => useFinanceStore());

    // Check that store returns all expected properties and handlers
    expect(result.current).toBeDefined();
    expect(typeof result.current.addTransaction).toBe("function");
    expect(typeof result.current.addRecurringTx).toBe("function");
    expect(typeof result.current.updateRecurringTx).toBe("function");
    expect(typeof result.current.deleteRecurringTx).toBe("function");
    expect(typeof result.current.toggleRecurringPause).toBe("function");
    expect(typeof result.current.processRecurring).toBe("function");
    expect(typeof result.current.getCurrentMonthBudgets).toBe("function");
    expect(typeof result.current.getMonthlyTrend).toBe("function");
    expect(typeof result.current.getPendingBills).toBe("function");

    // Check that calling computed functions doesn't throw ReferenceError
    expect(() => result.current.getCurrentMonthBudgets()).not.toThrow();
    expect(() => result.current.getMonthlyTrend()).not.toThrow();
    expect(() => result.current.getPendingBills()).not.toThrow();
  });

  it("calculates budget spent and trends without errors", () => {
    const { result } = renderHook(() => useFinanceStore());
    
    expect(result.current.getBudgetSpent("cat-1", 3, 2026)).toBe(0);
    const trend = result.current.getMonthlyTrend();
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBe(6);
  });

  it("handles recurring transactions and bills queries", () => {
    const { result } = renderHook(() => useFinanceStore());
    
    expect(Array.isArray(result.current.getPendingBills())).toBe(true);
    expect(typeof result.current.toggleRecurringPause).toBe("function");
  });

  it("passes receiptUrl correctly when creating a transaction via addTransaction", () => {
    const { result } = renderHook(() => useFinanceStore());
    const dummyCategory = { id: "cat-1", name: "Alimentación", color: "bg-orange-500", type: "expense" as const };

    act(() => {
      result.current.addTransaction(
        2500,
        "Supermercado Día",
        dummyCategory,
        "expense",
        "acc-1",
        { receiptUrl: "https://supabase.co/storage/v1/object/public/receipts/user/receipt.jpg" }
      );
    });

    expect(insertTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        description: "Supermercado Día",
        receiptUrl: "https://supabase.co/storage/v1/object/public/receipts/user/receipt.jpg",
      })
    );
  });

  it("exposes offline-first sync controls and purgeAllUserData", () => {
    const { result } = renderHook(() => useFinanceStore());

    expect(typeof result.current.pendingGlobalSyncCount).toBe("number");
    expect(typeof result.current.isGlobalSyncing).toBe("boolean");
    expect(typeof result.current.syncGlobalQueue).toBe("function");
    expect(typeof result.current.purgeAllUserData).toBe("function");
  });

  it("updates account balances accurately when editing a transaction (amount, account or type)", async () => {
    const { result } = renderHook(() => useFinanceStore());
    const dummyCategory = { id: "cat-1", name: "Alimentación", color: "bg-orange-500", type: "expense" as const };

    // Wait for accounts to initialize
    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThanOrEqual(2);
    });

    const initialAcc1 = result.current.accounts.find(a => a.id === "acc-1")?.balance ?? 50000;

    // 1. Add expense of 1000 in acc-1
    act(() => {
      result.current.addTransaction(1000, "Cena", dummyCategory, "expense", "acc-1");
    });

    // Check acc-1 balance decreased by 1000
    expect(result.current.accounts.find(a => a.id === "acc-1")?.balance).toBe(initialAcc1 - 1000);

    const addedTx = result.current.transactions[0];
    expect(addedTx).toBeDefined();

    // 2. Edit transaction: increase amount from 1000 to 1500
    act(() => {
      result.current.updateTransaction(addedTx.id, { amount: 1500 });
    });

    // acc-1 balance should now be initial - 1500
    expect(result.current.accounts.find(a => a.id === "acc-1")?.balance).toBe(initialAcc1 - 1500);

    // 3. Edit transaction: move from acc-1 to acc-2 (credit card)
    const initialAcc2 = result.current.accounts.find(a => a.id === "acc-2")?.balance ?? 12000;
    act(() => {
      result.current.updateTransaction(addedTx.id, { accountId: "acc-2" });
    });

    // acc-1 balance should be reverted back to initialAcc1
    expect(result.current.accounts.find(a => a.id === "acc-1")?.balance).toBe(initialAcc1);
    // acc-2 (credit card) balance should have increased debt by 1500
    expect(result.current.accounts.find(a => a.id === "acc-2")?.balance).toBe(initialAcc2 + 1500);
  });
});
