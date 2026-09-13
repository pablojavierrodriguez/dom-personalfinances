import { z } from "zod";
import { Account, Category, TransactionType } from "@/lib/types";

/**
 * Schema Zod estricto para la respuesta estructurada que devuelve el LLM
 */
export const WhatsAppExtractedExpenseSchema = z.object({
  amount: z.number().positive({ message: "El monto debe ser mayor a 0" }),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  description: z.string().min(1, { message: "La descripción es requerida" }),
  categoryHint: z.string().default("Otros"),
  accountHint: z.string().optional(),
  type: z.enum(["expense", "income"]).default("expense"),
  isTransfer: z.boolean().default(false),
  installmentInfo: z
    .object({
      current: z.number().int().positive(),
      total: z.number().int().positive(),
    })
    .optional(),
  date: z.string().default(() => new Date().toISOString()),
  confidence: z.number().min(0).max(1).default(1.0),
});

export type WhatsAppExtractedExpense = z.infer<typeof WhatsAppExtractedExpenseSchema>;

export interface ReconciledWhatsAppExpense {
  amount: number;
  description: string;
  type: TransactionType;
  date: Date;
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
  isTransfer: boolean;
  installmentInfo?: {
    current: number;
    total: number;
    groupId: string;
  };
}

/**
 * Normaliza cadenas de texto para comparaciones insensibles a mayúsculas, acentos y signos
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Reconcilia la pista de categoría extraída por el LLM contra las categorías existentes del usuario
 */
export function matchCategory(categoryHint: string, categories: Category[]): Category {
  if (categories.length === 0) {
    return {
      id: "uncategorized",
      name: "Sin Categoría",
      color: "bg-zinc-500",
      type: "expense",
      icon: "circle-dot",
    };
  }

  const cleanHint = normalizeText(categoryHint);

  // 1. Coincidencia exacta de nombre
  const exactMatch = categories.find((c) => normalizeText(c.name) === cleanHint);
  if (exactMatch) return exactMatch;

  // 2. Coincidencia parcial o palabras clave comunes
  const partialMatch = categories.find(
    (c) => cleanHint.includes(normalizeText(c.name)) || normalizeText(c.name).includes(cleanHint)
  );
  if (partialMatch) return partialMatch;

  // 3. Fallback a la primera categoría o 'Otros'
  const fallback = categories.find((c) => normalizeText(c.name).includes("otro")) || categories[0];
  return fallback;
}

/**
 * Reconcilia la pista de cuenta extraída por el LLM contra las cuentas existentes del usuario
 */
export function matchAccount(accountHint: string | undefined, accounts: Account[]): Account {
  if (accounts.length === 0) {
    throw new Error("El usuario no tiene cuentas disponibles");
  }

  if (!accountHint || accountHint.trim() === "") {
    // Si no hay hint, devolver la primera cuenta activa o billetera principal
    const defaultAcc = accounts.find((a) => !a.archived) || accounts[0];
    return defaultAcc;
  }

  const cleanHint = normalizeText(accountHint);

  // Mapeos conocidos de uso frecuente en Argentina / LatAm
  const synonyms: Record<string, string[]> = {
    "mercado pago": ["mp", "mercadopago", "mercado"],
    "galicia": ["banco galicia", "gali"],
    "santander": ["banco santander", "rio"],
    "bbva": ["frances", "banco frances"],
    "efectivo": ["cash", "plata", "mano", "billetera"],
  };

  // 1. Coincidencia exacta de nombre
  const exactMatch = accounts.find((a) => normalizeText(a.name) === cleanHint);
  if (exactMatch) return exactMatch;

  // 2. Coincidencia por sinónimos
  for (const [accountNameKey, aliasList] of Object.entries(synonyms)) {
    if (aliasList.some((alias) => cleanHint.includes(alias) || alias === cleanHint)) {
      const match = accounts.find((a) => normalizeText(a.name).includes(accountNameKey));
      if (match) return match;
    }
  }

  // 3. Coincidencia parcial directa
  const partialMatch = accounts.find(
    (a) => cleanHint.includes(normalizeText(a.name)) || normalizeText(a.name).includes(cleanHint)
  );
  if (partialMatch) return partialMatch;

  // Fallback seguro
  return accounts.find((a) => !a.archived) || accounts[0];
}

/**
 * Reconcilia la entidad extraída por IA con los datos reales del usuario en DOMINUS
 */
export function reconcileExpenseWithUserEntities(
  extracted: WhatsAppExtractedExpense,
  categories: Category[],
  accounts: Account[]
): ReconciledWhatsAppExpense {
  const category = matchCategory(extracted.categoryHint, categories);
  const account = matchAccount(extracted.accountHint, accounts);

  let installmentInfo: ReconciledWhatsAppExpense["installmentInfo"];
  if (extracted.installmentInfo) {
    installmentInfo = {
      current: extracted.installmentInfo.current,
      total: extracted.installmentInfo.total,
      groupId: `wa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  return {
    amount: extracted.amount,
    description: extracted.description,
    type: extracted.type,
    date: new Date(extracted.date),
    categoryId: category.id,
    categoryName: category.name,
    accountId: account.id,
    accountName: account.name,
    isTransfer: extracted.isTransfer || false,
    installmentInfo,
  };
}
