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
import { DOMLogo } from "@/components/ui/DOMLogo";
import { cn } from "@/lib/utils";

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
  const { settings, t } = useSettings();
  const { user, signOut } = useAuth();

  const effectivePlusPosition: "center" | "right" = (() => {
    if (settings.navPlusPosition === "center") return "center";
    if (settings.navPlusPosition === "right") return "right";
    // Modo "auto": según el tema/skin seleccionado
    return settings.appTheme === "mobills" || settings.appTheme === "wallet" ? "center" : "right";
  })();

  const leftTabs = [
    { id: "dashboard", icon: LayoutDashboard, label: t("nav.home") },
    { id: "transactions", icon: ArrowLeftRight, label: t("nav.history") },
  ];

  const rightTabs = [
    { id: "accounts", icon: Wallet, label: t("nav.accounts") },
  ];

  // Agrupación semántica para el drawer "Más"
  const moreSections = [
    {
      title: t("nav.sectionPlanning") || "Finanzas & Planificación",
      items: [
        { id: "transfer", icon: Repeat, label: t("nav.transfer"), desc: t("tx.transferDesc") || "Mover fondos entre cuentas", isAction: true, onClick: onTransfer },
        { id: "cards", icon: CreditCard, label: t("nav.cards"), desc: t("nav.cardsDesc") },
        { id: "budgets", icon: PiggyBank, label: t("nav.budgets"), desc: t("nav.budgetsDesc") },
        { id: "goals", icon: Target, label: t("nav.goals"), desc: t("nav.goalsDesc") },
        { id: "obligations", icon: Bell, label: t("nav.obligations") || "Compromisos & Vencimientos", desc: t("nav.obligationsDesc") || "Vencimientos y pagos periódicos", badge: pendingBillsCount },
      ],
    },
    {
      title: t("nav.sectionTools") || "Herramientas & Automatización",
      items: [
        { id: "reports", icon: BarChart3, label: t("nav.reports"), desc: t("nav.reportsDesc") },
        { id: "shopping", icon: ShoppingCart, label: t("nav.shopping") || "Listas de Compras", desc: t("nav.shoppingDesc") || "Organizar compras y registrar gastos" },
        ...(onImportCsv
          ? [{ id: "import-csv", icon: Upload, label: t("tx.importCsv") || "Importar CSV", desc: t("tx.importCsvDesc") || "Carga extractos bancarios y billeteras", isAction: true, onClick: onImportCsv }]
          : []),
        { id: "categories", icon: Tags, label: t("nav.categories"), desc: t("nav.categoriesDesc") },
        { id: "tags", icon: Hash, label: t("nav.tags"), desc: t("nav.tagsDesc") },
        { id: "rules", icon: Zap, label: t("nav.rules") || "Reglas", desc: t("nav.rulesDesc") || "Automatizaciones y auto-categorización" },
      ],
    },
    {
      title: t("nav.sectionSystem") || "Cuenta & Ajustes",
      items: [
        { id: "profile", icon: User, label: t("nav.profile") || "Mi Perfil", desc: t("nav.profileDesc") || "Datos personales y cuenta" },
        { id: "settings", icon: Settings, label: t("nav.settings"), desc: t("nav.settingsDesc") },
      ],
    },
  ];

  const allMoreItems = moreSections.flatMap(s => s.items);
  const moreTabIds = allMoreItems.map(i => i.id);

  const renderTabButton = (tab: { id: string; icon: React.ElementType; label: string }) => (
    <button
      key={tab.id}
      type="button"
      onClick={() => onTabChange(tab.id)}
      className="flex flex-col items-center justify-center flex-1 w-full h-12 relative active:scale-95 transition-transform"
      aria-label={tab.label}
      aria-selected={activeTab === tab.id}
    >
      <tab.icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${activeTab === tab.id ? "text-primary font-semibold" : "text-muted-foreground"}`}>{tab.label}</span>
      {activeTab === tab.id && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
        />
      )}
    </button>
  );

  const renderMoreButton = () => (
    <button
      type="button"
      onClick={() => setMoreOpen(true)}
      className="flex flex-col items-center justify-center flex-1 w-full h-12 relative active:scale-95 transition-transform"
      aria-label={t("nav.more")}
    >
      <MoreHorizontal className={`w-5 h-5 transition-colors ${moreTabIds.includes(activeTab) ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${moreTabIds.includes(activeTab) ? "text-primary font-semibold" : "text-muted-foreground"}`}>{t("nav.more")}</span>
      {pendingBillsCount > 0 && (
        <span className="absolute top-0 right-2.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold font-mono-data">
          {pendingBillsCount}
        </span>
      )}
      {moreTabIds.includes(activeTab) && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
        />
      )}
    </button>
  );

  const renderPlusButton = (variant: "center" | "right") => (
    <div className={cn("flex items-center justify-center relative", variant === "center" ? "w-full" : "shrink-0 ml-1")}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.90 }}
        onClick={() => onQuickAdd("expense")}
        className={cn(
          "h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 border-2 border-background transition-all duration-200 active:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          variant === "center" ? "-mt-4" : "-mt-3 fab-glow",
          moreOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"
        )}
        title={t("tx.newExpense") || "Nuevo Registro"}
        aria-label={t("tx.newExpense") || "Nuevo Registro"}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </motion.button>
    </div>
  );

  return (
    <>
      <nav aria-label={t("nav.mobileAriaLabel")} className="fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 pb-safe shadow-lg">
          {effectivePlusPosition === "center" ? (
            <div className="grid grid-cols-5 items-center justify-items-center h-16 max-w-md mx-auto px-2">
              {leftTabs.map(renderTabButton)}
              {renderPlusButton("center")}
              {rightTabs.map(renderTabButton)}
              {renderMoreButton()}
            </div>
          ) : (
            <div className="flex items-center justify-between h-16 max-w-md mx-auto px-2.5">
              <div className="flex items-center flex-1 justify-around">
                {leftTabs.map(renderTabButton)}
                {rightTabs.map(renderTabButton)}
                {renderMoreButton()}
              </div>
              {renderPlusButton("right")}
            </div>
          )}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="left"
          className="w-80 max-w-[85vw] p-0 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-card border-r border-border/60 [&>button]:top-4 [&>button]:right-4 [&>button]:w-8 [&>button]:h-8 [&>button]:rounded-full [&>button]:bg-secondary/70 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-80 hover:[&>button]:opacity-100 transition-all shadow-2xl"
        >
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <SheetHeader className="px-5 pt-5 pb-3.5 border-b border-border/50 pr-12 shrink-0 text-left">
              <SheetTitle className="text-left font-normal m-0 p-0 flex items-center">
                <DOMLogo
                  size="sm"
                  showTagline
                  taglinePosition="inline"
                  taglineText={t("nav.tagline") || "Visión y Propósito"}
                />
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t("nav.tagline") || "Visión y Propósito"}
              </SheetDescription>
            </SheetHeader>

            <div className="py-2.5 overflow-y-auto flex-1 no-scrollbar space-y-3 px-2.5 overscroll-contain">
              {moreSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1">
                  <div className="px-3 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {section.title}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if ("onClick" in item && typeof item.onClick === "function") {
                            item.onClick();
                          } else {
                            onTabChange(item.id);
                          }
                          setMoreOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left active:scale-[0.99]",
                          activeTab === item.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary/60 active:bg-secondary"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          activeTab === item.id ? "bg-primary/15 text-primary" : "bg-secondary/60 text-muted-foreground"
                        )}>
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{item.label}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                        </div>
                        {item.badge && item.badge > 0 ? (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold font-mono-data shrink-0">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {user && (
            <div className="px-4 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom,28px))] border-t border-border/50 bg-card/95 backdrop-blur-md shrink-0 mt-auto shadow-lg">
              <div className="text-[11px] font-mono-data text-muted-foreground truncate mb-2 px-1">
                {user.email}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  signOut();
                }}
                className="w-full h-11 flex items-center justify-center gap-2 px-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98] transition-all text-xs font-semibold"
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
