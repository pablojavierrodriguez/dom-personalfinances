import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PrivacyProvider, usePrivacy } from "@/contexts/PrivacyContext";
import * as webauthnGuard from "@/lib/webauthn-guard";
import React from "react";

describe("P12: Seguridad & Bloqueo Biométrico Web", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(PrivacyProvider, null, children)
  );

  it("initializes with biometric lock disabled by default", () => {
    const { result } = renderHook(() => usePrivacy(), { wrapper });
    expect(result.current.isBiometricLockEnabled).toBe(false);
    expect(result.current.isAppLocked).toBe(false);
    expect(result.current.biometricTimeoutMinutes).toBe(3);
  });

  it("enables biometric lock and updates localStorage", async () => {
    vi.spyOn(webauthnGuard, "checkBiometricsSupport").mockResolvedValue(true);
    vi.spyOn(webauthnGuard, "registerBiometricCredential").mockResolvedValue("mock-credential-base64");

    const { result } = renderHook(() => usePrivacy(), { wrapper });

    let success = false;
    await act(async () => {
      success = await result.current.setBiometricLockEnabled(true, "test@dominus.app");
    });

    expect(success).toBe(true);
    expect(result.current.isBiometricLockEnabled).toBe(true);
    expect(localStorage.getItem("dominus-biometric-enabled")).toBe("true");
  });

  it("locks and unlocks the application with biometrics", async () => {
    vi.spyOn(webauthnGuard, "checkBiometricsSupport").mockResolvedValue(true);
    vi.spyOn(webauthnGuard, "registerBiometricCredential").mockResolvedValue("mock-credential-base64");
    vi.spyOn(webauthnGuard, "verifyBiometricCredential").mockResolvedValue(true);

    const { result } = renderHook(() => usePrivacy(), { wrapper });

    await act(async () => {
      await result.current.setBiometricLockEnabled(true, "test@dominus.app");
    });

    // Lock application manually
    act(() => {
      result.current.lockApp();
    });
    expect(result.current.isAppLocked).toBe(true);

    // Unlock application with biometrics
    let unlocked = false;
    await act(async () => {
      unlocked = await result.current.unlockWithBiometrics();
    });

    expect(unlocked).toBe(true);
    expect(result.current.isAppLocked).toBe(false);
  });

  it("updates and persists biometric timeout minutes", async () => {
    const { result } = renderHook(() => usePrivacy(), { wrapper });

    await act(async () => {
      result.current.setBiometricTimeoutMinutes(5);
    });

    expect(result.current.biometricTimeoutMinutes).toBe(5);
    expect(localStorage.getItem("dominus-biometric-timeout")).toBe("5");
  });
});
