import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  checkBiometricsSupport,
  registerBiometricCredential,
  verifyBiometricCredential,
  clearBiometricCredential,
} from "@/lib/webauthn-guard";

export interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  setPrivacyMode: (value: boolean) => void;
  maskAmount: (formattedText: string) => string;

  // Biometría y Bloqueo de App
  isBiometricsSupported: boolean;
  isBiometricLockEnabled: boolean;
  setBiometricLockEnabled: (enabled: boolean, userEmail?: string) => Promise<boolean>;
  biometricTimeoutMinutes: number;
  setBiometricTimeoutMinutes: (minutes: number) => void;
  isAppLocked: boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  lockApp: () => void;
  forceUnlock: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | null>(null);

const STORAGE_KEY = "dominus-privacy-mode";
const LEGACY_IMPERO_STORAGE_KEY = "impero-privacy-mode";
const LEGACY_STORAGE_KEY = "m3-privacy-mode";
const BIOMETRIC_ENABLED_KEY = "dominus-biometric-enabled";
const LEGACY_BIOMETRIC_ENABLED_KEY = "impero-biometric-enabled";
const BIOMETRIC_TIMEOUT_KEY = "dominus-biometric-timeout";
const LEGACY_BIOMETRIC_TIMEOUT_KEY = "impero-biometric-timeout";
const MASK = "$ ••••••";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_IMPERO_STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const [isBiometricsSupported, setIsBiometricsSupported] = useState<boolean>(false);
  const [isBiometricLockEnabled, setIsBiometricLockEnabledState] = useState<boolean>(() => {
    try {
      const stored =
        localStorage.getItem(BIOMETRIC_ENABLED_KEY) ??
        localStorage.getItem(LEGACY_BIOMETRIC_ENABLED_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const [biometricTimeoutMinutes, setBiometricTimeoutMinutesState] = useState<number>(() => {
    try {
      const stored =
        localStorage.getItem(BIOMETRIC_TIMEOUT_KEY) ??
        localStorage.getItem(LEGACY_BIOMETRIC_TIMEOUT_KEY);
      return stored ? Number(stored) : 3;
    } catch {
      return 3;
    }
  });

  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);
  const backgroundedTimestamp = useRef<number | null>(null);

  // Detectar soporte de hardware biométrico al montar
  useEffect(() => {
    let isMounted = true;
    checkBiometricsSupport().then((supported) => {
      if (isMounted) {
        setIsBiometricsSupported(supported);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const setPrivacyMode = useCallback((val: boolean) => {
    setIsPrivacyMode(val);
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {}
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode(!isPrivacyMode);
  }, [isPrivacyMode, setPrivacyMode]);

  const setBiometricTimeoutMinutes = useCallback((minutes: number) => {
    setBiometricTimeoutMinutesState(minutes);
    try {
      localStorage.setItem(BIOMETRIC_TIMEOUT_KEY, String(minutes));
    } catch {}
  }, []);

  const setBiometricLockEnabled = useCallback(
    async (enabled: boolean, userEmail?: string): Promise<boolean> => {
      if (enabled) {
        const supported = await checkBiometricsSupport();
        if (!supported) return false;

        try {
          await registerBiometricCredential(userEmail);
          setIsBiometricLockEnabledState(true);
          localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
          return true;
        } catch (err) {
          console.error("Error al habilitar autenticación biométrica:", err);
          return false;
        }
      } else {
        clearBiometricCredential();
        setIsBiometricLockEnabledState(false);
        setIsAppLocked(false);
        try {
          localStorage.setItem(BIOMETRIC_ENABLED_KEY, "false");
        } catch {}
        return true;
      }
    },
    []
  );

  const lockApp = useCallback(() => {
    if (isBiometricLockEnabled) {
      setIsAppLocked(true);
    }
  }, [isBiometricLockEnabled]);

  const forceUnlock = useCallback(() => {
    setIsAppLocked(false);
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      const success = await verifyBiometricCredential();
      if (success) {
        setIsAppLocked(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error en desbloqueo biométrico:", err);
      return false;
    }
  }, []);

  // Monitoreo de inactividad por cambio de visibilidad de pestaña o suspensión
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isBiometricLockEnabled) return;

      if (document.visibilityState === "hidden") {
        backgroundedTimestamp.current = Date.now();
      } else if (document.visibilityState === "visible") {
        if (backgroundedTimestamp.current !== null) {
          const elapsedSeconds = (Date.now() - backgroundedTimestamp.current) / 1000;
          const timeoutSeconds = biometricTimeoutMinutes * 60;

          // Si transcurrió el tiempo de inactividad (o si el timeout está en 0 para inmediato)
          if (elapsedSeconds >= timeoutSeconds) {
            setIsAppLocked(true);
          }
          backgroundedTimestamp.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isBiometricLockEnabled, biometricTimeoutMinutes]);

  // Atajo global de teclado (tecla H para ocultar/mostrar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el usuario no está escribiendo en un input o textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key.toLowerCase() === "h" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        togglePrivacyMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePrivacyMode]);

  const maskAmount = useCallback(
    (formattedText: string) => {
      return isPrivacyMode ? MASK : formattedText;
    },
    [isPrivacyMode]
  );

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMode,
        togglePrivacyMode,
        setPrivacyMode,
        maskAmount,
        isBiometricsSupported,
        isBiometricLockEnabled,
        setBiometricLockEnabled,
        biometricTimeoutMinutes,
        setBiometricTimeoutMinutes,
        isAppLocked,
        unlockWithBiometrics,
        lockApp,
        forceUnlock,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextType {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return ctx;
}
