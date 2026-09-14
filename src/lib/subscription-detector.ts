import { Transaction, RecurringTransaction, BillReminder, Category } from "./types";

export type SubscriptionVerdict = "essential" | "review" | "leak" | "unreviewed";

export interface DetectedSubscription {
  id: string;
  normalizedName: string;
  originalDescriptions: string[];
  averageAmount: number;
  monthlyAmount: number;
  currency: string;
  frequency: "monthly" | "weekly" | "yearly";
  lastDate: string;
  occurrencesCount: number;
  annualCost: number;
  opportunityCost3Y: number;
  opportunityCost5Y: number;
  category?: Category;
  verdict: SubscriptionVerdict;
  isExistingObligation?: boolean;
  existingBillId?: string;
  existingRecurringId?: string;
}

const STORAGE_KEY = "dom-subscription-verdicts";

/**
 * Normaliza nombres de comercios o descripciones bancarias para agrupar
 * compras recurrentes similares (ej: "NETFLIX ARGENTINA" -> "Netflix").
 */
export function normalizeMerchantName(raw: string): string {
  if (!raw) return "Suscripción";

  let cleaned = raw.toUpperCase().trim();

  // Limpiar prefijos bancarios y ruidos de tarjetas comunes
  cleaned = cleaned.replace(/^(COMPRA EN |PAGO ELECTRONICO |DEB\.AUTOMATICO |DEBITO AUTOMATICO |DB\. |PAGO DE SERVICIOS )/i, "");
  cleaned = cleaned.replace(/(CUOTA \d+\/\d+|\*\d{4}|ARGENTINA|ARG|BUENOS AIRES|\.COM|\.AR)/gi, "");
  cleaned = cleaned.replace(/[^A-Z0-9\s]/gi, " ").trim();
  cleaned = cleaned.replace(/\s+/g, " ");

  // Patrones reconocidos de servicios y suscripciones populares
  if (/NETFLIX/i.test(cleaned)) return "Netflix";
  if (/SPOTIFY/i.test(cleaned)) return "Spotify";
  if (/CHATGPT|OPENAI/i.test(cleaned)) return "OpenAI (ChatGPT)";
  if (/YOUTUBE|GOOGLE.*YT/i.test(cleaned)) return "YouTube Premium";
  if (/APPLE|ITUNES|ICLOUD/i.test(cleaned)) return "Apple Services";
  if (/AMAZON|PRIME\s*VIDEO/i.test(cleaned)) return "Amazon Prime";
  if (/DISNEY/i.test(cleaned)) return "Disney+";
  if (/MAX|HBO/i.test(cleaned)) return "Max (HBO)";
  if (/FLOW|FIBERTEL|TELECOM/i.test(cleaned)) return "Personal Flow";
  if (/CLARO/i.test(cleaned)) return "Claro";
  if (/MOVISTAR/i.test(cleaned)) return "Movistar";
  if (/OSDE/i.test(cleaned)) return "OSDE";
  if (/SWISS\s*MEDICAL/i.test(cleaned)) return "Swiss Medical";
  if (/GALENO/i.test(cleaned)) return "Galeno";
  if (/GYM|GIMNASIO|MEGATLON|SPORTCLUB/i.test(cleaned)) return "Gimnasio / Fitness";
  if (/GITHUB/i.test(cleaned)) return "GitHub";
  if (/NOTION/i.test(cleaned)) return "Notion";
  if (/CANVA/i.test(cleaned)) return "Canva";
  if (/DROPBOX/i.test(cleaned)) return "Dropbox";
  if (/GOOGLE.*STORAGE|GOOGLE.*ONE/i.test(cleaned)) return "Google One";
  if (/METROGAS/i.test(cleaned)) return "Metrogas";
  if (/EDENOR/i.test(cleaned)) return "Edenor";
  if (/EDESUR/i.test(cleaned)) return "Edesur";
  if (/AYSA/i.test(cleaned)) return "AySA";

  if (!cleaned) return "Suscripción";

  // Capitalización amigable
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Calcula el costo de oportunidad compuesto (Future Value) de invertir un monto mensual
 * a una tasa de interés compuesto anual dada (default: 8% anual).
 * Fórmula: FV = P * [ ((1 + r/12)^(12 * n)) - 1 ] / (r/12)
 */
export function calculateCompoundOpportunityCost(
  monthlyAmount: number,
  years: number,
  annualRate = 0.08
): number {
  if (monthlyAmount <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;
  const fv = monthlyAmount * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  return Math.round(fv);
}

/**
 * Carga los veredictos de suscripciones persistidos en localStorage
 */
export function loadSubscriptionVerdicts(): Record<string, SubscriptionVerdict> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Persiste el veredicto del usuario para una suscripción
 */
export function saveSubscriptionVerdict(id: string, verdict: SubscriptionVerdict): void {
  try {
    const current = loadSubscriptionVerdicts();
    current[id] = verdict;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Error saving subscription verdict:", err);
  }
}

/**
 * Analiza el historial de transacciones y compromisos periódicos para detectar
 * micro-gastos y suscripciones recurrentes, calculando su impacto anual y plurianual.
 */
export function detectSubscriptions(
  transactions: Transaction[],
  recurringTxs: RecurringTransaction[] = [],
  bills: BillReminder[] = []
): DetectedSubscription[] {
  const verdicts = loadSubscriptionVerdicts();
  const detectedMap = new Map<string, DetectedSubscription>();

  // 1. Incorporar compromisos periódicos explícitos (recurringTxs)
  recurringTxs
    .filter((r) => r.type === "expense" && !r.paused)
    .forEach((r) => {
      const name = normalizeMerchantName(r.description);
      const id = `rec-${r.id}`;
      const amount = Math.abs(r.amount);
      let monthly = amount;
      if (r.frequency === "yearly") monthly = amount / 12;
      else if (r.frequency === "weekly") monthly = amount * 4.33;
      else if (r.frequency === "biweekly") monthly = amount * 2.16;

      const annual = monthly * 12;
      detectedMap.set(name.toLowerCase(), {
        id,
        normalizedName: name,
        originalDescriptions: [r.description],
        averageAmount: amount,
        monthlyAmount: monthly,
        currency: r.currency || "ARS",
        frequency: r.frequency === "yearly" ? "yearly" : r.frequency === "weekly" ? "weekly" : "monthly",
        lastDate: new Date(r.nextDate || r.startDate || new Date()).toISOString(),
        occurrencesCount: 1,
        annualCost: Math.round(annual),
        opportunityCost3Y: calculateCompoundOpportunityCost(monthly, 3),
        opportunityCost5Y: calculateCompoundOpportunityCost(monthly, 5),
        category: r.category,
        verdict: verdicts[id] || "unreviewed",
        isExistingObligation: true,
        existingRecurringId: r.id,
      });
    });

  // 2. Incorporar recordatorios de facturas/servicios fijos (bills)
  bills.forEach((b) => {
    const name = normalizeMerchantName(b.name);
    const key = name.toLowerCase();
    const id = `bill-${b.id}`;
    const amount = Math.abs(b.amount);
    let monthly = amount;
    if (b.frequency === "yearly") monthly = amount / 12;
    else if (b.frequency === "weekly") monthly = amount * 4.33;

    const annual = monthly * 12;

    if (!detectedMap.has(key)) {
      detectedMap.set(key, {
        id,
        normalizedName: name,
        originalDescriptions: [b.name],
        averageAmount: amount,
        monthlyAmount: monthly,
        currency: "ARS",
        frequency: b.frequency === "yearly" ? "yearly" : b.frequency === "weekly" ? "weekly" : "monthly",
        lastDate: new Date(b.dueDate || new Date()).toISOString(),
        occurrencesCount: 1,
        annualCost: Math.round(annual),
        opportunityCost3Y: calculateCompoundOpportunityCost(monthly, 3),
        opportunityCost5Y: calculateCompoundOpportunityCost(monthly, 5),
        verdict: verdicts[id] || "unreviewed",
        isExistingObligation: true,
        existingBillId: b.id,
      });
    }
  });

  // 3. Heurística de detección sobre el historial de transacciones (gastos)
  const expenseTxs = transactions
    .filter((t) => t.type === "expense" && Math.abs(t.amount) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Agrupar transacciones por nombre de comercio normalizado
  const groups = new Map<string, Transaction[]>();
  expenseTxs.forEach((t) => {
    const norm = normalizeMerchantName(t.description);
    const key = norm.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  });

  groups.forEach((txList, key) => {
    // Si ya existe en compromisos explícitos, sumar contexto de ocurrencias
    const existing = detectedMap.get(key);
    if (existing) {
      existing.occurrencesCount = Math.max(existing.occurrencesCount, txList.length);
      txList.forEach((t) => {
        if (!existing.originalDescriptions.includes(t.description)) {
          existing.originalDescriptions.push(t.description);
        }
      });
      return;
    }

    // Se requieren al menos 2 ocurrencias para inferir un patrón
    if (txList.length < 2) return;

    // Analizar intervalos entre fechas consecutivas
    const intervalsInDays: number[] = [];
    for (let i = 1; i < txList.length; i++) {
      const diffMs = new Date(txList[i].date).getTime() - new Date(txList[i - 1].date).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      intervalsInDays.push(diffDays);
    }

    const avgInterval = intervalsInDays.reduce((a, b) => a + b, 0) / intervalsInDays.length;

    // Evaluar si coincide con frecuencia recurrente típica (~30 días, ~7 días o ~365 días)
    const isMonthly = avgInterval >= 24 && avgInterval <= 36;
    const isWeekly = avgInterval >= 5 && avgInterval <= 10;
    const isYearly = avgInterval >= 340 && avgInterval <= 390;

    if (!isMonthly && !isWeekly && !isYearly) return;

    // Analizar dispersión de importes (tolerar hasta 35% de variación por inflación/FX)
    const amounts = txList.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);

    if (avgAmount > 0 && (maxAmount - minAmount) / avgAmount > 0.45) {
      // Dispersión demasiado alta para ser suscripción
      return;
    }

    const frequency: "monthly" | "weekly" | "yearly" = isYearly ? "yearly" : isWeekly ? "weekly" : "monthly";
    let monthly = avgAmount;
    if (frequency === "yearly") monthly = avgAmount / 12;
    if (frequency === "weekly") monthly = avgAmount * 4.33;

    const annual = monthly * 12;
    const normName = normalizeMerchantName(txList[0].description);
    const id = `detected-${key.replace(/[^a-z0-9]/g, "-")}`;
    const lastTx = txList[txList.length - 1];

    detectedMap.set(key, {
      id,
      normalizedName: normName,
      originalDescriptions: Array.from(new Set(txList.map((t) => t.description))),
      averageAmount: Math.round(avgAmount),
      monthlyAmount: Math.round(monthly),
      currency: lastTx.currency || "ARS",
      frequency,
      lastDate: new Date(lastTx.date).toISOString(),
      occurrencesCount: txList.length,
      annualCost: Math.round(annual),
      opportunityCost3Y: calculateCompoundOpportunityCost(monthly, 3),
      opportunityCost5Y: calculateCompoundOpportunityCost(monthly, 5),
      category: lastTx.category,
      verdict: verdicts[id] || "unreviewed",
      isExistingObligation: false,
    });
  });

  // Ordenar por peso anual descendente (mayor fuga primero)
  return Array.from(detectedMap.values()).sort((a, b) => b.annualCost - a.annualCost);
}
