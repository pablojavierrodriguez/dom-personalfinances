import { describe, it, expect } from "vitest";
import { generateTransactionsExcel, generateTransactionsCsv } from "@/lib/export-utils";
import { Transaction } from "@/lib/types";
import * as XLSX from "xlsx";

describe("Excel and CSV Export Suite", () => {
  const mockTransactions: Transaction[] = [
    {
      id: "tx-1",
      amount: 15400,
      description: "Supermercado Coto",
      category: { id: "cat-1", name: "Alimentos", icon: "shopping-bag", type: "expense", color: "bg-emerald-500" },
      date: new Date("2026-03-10T12:00:00Z"),
      type: "expense",
      accountId: "acc-1",
      tags: ["super", "semanal"],
      note: "Compra mensual",
    },
    {
      id: "tx-2",
      amount: 250000,
      description: "Sueldo Empresa",
      category: { id: "cat-2", name: "Salario", icon: "briefcase", type: "income", color: "bg-blue-500" },
      date: new Date("2026-03-01T09:00:00Z"),
      type: "income",
      accountId: "acc-1",
      isTransfer: false,
    },
  ];

  const mockAccountsMap = {
    "acc-1": "Banco Galicia",
  };

  it("generates a valid binary Excel workbook with readable sheets and correct rows", () => {
    const excelBuffer = generateTransactionsExcel(mockTransactions, mockAccountsMap);
    expect(excelBuffer).toBeInstanceOf(Uint8Array);
    expect(excelBuffer.length).toBeGreaterThan(0);

    // Parse the generated buffer with XLSX to assert contents
    const wb = XLSX.read(excelBuffer, { type: "array" });
    expect(wb.SheetNames).toContain("Transacciones");

    const ws = wb.Sheets["Transacciones"];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    // Assert headers
    expect(rows[0]).toEqual([
      "Fecha",
      "Tipo",
      "Descripción",
      "Categoría",
      "Monto",
      "Cuenta",
      "Es Transferencia",
      "Pago Tarjeta",
      "Cuota",
      "Notas",
      "Etiquetas",
    ]);

    // Assert rows
    expect(rows[1][2]).toBe("Supermercado Coto");
    expect(rows[1][3]).toBe("Alimentos");
    expect(rows[1][4]).toBe(15400);
    expect(rows[1][5]).toBe("Banco Galicia");
    expect(rows[1][10]).toBe("super; semanal");

    expect(rows[2][2]).toBe("Sueldo Empresa");
    expect(rows[2][1]).toBe("Ingreso");
    expect(rows[2][4]).toBe(250000);
  });

  it("generates standard CSV with UTF-8 BOM", () => {
    const csv = generateTransactionsCsv(mockTransactions, mockAccountsMap);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Supermercado Coto");
    expect(csv).toContain("Banco Galicia");
  });
});
