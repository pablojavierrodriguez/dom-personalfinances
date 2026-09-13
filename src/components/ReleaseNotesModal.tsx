import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  CloudLightning,
  Fingerprint,
  Globe,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-store";
import { APP_VERSION } from "@/lib/version";

export const CURRENT_VERSION = APP_VERSION;
export const STORAGE_KEY = "dom_last_seen_release";
export const LEGACY_DOMINUS_STORAGE_KEY = "dominus_last_seen_release";
export const LEGACY_STORAGE_KEY = "impero_last_seen_release";

interface ReleaseNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReleaseNotesModal({ open, onOpenChange }: ReleaseNotesModalProps) {
  const { t } = useSettings();

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch {
      // Ignorar en caso de storage restringido
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl rounded-2xl">
        {/* Header Hero */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-b from-primary/10 via-secondary/30 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          
          <DialogHeader className="space-y-2 text-left relative z-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30 animate-pulse">
                <Sparkles className="w-3 h-3" />
                {t("release.version")} {CURRENT_VERSION}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{t("release.majorUpdate")}</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight">
              {t("release.title")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {t("release.subtitle")}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Feature Cards */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Feature 1: Motor Offline-First Global */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <CloudLightning className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                {t("release.feature1Title")}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("release.feature1Desc")}
              </p>
            </div>
          </div>

          {/* Feature 2: Internacionalización Total (ES / EN) */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                {t("release.feature2Title")}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("release.feature2Desc")}
              </p>
            </div>
          </div>

          {/* Feature 3: Purga Atómica & Reinicio Seguro */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                {t("release.feature3Title")}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("release.feature3Desc")}
              </p>
            </div>
          </div>

          {/* Feature 4: Seguridad Biométrica & Atajos (⌘K) */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                {t("release.feature4Title")}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("release.feature4Desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground text-center sm:text-left">
            {t("release.footerHint")}
          </span>
          <Button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-2 font-semibold text-xs h-9"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {t("release.dismiss")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function shouldShowReleaseNotes(): boolean {
  try {
    const lastSeen =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_DOMINUS_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    return lastSeen !== CURRENT_VERSION;
  } catch {
    return false;
  }
}
