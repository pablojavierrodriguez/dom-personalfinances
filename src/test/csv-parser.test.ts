import { describe, it, expect } from "vitest";
import {
  parseCsvText,
  guessMapping,
  guessCategory,
  parseAmount,
  isNegativeAmount,
  parseDate,
  isPotentialDuplicate,
  rowsToTransactions,
  extractInstallmentInfo,
  generateFutureInstallments,
  detectCardPayment,
  detectPotentialTransfer,
  matchCategoryByName,
} from "@/lib/csv-parser";
import { CATEGORIES } from "@/lib/types";

describe("csv-parser module", () => {
  it("parses comma and semicolon separated CSV text correctly", () => {
    const csvComma = `Fecha,Concepto,Importe\n15/03/2026,"Supermercado Coto, Suc 45",15400.50\n16/03/2026,Uber,3200.00`;
    const resultComma = parseCsvText(csvComma);
    expect(resultComma.headers).toEqual(["Fecha", "Concepto", "Importe"]);
    expect(resultComma.rows).toHaveLength(2);
    expect(resultComma.rows[0]["Concepto"]).toBe("Supermercado Coto, Suc 45");

    const csvSemi = `Fecha;Detalle;Monto\n2026-03-01;Pago Edenor;4500,80\n2026-03-02;Acreditacion Haberes;350000,00`;
    const resultSemi = parseCsvText(csvSemi);
    expect(resultSemi.headers).toEqual(["Fecha", "Detalle", "Monto"]);
    expect(resultSemi.rows).toHaveLength(2);
  });

  it("guesses column mappings intelligently", () => {
    const headers = ["Fecha Op.", "Detalle del Movimiento", "Débito", "Crédito", "Saldo"];
    const mapping = guessMapping(headers);
    expect(mapping.date).toBe("Fecha Op.");
    expect(mapping.description).toBe("Detalle del Movimiento");
    expect(mapping.debit).toBe("Débito");
    expect(mapping.credit).toBe("Crédito");
  });

  it("parses various Latin American and international currency formats", () => {
    expect(parseAmount("$ 1.250,50")).toBe(1250.5);
    expect(parseAmount("ARS 15.400,00")).toBe(15400);
    expect(parseAmount("-2,450.75")).toBe(2450.75);
    expect(parseAmount("(500.00)")).toBe(500);
    expect(parseAmount("1200,50-")).toBe(1200.5);
    expect(parseAmount("")).toBe(0);
  });

  it("detects negative amounts correctly", () => {
    expect(isNegativeAmount("-$ 1500.00")).toBe(true);
    expect(isNegativeAmount("1500.00-")).toBe(true);
    expect(isNegativeAmount("(250.00)")).toBe(true);
    expect(isNegativeAmount("Débito")).toBe(true);
    expect(isNegativeAmount("500.00")).toBe(false);
  });

  it("parses multiple date formats (DD/MM/YYYY, YYYY-MM-DD)", () => {
    const d1 = parseDate("18/03/2026");
    expect(d1.getFullYear()).toBe(2026);
    expect(d1.getMonth()).toBe(2); // March
    expect(d1.getDate()).toBe(18);

    const d2 = parseDate("2026-03-18");
    expect(d2.getFullYear()).toBe(2026);
    expect(d2.getMonth()).toBe(2);
    expect(d2.getDate()).toBe(18);
  });

  it("categorizes common Argentine / Latin American merchants", () => {
    expect(guessCategory("Supermercado Coto Retiro").id).toBe("groceries");
    expect(guessCategory("Viaje Uber cabify").id).toBe("transport");
    expect(guessCategory("Estacion de servicio YPF").id).toBe("transport");
    expect(guessCategory("PedidosYa Hamburguesas").id).toBe("dining");
    expect(guessCategory("Factura Luz Edenor").id).toBe("bills");
    expect(guessCategory("Farmacity Suc 12").id).toBe("health");
    expect(guessCategory("Compra Mercadolibre Electrónica").id).toBe("shopping");
    expect(guessCategory("Acreditacion Sueldo Haberes").id).toBe("salary");
    expect(guessCategory("Suscripcion Netflix Mensual").id).toBe("entertainment");
  });

  it("detects potential duplicates based on date, amount and similar description", () => {
    const existing = [
      {
        id: "tx-1",
        amount: 5400,
        description: "Coto Supermercados",
        category: CATEGORIES[0],
        date: new Date(2026, 2, 15),
        type: "expense" as const,
        accountId: "acc-1",
      },
    ];

    const duplicateCandidate = {
      date: new Date(2026, 2, 15),
      amount: 5400,
      description: "Coto",
      accountId: "acc-1",
    };

    const differentCandidate = {
      date: new Date(2026, 2, 15),
      amount: 3200,
      description: "Coto",
      accountId: "acc-1",
    };

    expect(isPotentialDuplicate(duplicateCandidate, existing)).toBe(true);
    expect(isPotentialDuplicate(differentCandidate, existing)).toBe(false);
  });

  it("converts CSV rows with separate debit/credit columns into transactions", () => {
    const rows = [
      { Fecha: "15/03/2026", Detalle: "YPF Combustible", Débito: "12500,00", Crédito: "" },
      { Fecha: "16/03/2026", Detalle: "Cobro Sueldo", Débito: "", Crédito: "450000,00" },
    ];

    const mapping = {
      date: "Fecha",
      description: "Detalle",
      amount: "Débito",
      type: "",
      debit: "Débito",
      credit: "Crédito",
    };

    const txs = rowsToTransactions(rows, mapping, "acc-test");
    expect(txs).toHaveLength(2);

    expect(txs[0].type).toBe("expense");
    expect(txs[0].amount).toBe(12500);
    expect(txs[0].category.id).toBe("transport");

    expect(txs[1].type).toBe("income");
    expect(txs[1].amount).toBe(450000);
    expect(txs[1].category.id).toBe("salary");
  });

  it("extracts installment info from credit card descriptions (BBVA Visa/Mastercard)", () => {
    const r1 = extractInstallmentInfo("MERPAGO*DXELECTRONICA C.06/06");
    expect(r1).not.toBeNull();
    expect(r1?.current).toBe(6);
    expect(r1?.total).toBe(6);
    expect(r1?.cleanDescription).toBe("MERPAGO*DXELECTRONICA");

    const r2 = extractInstallmentInfo("MERPAGO*CARESTINO C.05/06");
    expect(r2?.current).toBe(5);
    expect(r2?.total).toBe(6);
    expect(r2?.cleanDescription).toBe("MERPAGO*CARESTINO");

    const r3 = extractInstallmentInfo("SUPERM LA ANONIMA 15 C.06/12");
    expect(r3?.current).toBe(6);
    expect(r3?.total).toBe(12);

    const r4 = extractInstallmentInfo("SOMMIERCENTER WEB CUOTA 02/12");
    expect(r4?.current).toBe(2);
    expect(r4?.total).toBe(12);

    const r5 = extractInstallmentInfo("FARMACIAS PATAGONICAS");
    expect(r5).toBeNull();
  });

  it("generates future installment transactions correctly", () => {
    const baseTx = {
      id: "tx-base-1",
      amount: 22666.5,
      description: "MERPAGO*CARESTINO",
      category: CATEGORIES[0],
      date: new Date(2026, 7, 21), // Agosto 2026
      type: "expense" as const,
      accountId: "credit-visa",
      installmentInfo: {
        current: 5,
        total: 6,
        groupId: "grp-carestino",
      },
    };

    const future = generateFutureInstallments(baseTx, { paymentDay: 5 });
    expect(future).toHaveLength(1);
    expect(future[0].installmentInfo?.current).toBe(6);
    expect(future[0].installmentInfo?.total).toBe(6);
    expect(future[0].date.getMonth()).toBe(8); // Septiembre 2026
    expect(future[0].date.getDate()).toBe(5);
  });

  it("detects credit card payment concepts", () => {
    expect(detectCardPayment("SU PAGO EN PESOS")).toBe(true);
    expect(detectCardPayment("PAGO DE RESUMEN VISA")).toBe(true);
    expect(detectCardPayment("DEPOSITO SU PAGO")).toBe(true);
    expect(detectCardPayment("SUPERM LA ANONIMA 15")).toBe(false);
  });

  it("parses real Mercado Pago CSV statement format", () => {
    const rawMp = `EXTERNAL_REFERENCE;SOURCE_ID;USER_ID;PAYMENT_METHOD_TYPE;PAYMENT_METHOD;SITE;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;SELLER_AMOUNT;TRANSACTION_DATE;FEE_AMOUNT;SETTLEMENT_NET_AMOUNT;SETTLEMENT_CURRENCY;SETTLEMENT_DATE;REAL_AMOUNT;COUPON_AMOUNT;METADATA;MKP_FEE_AMOUNT;FINANCING_FEE_AMOUNT;SHIPPING_FEE_AMOUNT;TAXES_AMOUNT;INSTALLMENTS;TAX_DETAIL;TAX_AMOUNT_TELCO;POS_ID;STORE_ID;STORE_NAME;EXTERNAL_POS_ID;POS_NAME;EXTERNAL_STORE_ID;FEE_PREVISION;ORDER_ID;SHIPPING_ID;SHIPMENT_MODE;PACK_ID;TAXES_DISAGGREGATED;POI_ID
;175609292015;21648255;available_money;available_money;MLA;SETTLEMENT;-15000.00;ARS;0.00;2026-08-31T17:25:20.000-03:00;0.00;-15000.00;ARS;2026-08-31T17:25:20.000-03:00;-15000.00;0.00;"[{}]";0.00;0.00;0.00;0.00;1;;0.00;;;;;;;0.00;;;;;"[]";
;175229529429;21648255;bank_transfer;cvu;MLA;SETTLEMENT;64824.10;ARS;0.00;2026-08-29T07:26:19.000-03:00;0.00;64824.10;ARS;2026-08-29T07:26:19.000-03:00;64824.10;0.00;"[{}]";0.00;0.00;0.00;0.00;1;;0.00;;;;;;;0.00;;;;;"[]";
"INSTORE-c561feb5";174615009236;21648255;available_money;available_money;MLA;SETTLEMENT;-3500.00;ARS;0.00;2026-08-19T13:11:33.000-03:00;0.00;-3500.00;ARS;2026-08-19T13:11:33.000-03:00;-3500.00;0.00;"[{}]";0.00;0.00;0.00;0.00;1;;0.00;85773201;;;;CAJA ALVEAR;;0.00;43738950487;;;;"[]";`;

    const { headers, rows } = parseCsvText(rawMp);
    expect(rows).toHaveLength(3);

    const mapping = guessMapping(headers);
    expect(mapping.date).toBe("TRANSACTION_DATE");
    expect(mapping.amount).toBe("TRANSACTION_AMOUNT");

    const txs = rowsToTransactions(rows, mapping, "mp-account");
    expect(txs).toHaveLength(3);

    // Fila 1: -15000 (gasto)
    expect(txs[0].type).toBe("expense");
    expect(txs[0].amount).toBe(15000);

    // Fila 2: +64824.10 (ingreso cvu transfer)
    expect(txs[1].type).toBe("income");
    expect(txs[1].amount).toBe(64824.1);
    expect(txs[1].isTransfer).toBe(true);

    // Fila 3: -3500 con STORE_NAME CAJA ALVEAR
    expect(txs[2].type).toBe("expense");
    expect(txs[2].amount).toBe(3500);
    expect(txs[2].description).toBe("CAJA ALVEAR");
    expect(txs[2].isTransfer).toBeFalsy();
  });

  it("detects transfers from bank statements and raw descriptions", () => {
    expect(detectPotentialTransfer("TRF INMEDIATA A CUENTA PROPIA")).toBe(true);
    expect(detectPotentialTransfer("DEBIN RECIBIDO")).toBe(true);
    expect(detectPotentialTransfer("TRANSFERENCIA CVU 000000310001")).toBe(true);
    expect(detectPotentialTransfer("TRASPASO ENTRE CUENTAS")).toBe(true);
    expect(detectPotentialTransfer("COMPRA FARMACIA DEL PUEBLO")).toBe(false);

    // Detección por metadatos de fila (ej. Mercado Pago)
    expect(
      detectPotentialTransfer("Movimiento", {
        PAYMENT_METHOD_TYPE: "bank_transfer",
        PAYMENT_METHOD: "cvu",
      })
    ).toBe(true);
  });

  it("applies declarative rules in rowsToTransactions with real UUID categories", () => {
    const userCategories = [
      { id: "uuid-salary-1234", name: "Sueldos & Honorarios", color: "bg-emerald-500", type: "income" as const },
      { id: "uuid-groceries-5678", name: "Supermercado", color: "bg-orange-500", type: "expense" as const },
    ];

    const rules = [
      {
        id: "rule-salary",
        name: "Sueldo",
        isActive: true,
        priority: 10,
        conditions: [
          { field: "description" as const, operator: "contains_any" as const, value: "sueldos op, haberes" },
        ],
        actions: {
          setCategoryId: "uuid-salary-1234",
          setType: "income" as const,
        },
        createdAt: new Date(),
      },
    ];

    const rows = [
      { Fecha: "01/09/2026", Concepto: "SUELDOS OP.4033741", Importe: "4105530,00" },
      { Fecha: "02/09/2026", Concepto: "COTO SUCURSAL 12", Importe: "-15000,00" },
    ];

    const mapping = {
      date: "Fecha",
      description: "Concepto",
      amount: "Importe",
      type: "",
    };

    const txs = rowsToTransactions(rows, mapping, "acc-bank", userCategories, "ARS", rules);
    expect(txs[0].category.id).toBe("uuid-salary-1234");
    expect(txs[0].category.name).toBe("Sueldos & Honorarios");
    expect(txs[0].type).toBe("income");
    expect(txs[0].amount).toBe(4105530);

    expect(txs[1].category.id).toBe("uuid-groceries-5678");
    expect(txs[1].type).toBe("expense");
  });

  it("classifies 'INTERESES GANADOS' as income category and NEVER as an expense category like Alimentación", () => {
    const userCategories = [
      { id: "cat-food", name: "Alimentación", color: "bg-orange-500", type: "expense" as const },
      { id: "cat-invest", name: "Rendimientos & Inversiones", color: "bg-cyan-500", type: "income" as const },
      { id: "cat-salary", name: "Sueldos", color: "bg-emerald-500", type: "income" as const },
    ];

    // 1. Test unitario directo de guessCategory con type === "income"
    const guessed = guessCategory("INTERESES GANADOS CA$ 339-630726/9", userCategories, "income");
    expect(guessed.type).toBe("income");
    expect(guessed.id).toBe("cat-invest");
    expect(guessed.name).toBe("Rendimientos & Inversiones");

    // 2. Test en rowsToTransactions con extracto de banco BBVA (Débito vacío, Crédito con monto)
    const bbvaRows = [
      {
        Fecha: "28/08/2026",
        Concepto: "INTERESES GANADOS CA$ 339-630726/9",
        Comprobante: "00000000",
        "Débito": "",
        "Crédito": "450,25",
        Saldo: "150450,25",
      },
    ];

    const bbvaMapping = {
      date: "Fecha",
      description: "Concepto",
      amount: "",
      debit: "Débito",
      credit: "Crédito",
      type: "",
    };

    const parsed = rowsToTransactions(bbvaRows, bbvaMapping, "acc-bbva", userCategories, "ARS", []);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("income");
    expect(parsed[0].amount).toBe(450.25);
    expect(parsed[0].category.type).toBe("income");
    expect(parsed[0].category.id).toBe("cat-invest");
    expect(parsed[0].category.name).not.toBe("Alimentación");
  });

  it("guarantees income fallback never defaults to an expense category", () => {
    const userCategories = [
      { id: "cat-food", name: "Alimentación", color: "bg-orange-500", type: "expense" as const },
      { id: "cat-transport", name: "Transporte", color: "bg-sky-500", type: "expense" as const },
      { id: "cat-other-inc", name: "Otros Ingresos", color: "bg-emerald-500", type: "income" as const },
    ];

    // Transacción de ingreso con concepto no reconocido
    const guessed = guessCategory("CONCEPTO DESCONOCIDO POSITIVO", userCategories, "income");
    expect(guessed.type).toBe("income");
    expect(guessed.name).toBe("Otros Ingresos");
    expect(guessed.name).not.toBe("Alimentación");
  });

  it("handles inverted signs convention for Mobills and card exports (__sign_inverted__)", () => {
    // Filas reales como las de la exportación de Mobills
    const mobillsRows = [
      { Fecha: "25/10/2024", "Descripción": "IMPUESTO DE SELLOS", "Categoría": "Tarjeta", Valor: "$ 18.590,25" },
      { Fecha: "24/10/2024", "Descripción": "Autopista", "Categoría": "Otros gastos", Valor: "$ 1224,50" },
      { Fecha: "10/10/2024", "Descripción": "Puntos BBVA", "Categoría": "Chargeback**", Valor: "$ -10.728,00" },
      { Fecha: "04/10/2024", "Descripción": "Supermercado Coco", "Categoría": "Almacén", Valor: "$ 24.800,00" },
    ];

    const mapping = {
      date: "Fecha",
      description: "Descripción",
      amount: "Valor",
      type: "__sign_inverted__",
      category: "Categoría",
    };

    const txs = rowsToTransactions(mobillsRows, mapping, "acc-mobills");
    expect(txs).toHaveLength(4);

    // 1. Gasto positivo -> clasificado como expense
    expect(txs[0].description).toBe("IMPUESTO DE SELLOS");
    expect(txs[0].type).toBe("expense");
    expect(txs[0].amount).toBe(18590.25);

    // 2. Gasto positivo -> clasificado como expense
    expect(txs[1].description).toBe("Autopista");
    expect(txs[1].type).toBe("expense");
    expect(txs[1].amount).toBe(1224.5);

    // 3. Reintegro/devolución negativa -> clasificado como income
    expect(txs[2].description).toBe("Puntos BBVA");
    expect(txs[2].type).toBe("income");
    expect(txs[2].amount).toBe(10728);

    // 4. Supermercado -> expense
    expect(txs[3].description).toBe("Supermercado Coco");
    expect(txs[3].type).toBe("expense");
    expect(txs[3].amount).toBe(24800);
  });

  it("matches imported category names with existing system categories", () => {
    const customCats = [
      { id: "cat-groceries", name: "Almacén y Supermercado", color: "bg-orange-500", type: "expense" as const },
      { id: "cat-dining", name: "Salidas y Restaurantes", color: "bg-amber-500", type: "expense" as const },
      { id: "cat-transport", name: "Transporte y Combustible", color: "bg-blue-500", type: "expense" as const },
      { id: "cat-other-inc", name: "Otros Ingresos", color: "bg-emerald-500", type: "income" as const },
    ];

    // Prueba de matchCategoryByName
    const matchedDining = matchCategoryByName("Salidas y delivery", customCats, "expense");
    expect(matchedDining?.id).toBe("cat-dining");

    const matchedAlmacen = matchCategoryByName("Almacén", customCats, "expense");
    expect(matchedAlmacen?.id).toBe("cat-groceries");

    const matchedNafta = matchCategoryByName("Nafta", customCats, "expense");
    expect(matchedNafta?.id).toBe("cat-transport");
  });
});
