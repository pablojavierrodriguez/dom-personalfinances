import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthPage from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import LandingPage from "./pages/Landing.tsx";
import { SettingsProvider, useSettings } from "@/lib/settings-store";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { BiometricLockOverlay } from "@/components/BiometricLockOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";


const queryClient = new QueryClient();

function ThemeApplier({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "light") {
      root.classList.add("light");
    } else if (settings.theme === "dark") {
      root.classList.remove("light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) root.classList.remove("light");
      else root.classList.add("light");
    }

    const appTheme = settings.appTheme || "m3";
    root.setAttribute("data-app-theme", appTheme);
  }, [settings.theme, settings.appTheme]);

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const VALID_TABS = [
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
] as const;

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route
        path="/auth"
        element={user && !loading ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/index"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      {VALID_TABS.map((tab) => (
        <Route
          key={tab}
          path={`/${tab}`}
          element={
            <ProtectedRoute>
              <Index initialTab={tab} />
            </ProtectedRoute>
          }
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <ThemeApplier>
            <PrivacyProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BiometricLockOverlay />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </PrivacyProvider>
          </ThemeApplier>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

