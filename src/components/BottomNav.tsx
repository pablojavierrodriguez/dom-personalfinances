import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, ArrowLeftRight, Wallet, Plus, MoreHorizontal } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  CreditCard, Tags, Repeat, Settings, PiggyBank, Target, Bell, BarChart3, Hash, Zap, ShoppingCart, Upload, User, LogOut
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useAuth } from "@/lib/auth-context";
import { DOMSymbol } from "@/components/ui/DOMSymbol";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onQuickAdd: (initialType?: "expense" | "income") => void;
  onTransfer: () => void;
  onImportCsv?: () => void;
  pendingBillsCount?: number;
}

export function BottomNav({ activeTab, onTabChange, onQuickAdd, onTransfer, onImportCsv, pendingBillsCount = 0 }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useSettings();
  const { user, signOut } = useAuth();

  const tabs = [
    { id: "dashboard", icon: LayoutDashboard, label: t("nav.home") },
    { id: "transactions", icon: ArrowLeftRight, label: t("nav.history") },
    { id: "accounts", icon: Wallet, label: t("nav.accounts") },
  ];

  const moreItems = [
    { id: "transfer", icon: Repeat, label: t("nav.transfer"), desc: t("tx.transferDesc") || "Mover fondos entre cuentas", isAction: true, onClick: onTransfer },
    { id: "budgets", icon: PiggyBank, label: t("nav.budgets"), desc: t("nav.budgetsDesc") },
    { id: "goals", icon: Target, label: t("nav.goals"), desc: t("nav.goalsDesc") },
    { id: "obligations", icon: Bell, label: t("nav.obligations") || "Recurrentes", desc: t("nav.obligationsDesc") || "Vencimientos y pagos periódicos", badge: pendingBillsCount },
    { id: "reports", icon: BarChart3, label: t("nav.reports"), desc: t("nav.reportsDesc") },
    { id: "cards", icon: CreditCard, label: t("nav.cards"), desc: t("nav.cardsDesc") },
    { id: "categories", icon: Tags, label: t("nav.categories"), desc: t("nav.categoriesDesc") },
    { id: "tags", icon: Hash, label: t("nav.tags"), desc: t("nav.tagsDesc") },
    { id: "rules", icon: Zap, label: t("nav.rules") || "Reglas", desc: t("nav.rulesDesc") || "Automatizaciones y auto-categorización" },
    { id: "shopping", icon: ShoppingCart, label: t("nav.shopping") || "Listas de Compras", desc: t("nav.shoppingDesc") || "Organizar compras y registrar gastos" },
    ...(onImportCsv
      ? [{ id: "import-csv", icon: Upload, label: t("tx.importCsv") || "Importar CSV", desc: t("tx.importCsvDesc") || "Carga extractos bancarios y billeteras", isAction: true, onClick: onImportCsv }]
      : []),
    { id: "profile", icon: User, label: t("nav.profile") || "Mi Perfil", desc: t("nav.profileDesc") || "Datos personales y cuenta" },
    { id: "settings", icon: Settings, label: t("nav.settings"), desc: t("nav.settingsDesc") },
  ];

  const moreTabIds = moreItems.map(i => i.id);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-card/95 backdrop-blur-lg border-t border-border/50 pb-safe">
          <div className="flex items-center justify-around px-1 h-16 max-w-md mx-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center w-14 h-12 relative">
                <tab.icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[9px] mt-0.5 transition-colors ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`}>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div layoutId="nav-indicator" className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 40 }} />
                )}
              </button>
            ))}

            <button onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center w-14 h-12 relative">
              <MoreHorizontal className={`w-5 h-5 transition-colors ${moreTabIds.includes(activeTab) ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[9px] mt-0.5 transition-colors ${moreTabIds.includes(activeTab) ? "text-primary" : "text-muted-foreground"}`}>{t("nav.more")}</span>
              {pendingBillsCount > 0 && (
                <span className="absolute top-0.5 right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-medium">
                  {pendingBillsCount}
                </span>
              )}
              {moreTabIds.includes(activeTab) && (
                <motion.div layoutId="nav-indicator" className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 40 }} />
              )}
            </button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => onQuickAdd("expense")}
              className="h-12 w-12 rounded-full bg-primary flex items-center justify-center fab-glow -mt-3 shadow-lg"
              title={t("tx.newExpense") || "Nuevo Gasto"}
              aria-label={t("tx.newExpense") || "Nuevo Gasto"}
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
            </motion.button>
          </div>
        </div>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 flex flex-col justify-between [&>button]:top-5 [&>button]:right-4 [&>button]:w-7 [&>button]:h-7 [&>button]:rounded-full [&>button]:bg-secondary/60 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-80 hover:[&>button]:opacity-100 transition-all"
        >
          <div>
            <SheetHeader className="px-5 pt-6 pb-4 border-b border-border/50 pr-12">
              <div className="flex items-center gap-2 mb-1">
                <DOMSymbol size={22} variant="badge" />
                <SheetTitle className="text-base font-display tracking-wider uppercase">DOM</SheetTitle>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">{t("nav.advancedMgmt")}</SheetDescription>
            </SheetHeader>
            <div className="py-2 overflow-y-auto max-h-[calc(100vh-180px)] no-scrollbar">
              {moreItems.map(item => (
                <button key={item.id}
                  onClick={() => {
                    if ("onClick" in item && typeof item.onClick === "function") {
                      item.onClick();
                    } else {
                      onTabChange(item.id);
                    }
                    setMoreOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/50 ${
                    activeTab === item.id ? "bg-secondary text-primary" : "text-foreground"
                  }`}>
                  <item.icon className="w-5 h-5" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium shrink-0">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {user && (
            <div className="p-4 pb-safe border-t border-border/50 bg-card/60">
              <div className="text-[11px] text-muted-foreground truncate mb-2 px-1">
                {user.email}
              </div>
              <button
                onClick={() => {
                  setMoreOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all text-xs font-medium"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>{t("settings.signOut") || "Cerrar sesión"}</span>
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
