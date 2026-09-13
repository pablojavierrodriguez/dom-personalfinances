import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank, Target,
  Repeat, Bell, BarChart3, CreditCard, Tags, Hash, Settings, Plus,
  Repeat as RepeatIcon, PanelLeftClose, PanelLeft, User, LogIn, Upload, Zap, ShoppingCart,
  Search, Sparkles, Keyboard
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DOMLogo } from "@/components/ui/DOMLogo";

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onQuickAdd: () => void;
  onTransfer: () => void;
  onImportCsv?: () => void;
  onOpenCommandMenu?: () => void;
  onOpenShortcuts?: () => void;
  onOpenReleaseNotes?: () => void;
  pendingBillsCount?: number;
}

export function DesktopSidebar({
  activeTab,
  onTabChange,
  onQuickAdd,
  onTransfer,
  onImportCsv,
  onOpenCommandMenu,
  onOpenShortcuts,
  onOpenReleaseNotes,
  pendingBillsCount = 0,
}: DesktopSidebarProps) {
  const { t } = useSettings();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  const mainTabs = [
    { id: "dashboard", icon: LayoutDashboard, label: t("nav.home") },
    { id: "transactions", icon: ArrowLeftRight, label: t("nav.history") },
    { id: "accounts", icon: Wallet, label: t("nav.accounts") },
  ];

  const moreItems = [
    { id: "budgets", icon: PiggyBank, label: t("nav.budgets") },
    { id: "goals", icon: Target, label: t("nav.goals") },
    { id: "obligations", icon: Bell, label: t("nav.obligations") || "Recurrentes", badge: pendingBillsCount },
    { id: "reports", icon: BarChart3, label: t("nav.reports") },
    { id: "cards", icon: CreditCard, label: t("nav.cards") },
    { id: "categories", icon: Tags, label: t("nav.categories") },
    { id: "tags", icon: Hash, label: t("nav.tags") },
    { id: "rules", icon: Zap, label: t("nav.rules") || "Reglas" },
    { id: "shopping", icon: ShoppingCart, label: t("nav.shopping") || "Listas de Compras" },
  ];

  const bottomItems = [
    { id: "profile", icon: User, label: t("nav.profile") || "Mi Perfil" },
    { id: "settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 68 : 256 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="hidden md:flex flex-col h-screen sticky top-0 shrink-0 z-30 bg-card border-r border-border/50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/50">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center min-w-0 flex-1 mr-2"
              >
                <DOMLogo
                  size="sm"
                  showTagline
                  taglinePosition="inline"
                  taglineText={t("nav.tagline") || "Visión y Propósito"}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className={`p-3 ${collapsed ? "flex flex-col items-center gap-2" : "flex gap-2"}`}>
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" className="w-10 h-10" onClick={onQuickAdd}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("nav.newExpense")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="secondary" className="w-10 h-10" onClick={onTransfer}>
                    <RepeatIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("nav.transfer")}</TooltipContent>
              </Tooltip>
              {onImportCsv && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="w-10 h-10" onClick={onImportCsv}>
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t("tx.importCsv") || "Importar CSV"}</TooltipContent>
                </Tooltip>
              )}
            </>
          ) : (
            <>
              <Button size="sm" className="flex-1 gap-1.5" onClick={onQuickAdd}>
                <Plus className="w-4 h-4" />
                {t("nav.newExpense")}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="secondary" className="px-2.5" onClick={onTransfer}>
                    <RepeatIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("nav.transfer")}</TooltipContent>
              </Tooltip>
              {onImportCsv && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="px-2.5 border-border/70 hover:bg-secondary/60 text-muted-foreground hover:text-foreground" onClick={onImportCsv}>
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t("tx.importCsv") || "Importar CSV"}</TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* Command Menu Search Trigger (⌘K) */}
        {onOpenCommandMenu && (
          <div className={`px-3 pb-2 pt-0.5`}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-10 h-10 border border-border/40 text-muted-foreground hover:text-foreground"
                    onClick={onOpenCommandMenu}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("nav.searchOrCommandTooltip") || "Buscar o comando (⌘K)"}</TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={onOpenCommandMenu}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 text-xs text-muted-foreground hover:text-foreground transition-all group"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>{t("nav.searchOrCommand") || "Buscar o comando..."}</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono-data bg-background border border-border/80 rounded text-muted-foreground group-hover:text-foreground">
                  ⌘K
                </kbd>
              </button>
            )}
          </div>
        )}

        {/* Main nav */}
        <div className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-3"} space-y-0.5`}>
          {mainTabs.map(tab => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              collapsed={collapsed}
              onClick={() => onTabChange(tab.id)}
            />
          ))}

          <Separator className="my-2" />

          {moreItems.map(tab => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              collapsed={collapsed}
              badge={tab.badge}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>

        {/* Bottom section */}
        <div className={`${collapsed ? "px-2" : "px-3"} pb-3 space-y-0.5`}>
          <Separator className="mb-2" />
          {bottomItems.map(tab => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              collapsed={collapsed}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
          {onOpenReleaseNotes && (
            <SidebarItem
              icon={Sparkles}
              label={t("nav.whatsNew") || "Novedades"}
              active={false}
              collapsed={collapsed}
              onClick={onOpenReleaseNotes}
            />
          )}
          {onOpenShortcuts && (
            <SidebarItem
              icon={Keyboard}
              label={t("nav.keyboardShortcuts") || "Atajos de Teclado"}
              active={false}
              collapsed={collapsed}
              onClick={onOpenShortcuts}
            />
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

function SidebarItem({ icon: Icon, label, active, badge, collapsed, onClick }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
  collapsed: boolean;
  onClick: () => void;
}) {
  const content = (
    <button
      onClick={onClick}
      className={`relative flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${collapsed ? "px-0 py-2.5 w-full" : "px-3 py-2 w-full"} rounded-lg text-sm font-medium transition-all duration-200 text-left group ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      }`}
    >
      {active && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
        />
      )}
      <Icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? "" : ""}`} />
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          className="flex-1 whitespace-nowrap overflow-hidden"
        >
          {label}
        </motion.span>
      )}
      {!collapsed && badge && badge > 0 ? (
        <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
          {badge}
        </span>
      ) : null}
      {collapsed && badge && badge > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-medium">
          {badge}
        </span>
      ) : null}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {label}
          {badge && badge > 0 ? <span className="text-destructive font-medium">({badge})</span> : null}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
