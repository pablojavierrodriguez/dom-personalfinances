import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, User, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DOMSymbol } from "@/components/ui/DOMSymbol";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings-store";
import { getHumanAuthErrorMessage, extractAuthUrlError, isLocalEnvironment } from "@/lib/auth-errors";

type Mode = "login" | "signup" | "forgot";

const isSignupEnabled = import.meta.env.VITE_ENABLE_SIGNUP === "true";

export default function AuthPage() {
  const { t } = useSettings();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connError, setConnError] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    const urlError = extractAuthUrlError();
    if (urlError) {
      const parsed = getHumanAuthErrorMessage(urlError);
      toast.error(parsed.title, {
        description: parsed.description,
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setConnError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: password.trim(),
        });
        if (error) throw error;
        toast.success(t("auth.welcomeBack"));
      } else if (mode === "signup") {
        if (!isSignupEnabled) {
          throw new Error(t("auth.signupDisabled"));
        }
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password.trim(),
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(t("auth.accountCreated"));
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t("auth.passwordResetSent"));
        setMode("login");
      }
    } catch (err: any) {
      const parsed = getHumanAuthErrorMessage(err);
      if (parsed.isConnectionError) {
        setConnError({ title: parsed.title, description: parsed.description });
      } else {
        toast.error(parsed.title, {
          description: parsed.description,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <DOMSymbol size={52} variant="badge" className="mb-4 shadow-xl" />
          <h1 className="text-2xl font-bold font-brand text-foreground uppercase">DOM</h1>
          <p className="text-xs font-medium text-primary tracking-wider uppercase mt-1 mb-1">{t("auth.tagline")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" && t("auth.loginSubtitle")}
            {mode === "signup" && t("auth.signupSubtitle")}
            {mode === "forgot" && t("auth.forgotSubtitle")}
          </p>
        </div>

        {/* Banner de error de conexión / servidor offline */}
        <AnimatePresence>
          {connError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs space-y-2.5 shadow-md backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-amber-500/20 shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="space-y-1 text-left">
                  <p className="font-semibold text-sm leading-tight text-amber-300">
                    {connError.title}
                  </p>
                  <p className="leading-relaxed text-amber-200/90 text-xs">
                    {connError.description}
                  </p>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConnError(null)}
                  className="h-7 text-xs px-3 border-amber-500/40 hover:bg-amber-500/20 text-amber-200 bg-amber-950/40"
                >
                  {t("auth.understood")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t("auth.fullNamePlaceholder")}
                  required
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setEmail(prev => prev.trim().toLowerCase())}
                placeholder={t("auth.emailPlaceholder")}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                required
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  minLength={6}
                  className="w-full h-12 pl-10 pr-12 rounded-xl bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </button>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gap-2 text-base font-semibold"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" && t("auth.loginButton")}
                  {mode === "signup" && t("auth.signupButton")}
                  {mode === "forgot" && t("auth.forgotButton")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </motion.form>
        </AnimatePresence>

        {isSignupEnabled && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("auth.noAccount")}{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                  {t("auth.register")}
                </button>
              </>
            ) : (
              <>
                {t("auth.hasAccount")}{" "}
                <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
                  {t("auth.goToLogin")}
                </button>
              </>
            )}
          </div>
        )}
        {!isSignupEnabled && mode !== "login" && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
              {t("auth.backToLogin")}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
