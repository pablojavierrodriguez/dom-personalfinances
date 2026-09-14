import React, { useEffect } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ReceiptText,
  CreditCard,
  PiggyBank,
  ShoppingCart,
  BarChart3,
  Landmark,
  Tags,
  SlidersHorizontal,
  Settings,
  PlusCircle,
  EyeOff,
  Eye,
  Keyboard,
  Sparkles,
  CalendarDays,
  Target,
  FileSpreadsheet,
} from "lucide-react";
import { Account, Transaction } from "@/lib/types";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useSettings } from "@/lib/settings-store";

interface GlobalCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTab: (tab: string) => void;
  onNewTransaction?: () => void;
  onOpenShortcuts?: () => void;
  onOpenReleaseNotes?: () => void;
  accounts?: Account[];
  transactions?: Transaction[];
}

export function GlobalCommandMenu({
  open,
  onOpenChange,
  onSelectTab,
  onNewTransaction,
  onOpenShortcuts,
  onOpenReleaseNotes,
  accounts = [],
  transactions = [],
}: GlobalCommandMenuProps) {
  const { isPrivacyMode, togglePrivacyMode, maskAmount } = usePrivacy();
  const { formatAmount, t } = useSettings();

  const handleSelect = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("command.dialogTitle")}
      description={t("command.dialogDesc")}
    >
      <CommandInput placeholder={t("command.placeholder") || "Buscar vistas, transacciones, cuentas o acciones..."} />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>{t("command.empty") || "No se encontraron resultados."}</CommandEmpty>

        {/* Acciones Rápidas */}
        <CommandGroup heading={t("command.groupActions") || "Acciones Frecuentes"}>
          {onNewTransaction && (
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  onNewTransaction();
                })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              <span>{t("command.newTransaction") || "Registrar nueva transacción"}</span>
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
          )}

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                togglePrivacyMode();
              })
            }
          >
            {isPrivacyMode ? (
              <Eye className="mr-2 h-4 w-4 text-amber-400" />
            ) : (
              <EyeOff className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span>{isPrivacyMode ? (t("command.privacyDisable") || "Desactivar Modo Privacidad") : (t("command.privacyEnable") || "Activar Modo Privacidad")}</span>
            <CommandShortcut>H</CommandShortcut>
          </CommandItem>

          {onOpenShortcuts && (
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  onOpenShortcuts();
                })
              }
            >
              <Keyboard className="mr-2 h-4 w-4 text-sky-400" />
              <span>{t("command.viewShortcuts") || "Ver Atajos de Teclado"}</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          )}

          {onOpenReleaseNotes && (
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  onOpenReleaseNotes();
                })
              }
            >
              <Sparkles className="mr-2 h-4 w-4 text-purple-400" />
              <span>{t("command.whatsNew") || "Novedades y Mejoras"}</span>
            </CommandItem>
          )}

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("obligations"))}>
            <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
            <span>{t("auditor.title") || "Auditor de Suscripciones & Fugas"}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navegación a Módulos */}
        <CommandGroup heading={t("command.groupNav") || "Navegación"}>
          <CommandItem onSelect={() => handleSelect(() => onSelectTab("dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
            <span>{t("command.navDashboard") || "Dashboard / Resumen"}</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("transactions"))}>
            <ReceiptText className="mr-2 h-4 w-4 text-blue-400" />
            <span>{t("command.navTransactions") || "Transacciones"}</span>
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("cards"))}>
            <CreditCard className="mr-2 h-4 w-4 text-rose-400" />
            <span>{t("command.navCards") || "Tarjetas de Crédito"}</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("budgets"))}>
            <PiggyBank className="mr-2 h-4 w-4 text-amber-400" />
            <span>{t("command.navBudgets") || "Presupuestos"}</span>
            <CommandShortcut>G B</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("shopping"))}>
            <ShoppingCart className="mr-2 h-4 w-4 text-emerald-400" />
            <span>{t("command.navShopping") || "Listas de Compras"}</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("reports"))}>
            <BarChart3 className="mr-2 h-4 w-4 text-indigo-400" />
            <span>{t("command.navReports") || "Reportes y Estadísticas"}</span>
            <CommandShortcut>G R</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("accounts"))}>
            <Landmark className="mr-2 h-4 w-4 text-emerald-500" />
            <span>{t("nav.accounts") || "Cuentas"}</span>
            <CommandShortcut>G A</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("obligations"))}>
            <CalendarDays className="mr-2 h-4 w-4 text-violet-400" />
            <span>{t("command.navObligations") || "Compromisos y Facturas"}</span>
            <CommandShortcut>G O</CommandShortcut>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("goals"))}>
            <Target className="mr-2 h-4 w-4 text-pink-400" />
            <span>{t("nav.goals") || "Metas"}</span>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("categories"))}>
            <Tags className="mr-2 h-4 w-4 text-cyan-400" />
            <span>{t("nav.categories") || "Categorías"}</span>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("rules"))}>
            <SlidersHorizontal className="mr-2 h-4 w-4 text-slate-400" />
            <span>{t("command.navRules") || "Reglas de Automatización"}</span>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => onSelectTab("settings"))}>
            <Settings className="mr-2 h-4 w-4 text-zinc-400" />
            <span>{t("command.navSettings") || "Configuración del Sistema"}</span>
            <CommandShortcut>G P</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {/* Cuentas de Usuario */}
        {accounts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command.groupAccounts") || "Cuentas Registradas"}>
              {accounts.map((acc) => (
                <CommandItem
                  key={acc.id}
                  onSelect={() =>
                    handleSelect(() => {
                      onSelectTab("accounts");
                    })
                  }
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: acc.color || "hsl(var(--primary))" }}
                  />
                  <span className="truncate mr-2">{acc.name}</span>
                  <span className="ml-auto text-xs font-mono-data text-muted-foreground">
                    {maskAmount(formatAmount(acc.balance))} {acc.currency || "ARS"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Transacciones Recientes */}
        {transactions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command.groupRecent") || "Transacciones Recientes"}>
              {transactions.slice(0, 5).map((tx) => (
                <CommandItem
                  key={tx.id}
                  onSelect={() =>
                    handleSelect(() => {
                      onSelectTab("transactions");
                    })
                  }
                >
                  <ReceiptText className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate mr-2">{tx.description}</span>
                  <span
                    className={`ml-auto text-xs font-mono-data font-semibold ${
                      tx.type === "income" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {maskAmount(formatAmount(tx.amount))}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
