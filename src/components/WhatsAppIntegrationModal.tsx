import { useState, useEffect } from "react";
import { MessageSquare, Phone, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getWhatsAppStatus,
  generateWhatsAppOtp,
  unlinkWhatsApp,
  WhatsAppIntegrationStatus,
} from "@/services/whatsapp.service";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings-store";

export function WhatsAppIntegrationModal() {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WhatsAppIntegrationStatus>({
    phoneNumber: null,
    isVerified: false,
    isActive: false,
    defaultAccountId: null,
  });
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInfo, setOtpInfo] = useState<{ code: string; expiresAt: Date } | null>(null);
  const { toast } = useToast();

  const loadStatus = async () => {
    try {
      const s = await getWhatsAppStatus();
      setStatus(s);
      if (s.phoneNumber) {
        setPhoneInput(s.phoneNumber);
      }
    } catch {
      // Ignorar errores si no está logueado o migrado aún
    }
  };

  useEffect(() => {
    if (open) {
      loadStatus();
    }
  }, [open]);

  const handleGenerateOtp = async () => {
    if (!phoneInput || phoneInput.trim().length < 8) {
      toast({
        title: t("whatsapp.invalidPhone"),
        description: t("whatsapp.invalidPhoneDesc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await generateWhatsAppOtp(phoneInput);
      setOtpInfo(res);
      toast({
        title: t("whatsapp.codeGenerated"),
        description: `${t("whatsapp.codeGeneratedDesc")} ${res.code}. ${t("whatsapp.codeGeneratedSuffix")}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast({
        title: t("whatsapp.errorGenCode"),
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      await unlinkWhatsApp();
      setStatus({ phoneNumber: null, isVerified: false, isActive: false, defaultAccountId: null });
      setOtpInfo(null);
      setPhoneInput("");
      toast({
        title: t("whatsapp.unlinkedSuccess"),
        description: t("whatsapp.unlinkedDesc"),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast({
        title: t("whatsapp.errorUnlink"),
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = status.isVerified && status.isActive;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full py-3 px-4 hover:bg-secondary/30 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-sm text-foreground block">{t("settings.whatsappBot")}</span>
              <span className="text-[11px] text-muted-foreground block">
                {isConnected ? t("settings.whatsappActive") : t("settings.whatsappInactive")}
              </span>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
              {t("settings.whatsappConnected")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {t("settings.whatsappConfigure")}
            </Badge>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            {t("whatsapp.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("whatsapp.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isConnected ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t("whatsapp.linked")}: {status.phoneNumber}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("whatsapp.help")}
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-2"
                onClick={handleUnlink}
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("whatsapp.unlink")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  {t("whatsapp.phoneLabel")}
                </label>
                <Input
                  type="tel"
                  placeholder="+5491112345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {!otpInfo ? (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                  onClick={handleGenerateOtp}
                  disabled={loading}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  {t("whatsapp.generateCode")}
                </Button>
              ) : (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t("whatsapp.yourCode")}</span>
                    <Badge className="font-mono text-base px-3 py-0.5 bg-emerald-500/20 text-emerald-500 border-none">
                      {otpInfo.code}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("whatsapp.codeExpire")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      const msg = encodeURIComponent(`Hola! Mi código de vinculación DOM es: ${otpInfo.code}`);
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    {t("whatsapp.sendMessage")}
                  </Button>
                </div>
              )}

              <div className="rounded-lg bg-muted/40 p-3 flex gap-2.5 text-xs text-muted-foreground items-start">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {t("whatsapp.securityNotice")}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
