import * as XLSX from "xlsx";
import { Transaction, Account } from "./types";

/**
 * Escapes a field for CSV according to RFC 4180:
 * - Wraps in quotes if it contains commas, quotes, or newlines
 * - Escapes inner double quotes by doubling them
 */
export function escapeCsvField(field: string | number | undefined | null): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a standard CSV string from a list of transactions,
 * with localized headings and UTF-8 BOM (\uFEFF) for immediate compatibility with Excel.
 */
export function generateTransactionsCsv(
  transactions: Transaction[],
  accountsMap: Record<string, string> = {}
): string {
  const headers = [
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
    "Etiquetas"
  ];

  const rows = transactions.map((t) => {
    const dateStr = t.date instanceof Date 
      ? t.date.toISOString().split("T")[0] 
      : new Date(t.date).toISOString().split("T")[0];
    
    const typeStr = t.type === "expense" ? "Gasto" : "Ingreso";
    const accountName = accountsMap[t.accountId] || t.accountId || "";
    const installmentStr = t.installmentInfo 
      ? `${t.installmentInfo.current}/${t.installmentInfo.total}` 
      : "";
    const tagsStr = (t.tags || []).join("; ");

    return [
      escapeCsvField(dateStr),
      escapeCsvField(typeStr),
      escapeCsvField(t.description),
      escapeCsvField(t.category?.name || "Sin Categoría"),
      escapeCsvField(t.amount),
      escapeCsvField(accountName),
      escapeCsvField(t.isTransfer ? "Sí" : "No"),
      escapeCsvField(t.isCardPayment ? "Sí" : "No"),
      escapeCsvField(installmentStr),
      escapeCsvField(t.note || ""),
      escapeCsvField(tagsStr)
    ].join(",");
  });

  // UTF-8 BOM (\uFEFF) + headers + rows
  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
}

/**
 * Triggers a browser download of the generated CSV file
 */
export function downloadCsvFile(content: string, filename = "transacciones_dom.csv"): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an Excel workbook (.xlsx binary buffer) from a list of transactions,
 * with structured headers and auto-sized column widths.
 */
export function generateTransactionsExcel(
  transactions: Transaction[],
  accountsMap: Record<string, string> = {}
): Uint8Array {
  const headers = [
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
    "Etiquetas"
  ];

  const rows = transactions.map((t) => {
    const dateStr = t.date instanceof Date 
      ? t.date.toISOString().split("T")[0] 
      : new Date(t.date).toISOString().split("T")[0];
    
    const typeStr = t.type === "expense" ? "Gasto" : "Ingreso";
    const accountName = accountsMap[t.accountId] || t.accountId || "";
    const installmentStr = t.installmentInfo 
      ? `${t.installmentInfo.current}/${t.installmentInfo.total}` 
      : "";
    const tagsStr = (t.tags || []).join("; ");

    return [
      dateStr,
      typeStr,
      t.description,
      t.category?.name || "Sin Categoría",
      t.amount,
      accountName,
      t.isTransfer ? "Sí" : "No",
      t.isCardPayment ? "Sí" : "No",
      installmentStr,
      t.note || "",
      tagsStr
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Cálculo de ancho automático por columna
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of rows) {
      const val = String(row[colIdx] ?? "");
      if (val.length > maxLen) maxLen = Math.min(val.length, 45);
    }
    return { wch: Math.max(maxLen + 3, 10) };
  });
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(wbout);
}

/**
 * Triggers a browser download of the generated Excel (.xlsx) file
 */
export function downloadExcelFile(data: Uint8Array, filename = "transacciones_dom.xlsx"): void {
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

