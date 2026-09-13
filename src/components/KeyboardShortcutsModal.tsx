import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard, Navigation, Zap } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { APP_VERSION } from "@/lib/version";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  descKey: string;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const { t } = useSettings();

  const NAVIGATION_SHORTCUTS: ShortcutItem[] = [
    { keys: ["G", "D"], descKey: "shortcuts.navDashboard" },
    { keys: ["G", "T"], descKey: "shortcuts.navTransactions" },
    { keys: ["G", "C"], descKey: "shortcuts.navCards" },
    { keys: ["G", "B"], descKey: "shortcuts.navBudgets" },
    { keys: ["G", "S"], descKey: "shortcuts.navShopping" },
    { keys: ["G", "R"], descKey: "shortcuts.navReports" },
    { keys: ["G", "A"], descKey: "shortcuts.navAccounts" },
    { keys: ["G", "O"], descKey: "shortcuts.navObligations" },
  ];

  const ACTION_SHORTCUTS: ShortcutItem[] = [
    { keys: ["⌘ / Ctrl", "K"], descKey: "shortcuts.actionSearch" },
    { keys: ["N"], descKey: "shortcuts.actionNewTx" },
    { keys: ["H"], descKey: "shortcuts.actionPrivacy" },
    { keys: ["?"], descKey: "shortcuts.actionOpenShortcuts" },
    { keys: ["Esc"], descKey: "shortcuts.actionClose" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border/50 bg-secondary/30">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                <Keyboard className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-display font-semibold">
                {t("shortcuts.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {t("shortcuts.description")}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick navigation */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              <span>{t("shortcuts.navSection")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NAVIGATION_SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-secondary/35 border border-border/40 hover:bg-secondary/60 transition-colors"
                >
                  <span className="text-xs text-foreground/90 truncate mr-2">
                    {t(item.descKey as any)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-1.5 py-0.5 min-w-[20px] text-center text-[11px] font-mono-data font-semibold bg-background border border-border/80 rounded-md text-foreground shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global actions */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{t("shortcuts.actionsSection")}</span>
            </div>
            <div className="space-y-2">
              {ACTION_SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-secondary/35 border border-border/40 hover:bg-secondary/60 transition-colors"
                >
                  <span className="text-xs text-foreground/90 truncate mr-2">
                    {t(item.descKey as any)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-1.5 py-0.5 min-w-[20px] text-center text-[11px] font-mono-data font-semibold bg-background border border-border/80 rounded-md text-foreground shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/40 bg-secondary/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {t("shortcuts.footerHint")}{" "}
            <kbd className="px-1 py-0.5 rounded bg-background border border-border/60 text-[10px] font-mono">?</kbd>
          </span>
          <span>DOM v{APP_VERSION}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
