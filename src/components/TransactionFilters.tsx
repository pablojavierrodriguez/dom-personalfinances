import { useState, useMemo, useEffect } from "react";
import { Category, Account, Transaction } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Search, Filter, X, ChevronDown, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings-store";
import { parseThousandsInput } from "@/lib/utils";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, addDays, startOfYear, endOfYear, format,
} from "date-fns";

export interface TransactionFilterValues {
  search: string;
  type: "all" | "income" | "expense";
  categoryId: string | null;
  accountId: string | null;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

export const EMPTY_FILTERS: TransactionFilterValues = {
  search: "", type: "all", categoryId: null, accountId: null,
  dateFrom: "", dateTo: "", amountMin: "", amountMax: "",
};

interface TransactionFiltersProps {
  filters: TransactionFilterValues;
  onChange: (filters: TransactionFilterValues) => void;
  categories: Category[];
  accounts: Account[];
}

type DatePreset = { label: string; from: Date; to: Date };

function getDatePresets(t: (k: any) => string): DatePreset[] {
  const now = new Date();
  const prev = subMonths(now, 1);
  const next30 = addDays(now, 30);
  return [
    { label: t("filters.today"), from: startOfDay(now), to: endOfDay(now) },
    { label: t("filters.thisWeek"), from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) },
    { label: t("filters.thisMonth"), from: startOfMonth(now), to: endOfMonth(now) },
    { label: t("filters.next30Days"), from: startOfDay(now), to: endOfDay(next30) },
    { label: t("filters.prevMonth"), from: startOfMonth(prev), to: endOfMonth(prev) },
    { label: t("filters.thisYear"), from: startOfYear(now), to: endOfYear(now) },
  ];
}

export function TransactionFilters({ filters, onChange, categories, accounts }: TransactionFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const { t } = useSettings();

  // Sincronizar localSearch si filters.search cambia desde el exterior
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce de 250ms para evitar re-filtrado en cada frame de tecleo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, filters, onChange]);

  // Active chips for quick removal
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (filters.type !== "all") {
      chips.push({
        key: "type",
        label: filters.type === "expense" ? t("filters.expensesOnly") : t("filters.incomeOnly"),
        onRemove: () => onChange({ ...filters, type: "all" }),
      });
    }
    if (filters.categoryId) {
      const cat = categories.find(c => c.id === filters.categoryId);
      chips.push({
        key: "category",
        label: cat?.name || t("filters.category"),
        onRemove: () => onChange({ ...filters, categoryId: null }),
      });
    }
    if (filters.accountId) {
      const acc = accounts.find(a => a.id === filters.accountId);
      chips.push({
        key: "account",
        label: acc?.name || t("filters.accountFilter"),
        onRemove: () => onChange({ ...filters, accountId: null }),
      });
    }
    if (filters.dateFrom || filters.dateTo) {
      const label = filters.dateFrom && filters.dateTo
        ? `${filters.dateFrom} – ${filters.dateTo}`
        : filters.dateFrom
        ? `${t("filters.from")} ${filters.dateFrom}`
        : `${t("filters.to")} ${filters.dateTo}`;
      chips.push({
        key: "date",
        label,
        onRemove: () => onChange({ ...filters, dateFrom: "", dateTo: "" }),
      });
    }
    if (filters.amountMin || filters.amountMax) {
      const label = filters.amountMin && filters.amountMax
        ? `$${filters.amountMin} – $${filters.amountMax}`
        : filters.amountMin
        ? `${t("filters.from")} $${filters.amountMin}`
        : `${t("filters.to")} $${filters.amountMax}`;
      chips.push({
        key: "amount",
        label,
        onRemove: () => onChange({ ...filters, amountMin: "", amountMax: "" }),
      });
    }
    return chips;
  }, [filters, categories, accounts, t, onChange]);

  const activeCount = activeChips.length + (filters.search ? 1 : 0);
  const update = (partial: Partial<TransactionFilterValues>) => onChange({ ...filters, ...partial });
  const clearAll = () => onChange(EMPTY_FILTERS);

  const datePresets = useMemo(() => getDatePresets(t), [t]);

  const applyDatePreset = (preset: DatePreset) => {
    update({
      dateFrom: format(preset.from, "yyyy-MM-dd"),
      dateTo: format(preset.to, "yyyy-MM-dd"),
    });
  };

  return (
    <div className="px-4 pb-3">
      {/* Search bar + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("filters.search")} value={localSearch} onChange={e => setLocalSearch(e.target.value)}
            className="pl-9 h-9 bg-secondary border-0 text-[13px] theme-pill-btn" />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                onChange({ ...filters, search: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-3 h-9 theme-pill-btn text-[12px] font-medium transition-colors ${
            expanded || activeCount > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}>
          <Filter className="w-3.5 h-3.5" />
          {activeCount > 0 && <span>{activeCount}</span>}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Active filter chips (always visible when filters are applied) */}
      {activeChips.length > 0 && !expanded && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-1.5 mt-2"
        >
          {activeChips.map(chip => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 px-2.5 py-1 theme-pill-btn bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
            >
              {chip.label}
              <X className="w-3 h-3" />
            </button>
          ))}
          {activeChips.length > 1 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 theme-pill-btn bg-destructive/10 text-destructive text-[11px] font-medium hover:bg-destructive/20 transition-colors"
            >
              {t("filters.clearAll")}
              <X className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      )}

      {/* Expanded filter panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="overflow-hidden">
            <div className="pt-3 space-y-3">
              {/* Type filter */}
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("filters.type")}</label>
                <div className="flex gap-1.5">
                  {(["all", "expense", "income"] as const).map(tp => (
                    <button key={tp} onClick={() => update({ type: tp })}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                        filters.type === tp ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}>
                      {tp === "all" ? t("filters.all") : tp === "expense" ? t("filters.expensesOnly") : t("filters.incomeOnly")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category filter */}
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("filters.category")}</label>
                <select value={filters.categoryId || ""} onChange={e => update({ categoryId: e.target.value || null })}
                  className="w-full h-9 rounded-xl bg-secondary border-0 text-[13px] text-foreground px-3 appearance-none">
                  <option value="">{t("filters.allCategories")}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Account filter */}
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("filters.accountFilter")}</label>
                <select value={filters.accountId || ""} onChange={e => update({ accountId: e.target.value || null })}
                  className="w-full h-9 rounded-xl bg-secondary border-0 text-[13px] text-foreground px-3 appearance-none">
                  <option value="">{t("filters.allAccounts")}</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* Date presets + custom range */}
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("filters.date")}</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {datePresets.map(preset => {
                    const isActive =
                      filters.dateFrom === format(preset.from, "yyyy-MM-dd") &&
                      filters.dateTo === format(preset.to, "yyyy-MM-dd");
                    return (
                      <button
                        key={preset.label}
                        onClick={() => isActive ? update({ dateFrom: "", dateTo: "" }) : applyDatePreset(preset)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input type="date" value={filters.dateFrom} onChange={e => update({ dateFrom: e.target.value })}
                    className="flex-1 h-9 rounded-xl bg-secondary border-0 text-[13px] text-foreground px-3" />
                  <input type="date" value={filters.dateTo} onChange={e => update({ dateTo: e.target.value })}
                    className="flex-1 h-9 rounded-xl bg-secondary border-0 text-[13px] text-foreground px-3" />
                </div>
              </div>

              {/* Amount range */}
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("filters.amountRange")}</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={t("filters.min")}
                    value={filters.amountMin}
                    onChange={e => update({ amountMin: e.target.value.replace(/[^0-9.,]/g, "") })}
                    className="flex-1 h-9 bg-secondary border-0 text-[13px] rounded-xl font-mono-data"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={t("filters.max")}
                    value={filters.amountMax}
                    onChange={e => update({ amountMax: e.target.value.replace(/[^0-9.,]/g, "") })}
                    className="flex-1 h-9 bg-secondary border-0 text-[13px] rounded-xl font-mono-data"
                  />
                </div>
              </div>

              {/* Clear all button */}
              {activeCount > 0 && (
                <button onClick={clearAll}
                  className="w-full py-2 rounded-xl text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-colors">
                  {t("filters.clear")} ({activeCount})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function applyFilters(transactions: Transaction[], filters: TransactionFilterValues): Transaction[] {
  const minVal = filters.amountMin ? parseThousandsInput(filters.amountMin) : null;
  const maxVal = filters.amountMax ? parseThousandsInput(filters.amountMax) : null;

  return transactions.filter(tx => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchNote = tx.note?.toLowerCase().includes(q);
      const matchCat = tx.category.name.toLowerCase().includes(q);
      if (!matchDesc && !matchNote && !matchCat) return false;
    }
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.categoryId && tx.category.id !== filters.categoryId) return false;
    if (filters.accountId && tx.accountId !== filters.accountId) return false;
    if (filters.dateFrom && tx.date < new Date(filters.dateFrom + "T00:00:00")) return false;
    if (filters.dateTo && tx.date > new Date(filters.dateTo + "T23:59:59")) return false;
    if (minVal !== null && !isNaN(minVal) && tx.amount < minVal) return false;
    if (maxVal !== null && !isNaN(maxVal) && tx.amount > maxVal) return false;
    return true;
  });
}
