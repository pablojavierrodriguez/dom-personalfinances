import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFinanceStore } from "@/lib/finance-store";
import { useSettings } from "@/lib/settings-store";
import { VelocityBar } from "@/components/VelocityBar";
import { BalanceHeader } from "@/components/BalanceHeader";
import { AccountCards } from "@/components/AccountCards";
import { TransactionList } from "@/components/TransactionList";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { CsvImportSheet } from "@/components/CsvImportSheet";
import { TransactionEditSheet } from "@/components/TransactionEditSheet";
import { TransferSheet } from "@/components/TransferSheet";
import { BottomNav } from "@/components/BottomNav";
import { CategoryManager } from "@/components/CategoryManager";
import { AccountManager } from "@/components/AccountManager";
import { CreditCardManager } from "@/components/CreditCardManager";
import { SettingsPage } from "@/components/SettingsPage";
import { TransactionFilters, applyFilters, EMPTY_FILTERS, TransactionFilterValues } from "@/components/TransactionFilters";
import { BudgetManager, BudgetSummaryWidget } from "@/components/BudgetManager";
import { GoalsManager, GoalsSummaryWidget } from "@/components/GoalsManager";
import { BillsSummaryWidget } from "@/components/BillsSummaryWidget";
import { ObligationsManager } from "@/components/ObligationsManager";
import { ReportsPage } from "@/components/ReportsPage";
import { TagManager } from "@/components/TagManager";
import { RulesManager } from "@/components/RulesManager";
import { ShoppingListManager } from "@/components/ShoppingListManager";
import { HealthScore } from "@/components/HealthScore";
import { UserProfilePage } from "@/components/UserProfile";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { Transaction, Account } from "@/lib/types";
import { AnimatePresence } from "framer-motion";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { NetWorthChart } from "@/components/NetWorthChart";
import { PayStatementModal } from "@/components/PayStatementModal";
import { MonthSelector } from "@/components/MonthSelector";
import { DashboardCardPicker } from "@/components/DashboardCardPicker";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { GlobalCommandMenu } from "@/components/GlobalCommandMenu";
import { ReleaseNotesModal, shouldShowReleaseNotes } from "@/components/ReleaseNotesModal";
import { PageTransition } from "@/components/PageTransition";
import { PullToRefresh } from "@/components/PullToRefresh";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { TrendingDown, TrendingUp, Calendar, Sparkles, SlidersHorizontal, Search, Keyboard } from "lucide-react";

const VALID_TAB_SET = new Set([
  "dashboard",
  "transactions",
  "cards",
  "categories",
  "accounts",
  "budgets",
  "goals",
  "obligations",
  "reports",
  "tags",
  "rules",
  "shopping",
  "settings",
  "profile",
]);

interface IndexProps {
  initialTab?: string;
}

const Index = ({ initialTab }: IndexProps = {}) => {
  const store = useFinanceStore();
  const { settings, isSectionEnabled, t, formatAmount } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = useCallback(() => {
    const raw = location.pathname.replace(/^\//, "").split("/")[0];
    if (VALID_TAB_SET.has(raw)) return raw;
    return "dashboard";
  }, [location.pathname]);

  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (initialTab && VALID_TAB_SET.has(initialTab)) return initialTab;
    const fromPath = location.pathname.replace(/^\//, "").split("/")[0];
    if (VALID_TAB_SET.has(fromPath)) return fromPath;
    return "dashboard";
  });

  // Sync state if URL changes externally (browser back/forward or deep links)
  useEffect(() => {
    const fromPath = getTabFromPath();
    if (fromPath !== activeTab) {
      setActiveTabState(fromPath);
    }
  }, [location.pathname, getTabFromPath]);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    const targetPath = tab === "dashboard" ? "/" : `/${tab}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [navigate, location.pathname]);

  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("onboarding-complete"));
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"expense" | "income">("expense");
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [txFilters, setTxFilters] = useState<TransactionFilterValues>(EMPTY_FILTERS);
  const [selectedDetailAccountId, setSelectedDetailAccountId] = useState<string | null>(null);
  const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);

  const handleOpenQuickAdd = useCallback((type: "expense" | "income" = "expense") => {
    setQuickAddType(type);
    setQuickAddOpen(true);
  }, []);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [payingCard, setPayingCard] = useState<Account | null>(null);
  const [payingAmount, setPayingAmount] = useState(0);

  // Quick Wins de UX: Atajos de Teclado, Command Menu (⌘K) y Novedades
  const { togglePrivacyMode } = usePrivacy();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);

  // Notificar novedades de versión tras completar el onboarding si aún no fueron vistas
  useEffect(() => {
    if (shouldShowReleaseNotes()) {
      const onboardingComplete = localStorage.getItem("onboarding-complete");
      if (onboardingComplete) {
        setReleaseNotesOpen(true);
      }
    }
  }, []);

  const anyModalOpen =
    commandMenuOpen ||
    shortcutsOpen ||
    releaseNotesOpen ||
    quickAddOpen ||
    transferOpen ||
    csvImportOpen ||
    Boolean(editingTx) ||
    Boolean(payingCard) ||
    isCardPickerOpen;

  const modalOpenRef = useRef(anyModalOpen);
  modalOpenRef.current = anyModalOpen;

  // Listener global de atajos de teclado y secuencias de navegación
  useEffect(() => {
    let pendingG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el foco está dentro de un elemento editable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // ⌘K o Ctrl+K -> Command Menu Omnicanal
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
        return;
      }

      // Si hay un modal o diálogo abierto, no procesar atajos globales de letra simple
      if (modalOpenRef.current) {
        return;
      }

      // ? o Shift + / -> Cheat Sheet de atajos
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // H -> Alternar Modo Privacidad
      if ((e.key === "h" || e.key === "H") && !pendingG && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        togglePrivacyMode();
        return;
      }

      // N -> Registrar nueva transacción
      if ((e.key === "n" || e.key === "N") && !pendingG && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleOpenQuickAdd("expense");
        return;
      }

      // Secuencia G + [tecla] para navegación rápida
      if (e.key === "g" || e.key === "G") {
        pendingG = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          pendingG = false;
        }, 1200);
        return;
      }

      if (pendingG) {
        pendingG = false;
        if (gTimer) clearTimeout(gTimer);
        const k = e.key.toLowerCase();
        switch (k) {
          case "d":
            setActiveTab("dashboard");
            break;
          case "t":
            setActiveTab("transactions");
            break;
          case "c":
            setActiveTab("cards");
            break;
          case "b":
            setActiveTab("budgets");
            break;
          case "s":
            setActiveTab("shopping");
            break;
          case "r":
            setActiveTab("reports");
            break;
          case "a":
            setActiveTab("accounts");
            break;
          case "o":
            setActiveTab("obligations");
            break;
          case "p":
            setActiveTab("settings");
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [setActiveTab, togglePrivacyMode, handleOpenQuickAdd]);

  const handleOpenPayStatement = (cardId: string, amount: number) => {
    const card = store.accounts.find((a) => a.id === cardId);
    if (card) {
      setPayingCard(card);
      setPayingAmount(amount);
    }
  };

  const handleSelectAccountFromHome = (account: Account) => {
    setSelectedDetailAccountId(account.id);
    if (account.type === "credit") {
      setActiveTab("cards");
    } else {
      setActiveTab("accounts");
    }
  };

  // Procesar recurrentes vencidas una vez que los datos de Supabase terminen de cargar
  useEffect(() => {
    if (!store.loading && store.recurringTxs.length > 0) {
      store.processRecurring();
    }
  }, [store.loading, store.recurringTxs.length, store.processRecurring]);

  useEffect(() => { 
    // Detectar atajo PWA desde pantalla de inicio (?action=quick-add)
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "quick-add") {
      setQuickAddOpen(true);
      // Limpiar el parámetro de la URL limpiamente sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const pendingBillsCount = store.getPendingBills().filter(b => b.status !== "paid").length;

  // Métricas reactivas al mes seleccionado
  const selMonth = selectedDate.getMonth();
  const selYear = selectedDate.getFullYear();

  const selectedMonthTxs = store.transactions.filter(
    t => t.date.getMonth() === selMonth && t.date.getFullYear() === selYear
  );

  const selectedMonthExpenses = selectedMonthTxs
    .filter(t => t.type === "expense" && !t.isCardPayment && !t.isTransfer)
    .reduce((sum, t) => sum + t.amount, 0);

  const selectedMonthIncome = selectedMonthTxs
    .filter(t => t.type === "income" && !t.isCardPayment && !t.isTransfer)
    .reduce((sum, t) => sum + t.amount, 0);

  // Comparativa contra mes anterior
  const prevDate = new Date(selYear, selMonth - 1, 1);
  const prevMonthExpenses = store.transactions
    .filter(t => t.type === "expense" && !t.isCardPayment && !t.isTransfer && t.date.getMonth() === prevDate.getMonth() && t.date.getFullYear() === prevDate.getFullYear())
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseDiffPct = prevMonthExpenses > 0
    ? Math.round(((selectedMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100)
    : 0;

  // Health score computations para el mes seleccionado
  const selectedBudgets = store.budgets.filter(b => b.month === selMonth && b.year === selYear);
  const avgBudgetUsage = selectedBudgets.length > 0
    ? selectedBudgets.reduce((sum, b) => {
        const spent = store.getBudgetSpent(b.categoryId, b.month, b.year);
        return sum + (spent / b.amount) * 100;
      }, 0) / selectedBudgets.length
    : 50;
  const goalsProgress = store.goals.length > 0
    ? store.goals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount) * 100, 0) / store.goals.length
    : 0;

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-background flex w-full overflow-x-hidden" key="app-root">
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickAdd={() => setQuickAddOpen(true)}
        onTransfer={() => setTransferOpen(true)}
        onImportCsv={() => setCsvImportOpen(true)}
        onOpenCommandMenu={() => setCommandMenuOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenReleaseNotes={() => setReleaseNotesOpen(true)}
        pendingBillsCount={pendingBillsCount}
      />
      <div className="flex-1 w-full min-w-0 max-w-2xl mx-auto relative pb-20 md:pb-6 md:px-6 md:max-w-5xl lg:max-w-6xl md:h-screen md:overflow-y-auto overflow-x-hidden">
        {/* Mobile Search Bar & Shortcuts Trigger Header */}
        <div className="md:hidden px-4 pt-3 pb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommandMenuOpen(true)}
            className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/50 border border-border/40 text-xs text-muted-foreground active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span className="truncate">{t("nav.searchOrCommand")}</span>
            </div>
            <span className="px-1.5 py-0.5 text-[10px] font-mono-data bg-background border border-border/60 rounded text-muted-foreground shrink-0">
              ⌘K
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="w-8 h-8 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all shrink-0"
            title={`${t("nav.keyboardShortcuts")} (?)`}
            aria-label={t("nav.keyboardShortcuts")}
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>

      <PullToRefresh onRefresh={store.refetchData}>
        <AnimatePresence mode="wait">
          <PageTransition key={activeTab}>

          {activeTab === "dashboard" && (
            store.loading && store.accounts.length === 0 ? (
              <DashboardSkeleton />
            ) : (() => {
            // Helper para renderizar cada widget individualmente
            const renderWidget = (id: string) => {
              switch (id) {
                case "velocity":
                  return (
                    <VelocityBar
                      key="velocity"
                      spent={store.todaySpent}
                      budget={settings.dailyBudget}
                      weekSpent={store.weekSpent}
                    />
                  );
                case "balance":
                  return (
                    <BalanceHeader
                      key="balance"
                      totalBalance={store.totalBalance}
                      monthlyIncome={selectedMonthIncome}
                      monthlyExpenses={selectedMonthExpenses}
                      accounts={store.accounts}
                      transactions={selectedMonthTxs}
                      syncStatus={{
                        pendingCount: store.pendingGlobalSyncCount,
                        isSyncing: store.isGlobalSyncing,
                        onSync: store.syncGlobalQueue,
                      }}
                    />
                  );
                case "accounts":
                  return (
                    <div key="accounts" className="my-4">
                      <AccountCards
                        accounts={store.getActiveAccounts()}
                        onSelectAccount={handleSelectAccountFromHome}
                      />
                    </div>
                  );
                case "net_worth":
                  return (
                    <NetWorthChart
                      key="net_worth"
                      accounts={store.getActiveAccounts()}
                      transactions={store.transactions}
                    />
                  );
                case "breakdown":
                  return (
                    <SpendingBreakdown
                      key="breakdown"
                      transactions={selectedMonthTxs}
                      categories={store.categories}
                      referenceDate={selectedDate}
                    />
                  );
                case "monthly_comparison":
                  return (
                    <div key="monthly_comparison" className="px-4">
                      <div className="card-surface p-3.5 rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/40 via-card to-secondary/20 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-semibold text-foreground font-display">
                              {t("settings.sectionMonthlyComparison") || "Comparativa mensual"}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono-data">
                            {t("dashboard.vsPrevMonth") || "vs. mes anterior"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/30">
                            <span className="text-[11px] text-muted-foreground block mb-0.5">{t("dashboard.periodExpense") || "Gasto del período"}</span>
                            <span className="font-mono-data text-sm font-semibold text-foreground">
                              {formatAmount(selectedMonthExpenses)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/30">
                            <span className="text-[11px] text-muted-foreground block mb-0.5">{t("dashboard.variation") || "Variación"}</span>
                            <div className="flex items-center gap-1">
                              {expenseDiffPct <= 0 ? (
                                <>
                                  <TrendingDown className="w-3.5 h-3.5 text-primary" />
                                  <span className="font-mono-data text-sm font-semibold text-primary">
                                    {expenseDiffPct}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                                  <span className="font-mono-data text-sm font-semibold text-destructive">
                                    +{expenseDiffPct}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                case "budgets":
                  return (
                    <BudgetSummaryWidget
                      key="budgets"
                      budgets={store.budgets}
                      categories={store.categories}
                      getBudgetSpent={store.getBudgetSpent}
                    />
                  );
                case "goals":
                  return <GoalsSummaryWidget key="goals" goals={store.goals} />;
                case "bills":
                  return <BillsSummaryWidget key="bills" bills={store.getPendingBills()} />;
                case "health_score":
                  return (
                    <HealthScore
                      key="health_score"
                      monthlyIncome={selectedMonthIncome}
                      monthlyExpenses={selectedMonthExpenses}
                      budgetsUsedPct={avgBudgetUsage}
                      goalsProgress={goalsProgress}
                      pendingBills={pendingBillsCount}
                    />
                  );
                case "recent":
                  return (
                    <div key="recent" className="mt-2">
                      <TransactionList
                        title={t("settings.sectionRecent")}
                        transactions={store.transactions.slice(0, 5)}
                        accounts={store.accounts}
                        onSelect={setEditingTx}
                        onDelete={store.deleteTransaction}
                        onPayStatement={handleOpenPayStatement}
                      />
                    </div>
                  );
                default:
                  return null;
              }
            };

            const sections = settings.homeSections || [];
            const leftSections = sections.filter(s => s.enabled && s.column !== "right");
            const rightSections = sections.filter(s => s.enabled && s.column === "right");

            return (
              <div className="space-y-4">
                <div className="md:grid md:grid-cols-2 md:gap-6 md:pt-4">
                  {/* Columna Izquierda / Principal */}
                  <div className="space-y-4">
                    {/* Selector de Mes Global (< Mes Año >) */}
                    <div className="px-4 pt-2 pb-2">
                      <MonthSelector
                        currentDate={selectedDate}
                        onChangeDate={setSelectedDate}
                        onCustomizeDashboard={() => setIsCardPickerOpen(true)}
                      />
                    </div>

                    {leftSections.map(s => renderWidget(s.id))}
                  </div>

                  {/* Columna Derecha / Métricas e Insights */}
                  <div className="space-y-4 pt-2 md:pt-0">
                    {rightSections.map(s => renderWidget(s.id))}
                  </div>
                </div>

                {/* Botón flotante/al pie para Personalizar Dashboard */}
                <div className="px-4 pt-4 pb-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsCardPickerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 hover:bg-secondary border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-xs group"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary group-hover:rotate-12 transition-transform" />
                    <span>{t("picker.title")}</span>
                  </button>
                </div>
              </div>
            );
          })())}

          {activeTab === "transactions" && (
            <div className="pt-4">
              <div className="px-4 pb-3 flex items-center justify-between">
                <h1 className="text-[20px] font-display font-semibold text-foreground">{t("tx.history")}</h1>
                <button onClick={() => setCsvImportOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t("tx.importCsv")}
                </button>
              </div>

              {/* Selector de Mes Global en Historial */}
              <div className="px-4 mb-3">
                <MonthSelector
                  currentDate={selectedDate}
                  onChangeDate={setSelectedDate}
                />
              </div>

              <TransactionFilters filters={txFilters} onChange={setTxFilters}
                categories={store.getAllActiveCategories()} accounts={store.getActiveAccounts()} />

              {/* Transacciones del mes seleccionado, combinadas con los filtros activos */}
              <TransactionList
                transactions={applyFilters(
                  store.transactions.filter(t => {
                    // Si el usuario fijó fechas manuales en los filtros avanzados, respetarlas
                    if (txFilters.dateFrom || txFilters.dateTo) return true;
                    return t.date.getMonth() === selectedDate.getMonth() &&
                           t.date.getFullYear() === selectedDate.getFullYear();
                  }),
                  txFilters
                )}
                accounts={store.accounts}
                onSelect={setEditingTx}
                onDelete={store.deleteTransaction}
                onPayStatement={handleOpenPayStatement}
              />
            </div>
          )}

          {activeTab === "cards" && (
            <CreditCardManager
              accounts={store.accounts}
              getCreditCards={store.getCreditCards}
              getArchivedAccounts={store.getArchivedAccounts}
              getTransactionsByAccount={store.getTransactionsByAccount}
              getStatementTransactions={store.getStatementTransactions}
              getNonCardAccounts={store.getNonCardAccounts}
              onAdd={store.addAccount}
              onUpdate={store.updateAccount}
              onArchive={store.archiveAccount}
              onUnarchive={store.unarchiveAccount}
              onPayCard={store.payCard}
              onSelectTransaction={setEditingTx}
              initialSelectedCardId={selectedDetailAccountId}
              onClearInitialCard={() => setSelectedDetailAccountId(null)}
            />
          )}

          {activeTab === "categories" && (
            <CategoryManager categories={store.categories} getRootCategories={store.getRootCategories}
              getSubcategories={store.getSubcategories} getArchivedCategories={store.getArchivedCategories}
              getTransactionCountByCategory={store.getTransactionCountByCategory} getAllActiveCategories={store.getAllActiveCategories}
              onAdd={store.addCategory} onUpdate={store.updateCategory} onArchive={store.archiveCategory}
              onUnarchive={store.unarchiveCategory} onDelete={store.deleteCategory} onReassign={store.reassignTransactions}
              onSeedDefaults={store.seedDefaultCategories} />
          )}

          {activeTab === "accounts" && (
          <AccountManager
              accounts={store.accounts}
              getActiveAccounts={store.getActiveAccounts}
              getArchivedAccounts={store.getArchivedAccounts}
              getTransactionsByAccount={store.getTransactionsByAccount}
              onAdd={store.addAccount}
              onUpdate={store.updateAccount}
              onArchive={store.archiveAccount}
              onUnarchive={store.unarchiveAccount}
              onAdjustBalance={store.adjustAccountBalance}
              onSyncBalance={store.syncAccountBalance}
              recalculateAccountBalance={store.recalculateAccountBalance}
              onSelectTransaction={setEditingTx}
              initialSelectedAccountId={selectedDetailAccountId}
              onClearInitialAccount={() => setSelectedDetailAccountId(null)}
            />
          )}

          {activeTab === "budgets" && (
            <BudgetManager budgets={store.budgets} categories={store.categories}
              transactions={store.transactions}
              getBudgetSpent={store.getBudgetSpent} getAllActiveCategories={store.getAllActiveCategories}
              onAdd={store.addBudget} onUpdate={store.updateBudget} onDelete={store.deleteBudget} />
          )}

          {activeTab === "goals" && (
            <GoalsManager goals={store.goals} accounts={store.getActiveAccounts()}
              onAdd={store.addGoal} onUpdate={store.updateGoal}
              onDelete={store.deleteGoal} onContribute={store.contributeToGoal} onWithdraw={store.withdrawFromGoal} />
          )}

          {(activeTab === "obligations" || activeTab === "recurring" || activeTab === "bills") && (
            <ObligationsManager
              bills={store.bills}
              recurringTxs={store.recurringTxs}
              accounts={store.getActiveAccounts()}
              categories={store.getAllActiveCategories()}
              initialSubTab={activeTab === "recurring" ? "recurring" : "bills"}
              onAddBill={store.addBill}
              onUpdateBill={store.updateBill}
              onDeleteBill={store.deleteBill}
              onMarkBillPaid={store.markBillPaid}
              getPendingBills={store.getPendingBills}
              onAddRecurring={store.addRecurringTx}
              onUpdateRecurring={store.updateRecurringTx}
              onDeleteRecurring={store.deleteRecurringTx}
              onToggleRecurringPause={store.toggleRecurringPause}
            />
          )}

          {activeTab === "reports" && (
            <ReportsPage
              transactions={store.transactions}
              categories={store.categories}
              accounts={store.accounts}
              monthlyExpenses={store.monthlyExpenses}
              monthlyIncome={store.monthlyIncome}
              recurringTxs={store.recurringTxs}
              bills={store.bills}
              getMonthlyTrend={store.getMonthlyTrend}
              getLastMonthExpenses={store.getLastMonthExpenses}
            />
          )}

          {activeTab === "tags" && (
            <TagManager tags={store.tags} onAdd={store.addTag} onUpdate={store.updateTag}
              onDelete={store.deleteTag} getTransactionCountByTag={store.getTransactionCountByTag} />
          )}

          {activeTab === "rules" && (
            <RulesManager
              rules={store.rules}
              categories={store.getAllActiveCategories()}
              onAddRule={store.addRule}
              onUpdateRule={store.updateRule}
              onDeleteRule={store.deleteRule}
              onToggleRule={store.toggleRule}
              onApplyRetroactively={store.applyRulesRetroactively}
              onProvisionDefaults={store.provisionDefaultRules}
            />
          )}

          {activeTab === "shopping" && (
            <ShoppingListManager
              accounts={store.accounts}
              categories={store.getAllActiveCategories()}
              onCheckout={(listName, totalAmount, accountId, categoryId) => {
                const cat = store.getAllActiveCategories().find(c => c.id === categoryId);
                if (!cat) return;
                const acc = store.accounts.find(a => a.id === accountId);
                store.addTransaction(
                  totalAmount,
                  `${t("shopping.purchasePrefix")}: ${listName}`,
                  cat,
                  "expense",
                  accountId,
                  { currency: acc?.currency }
                );
              }}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPage
              onImportCsv={() => setCsvImportOpen(true)}
              onOpenReleaseNotes={() => setReleaseNotesOpen(true)}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              onPurgeData={store.purgeAllUserData}
            />
          )}

          {activeTab === "profile" && (
            <UserProfilePage />
          )}
          </PageTransition>
        </AnimatePresence>
      </PullToRefresh>

      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)}
        onSubmit={store.addTransaction} accounts={store.getActiveAccounts()}
        categories={store.getAllActiveCategories()} tags={store.tags}
        initialType={quickAddType}
        getTransactionCountByCategory={store.getTransactionCountByCategory}
        onTransferRequest={() => {
          setQuickAddOpen(false);
          setTransferOpen(true);
        }} />

      <CsvImportSheet
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImport={store.importTransactions}
        accounts={store.getActiveAccounts()}
        categories={store.getAllActiveCategories()}
        existingTransactions={store.transactions}
        rules={store.rules}
        onAddRule={store.addRule}
      />

      <TransferSheet open={transferOpen} onClose={() => setTransferOpen(false)}
        accounts={store.accounts} onTransfer={store.transferBetweenAccounts} />

      <TransactionEditSheet transaction={editingTx} open={!!editingTx}
        onClose={() => setEditingTx(null)} onUpdate={store.updateTransaction}
        onDelete={store.deleteTransaction} onDeleteGroup={store.deleteInstallmentGroup}
        onDuplicate={store.duplicateTransaction}
        accounts={store.getActiveAccounts()} categories={store.getAllActiveCategories()} tags={store.tags} />

      <PayStatementModal
        open={!!payingCard}
        onClose={() => setPayingCard(null)}
        card={payingCard}
        suggestedAmount={payingAmount}
        sourceAccounts={store.getNonCardAccounts()}
        onConfirmPay={(cardId, fromAccountId, amount) => {
          store.payCard(cardId, fromAccountId, amount);
        }}
      />

      <DashboardCardPicker
        open={isCardPickerOpen}
        onClose={() => setIsCardPickerOpen(false)}
      />

      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      <GlobalCommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        onSelectTab={setActiveTab}
        onNewTransaction={() => handleOpenQuickAdd("expense")}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenReleaseNotes={() => setReleaseNotesOpen(true)}
        accounts={store.getActiveAccounts()}
        transactions={store.transactions}
      />

      <ReleaseNotesModal
        open={releaseNotesOpen}
        onOpenChange={setReleaseNotesOpen}
      />

      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(false)}
          onProvisionDefaultRules={store.provisionDefaultRules}
        />
      )}

      <div className="md:hidden">
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab}
          onQuickAdd={(type) => handleOpenQuickAdd(type)} onTransfer={() => setTransferOpen(true)}
          onImportCsv={() => setCsvImportOpen(true)}
          pendingBillsCount={pendingBillsCount} />
      </div>
      </div>
    </div>
  );
};

export default Index;
