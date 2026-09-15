import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { purgeLocalUserData, purgeAllUserData } from "../services/user-data.service";
import { CACHE_KEYS, GLOBAL_QUEUE_KEY } from "../services/sync-queue.service";
import { SHOPPING_CACHE_KEY, SHOPPING_QUEUE_KEY } from "../services/shopping.service";
import { SettingsPage } from "../components/SettingsPage";
import { SettingsProvider } from "../lib/settings-store";
import { PrivacyProvider } from "../contexts/PrivacyContext";
import { AuthProvider } from "../lib/auth-context";

describe("User Data Purge Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("purgeLocalUserData removes all cache keys, sync queues, and onboarding flags", () => {
    // Populate localStorage with test state
    localStorage.setItem(CACHE_KEYS.TRANSACTIONS, JSON.stringify([{ id: "t1" }]));
    localStorage.setItem(CACHE_KEYS.ACCOUNTS, JSON.stringify([{ id: "a1" }]));
    localStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify([{ id: "c1" }]));
    localStorage.setItem(GLOBAL_QUEUE_KEY, JSON.stringify([{ type: "insert_transaction" }]));
    localStorage.setItem(SHOPPING_CACHE_KEY, JSON.stringify([{ id: "s1" }]));
    localStorage.setItem(SHOPPING_QUEUE_KEY, JSON.stringify([{ type: "create_list" }]));
    localStorage.setItem("onboarding-complete", "true");
    localStorage.setItem("impero-transactions", JSON.stringify([{ id: "legacy" }]));

    expect(localStorage.getItem(CACHE_KEYS.TRANSACTIONS)).not.toBeNull();
    expect(localStorage.getItem(GLOBAL_QUEUE_KEY)).not.toBeNull();
    expect(localStorage.getItem("onboarding-complete")).toBe("true");

    // Execute purge
    purgeLocalUserData();

    // Verify all keys are purged
    expect(localStorage.getItem(CACHE_KEYS.TRANSACTIONS)).toBeNull();
    expect(localStorage.getItem(CACHE_KEYS.ACCOUNTS)).toBeNull();
    expect(localStorage.getItem(CACHE_KEYS.CATEGORIES)).toBeNull();
    expect(localStorage.getItem(GLOBAL_QUEUE_KEY)).toBeNull();
    expect(localStorage.getItem(SHOPPING_CACHE_KEY)).toBeNull();
    expect(localStorage.getItem(SHOPPING_QUEUE_KEY)).toBeNull();
    expect(localStorage.getItem("onboarding-complete")).toBeNull();
    expect(localStorage.getItem("impero-transactions")).toBeNull();
  });

  it("purgeAllUserData purges both local caches and handles unauthenticated state gracefully", async () => {
    localStorage.setItem(CACHE_KEYS.TRANSACTIONS, JSON.stringify([{ id: "tx-test" }]));
    localStorage.setItem("onboarding-complete", "true");

    await purgeAllUserData(undefined);

    expect(localStorage.getItem(CACHE_KEYS.TRANSACTIONS)).toBeNull();
    expect(localStorage.getItem("onboarding-complete")).toBeNull();
  });

  it("SettingsPage double validation challenge enforces both checkbox and 'BORRAR' keyword", async () => {
    const onPurgeData = vi.fn().mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <SettingsProvider>
          <PrivacyProvider>
            <SettingsPage onImportCsv={vi.fn()} onPurgeData={onPurgeData} />
          </PrivacyProvider>
        </SettingsProvider>
      </AuthProvider>
    );

    // 1. Click trigger button in SettingsPage
    const triggerBtn = screen.getByText("Borrar todos los datos y reiniciar");
    fireEvent.click(triggerBtn);

    // 2. Assert modal is visible
    expect(screen.getByText("¿Borrar todos tus datos y reiniciar?")).toBeDefined();

    const confirmBtn = screen.getByText("Eliminar definitivamente y reiniciar").closest("button");
    expect(confirmBtn).toBeDefined();
    // Initially disabled
    expect(confirmBtn?.hasAttribute("disabled")).toBe(true);

    // 3. Toggle checkbox alone -> still disabled
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(confirmBtn?.hasAttribute("disabled")).toBe(true);

    // 4. Type incorrect keyword -> still disabled
    const textInput = screen.getByPlaceholderText("BORRAR");
    fireEvent.change(textInput, { target: { value: "borrame esto" } });
    expect(confirmBtn?.hasAttribute("disabled")).toBe(true);

    // 5. Type exact keyword "BORRAR" -> enabled
    fireEvent.change(textInput, { target: { value: "BORRAR" } });
    expect(confirmBtn?.hasAttribute("disabled")).toBe(false);

    // 5b. Also accepts "DELETE" (multilingual support)
    fireEvent.change(textInput, { target: { value: "DELETE" } });
    expect(confirmBtn?.hasAttribute("disabled")).toBe(false);

    // 6. Uncheck checkbox -> disabled again
    fireEvent.click(checkbox);
    expect(confirmBtn?.hasAttribute("disabled")).toBe(true);

    // 7. Check again -> enabled again
    fireEvent.click(checkbox);
    expect(confirmBtn?.hasAttribute("disabled")).toBe(false);
  });

  it("purgeRemoteUserData invokes atomic RPC purge_user_data with p_reseed: true", async () => {
    const { supabase } = await import("../integrations/supabase/client");
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: { success: true }, error: null } as any);

    const { purgeRemoteUserData } = await import("../services/user-data.service");
    await purgeRemoteUserData("user-uuid-123");

    expect(rpcSpy).toHaveBeenCalledWith("purge_user_data", { p_reseed: true });
    rpcSpy.mockRestore();
  });

  it("purgeRemoteUserData invokes atomic RPC purge_user_data with p_reseed: false when requesting total wipe", async () => {
    const { supabase } = await import("../integrations/supabase/client");
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: { success: true }, error: null } as any);

    const { purgeRemoteUserData } = await import("../services/user-data.service");
    await purgeRemoteUserData("user-uuid-123", { reseed: false });

    expect(rpcSpy).toHaveBeenCalledWith("purge_user_data", { p_reseed: false });
    rpcSpy.mockRestore();
  });

  it("SettingsPage enables confirm button when typing 'DELETE' as well", async () => {
    const onPurgeData = vi.fn().mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <SettingsProvider>
          <PrivacyProvider>
            <SettingsPage onImportCsv={vi.fn()} onPurgeData={onPurgeData} />
          </PrivacyProvider>
        </SettingsProvider>
      </AuthProvider>
    );

    const triggerBtn = screen.getByText("Borrar todos los datos y reiniciar");
    fireEvent.click(triggerBtn);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const textInput = screen.getByPlaceholderText("BORRAR");
    fireEvent.change(textInput, { target: { value: "DELETE" } });

    const confirmBtn = screen.getByText("Eliminar definitivamente y reiniciar").closest("button");
    expect(confirmBtn?.hasAttribute("disabled")).toBe(false);
  });

  it("SettingsPage redirects to '/' upon successful purge confirmation", async () => {
    const onPurgeData = vi.fn().mockResolvedValue(undefined);
    delete (window as any).location;
    (window as any).location = { href: "/settings" };

    render(
      <AuthProvider>
        <SettingsProvider>
          <PrivacyProvider>
            <SettingsPage onImportCsv={vi.fn()} onPurgeData={onPurgeData} />
          </PrivacyProvider>
        </SettingsProvider>
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("Borrar todos los datos y reiniciar"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByPlaceholderText("BORRAR"), { target: { value: "BORRAR" } });

    const confirmBtn = screen.getByText("Eliminar definitivamente y reiniciar");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onPurgeData).toHaveBeenCalled();
      expect(window.location.href).toBe("/");
    });
  });
});
