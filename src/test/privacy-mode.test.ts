import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PrivacyProvider, usePrivacy } from "@/contexts/PrivacyContext";
import React from "react";

describe("Privacy Context & Masking", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(PrivacyProvider, null, children)
  );

  it("initializes in public mode and toggles to privacy mode", () => {
    const { result } = renderHook(() => usePrivacy(), { wrapper });
    expect(result.current.isPrivacyMode).toBe(false);

    act(() => {
      result.current.togglePrivacyMode();
    });

    expect(result.current.isPrivacyMode).toBe(true);
    expect(result.current.maskAmount("$ 150.000,00")).toBe("$ ••••••");
  });

  it("returns original text when privacy mode is false", () => {
    const { result } = renderHook(() => usePrivacy(), { wrapper });
    expect(result.current.maskAmount("$ 50.000,00")).toBe("$ 50.000,00");
  });

  it("persists privacy mode state to localStorage", () => {
    const { result } = renderHook(() => usePrivacy(), { wrapper });

    act(() => {
      result.current.setPrivacyMode(true);
    });

    expect(localStorage.getItem("dom-privacy-mode")).toBe("true");
  });

  it("reads legacy dominus-privacy-mode key when modern key is absent", () => {
    localStorage.setItem("dominus-privacy-mode", "true");
    const { result } = renderHook(() => usePrivacy(), { wrapper });
    expect(result.current.isPrivacyMode).toBe(true);
  });

  it("reads legacy impero-privacy-mode key when modern key is absent", () => {
    localStorage.setItem("impero-privacy-mode", "true");
    const { result } = renderHook(() => usePrivacy(), { wrapper });
    expect(result.current.isPrivacyMode).toBe(true);
  });

  it("reads legacy m3-privacy-mode key when modern key is absent", () => {
    localStorage.setItem("m3-privacy-mode", "true");
    const { result } = renderHook(() => usePrivacy(), { wrapper });
    expect(result.current.isPrivacyMode).toBe(true);
  });
});
