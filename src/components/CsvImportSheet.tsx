import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileText,
  ChevronDown,
  Check,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ArrowLeftRight,
  CheckSquare,
  Square,
  Sparkles,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { Account, Transaction, Category, TransactionRule } from "@/lib/types";
import {
  parseCsvText,
  guessMapping,
  rowsToTransactions,
  isPotentialDuplicate,
  generateFutureInstallments,
  CsvRow,
  ColumnMapping,
} from "@/lib/csv-parser";
import { parseExcelBuffer } from "@/lib/excel-parser";
import {
  extractPdfTextItems,
  parseBbvaCreditCardStatement,
  StatementMetadata,
} from "@/lib/pdf-statement-parser";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from "@/lib/settings-store";

interface CsvImportSheetProps {
  open: boolean;
  onClose: () => void;
  onImport: (txs: Transaction[]) => void;
  accounts: Account[];
  categories?: Category[];
  existingTransactions?: Transaction[];
  rules?: TransactionRule[];
  onAddRule?: (rule: TransactionRule) => void;
}

type Step = "upload" | "mapping" | "preview";

interface PreviewItem {
  tx: Transaction;
  selected: boolean;
  isDuplicate: boolean;
  projectFuture?: boolean;
}

export function CsvImportSheet({
  open,
  onClose,
  onImport,
  accounts,
  categories = [],
  existingTransactions = [],
  rules = [],
  onAddRule,
}: CsvImportSheetProps) {
  const { t } = useSettings();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [detectedProfile, setDetectedProfile] = useState<string | null>(null);
  const [pdfMetadata, setPdfMetadata] = useState<StatementMetadata | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
    type: "",
    debit: "",
    credit: "",
    installments: "",
  });
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [projectAllFuture, setProjectAllFuture] = useState(true);

  // Sincronizar automáticamente con una cuenta válida cuando cargan las cuentas,
  // priorizando cuentas bancarias (savings o checking) antes que efectivo
  useEffect(() => {
    if ((!accountId || !accounts.some((a) => a.id === accountId)) && accounts.length > 0) {
      const defaultAcc =
        accounts.find((a) => a.type === "savings") ||
        accounts.find((a) => a.type === "checking") ||
        accounts.find((a) => a.type === "credit") ||
        accounts[0];
      setAccountId(defaultAcc.id);
    }
  }, [accounts, accountId]);

  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    setPreviewItems((prev) =>
      prev.map((item) => ({
        ...item,
        tx: {
          ...item.tx,
          accountId: newAccId,
        },
      }))
    );
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setDetectedProfile(null);
    setPdfMetadata(null);
    setHeaders([]);
    setRows([]);
    setMapping({ date: "", description: "", amount: "", type: "", debit: "", credit: "", installments: "" });
    setPreviewItems([]);
    setError("");
    setIsImporting(false);
    setIsLoadingFile(false);
    setProjectAllFuture(true);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setError("");
    setFileName(file.name);
    setIsLoadingFile(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      // 1. Manejo de PDF (Resúmenes bancarios y de tarjetas)
      if (ext === "pdf") {
        const buffer = await file.arrayBuffer();
        const items = await extractPdfTextItems(buffer);
        if (items.length === 0) {
          setError("No se pudo extraer texto del PDF. Verificá que no sea una imagen escaneada.");
          setIsLoadingFile(false);
          return;
        }

        const fullText = items.map((i) => i.str).join(" ").toLowerCase();

        // Detección BBVA
        if (fullText.includes("bbva") || fullText.includes("resumen con vencimiento") || fullText.includes("consumos")) {
          const effectiveAccountId =
            accountId ||
            (accounts.find((a) => a.type === "credit") || accounts[0])?.id ||
            "";

          if (!effectiveAccountId) {
            setError("No hay cuentas configuradas para asociar los movimientos del extracto.");
            setIsLoadingFile(false);
            return;
          }

          if (accountId !== effectiveAccountId) {
            setAccountId(effectiveAccountId);
          }

          const parsed = parseBbvaCreditCardStatement(items, effectiveAccountId, categories);
          setDetectedProfile("Resumen Tarjeta BBVA");
          setPdfMetadata(parsed.metadata);

          // Combinar consumos + impuestos/cargos + pagos
          const allTxs = [...parsed.transactions, ...parsed.taxesAndFees, ...parsed.payments];
          if (allTxs.length === 0) {
            setError("No se encontraron transacciones legibles en el formato de BBVA.");
            setIsLoadingFile(false);
            return;
          }

          const previewList: PreviewItem[] = allTxs.map((tx) => {
            const isDup = isPotentialDuplicate(
              { date: tx.date, amount: tx.amount, description: tx.description, accountId },
              existingTransactions
            );
            return {
              tx,
              selected: !isDup,
              isDuplicate: isDup,
              projectFuture: tx.installmentInfo && tx.installmentInfo.current < tx.installmentInfo.total ? true : false,
            };
          });

          setPreviewItems(previewList);
          setStep("preview");
          setIsLoadingFile(false);
          return;
        }

        setError("El PDF no coincide con un formato bancario reconocido actualmente (BBVA). Podés convertirlo a Excel o CSV.");
        setIsLoadingFile(false);
        return;
      }

      // 2. Manejo de Excel (.xls / .xlsx)
      if (ext === "xls" || ext === "xlsx") {
        const buffer = await file.arrayBuffer();
        const sheets = parseExcelBuffer(buffer);

        if (sheets.length === 0 || sheets[0].rows.length === 0) {
          setError("No se encontraron tablas de datos válidas en el archivo Excel.");
          setIsLoadingFile(false);
          return;
        }

        const activeSheet = sheets[0];
        setHeaders(activeSheet.headers);
        setRows(activeSheet.rows);

        const guessed = guessMapping(activeSheet.headers);
        setMapping(guessed);

        if (activeSheet.metadata?.detectedType === "bbva") {
          setDetectedProfile("BBVA (Extracto Cuenta)");
        } else if (activeSheet.metadata?.detectedType === "generic_card") {
          setDetectedProfile("Tarjeta de Crédito / Movimientos");
        } else {
          setDetectedProfile(null);
        }

        // Selección inteligente de cuenta de destino según metadatos del extracto
        const accNum = activeSheet.metadata?.accountNumber;
        const accType = activeSheet.metadata?.accountType;
        let matchedAcc: Account | undefined;

        if (accNum) {
          matchedAcc = accounts.find(
            (a) =>
              a.name.toLowerCase().includes(accNum.toLowerCase()) ||
              accNum.toLowerCase().includes(a.name.toLowerCase())
          );
        }

        if (!matchedAcc && accType) {
          matchedAcc = accounts.find((a) => a.type === accType);
        }

        if (!matchedAcc) {
          matchedAcc = accounts.find((a) => a.type === "savings" || a.type === "checking");
        }

        if (matchedAcc) {
          setAccountId(matchedAcc.id);
        }

        setStep("mapping");
        setIsLoadingFile(false);
        return;
      }

      // 3. Fallback CSV / TXT
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { headers: h, rows: r } = parseCsvText(text);
        if (h.length < 2 || r.length === 0) {
          setError("No se encontraron datos válidos o columnas en el archivo.");
          setIsLoadingFile(false);
          return;
        }
        setHeaders(h);
        setRows(r);
        const guessed = guessMapping(h);
        setMapping(guessed);
        setStep("mapping");
        setIsLoadingFile(false);
      };
      reader.onerror = () => {
        setError("Error al leer el archivo seleccionado.");
        setIsLoadingFile(false);
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al procesar el archivo.");
      setIsLoadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleGeneratePreview = () => {
    if (!mapping.date || (!mapping.amount && !mapping.debit && !mapping.credit)) {
      setError("Mapeá al menos fecha y la columna de importe o débito/crédito.");
      return;
    }

    const txs = rowsToTransactions(
      rows,
      mapping,
      accountId,
      categories.length > 0 ? categories : undefined,
      selectedAccount?.currency as any,
      rules
    );

    const items: PreviewItem[] = txs.map((tx) => {
      const isDup = isPotentialDuplicate(
        { date: tx.date, amount: tx.amount, description: tx.description, accountId },
        existingTransactions
      );
      return {
        tx,
        selected: !isDup,
        isDuplicate: isDup,
        projectFuture: tx.installmentInfo && tx.installmentInfo.current < tx.installmentInfo.total ? true : false,
      };
    });

    setPreviewItems(items);
    setStep("preview");
  };

  const toggleSelectAll = () => {
    const allSelected = previewItems.every((item) => item.selected);
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const toggleSelectItem = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleProjectFuture = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, projectFuture: !item.projectFuture } : item))
    );
  };

  const handleCreateRuleFromItem = (tx: Transaction) => {
    if (!onAddRule) return;
    const cleanWord = tx.description.split(/\s+/).slice(0, 3).join(" ").trim();
    if (!cleanWord) return;

    const newRule: TransactionRule = {
      id: `rule-${Date.now()}`,
      name: `Auto: ${cleanWord} → ${tx.category.name}`,
      isActive: true,
      priority: (rules.length || 0) + 1,
      conditions: [
        {
          field: "description",
          operator: "contains",
          value: cleanWord,
        },
      ],
      actions: {
        setCategoryId: tx.category.id,
      },
      createdAt: new Date(),
    };

    onAddRule(newRule);
    toast({
      title: "Regla creada con éxito",
      description: `Las futuras transacciones con "${cleanWord}" se clasificarán automáticamente como "${tx.category.name}".`,
    });
  };

  const updateItemCategory = (index: number, categoryId: string) => {
    const selectedCat = categories.find((c) => c.id === categoryId);
    if (!selectedCat) return;

    setPreviewItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              tx: {
                ...item.tx,
                category: selectedCat,
                type: selectedCat.type, // Sincroniza automáticamente ingreso vs gasto
              },
            }
          : item
      )
    );
  };

  const toggleItemType = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const nextType: "income" | "expense" = item.tx.type === "income" ? "expense" : "income";
        let nextCat = item.tx.category;
        if (nextCat.type !== nextType) {
          const compatibleCat =
            categories.find((c) => c.type === nextType && /otros?|general/i.test(c.name)) ??
            categories.find((c) => c.type === nextType) ??
            nextCat;
          nextCat = compatibleCat;
        }

        return {
          ...item,
          tx: {
            ...item.tx,
            type: nextType,
            category: nextCat,
          },
        };
      })
    );
  };

  const toggleIsTransfer = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const nextIsTransfer = !item.tx.isTransfer;
        let newCategory = item.tx.category;

        if (nextIsTransfer) {
          const transferCat = categories.find((c) => c.id === "transfer" || /transfer/i.test(c.name));
          if (transferCat) {
            newCategory = transferCat;
          }
        }

        return {
          ...item,
          tx: {
            ...item.tx,
            isTransfer: nextIsTransfer,
            category: newCategory,
          },
        };
      })
    );
  };

  const selectedCount = previewItems.filter((i) => i.selected).length;
  const duplicateCount = previewItems.filter((i) => i.isDuplicate).length;
  const installmentsCount = previewItems.filter((i) => i.tx.installmentInfo).length;
  const transfersCount = previewItems.filter((i) => i.tx.isTransfer).length;

  const totalProjectedTxs = useMemo(() => {
    let count = 0;
    for (const item of previewItems) {
      if (item.selected && item.projectFuture && item.tx.installmentInfo) {
        const remaining = item.tx.installmentInfo.total - item.tx.installmentInfo.current;
        if (remaining > 0) count += remaining;
      }
    }
    return count;
  }, [previewItems]);

  const summary = useMemo(() => {
    const selectedItems = previewItems.filter((i) => i.selected);
    const regularIncome = selectedItems.filter((i) => i.tx.type === "income" && !i.tx.isTransfer);
    const regularExpense = selectedItems.filter((i) => i.tx.type === "expense" && !i.tx.isTransfer);
    const transfers = selectedItems.filter((i) => i.tx.isTransfer);

    const incomeTotal = selectedItems
      .filter((i) => i.tx.type === "income")
      .reduce((s, i) => s + i.tx.amount, 0);
    const expenseTotal = selectedItems
      .filter((i) => i.tx.type === "expense")
      .reduce((s, i) => s + i.tx.amount, 0);
    const net = incomeTotal - expenseTotal;

    return {
      total: selectedItems.length,
      incomeCount: regularIncome.length,
      expenseCount: regularExpense.length,
      transferCount: transfers.length,
      net,
    };
  }, [previewItems]);

  const handleImport = async () => {
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setError("Por favor seleccioná una cuenta de destino válida antes de importar.");
      return;
    }

    const selectedList = previewItems.filter((i) => i.selected);
    if (selectedList.length === 0) {
      setError("Seleccioná al menos un movimiento para importar.");
      return;
    }

    // Construir lista final: transacciones base + cuotas proyectadas a futuro si está activo
    const toImport: Transaction[] = [];
    for (const item of selectedList) {
      const ensuredTx: Transaction = {
        ...item.tx,
        accountId,
      };
      toImport.push(ensuredTx);
      if (item.projectFuture && item.tx.installmentInfo) {
        const futureTxs = generateFutureInstallments(ensuredTx, {
          paymentDay: selectedAccount?.paymentDay,
          closingDay: selectedAccount?.closingDay,
        });
        toImport.push(...futureTxs);
      }
    }

    try {
      setIsImporting(true);
      await onImport(toImport);
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${toImport.length} movimientos (${selectedList.length} extracto + ${toImport.length - selectedList.length} cuotas futuras).`,
      });
      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ocurrió un error al persistir los movimientos.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-card border border-border/80 rounded-t-[28px] md:rounded-[24px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/40 flex-shrink-0">
              <button
                onClick={handleClose}
                aria-label={t("csv.closeModal")}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <span className="text-[16px] font-display font-semibold text-foreground block">
                  {t("csv.title")}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {step === "upload" && t("csv.step1")}
                  {step === "mapping" && t("csv.step2")}
                  {step === "preview" && t("csv.step3")}
                </span>
              </div>
              <div className="w-10" />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls,.pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {/* Step Body */}
            <div className="p-6 overflow-y-auto overflow-x-hidden max-h-[calc(92vh-80px)] w-full">
              <AnimatePresence mode="wait">
                {/* STEP 1: Upload */}
                {step === "upload" && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 w-full overflow-x-hidden"
                  >
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => !isLoadingFile && fileRef.current?.click()}
                      className={`border-2 border-dashed border-border/80 hover:border-primary/80 rounded-[20px] p-8 flex flex-col items-center gap-3 cursor-pointer bg-secondary/15 hover:bg-secondary/30 transition-all duration-200 ${
                        isLoadingFile ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {isLoadingFile ? (
                          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8" />
                        )}
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[15px] text-foreground font-medium">
                          {isLoadingFile ? "Procesando documento..." : "Arrastrá tu extracto o hacé clic para buscar"}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          Resúmenes en PDF · Libros Excel (.xlsx / .xls) · Archivos CSV
                        </p>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-[12px] bg-destructive/10 border border-destructive/20 text-destructive text-[13px]">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[12px] text-muted-foreground font-medium">{t("csv.compatibleFormats")}</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "BBVA Visa/Master (PDF)",
                          "Santander Cuenta (XLS/CSV)",
                          "La Anónima / Tarjetas (XLSX)",
                          "Mercado Pago",
                          "Banco Galicia",
                          "Brubank",
                          "Ualá",
                          t("csv.genericExcel"),
                        ].map((b) => (
                          <span
                            key={b}
                            className="px-3 py-1 rounded-full bg-secondary/60 text-[12px] text-muted-foreground border border-border/40"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Mapping */}
                {step === "mapping" && (
                  <motion.div
                    key="mapping"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 w-full min-w-0 overflow-x-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[16px] bg-secondary/40 border border-border/50 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-[13px] text-foreground font-medium truncate">
                          {fileName || "Extracto cargado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {detectedProfile && (
                          <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/30">
                            {detectedProfile}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {rows.length} filas · {headers.length} col.
                        </Badge>
                      </div>
                    </div>

                    {/* Account Selector */}
                    <div>
                      <label className="text-[13px] text-foreground font-medium mb-2.5 block">
                        Cuenta bancaria de destino
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {accounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setAccountId(acc.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-[12px] text-left transition-all border ${
                              accountId === acc.id
                                ? "bg-secondary text-foreground border-primary/40 ring-1 ring-primary/40 font-medium"
                                : "bg-card hover:bg-secondary/30 text-muted-foreground border-border/60"
                            }`}
                          >
                            <div className={`category-dot ${acc.color} flex-shrink-0`} />
                            <span className="text-[13px] truncate">{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column Selectors */}
                    <div className="space-y-3">
                      <span className="text-[13px] text-foreground font-medium block">
                        {t("csv.columnMapping")}
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                        {/* Fecha */}
                        <div className="min-w-0">
                          <label className="text-[12px] text-muted-foreground mb-1 block">{t("csv.colDate")}</label>
                          <div className="relative">
                            <select
                              value={mapping.date}
                              onChange={(e) => setMapping((m) => ({ ...m, date: e.target.value }))}
                              className="w-full h-11 px-3.5 pr-8 rounded-[12px] bg-secondary/40 border border-border text-foreground text-[13px] appearance-none outline-none focus:ring-2 focus:ring-primary/30 transition-colors truncate"
                            >
                              {headers.map((h, hIdx) => (
                                <option key={`date-opt-${hIdx}-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        {/* Descripción */}
                        <div className="min-w-0">
                          <label className="text-[12px] text-muted-foreground mb-1 block">{t("csv.colDescription")}</label>
                          <div className="relative">
                            <select
                              value={mapping.description}
                              onChange={(e) => setMapping((m) => ({ ...m, description: e.target.value }))}
                              className="w-full h-11 px-3.5 pr-8 rounded-[12px] bg-secondary/40 border border-border text-foreground text-[13px] appearance-none outline-none focus:ring-2 focus:ring-primary/30 transition-colors truncate"
                            >
                              {headers.map((h, hIdx) => (
                                <option key={`desc-opt-${hIdx}-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        {/* Importe Único */}
                        <div className="min-w-0">
                          <label className="text-[12px] text-muted-foreground mb-1 block">
                            {t("csv.colAmount")}
                          </label>
                          <div className="relative">
                            <select
                              value={mapping.amount}
                              onChange={(e) => setMapping((m) => ({ ...m, amount: e.target.value }))}
                              className="w-full h-11 px-3.5 pr-8 rounded-[12px] bg-secondary/40 border border-border text-foreground text-[13px] appearance-none outline-none focus:ring-2 focus:ring-primary/30 transition-colors truncate"
                            >
                              <option key="amount-opt-none" value="">{t("csv.doNotUseDebitCredit")}</option>
                              {headers.map((h, hIdx) => (
                                <option key={`amount-opt-${hIdx}-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        {/* Tipo opcional */}
                        <div className="min-w-0">
                          <label className="text-[12px] text-muted-foreground mb-1 block">
                            {t("csv.movementTypeOptional")}
                          </label>
                          <div className="relative">
                            <select
                              value={mapping.type}
                              onChange={(e) => setMapping((m) => ({ ...m, type: e.target.value }))}
                              className="w-full h-11 px-3.5 pr-8 rounded-[12px] bg-secondary/40 border border-border text-foreground text-[13px] appearance-none outline-none focus:ring-2 focus:ring-primary/30 transition-colors truncate"
                            >
                              <option key="type-opt-none" value="">{t("csv.detectBySign")}</option>
                              {headers.map((h, hIdx) => (
                                <option key={`type-opt-${hIdx}-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        {/* Débito separado */}
                        <div className="min-w-0">
                          <label className="text-[12px] text-muted-foreground mb-1 block">
                            {t("csv.debitColumnOptional")}
                          </label>
                          <div className="relative">
                            <select
                              value={mapping.debit || ""}
                              onChange={(e) => setMapping((m) => ({ ...m, debit: e.target.value }))}
                              className="w-full h-11 px-3.5 pr-8 rounded-[12px] bg-secondary/40 border border-border text-foreground text-[13px] appearance-none outline-none focus:ring-2 focus:ring-primary/30 transition-colors truncate"
                            >
                              <option key="debit-opt-none" value="">{t("common.none")}</option>
                              {headers.map((h, hIdx) => (
                                <option key={`debit-opt-${hIdx}-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        {/* Crédito separado */}
                        <div className="min-w-0">
                          <label className="text-[12px] text-muted-foreground mb-1 block">
                            {t("csv.creditColumnOptional")}
                          </label>
                          <div className="relative">
                            <select
                              value={mapping.credit || ""}
                              onChange={(e) => setMapping((m) => ({ ...m, credit: e.target.value }))}
                              className="w-full h-11 px-3.5 pr-8 rounded-[12px] bg-secondary/40 border border-border text-foreground text-[13px] appearance-none outline-none focus:ring-2 focus:ring-primary/30 transition-colors truncate"
                            >
                              <option key="credit-opt-none" value="">{t("common.none")}</option>
                              {headers.map((h, hIdx) => (
                                <option key={`credit-opt-${hIdx}-${h}`} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview de la primera fila */}
                    {rows.length > 0 && (
                      <div className="p-3.5 rounded-[16px] bg-secondary/30 border border-border/40 min-w-0 overflow-hidden">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Muestra: Fila 1 de datos
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] min-w-0">
                          {headers.slice(0, 6).map((h, hIdx) => (
                            <div key={`sample-head-${hIdx}-${h}`} className="min-w-0 truncate">
                              <span className="text-muted-foreground truncate">{h}: </span>
                              <span className="text-foreground font-mono-data font-medium truncate">{rows[0][h] || "-"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-[12px] bg-destructive/10 border border-destructive/20 text-destructive text-[13px]">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={reset}
                        className="flex-1 h-12 rounded-[14px] bg-secondary hover:bg-secondary/80 text-foreground font-medium text-[14px] transition-colors"
                      >
                        Cambiar archivo
                      </button>
                      <button
                        type="button"
                        onClick={handleGeneratePreview}
                        className="flex-[2] h-12 rounded-[14px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[14px] shadow-sm transition-all"
                      >
                        Continuar a conciliación
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Preview & Reconciliation */}
                {step === "preview" && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5 w-full min-w-0 overflow-x-hidden"
                  >
                    {/* Selector de cuenta bancaria de destino */}
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-[16px] bg-secondary/40 border border-border/60 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
                          Cuenta bancaria de destino
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 min-w-0">
                          {selectedAccount && <div className={`category-dot ${selectedAccount.color} flex-shrink-0`} />}
                          <span className="text-[13px] font-medium text-foreground truncate block">
                            {selectedAccount ? selectedAccount.name : "Seleccionar cuenta..."}
                          </span>
                        </div>
                      </div>
                      <div className="relative flex-shrink-0">
                        <select
                          value={accountId}
                          onChange={(e) => handleAccountChange(e.target.value)}
                          className="h-10 px-3 pr-8 rounded-[12px] bg-card border border-border text-foreground text-[12px] font-medium outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.type === "credit" ? "Tarjeta" : acc.type === "savings" ? "Ahorro" : acc.type === "checking" ? "Corriente" : "Efectivo"})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* Resumen de totales */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-[16px] bg-secondary/50 border border-border/40 text-center">
                        <p className="text-[20px] font-mono-data font-semibold text-foreground">{summary.total}</p>
                        <p className="text-[11px] text-muted-foreground">{t("csv.selected")}</p>
                      </div>
                      <div className="p-3 rounded-[16px] bg-secondary/50 border border-border/40 text-center">
                        <p className="text-[20px] font-mono-data font-semibold text-primary">{summary.incomeCount}</p>
                        <p className="text-[11px] text-muted-foreground">{t("tx.incomes")}</p>
                      </div>
                      <div className="p-3 rounded-[16px] bg-secondary/50 border border-border/40 text-center">
                        <p className="text-[20px] font-mono-data font-semibold text-destructive">
                          {summary.expenseCount}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{t("tx.expenses")}</p>
                      </div>
                      <div className="p-3 rounded-[16px] bg-secondary/50 border border-border/40 text-center">
                        <p className="text-[20px] font-mono-data font-semibold text-sky-500">
                          {summary.transferCount}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{t("tx.transfers")}</p>
                      </div>
                    </div>

                    {/* Impacto neto */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[16px] bg-card border border-border/70 min-w-0">
                      <div className="min-w-0">
                        <span className="text-[12px] text-muted-foreground block truncate">{t("csv.netImpact")}</span>
                        <span
                          className={`font-mono-data text-[20px] font-semibold truncate block ${
                            summary.net >= 0 ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {summary.net >= 0 ? "+" : "-"}$
                          {Math.abs(summary.net).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {duplicateCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[12px] flex-shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{duplicateCount} posibles duplicados</span>
                        </div>
                      )}
                    </div>

                    {/* Toolbar de selección y opción de proyección de cuotas */}
                    <div className="flex flex-col gap-2 pt-1 border-b border-border/40 pb-3 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground font-medium py-1 px-2 -ml-2 rounded-[8px] hover:bg-secondary transition-colors flex-shrink-0"
                        >
                          {selectedCount === previewItems.length ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          <span>{selectedCount === previewItems.length ? "Deseleccionar todo" : "Seleccionar todo"}</span>
                        </button>

                        <span className="text-[12px] text-muted-foreground truncate">
                          {selectedCount} seleccionados {totalProjectedTxs > 0 && `(+${totalProjectedTxs} cuotas proyectadas)`}
                        </span>
                      </div>

                      {installmentsCount > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[12px] bg-primary/5 border border-primary/20 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-[12px] text-foreground font-medium truncate">
                              Se detectaron {installmentsCount} compras en cuotas
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !projectAllFuture;
                              setProjectAllFuture(nextVal);
                              setPreviewItems((prev) =>
                                prev.map((item) => ({
                                  ...item,
                                  projectFuture:
                                    item.tx.installmentInfo &&
                                    item.tx.installmentInfo.current < item.tx.installmentInfo.total
                                      ? nextVal
                                      : false,
                                }))
                              );
                            }}
                            className="text-[11px] font-medium text-primary hover:underline flex-shrink-0"
                          >
                            {projectAllFuture ? "Desactivar proyección futura" : "Proyectar cuotas futuras"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Lista interactiva de movimientos */}
                    <div className="max-h-[340px] overflow-y-auto overflow-x-hidden space-y-2 pr-1 divide-y divide-border/30 w-full min-w-0">
                      {previewItems.map((item, idx) => {
                        const { tx, selected, isDuplicate, projectFuture } = item;
                        const hasRemainingInstallments =
                          tx.installmentInfo && tx.installmentInfo.current < tx.installmentInfo.total;

                        return (
                          <div
                            key={tx.id}
                            className={`pt-2.5 pb-2 px-2.5 rounded-[14px] transition-all flex flex-col gap-2 min-w-0 ${
                              selected ? "bg-secondary/35" : "opacity-45 hover:opacity-75 bg-transparent"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="pt-1 flex-shrink-0">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={() => toggleSelectItem(idx)}
                                  className="w-4 h-4 rounded-[5px]"
                                />
                              </div>

                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                  <p className="text-[13px] text-foreground font-medium truncate min-w-0">{tx.description}</p>
                                  <span
                                    className={`font-mono-data text-[14px] font-semibold flex-shrink-0 whitespace-nowrap ${
                                      tx.type === "income" ? "text-primary" : "text-foreground"
                                    }`}
                                  >
                                    {tx.type === "expense" ? "-" : "+"}$
                                    {tx.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-1.5 min-w-0">
                                  <span className="text-[11px] text-muted-foreground font-mono flex-shrink-0">
                                    {tx.date.toLocaleDateString("es-AR", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>

                                  {/* Toggle de Tipo Ingreso / Gasto */}
                                  <button
                                    type="button"
                                    onClick={() => toggleItemType(idx)}
                                    title={tx.type === "income" ? "Movimiento clasificado como Ingreso (clic para cambiar a Gasto)" : "Movimiento clasificado como Gasto (clic para cambiar a Ingreso)"}
                                    className={`inline-flex items-center text-[10px] py-0 px-2 h-5 rounded-full font-medium transition-all flex-shrink-0 border ${
                                      tx.type === "income"
                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                        : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary/70"
                                    }`}
                                  >
                                    <span>{tx.type === "income" ? "+ Ingreso" : "- Gasto"}</span>
                                  </button>

                                  {/* Badges especiales y toggle de transferencia */}
                                  <button
                                    type="button"
                                    onClick={() => toggleIsTransfer(idx)}
                                    title={tx.isTransfer ? "Hacé clic para desmarcar como transferencia propia" : "Hacé clic para marcar como transferencia entre cuentas propias"}
                                    className={`inline-flex items-center gap-1 text-[10px] py-0 px-2 h-5 rounded-full font-medium transition-all flex-shrink-0 border ${
                                      tx.isTransfer
                                        ? "bg-sky-500/15 text-sky-500 border-sky-500/30 hover:bg-sky-500/25"
                                        : "bg-secondary/40 hover:bg-secondary/70 text-muted-foreground border-border/60"
                                    }`}
                                  >
                                    <ArrowLeftRight className="w-2.5 h-2.5" />
                                    <span>{tx.isTransfer ? "Transferencia propia" : "Marcar transf."}</span>
                                  </button>

                                  {tx.installmentInfo && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1.5 h-4 bg-primary/10 text-primary border-primary/30 font-medium flex-shrink-0"
                                    >
                                      Cuota {tx.installmentInfo.current}/{tx.installmentInfo.total}
                                    </Badge>
                                  )}

                                  {tx.isCardPayment && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1.5 h-4 bg-sky-500/10 text-sky-500 border-sky-500/30 font-medium flex-shrink-0"
                                    >
                                      Pago de Resumen
                                    </Badge>
                                  )}

                                  {isDuplicate && (
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px] py-0 px-1.5 h-4 bg-amber-500/20 text-amber-500 border border-amber-500/30 font-normal flex-shrink-0"
                                    >
                                      Posible duplicado
                                    </Badge>
                                  )}

                                  {/* Selector rápido de categoría por fila con optgroups ordenados */}
                                  {(() => {
                                    const incomeCats = categories.filter((c) => c.type === "income");
                                    const expenseCats = categories.filter((c) => c.type === "expense");
                                    const isIncome = tx.type === "income";

                                    return (
                                      <div className="relative inline-flex items-center ml-auto max-w-[170px] sm:max-w-[210px]">
                                        <select
                                          value={tx.category.id}
                                          onChange={(e) => updateItemCategory(idx, e.target.value)}
                                          className="h-6 pl-2 pr-6 rounded-[8px] bg-background border border-border/80 text-[11px] text-foreground appearance-none outline-none focus:ring-1 focus:ring-primary truncate w-full"
                                        >
                                          {!categories.some((c) => c.id === tx.category.id) && (
                                            <option value={tx.category.id}>
                                              {tx.category.name} ({tx.category.type === "income" ? t("cat.income") : t("cat.expense")})
                                            </option>
                                          )}

                                          {isIncome ? (
                                            <>
                                              {incomeCats.length > 0 && (
                                                <optgroup label={`── ${t("csv.incomeCategories")} ──`}>
                                                  {incomeCats.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                      {c.name}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              )}
                                              {expenseCats.length > 0 && (
                                                <optgroup label={`── ${t("csv.expenseCategories")} ──`}>
                                                  {expenseCats.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                      {c.name}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              {expenseCats.length > 0 && (
                                                <optgroup label={`── ${t("csv.expenseCategories")} ──`}>
                                                  {expenseCats.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                      {c.name}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              )}
                                              {incomeCats.length > 0 && (
                                                <optgroup label={`── ${t("csv.incomeCategories")} ──`}>
                                                  {incomeCats.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                      {c.name}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              )}
                                            </>
                                          )}
                                        </select>
                                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                      </div>
                                    );
                                  })()}

                                  {onAddRule && (
                                    <button
                                      type="button"
                                      onClick={() => handleCreateRuleFromItem(tx)}
                                      title={t("csv.createRule")}
                                      className="p-1 rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors flex-shrink-0"
                                    >
                                      <Zap className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Opción de proyectar cuotas restantes de esta compra */}
                                {hasRemainingInstallments && selected && (
                                  <div className="mt-2 pt-1.5 border-t border-border/30 flex flex-wrap items-center justify-between gap-1 text-[11px] min-w-0">
                                    <span className="text-muted-foreground truncate">
                                      {t("csv.installmentsRemaining")
                                        .replace("{count}", String(tx.installmentInfo!.total - tx.installmentInfo!.current))
                                        .replace("{amount}", tx.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 }))}
                                    </span>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-primary flex-shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={projectFuture}
                                        onChange={() => toggleProjectFuture(idx)}
                                        className="rounded border-border w-3.5 h-3.5"
                                      />
                                      <span>{t("csv.projectFutureMonths")}</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-[12px] bg-destructive/10 border border-destructive/20 text-destructive text-[13px]">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep("mapping")}
                        disabled={isImporting}
                        className="flex-1 h-12 rounded-[14px] bg-secondary hover:bg-secondary/80 text-foreground font-medium text-[14px] transition-colors"
                      >
                        Atrás
                      </button>
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={isImporting || selectedCount === 0}
                        className="flex-[2] h-12 rounded-[14px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isImporting ? "Importando..." : `Importar ${selectedCount} seleccionados`}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
