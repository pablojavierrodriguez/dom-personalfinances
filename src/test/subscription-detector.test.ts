import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeMerchantName,
  calculateCompoundOpportunityCost,
  detectSubscriptions,
} from "@/lib/subscription-detector";
import { Transaction, RecurringTransaction, BillReminder } from "@/lib/types";

describe("Subscription Detector & Leak Auditor", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normaliza nombres de suscripciones comunes limpiando prefijos bancarios", () => {
    expect(normalizeMerchantName("COMPRA EN NETFLIX ARGENTINA")).toBe("Netflix");
    expect(normalizeMerchantName("DEBITO AUTOMATICO SPOTIFY AR")).toBe("Spotify");
    expect(normalizeMerchantName("OPENAI *CHATGPT SUBSCRIPTION")).toBe("OpenAI (ChatGPT)");
    expect(normalizeMerchantName("GOOGLE *YOUTUBE PREMIUM")).toBe("YouTube Premium");
    expect(normalizeMerchantName("PAGO ELECTRONICO CLARO")).toBe("Claro");
  });

  it("calcula el costo de oportunidad compuesto correctamente a 3 y 5 años (8% anual)", () => {
    // Si se invierten $10.000 mensuales:
    // A 3 años (36 meses) al 8% anual: ~ $405.328
    const fv3Y = calculateCompoundOpportunityCost(10000, 3, 0.08);
    expect(fv3Y).toBeGreaterThan(390000);
    expect(fv3Y).toBeLessThan(420000);

    // A 5 años (60 meses) al 8% anual: ~ $734.769
    const fv5Y = calculateCompoundOpportunityCost(10000, 5, 0.08);
    expect(fv5Y).toBeGreaterThan(700000);
    expect(fv5Y).toBeLessThan(760000);
  });

  it("detecta gastos recurrentes mensuales en el historial de transacciones", () => {
    const mockTxs: Transaction[] = [
      {
        id: "tx-1",
        amount: -8500,
        description: "NETFLIX",
        category: { id: "cat-1", name: "Servicios", icon: "Tv", color: "text-blue-500", type: "expense" },
        type: "expense",
        date: new Date("2026-06-10T12:00:00Z"),
        accountId: "acc-1",
      },
      {
        id: "tx-2",
        amount: -8900,
        description: "NETFLIX ARGENTINA",
        category: { id: "cat-1", name: "Servicios", icon: "Tv", color: "text-blue-500", type: "expense" },
        type: "expense",
        date: new Date("2026-07-10T12:00:00Z"),
        accountId: "acc-1",
      },
      {
        id: "tx-3",
        amount: -8900,
        description: "Netflix",
        category: { id: "cat-1", name: "Servicios", icon: "Tv", color: "text-blue-500", type: "expense" },
        type: "expense",
        date: new Date("2026-08-10T12:00:00Z"),
        accountId: "acc-1",
      },
      // Gasto esporádico no recurrente
      {
        id: "tx-4",
        amount: -45000,
        description: "Cena Restaurante",
        category: { id: "cat-2", name: "Salidas", icon: "Utensils", color: "text-amber-500", type: "expense" },
        type: "expense",
        date: new Date("2026-08-15T21:00:00Z"),
        accountId: "acc-1",
      },
    ];

    const detected = detectSubscriptions(mockTxs);
    expect(detected.length).toBe(1);
    expect(detected[0].normalizedName).toBe("Netflix");
    expect(detected[0].occurrencesCount).toBe(3);
    expect(detected[0].frequency).toBe("monthly");
    expect(detected[0].annualCost).toBeGreaterThan(100000);
  });

  it("integra obligaciones recurrentes ya existentes sin duplicar", () => {
    const recurring: RecurringTransaction[] = [
      {
        id: "rec-1",
        amount: -15000,
        description: "Spotify Familiar",
        category: { id: "cat-1", name: "Servicios", icon: "Music", color: "text-green-500", type: "expense" },
        type: "expense",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: new Date("2026-01-01"),
        nextDate: new Date("2026-09-15"),
        paused: false,
      },
    ];

    const detected = detectSubscriptions([], recurring, []);
    expect(detected.length).toBe(1);
    expect(detected[0].normalizedName).toBe("Spotify");
    expect(detected[0].isExistingObligation).toBe(true);
    expect(detected[0].annualCost).toBe(180000);
  });
});
