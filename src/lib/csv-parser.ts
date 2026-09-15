import { Transaction, Category, CATEGORIES, Currency } from "./types";
import { applyRulesToTransaction, TransactionRule, DraftTransactionInput } from "./rules-engine";
import { generateUUID } from "@/services/sync-queue.service";

export interface CsvRow {
  [key: string]: string;
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  type: string; // column name, "" if using sign detection, or "__sign_inverted__"
  debit?: string;
  credit?: string;
  installments?: string;
  category?: string;
}

export function parseCsvText(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const rawHeaders = parseCsvLine(lines[0]);
  // Asegurar que cada header tenga nombre válido y único para evitar colisiones de keys y columnas anónimas
  const seenHeaders = new Map<string, number>();
  const headers = rawHeaders.map((h, idx) => {
    let name = h.trim();
    if (!name) {
      name = `Columna_${idx + 1}`;
    }
    const count = seenHeaders.get(name) || 0;
    seenHeaders.set(name, count + 1);
    return count === 0 ? name : `${name}_${count + 1}`;
  });
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "," || char === ";") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function guessMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());

  // Fecha (Soporta DATE, TRANSACTION_DATE, Fecha Op, etc.)
  const dateCol =
    headers[
      lower.findIndex((h) =>
        /transaction_date|^date$|settlement_date|fecha|data|f\.\s*op|vencim/i.test(h)
      )
    ] ??
    headers[0] ??
    "";

  // Concepto / Descripción (Soporta Mercado Pago STORE_NAME, concepto bancario, description, detalle)
  const descCol =
    headers[
      lower.findIndex((h) =>
        /^store_name$|pos_name|concepto|^desc|description|detalle|movimiento/i.test(h)
      )
    ] ??
    headers[
      lower.findIndex((h) =>
        /external_reference|referencia|glosa|memo/i.test(h)
      )
    ] ??
    headers[1] ??
    "";

  // Débito y Crédito (Soporta NET_DEBIT_AMOUNT, NET_CREDIT_AMOUNT de Mercado Pago o bancos tradicionales)
  const debitCol = headers[lower.findIndex((h) => /net_debit_amount|d[eé]bito|egreso|cargo/i.test(h))];
  const creditCol = headers[lower.findIndex((h) => /net_credit_amount|cr[eé]dito|ingreso|abono/i.test(h))];

  // Importe / Monto (Soporta TRANSACTION_AMOUNT, REAL_AMOUNT, SETTLEMENT_NET_AMOUNT, GROSS_AMOUNT)
  const amountCol =
    headers[
      lower.findIndex((h) =>
        /transaction_amount|settlement_net_amount|real_amount|gross_amount|importe|monto|amount|valor|value/i.test(
          h
        )
      )
    ] ??
    debitCol ??
    headers[2] ??
    "";

  const typeCol =
    headers[lower.findIndex((h) => /transaction_type|record_type|payment_method_type|tipo|type/i.test(h))] ?? "";

  const installmentsCol = headers[lower.findIndex((h) => /^installments$|cuotas/i.test(h))];
  const categoryCol = headers[lower.findIndex((h) => /^categor[ií]a$|^category$|^rubro$/i.test(h))];

  return {
    date: dateCol,
    description: descCol,
    amount: amountCol,
    type: typeCol,
    debit: debitCol,
    credit: creditCol,
    installments: installmentsCol,
    category: categoryCol,
  };
}

/**
 * Detecta si una descripción corresponde a un pago de resumen de tarjeta
 */
export function detectCardPayment(description: string): boolean {
  return /su pago en pesos|pago de resumen|pago visa|pago mastercard|pago tarjeta|deposito su pago|su pago/i.test(
    description
  );
}

/**
 * Detecta si una fila o descripción corresponde a una transferencia de fondos
 */
export function detectPotentialTransfer(description: string, rawRow?: CsvRow): boolean {
  if (rawRow) {
    const paymentMethodType = (rawRow["PAYMENT_METHOD_TYPE"] || "").toLowerCase();
    const paymentMethod = (rawRow["PAYMENT_METHOD"] || "").toLowerCase();
    const transactionType = (rawRow["TRANSACTION_TYPE"] || "").toLowerCase();

    if (
      paymentMethodType === "bank_transfer" ||
      paymentMethod === "cvu" ||
      paymentMethod === "cbu" ||
      transactionType.includes("transfer")
    ) {
      return true;
    }
  }

  const d = description.toLowerCase();
  return (
    /\b(?:trf|trf\.|transferencia|traspaso|debin|transfer|envio de dinero|envío de dinero|extraccion|extracci[oó]n|retiro de dinero|ingreso de dinero)\b/i.test(
      d
    ) ||
    /\b(?:cbu|cvu)\b/i.test(d) ||
    /transferencia (?:recibida|enviada|inmediata|emitida|propia)/i.test(d)
  );
}

/**
 * Extrae cuota actual y cuotas totales de una descripción (ej. "MERPAGO*DXELECTRONICA C.06/06", "CUOTA 02/12", "(3/6)")
 */
export function extractInstallmentInfo(description: string): {
  current: number;
  total: number;
  cleanDescription: string;
} | null {
  if (!description) return null;

  // Patrones frecuentes:
  // 1. C.06/06 o C 06/06 o C.6/6
  // 2. CUOTA 02/12 o CUOTA 2 DE 12 o CUOTA 2/12
  // 3. (03/06) o [03/06]
  // 4. Formato aislado de celda: 04/06 o 4/6
  const patterns = [
    /\b(?:c\.|c\s+)(\d{1,2})\/(\d{1,2})\b/i,
    /\bcuota\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/i,
    /[\(\[]\s*(\d{1,2})\/(\d{1,2})\s*[\)\]]/i,
    /^\s*(\d{1,2})\/(\d{1,2})\s*$/,
  ];

  for (const regex of patterns) {
    const match = description.match(regex);
    if (match) {
      const current = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      if (current > 0 && total >= current) {
        // Limpiar la descripción quitando el patrón de cuota
        const cleanDescription = description.replace(regex, "").replace(/\s{2,}/g, " ").trim();
        return {
          current,
          total,
          cleanDescription: cleanDescription || description,
        };
      }
    }
  }

  return null;
}

/**
 * Genera las transacciones correspondientes a las cuotas futuras restantes
 */
export function generateFutureInstallments(
  baseTx: Transaction,
  options?: { closingDay?: number; paymentDay?: number }
): Transaction[] {
  if (!baseTx.installmentInfo) return [];

  const { current, total, groupId } = baseTx.installmentInfo;
  if (current >= total) return []; // ya es la última cuota, no hay remanente

  const futureTxs: Transaction[] = [];
  const baseDate = new Date(baseTx.date);

  for (let c = current + 1; c <= total; c++) {
    const monthsAhead = c - current;
    const futureDate = new Date(baseDate);
    futureDate.setMonth(futureDate.getMonth() + monthsAhead);

    // Si la tarjeta tiene día de pago o de cierre específico, ajustamos
    if (options?.paymentDay) {
      futureDate.setDate(Math.min(options.paymentDay, 28));
    }

    futureTxs.push({
      ...baseTx,
      id: `proj-${groupId}-${c}`,
      description: `${baseTx.description} (Cuota ${c}/${total})`,
      date: futureDate,
      installmentInfo: {
        current: c,
        total,
        groupId,
      },
    });
  }

  return futureTxs;
}

export function guessCategory(
  description: string,
  availableCategories: Category[] = CATEGORIES,
  type?: "income" | "expense"
): Category {
  const d = description.toLowerCase();

  // Si la transacción es explícitamente un INGRESO, buscar exclusivamente entre categorías de ingreso
  if (type === "income") {
    const incomeCats = availableCategories.filter((c) => c.type === "income");

    // 1. Sueldos / Haberes / Salario
    if (/sueldo|salary|haberes|honorarios|remuneraci[oó]n|jubilaci[oó]n|acreditacion haberes|pago de haberes/.test(d)) {
      const found = incomeCats.find((c) => c.id === "salary" || /sueldo|salario|salary|haberes|laboral/i.test(c.name));
      if (found) return found;
    }

    // 2. Rendimientos / Intereses / Inversiones / Dividendos
    if (/inter[eé]s|intereses|rendimiento|dividendos|plazo fijo|fci|cauci[oó]n|dividend|renta|capital/i.test(d)) {
      const found = incomeCats.find(
        (c) => c.id === "investments" || /inversi|rendimiento|investment|inter[eé]s/i.test(c.name)
      );
      if (found) return found;
    }

    // 3. Freelance / Consultoría / Proyectos
    if (/freelance|honorarios prof|proyecto|cliente|factura emitida|upwork|fiverr|consultor/.test(d)) {
      const found = incomeCats.find((c) => c.id === "freelance" || /freelance|proyecto|consultor/i.test(c.name));
      if (found) return found;
    }

    // Fallback garantizado para ingresos: nunca un gasto
    const safeIncomeFallback =
      incomeCats.find((c) => /otros?|general|ingreso/i.test(c.name)) ??
      incomeCats[0];

    if (safeIncomeFallback) return safeIncomeFallback;

    return {
      id: "uncategorized-income",
      name: "Sin Categoría (Ingreso)",
      color: "bg-emerald-500",
      type: "income",
      icon: "circle-dot",
    };
  }

  // Si no es ingreso (es gasto por defecto o type === "expense"):
  const expenseCats = availableCategories.filter((c) => c.type === "expense");

  // 1. Transporte / Movilidad
  if (/uber|cabify|didi|lyft|taxi|subte|metro|colectivo|peaje|autopista|sube|tren|combustible|ypf|shell|axion|puma energy|estacionamiento/.test(d)) {
    const found = expenseCats.find((c) => c.id === "transport" || /transport|viaje|movilidad/i.test(c.name));
    if (found) return found;
  }

  // 2. Supermercado / Comestibles / Alimentación
  if (/supermercado|super|market|coto|carrefour|dia|día|disco|jumbo|vea|walmart|chango|makro|vital|almacen|almacén|verduleria|verdul\b|carniceria|carnicer\b/.test(d)) {
    const found = expenseCats.find((c) => c.id === "groceries" || /alimentaci[oó]n|comestibles|super|groceries/i.test(c.name));
    if (found) return found;
  }

  // 3. Restaurantes & Delivery / Salidas
  if (/pedidosya|rappi|restaurant|rest[oó]|bar\b|cafe|café|coffee|starbucks|mcdon|burger|mostaza|havanna|pizzeria|pizz|sushi|helad|cerveza|grido|freddo|lucciano/.test(d)) {
    const found = expenseCats.find((c) => c.id === "dining" || /restaurante|comida|dining|gastronom[ií]a/i.test(c.name));
    if (found) return found;
  }

  // 4. Servicios & Facturas / Impuestos
  if (/luz|gas|agua|telecom|fibertel|personal|claro|movistar|edenor|edesur|metrogas|aysa|flow|telecentro|abl|arba|afip|rentas|seguro|inmobiliario|expensas|patente|alquiler/.test(d)) {
    const found = expenseCats.find((c) => c.id === "bills" || /servicios|impuestos|facturas|bills/i.test(c.name));
    if (found) return found;
  }

  // 5. Salud & Farmacia
  if (/farmacia|farmacity|dr\.|doctor|hospital|clinica|clínica|swiss medical|osde|galeno|medic|optica|óptica|laboratorio|odontolog/.test(d)) {
    const found = expenseCats.find((c) => c.id === "health" || /salud|farmacia|health/i.test(c.name));
    if (found) return found;
  }

  // 6. Entretenimiento & Ocio / Salidas
  if (/netflix|spotify|disney|hbo|max|prime video|youtube|steam|playstation|xbox|cinema|cine|hoyts|cinemark|teatro|recital|show/.test(d)) {
    const found = expenseCats.find((c) => c.id === "entertainment" || /ocio|entretenimiento|entertainment|salidas/i.test(c.name));
    if (found) return found;
  }

  // 7. Compras / Shopping
  if (/mercadolibre|mercado libre|meli|amazon|zara|falabella|tienda|shop|ropa|indumentaria|electronica|electrónica|nike|adidas/.test(d)) {
    const found = expenseCats.find((c) => c.id === "shopping" || /compras|shopping|indumentaria/i.test(c.name));
    if (found) return found;
  }

  // Si no se especificó type, evaluar ingresos como posibilidad secundaria
  if (!type) {
    if (/sueldo|salary|haberes|honorarios|remuneraci[oó]n|jubilaci[oó]n|acreditacion haberes|pago de haberes/.test(d)) {
      const found = availableCategories.find((c) => c.id === "salary" || /sueldo|salario|salary/i.test(c.name));
      if (found) return found;
    }
    if (/freelance|honorarios prof|proyecto|cliente|factura emitida|upwork|fiverr/.test(d)) {
      const found = availableCategories.find((c) => c.id === "freelance" || /freelance|proyecto/i.test(c.name));
      if (found) return found;
    }
    if (/inter[eé]s|intereses|rendimiento|dividendos|plazo fijo|fci|cauci[oó]n|dividend/.test(d)) {
      const found = availableCategories.find((c) => c.id === "investments" || /inversi|rendimiento|investment|inter[eé]s/i.test(c.name));
      if (found) return found;
    }
  }

  // Fallback seguro: buscar una categoría válida existente en availableCategories
  const safeFallback =
    expenseCats.find((c) => /otros?|general/i.test(c.name)) ??
    expenseCats[0] ??
    availableCategories[0];

  if (safeFallback) {
    return safeFallback;
  }

  return {
    id: "uncategorized",
    name: "Sin Categoría",
    color: "bg-zinc-500",
    type: "expense",
    icon: "circle-dot",
  };
}

export function parseAmount(raw: string): number {
  if (!raw) return 0;
  // Limpiar monedas, signos, comillas y espacios (ARS, $, USD, EUR, etc.)
  let cleaned = raw.replace(/[$€£ARSUSD\s"']/gi, "").trim();

  // Si tiene formato entre paréntesis: (1200.50) => 1200.50
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = cleaned.slice(1, -1);
  }

  // Manejo de signos iniciales o finales (ej. 1500.00-)
  cleaned = cleaned.replace(/^-/, "").replace(/-$/, "");

  // Si tiene formato "1.234,56" o "1234,56" (coma como decimal)
  if (/,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{1,2}$/.test(cleaned)) {
    // Si tiene formato "1,234.56" o "1234.56" (punto como decimal)
    cleaned = cleaned.replace(/,/g, "");
  } else if (/,\d{3}$/.test(cleaned) || /\.\d{3}$/.test(cleaned)) {
    // Caso de enteros con miles ej "1.500" o "1,500"
    cleaned = cleaned.replace(/[.,]/g, "");
  }

  return Math.abs(parseFloat(cleaned) || 0);
}

export function isNegativeAmount(raw: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim().toLowerCase();
  // Limpiar posibles símbolos de moneda para ver si empieza o termina con -
  const withoutCurrency = trimmed.replace(/[$€£arsusd\s"']/gi, "");
  return (
    withoutCurrency.startsWith("-") ||
    withoutCurrency.endsWith("-") ||
    (withoutCurrency.startsWith("(") && withoutCurrency.endsWith(")")) ||
    /d[eé]bito|egreso|cargo/i.test(trimmed)
  );
}

export function parseDate(raw: string): Date {
  if (!raw) return new Date();
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");

  // Formato DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = dmy[3].length === 2 ? 2000 + parseInt(dmy[3], 10) : parseInt(dmy[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Formato YYYY/MM/DD o YYYY-MM-DD
  const ymd = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Fallback nativo
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function isPotentialDuplicate(
  candidate: { date: Date; amount: number; description: string; accountId: string },
  existingTransactions: Transaction[]
): boolean {
  const candidateDateStr = candidate.date.toISOString().split("T")[0];
  const candDescClean = candidate.description.trim().toLowerCase();

  return existingTransactions.some((tx) => {
    if (tx.accountId !== candidate.accountId) return false;
    if (Math.abs(tx.amount - candidate.amount) > 0.01) return false;

    const txDateStr = tx.date.toISOString().split("T")[0];
    if (txDateStr !== candidateDateStr) return false;

    // Coincidencia o similitud alta en descripción
    const txDescClean = tx.description.trim().toLowerCase();
    return (
      txDescClean === candDescClean ||
      txDescClean.includes(candDescClean) ||
      candDescClean.includes(txDescClean)
    );
  });
}

/**
 * Intenta encontrar una coincidencia entre el nombre de categoría importado y las categorías del sistema
 */
export function matchCategoryByName(
  rawName: string,
  availableCategories: Category[],
  preferredType?: "income" | "expense"
): Category | null {
  if (!rawName) return null;
  const clean = rawName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!clean) return null;

  // Filtrar si hay preferencia de tipo
  const pool = preferredType
    ? [
        ...availableCategories.filter((c) => c.type === preferredType),
        ...availableCategories.filter((c) => c.type !== preferredType),
      ]
    : availableCategories;

  // 1. Coincidencia exacta normalizada
  for (const cat of pool) {
    const catClean = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (catClean === clean) return cat;
  }

  // 2. Coincidencia por contención bidireccional
  for (const cat of pool) {
    const catClean = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (catClean.includes(clean) || clean.includes(catClean)) return cat;
  }

  // 3. Mapeos semánticos frecuentes (ej. Mobills -> DOM)
  if (/salida|delivery|restauran|comida|gastronom/i.test(clean)) {
    const found = pool.find(
      (c) => /dining|restaurante|salidas/i.test(c.id) || /restaurante|delivery|salidas/i.test(c.name)
    );
    if (found) return found;
  }
  if (/almacen|super|comestible|mercado/i.test(clean)) {
    const found = pool.find(
      (c) => /groceries|super|almacen/i.test(c.id) || /supermercado|almacen/i.test(c.name)
    );
    if (found) return found;
  }
  if (/nafta|combustible|transporte|peaje|auto/i.test(clean)) {
    const found = pool.find(
      (c) => /transport|transporte|combustible/i.test(c.id) || /transporte|movilidad/i.test(c.name)
    );
    if (found) return found;
  }
  if (/salud|farmacia|medic/i.test(clean)) {
    const found = pool.find(
      (c) => /health|salud|farmacia/i.test(c.id) || /salud|farmacia/i.test(c.name)
    );
    if (found) return found;
  }
  if (/impuesto|tarjeta|servicio|comision/i.test(clean)) {
    const found = pool.find(
      (c) => /bills|servicios|impuestos/i.test(c.id) || /servicios|impuestos/i.test(c.name)
    );
    if (found) return found;
  }
  if (/formacion|educacion|curso/i.test(clean)) {
    const found = pool.find((c) => /educacion|formacion/i.test(c.name));
    if (found) return found;
  }

  return null;
}

export function rowsToTransactions(
  rows: CsvRow[],
  mapping: ColumnMapping,
  accountId: string,
  availableCategories: Category[] = CATEGORIES,
  currency?: Currency,
  rules: TransactionRule[] = []
): Transaction[] {
  return rows.map((row, i) => {
    let amount = 0;
    let type: "income" | "expense" = "expense";

    // Si hay columnas separadas de débito y crédito
    const debitVal = mapping.debit ? row[mapping.debit] : "";
    const creditVal = mapping.credit ? row[mapping.credit] : "";

    if (debitVal && parseAmount(debitVal) > 0) {
      amount = parseAmount(debitVal);
      type = "expense";
    } else if (creditVal && parseAmount(creditVal) > 0) {
      amount = parseAmount(creditVal);
      type = "income";
    } else {
      const rawAmount = row[mapping.amount] ?? "0";
      amount = parseAmount(rawAmount);

      const isInvertedSign = mapping.type === "__sign_inverted__";

      if (isInvertedSign) {
        // En convención invertida (Mobills, resúmenes de tarjeta, etc.):
        // Montos negativos son devoluciones/ingresos, y montos positivos son gastos
        if (isNegativeAmount(rawAmount)) {
          type = "income";
        } else {
          type = "expense";
        }
      } else if (isNegativeAmount(rawAmount)) {
        type = "expense";
      } else if (mapping.type && row[mapping.type]) {
        const tv = row[mapping.type].toLowerCase();
        if (/debit|d[eé]bito|egreso|cargo/i.test(tv)) {
          type = "expense";
        } else if (/cr[eé]dit|income|ingreso|haber|abono/i.test(tv)) {
          type = "income";
        } else {
          type = "income";
        }
      } else {
        type = "income";
      }
    }

    let desc = row[mapping.description]?.trim() || "";

    // Si la descripción está vacía (común en Mercado Pago si no hay store_name), buscar en referencias
    if (!desc) {
      const altDesc =
        row["POS_NAME"] ||
        row["STORE_NAME"] ||
        row["EXTERNAL_REFERENCE"] ||
        row["PAYMENT_METHOD"] ||
        row["TRANSACTION_TYPE"] ||
        "";
      if (altDesc) {
        desc = altDesc;
      } else if (type === "income") {
        desc = "Ingreso / Transferencia";
      } else {
        desc = "Consumo Mercado Pago";
      }
    }

    const date = parseDate(row[mapping.date] ?? "");

    // Detección de cuotas (por columna dedicada o por patrón C.XX/YY en descripción)
    let installmentInfo: { current: number; total: number; groupId: string } | undefined;

    const extracted = extractInstallmentInfo(desc);
    if (extracted) {
      installmentInfo = {
        current: extracted.current,
        total: extracted.total,
        groupId: `group-${Date.now()}-${i}`,
      };
      // Opcional: limpiar descripción para que quede prolija
      desc = extracted.cleanDescription;
    } else if (mapping.installments && row[mapping.installments]) {
      const rawInst = row[mapping.installments].trim();
      const extractedFromCol = extractInstallmentInfo(rawInst);
      if (extractedFromCol) {
        installmentInfo = {
          current: extractedFromCol.current,
          total: extractedFromCol.total,
          groupId: `group-${Date.now()}-${i}`,
        };
      } else {
        const instCount = parseInt(rawInst, 10);
        if (!isNaN(instCount) && instCount > 1) {
          installmentInfo = {
            current: 1,
            total: instCount,
            groupId: `group-${Date.now()}-${i}`,
          };
        }
      }
    }

    // Detección de moneda USD si el monto o la descripción explicitan USD
    let txCurrency = currency || "ARS";
    const rawAmountStr = (mapping.amount ? row[mapping.amount] : "") || "";
    if (/usd|u\$s|\$us/i.test(rawAmountStr) || /usd|u\$s|\$us/i.test(desc)) {
      txCurrency = "USD";
    }

    let isCardPayment = detectCardPayment(desc);
    let isTransfer = detectPotentialTransfer(desc, row);

    // Categoría de fallback garantizada proveniente de las categorías reales
    const defaultExpense =
      availableCategories.find((c) => /otros?|general/i.test(c.name) && c.type === "expense") ??
      availableCategories.find((c) => c.type === "expense") ??
      availableCategories[0];
    const defaultIncome =
      availableCategories.find((c) => /otros?|general/i.test(c.name) && c.type === "income") ??
      availableCategories.find((c) => c.type === "income") ??
      availableCategories[0];

    const fallbackCat: Category = (type === "income" ? defaultIncome : defaultExpense) || {
      id: "uncategorized",
      name: "Sin Categoría",
      color: "bg-zinc-500",
      type,
      icon: "circle-dot",
    };

    // Si mapping.category está definido, intentar matchear la categoría importada
    let importedCategory: Category | null = null;
    if (mapping.category && row[mapping.category]) {
      importedCategory = matchCategoryByName(row[mapping.category], availableCategories, type);
    }

    const initialCat = importedCategory || fallbackCat;

    // Crear draft para pasar por el motor de reglas
    const draft: DraftTransactionInput = {
      amount,
      description: desc,
      category: initialCat,
      type,
      accountId,
      isTransfer,
      isCardPayment,
    };

    // Evaluar reglas declarativas activas
    const evaluated =
      rules.length > 0
        ? applyRulesToTransaction(draft, rules, availableCategories)
        : draft;

    let finalCategory = evaluated.category;

    // Si ninguna regla asignó categoría y se conserva el fallback (y no había categoría importada válida), intentar deducción por nombre
    if (finalCategory.id === fallbackCat.id && !importedCategory) {
      if (evaluated.isTransfer) {
        const transferCat = availableCategories.find(
          (c) => c.id === "transfer" || /transfer/i.test(c.name)
        );
        if (transferCat) finalCategory = transferCat;
      } else {
        const guessed = guessCategory(evaluated.description, availableCategories, evaluated.type);
        if (guessed && !guessed.id.startsWith("uncategorized")) {
          finalCategory = guessed;
        }
      }
    }

    // Invariante de coherencia de tipo: si la transacción es ingreso, jamás debe quedar con categoría de gasto
    if (evaluated.type === "income" && finalCategory.type === "expense") {
      const incomeCat =
        availableCategories.find((c) => c.type === "income" && /inversi|rendimiento|inter[eé]s/i.test(c.name)) ??
        availableCategories.find((c) => c.type === "income" && /otros?|general|ingreso/i.test(c.name)) ??
        availableCategories.find((c) => c.type === "income") ??
        fallbackCat;
      finalCategory = incomeCat;
    }

    return {
      id: generateUUID(),
      amount: evaluated.amount,
      description: evaluated.description,
      category: finalCategory,
      date,
      type: evaluated.type,
      accountId,
      currency: txCurrency,
      isCardPayment: evaluated.isCardPayment ?? isCardPayment,
      isTransfer: evaluated.isTransfer ?? isTransfer,
      installmentInfo,
      tags: evaluated.tags,
    };
  });
}
