import React, { useState } from "react";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useSettings } from "@/lib/settings-store";

export function PwaInstallPrompt() {
  const { t } = useSettings();
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Si ya está corriendo como app instalada, no mostramos nada
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{t("pwa.installedDevice") || "Aplicación DOM instalada en este dispositivo."}</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
    } else if (isInstallable) {
      await triggerInstall();
    } else {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-card to-secondary/30 border border-border/80 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t("pwa.installTitle") || "Instalar DOM en tu teléfono"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("pwa.installSubtitle") || "Tu dinero. Tu mente. Tu control. Acceso en 1 toque, pantalla completa y offline."}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleInstallClick}
          className="w-full sm:w-auto h-10 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium theme-pill-btn shadow transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>{t("pwa.installButton") || "Instalar App"}</span>
        </Button>
      </div>

      {/* Modal interactivo con guía paso a paso para iOS Safari / Otros */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="max-w-md w-[92vw] rounded-2xl bg-card border-border/80 p-6">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-1">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              {t("pwa.iosModalTitle") || "Instalar DOM en tu Pantalla de Inicio"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              {t("pwa.iosModalDesc") || "Sigue estos 2 sencillos pasos en tu navegador móvil para tener la app como nativa:"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4">
            <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-xl border border-border/60">
              <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center shrink-0 text-primary font-bold text-xs shadow-sm">
                1
              </div>
              <div className="text-xs text-foreground/90 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  {t("pwa.iosStep1Title") || "Toca el botón Compartir"} <Share className="w-3.5 h-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground">
                  {t("pwa.iosStep1Desc") || "En la barra inferior de Safari o en el menú de tres puntos de tu navegador."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-xl border border-border/60">
              <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center shrink-0 text-primary font-bold text-xs shadow-sm">
                2
              </div>
              <div className="text-xs text-foreground/90 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  {t("pwa.iosStep2Title") || "Selecciona 'Agregar a inicio'"} <PlusSquare className="w-3.5 h-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground">
                  {t("pwa.iosStep2Desc") || "Desliza hacia abajo en las opciones y confirma para crear el ícono en tu teléfono."}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowIosGuide(false)}
            variant="outline"
            className="w-full rounded-xl h-11 text-xs font-semibold"
          >
            {t("pwa.iosUnderstood") || "Entendido"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
