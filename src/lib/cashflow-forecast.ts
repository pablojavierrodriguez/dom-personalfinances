import { Account, Transaction, BillReminder, RecurringTransaction } from "./types";
import { Currency, DEFAULT_EXCHANGE_RATES } from "./settings-types";

export interface CashFlowDayEvent {
  name: string;
  amount: number;
  type: "in" | "out";
  category?: string;
  source: "recurring" | "bill" | "card_due" | "simulated";
}

export interface CashFlowDayPoint {
  date: string; // ISO YYYY-MM-DD
  dayLabel: string; // DD/MM
  balance: number;
  income: number;
  expense: number;
  isNegative: boolean;
  events: CashFlowDayEvent[];
}

export interface CashFlowForecastSummary {
  startingBalance: number;
  endingBalance: number;
  lowestBalance: number;
  lowestBalanceDate: string | null;
  totalIncomeExpected: number;
  totalExpensesExpected: number;
  hasDeficitRisk: boolean;
  points: CashFlowDayPoint[];
}

export interface CashFlowForecastOptions {
  daysAhead?: 30 | 60 | 90;
  simulatedExpense?: { amount: number; date: Date; name: string };
  targetCurrency?: Currency;
  exchangeRates?: Record<Currency, number>;
}

function convertAmount(
  amount: number,
  from: Currency | undefined,
  to: Currency,
  rates: Record<Currency, number>
): number {
  const fromCurrency = from || "ARS";
  if (fromCurrency === to) return amount;
  const rateFrom = rates[fromCurrency] ?? 1;
  const rateTo = rates[to] ?? 1;
  const amountInArs = rateFrom > 0 ? amount / rateFrom : amount;
  return amountInArs * rateTo;
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcula la proyección día a día del saldo patrimonial líquido futuro
 * combinando saldo líquido actual, gastos recurrentes, facturas programadas y liquidaciones de tarjetas.
 * BUG-A3 fix: Convierte todas las cuentas y flujos a la divisa objetivo (targetCurrency).
 */
export function calculateCashFlowForecast(
  accounts: Account[],
  transactions: Transaction[],
  recurringTxs: RecurringTransaction[],
  bills: BillReminder[],
  options: CashFlowForecastOptions = {}
): CashFlowForecastSummary {
  const daysAhead = options.daysAhead || 30;
  const targetCurrency: Currency = options.targetCurrency || "ARS";
  const rates = options.exchangeRates || DEFAULT_EXCHANGE_RATES;
  const toTarget = (amount: number, fromCurrency?: Currency) =>
    convertAmount(amount, fromCurrency, targetCurrency, rates);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Saldo líquido de inicio: cuentas activas que NO sean tarjetas de crédito, convertidas a targetCurrency
  const liquidAccounts = accounts.filter((a) => !a.archived && a.type !== "credit");
  const startingBalance = liquidAccounts.reduce(
    (sum, a) => sum + toTarget(a.balance, a.currency as Currency),
    0
  );

  // 2. Preparar el mapa de días futuros
  const pointsMap = new Map<string, CashFlowDayPoint>();

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateKey = toLocalDateString(d);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");

    pointsMap.set(dateKey, {
      date: dateKey,
      dayLabel: `${day}/${month}`,
      balance: 0,
      income: 0,
      expense: 0,
      isNegative: false,
      events: [],
    });
  }

  // 3. Proyectar transacciones recurrentes activas
  for (const rtx of recurringTxs) {
    if (rtx.paused) continue;

    let nextDate = new Date(rtx.nextDate);
    nextDate.setHours(0, 0, 0, 0);

    const convertedAmount = toTarget(rtx.amount, rtx.currency as Currency);

    while (nextDate <= new Date(now.getTime() + daysAhead * 86400000)) {
      if (nextDate >= now) {
        const key = toLocalDateString(nextDate);
        const point = pointsMap.get(key);
        if (point) {
          if (rtx.type === "income") {
            point.income += convertedAmount;
            point.events.push({
              name: rtx.description,
              amount: convertedAmount,
              type: "in",
              source: "recurring",
            });
          } else {
            point.expense += convertedAmount;
            point.events.push({
              name: rtx.description,
              amount: convertedAmount,
              type: "out",
              source: "recurring",
            });
          }
        }
      }

      // Avanzar fecha según frecuencia
      const next = new Date(nextDate);
      switch (rtx.frequency) {
        case "daily":
          next.setDate(next.getDate() + 1);
          break;
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "biweekly":
          next.setDate(next.getDate() + 14);
          break;
        case "monthly":
          next.setMonth(next.getMonth() + 1);
          break;
        case "yearly":
          next.setFullYear(next.getFullYear() + 1);
          break;
        default:
          next.setMonth(next.getMonth() + 1);
      }
      if (next.getTime() === nextDate.getTime()) break; // prevenir loop infinito
      nextDate = next;
    }
  }

  // 4. Proyectar facturas y recordatorios pendientes
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  for (const bill of bills) {
    if (bill.status === "paid") continue;
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate >= now) {
      const key = toLocalDateString(dueDate);
      const point = pointsMap.get(key);
      if (point) {
        const billCurrency = (bill.accountId ? accountMap.get(bill.accountId)?.currency : undefined) as Currency | undefined;
        const convertedAmount = toTarget(bill.amount, billCurrency);
        point.expense += convertedAmount;
        point.events.push({
          name: bill.name,
          amount: convertedAmount,
          type: "out",
          source: "bill",
        });
      }
    }
  }

  // 5. Proyectar vencimientos de pago de tarjetas de crédito
  const creditCards = accounts.filter((a) => !a.archived && a.type === "credit");
  for (const card of creditCards) {
    if (!card.paymentDay) continue;
    const owedRaw = Math.abs(Math.min(card.balance, 0));
    if (owedRaw <= 0) continue;
    const owed = toTarget(owedRaw, card.currency as Currency);

    // Calcular el próximo día de vencimiento de la tarjeta
    const currentMonthDue = new Date(now.getFullYear(), now.getMonth(), card.paymentDay);
    let targetDue = currentMonthDue;
    if (currentMonthDue < now) {
      targetDue = new Date(now.getFullYear(), now.getMonth() + 1, card.paymentDay);
    }

    const key = toLocalDateString(targetDue);
    const point = pointsMap.get(key);
    if (point) {
      point.expense += owed;
      point.events.push({
        name: `Vto. Tarjeta ${card.name}`,
        amount: owed,
        type: "out",
        source: "card_due",
      });
    }
  }

  // 6. Simulación opcional de gasto puntual
  if (options.simulatedExpense && options.simulatedExpense.amount > 0) {
    const simAmount = toTarget(options.simulatedExpense.amount, targetCurrency);
    const simDate = new Date(options.simulatedExpense.date);
    simDate.setHours(0, 0, 0, 0);
    const key = toLocalDateString(simDate);
    const point = pointsMap.get(key);
    if (point) {
      point.expense += simAmount;
      point.events.push({
        name: `[Simulación] ${options.simulatedExpense.name}`,
        amount: simAmount,
        type: "out",
        source: "simulated",
      });
    }
  }

  // 7. Recorrer cronológicamente y calcular saldo acumulativo
  const points = Array.from(pointsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  let currentBalance = startingBalance;
  let lowestBalance = startingBalance;
  let lowestBalanceDate: string | null = null;
  let totalIncomeExpected = 0;
  let totalExpensesExpected = 0;

  for (const point of points) {
    currentBalance = currentBalance + point.income - point.expense;
    point.balance = currentBalance;
    point.isNegative = currentBalance < 0;

    totalIncomeExpected += point.income;
    totalExpensesExpected += point.expense;

    if (currentBalance < lowestBalance) {
      lowestBalance = currentBalance;
      lowestBalanceDate = point.date;
    }
  }

  const endingBalance = points.length > 0 ? points[points.length - 1].balance : startingBalance;

  return {
    startingBalance,
    endingBalance,
    lowestBalance,
    lowestBalanceDate,
    totalIncomeExpected,
    totalExpensesExpected,
    hasDeficitRisk: lowestBalance < 0,
    points,
  };
}
