import { describe, it, expect } from "vitest";
import { calculateCashFlowForecast } from "@/lib/cashflow-forecast";
import { Account, RecurringTransaction, BillReminder } from "@/lib/types";

describe("Cash Flow Forecast Engine", () => {
  it("calculates starting balance exclusively from non-credit accounts", () => {
    const accounts: Account[] = [
      { id: "acc-1", name: "Banco Corriente", balance: 50000, type: "checking", color: "bg-blue-500", currency: "ARS" },
      { id: "acc-2", name: "Ahorro", balance: 30000, type: "savings", color: "bg-emerald-500", currency: "ARS" },
      { id: "card-1", name: "Visa", balance: -20000, type: "credit", color: "bg-red-400", paymentDay: 10 },
    ];
    const summary = calculateCashFlowForecast(accounts, [], [], [], { daysAhead: 30 });
    // 50000 + 30000 = 80000 (excluye el -20000 de tarjeta como deuda, no como fondo líquido)
    expect(summary.startingBalance).toBe(80000);
  });

  it("detects future recurring income and expenses", () => {
    const accounts: Account[] = [
      { id: "acc-1", name: "Banco Corriente", balance: 50000, type: "checking", color: "bg-blue-500", currency: "ARS" },
    ];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const recurringTxs: RecurringTransaction[] = [
      {
        id: "rec-1",
        amount: 25000,
        description: "Sueldo Parcial",
        category: { id: "cat-inc", name: "Sueldo", color: "bg-emerald-500", type: "income" },
        type: "income",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: tomorrow,
        nextDate: tomorrow,
        paused: false,
      },
      {
        id: "rec-2",
        amount: 15000,
        description: "Alquiler",
        category: { id: "cat-exp", name: "Vivienda", color: "bg-red-400", type: "expense" },
        type: "expense",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: tomorrow,
        nextDate: tomorrow,
        paused: false,
      },
    ];

    const summary = calculateCashFlowForecast(accounts, [], recurringTxs, [], { daysAhead: 30 });
    expect(summary.totalIncomeExpected).toBeGreaterThanOrEqual(25000);
    expect(summary.totalExpensesExpected).toBeGreaterThanOrEqual(15000);
    expect(summary.endingBalance).toBe(60000); // 50000 + 25000 - 15000
  });

  it("flags deficit risk when future commitments exceed liquid capital", () => {
    const accounts: Account[] = [
      { id: "acc-1", name: "Banco Corriente", balance: 50000, type: "checking", color: "bg-blue-500", currency: "ARS" },
      { id: "acc-2", name: "Ahorro", balance: 30000, type: "savings", color: "bg-emerald-500", currency: "ARS" },
    ];
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const hugeBills: BillReminder[] = [
      {
        id: "bill-huge",
        name: "Pago Extraordinario",
        amount: 150000, // supera los 80.000 líquidos
        dueDate: dayAfterTomorrow,
        frequency: "monthly",
        status: "pending",
        autoPay: false,
      },
    ];

    const summary = calculateCashFlowForecast(accounts, [], [], hugeBills, { daysAhead: 30 });
    expect(summary.hasDeficitRisk).toBe(true);
    expect(summary.lowestBalance).toBeLessThan(0);
    expect(summary.lowestBalance).toBe(-70000); // 80000 - 150000
  });

  it("handles multi-currency conversion accurately (BUG-A3)", () => {
    // 1 ARS = 0.001 USD (tasa: 1000 ARS por USD)
    const exchangeRates = { ARS: 1, USD: 0.001, EUR: 0.0009 };
    const accounts: Account[] = [
      { id: "acc-ars", name: "Banco ARS", balance: 100000, type: "checking", color: "bg-blue-500", currency: "ARS" },
      { id: "acc-usd", name: "Caja USD", balance: 100, type: "savings", color: "bg-emerald-500", currency: "USD" },
    ];

    // En ARS: 100.000 ARS + (100 USD / 0.001) = 100.000 + 100.000 = 200.000 ARS
    const summaryArs = calculateCashFlowForecast(accounts, [], [], [], {
      daysAhead: 30,
      targetCurrency: "ARS",
      exchangeRates,
    });
    expect(summaryArs.startingBalance).toBe(200000);

    // En USD: (100.000 ARS * 0.001) + 100 USD = 100 + 100 = 200 USD
    const summaryUsd = calculateCashFlowForecast(accounts, [], [], [], {
      daysAhead: 30,
      targetCurrency: "USD",
      exchangeRates,
    });
    expect(summaryUsd.startingBalance).toBe(200);
  });
});
