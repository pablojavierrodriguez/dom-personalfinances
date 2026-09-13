import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardSparkline } from "@/components/DashboardSparkline";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { GlobalCommandMenu } from "@/components/GlobalCommandMenu";
import { ReleaseNotesModal, shouldShowReleaseNotes, CURRENT_VERSION, STORAGE_KEY } from "@/components/ReleaseNotesModal";
import { SettingsProvider } from "@/lib/settings-store";
import { PrivacyProvider } from "@/contexts/PrivacyContext";

describe("UX Quick Wins: Sparklines, Keyboard Shortcuts, Command Menu & Release Notes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("DashboardSparkline Component", () => {
    it("renders with fallback data when given empty array", () => {
      const { container } = render(
        <DashboardSparkline data={[]} gradientId="test-sparkline" />
      );
      expect(container.firstChild).toBeDefined();
    });

    it("renders with numeric points", () => {
      const { container } = render(
        <DashboardSparkline data={[10, 25, 40, 35, 60]} gradientId="test-sparkline-numeric" />
      );
      expect(container.firstChild).toBeDefined();
    });
  });

  describe("KeyboardShortcutsModal Component", () => {
    it("renders title, navigation shortcuts and actions when open", () => {
      const onOpenChange = vi.fn();
      render(
        <KeyboardShortcutsModal open={true} onOpenChange={onOpenChange} />
      );

      expect(screen.getByText("Atajos de Teclado")).toBeDefined();
      expect(screen.getByText("Ir al Dashboard")).toBeDefined();
      expect(screen.getByText("Ir a Transacciones")).toBeDefined();
      expect(screen.getByText("Ir a Tarjetas de Crédito")).toBeDefined();
      expect(screen.getByText("Buscador Omnicanal & Comandos")).toBeDefined();
      expect(screen.getByText("Alternar Modo Privacidad")).toBeDefined();
    });
  });

  describe("GlobalCommandMenu Component", () => {
    it("renders command search and options", () => {
      const onOpenChange = vi.fn();
      const onSelectTab = vi.fn();
      const onNewTransaction = vi.fn();

      render(
        <SettingsProvider>
          <PrivacyProvider>
            <GlobalCommandMenu
              open={true}
              onOpenChange={onOpenChange}
              onSelectTab={onSelectTab}
              onNewTransaction={onNewTransaction}
              accounts={[
                { id: "acc-1", name: "Banco Galicia", balance: 150000, type: "checking", color: "#10b981", archived: false },
              ]}
              transactions={[
                { id: "tx-1", amount: 4500, description: "Café Martinez", category: { id: "c1", name: "Comida", color: "#f59e0b", type: "expense" }, date: new Date(), type: "expense", accountId: "acc-1" },
              ]}
            />
          </PrivacyProvider>
        </SettingsProvider>
      );

      expect(screen.getByPlaceholderText("Buscar vistas, transacciones, cuentas o acciones...")).toBeDefined();
      expect(screen.getByText("Registrar nueva transacción")).toBeDefined();
      expect(screen.getByText("Dashboard / Resumen")).toBeDefined();
      expect(screen.getByText("Transacciones")).toBeDefined();
      expect(screen.getByText("Banco Galicia")).toBeDefined();
      expect(screen.getByText("Café Martinez")).toBeDefined();
    });

    it("immediately closes menu and invokes callback upon selecting an action without delay", () => {
      const onOpenChange = vi.fn();
      const onNewTransaction = vi.fn();

      render(
        <SettingsProvider>
          <PrivacyProvider>
            <GlobalCommandMenu
              open={true}
              onOpenChange={onOpenChange}
              onSelectTab={vi.fn()}
              onNewTransaction={onNewTransaction}
            />
          </PrivacyProvider>
        </SettingsProvider>
      );

      const actionItem = screen.getByText("Registrar nueva transacción");
      fireEvent.click(actionItem);

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onNewTransaction).toHaveBeenCalled();
    });
  });

  describe("ReleaseNotesModal Component", () => {
    it("detects shouldShowReleaseNotes as true when never seen", () => {
      expect(shouldShowReleaseNotes()).toBe(true);
    });

    it("renders version highlights and marks as seen on dismiss", () => {
      const onOpenChange = vi.fn();
      render(
        <ReleaseNotesModal open={true} onOpenChange={onOpenChange} />
      );

      expect(screen.getByText("¿Qué hay de nuevo en DOM?")).toBeDefined();
      expect(screen.getByText(new RegExp(`Versión ${CURRENT_VERSION}`))).toBeDefined();
      expect(screen.getByText("Motor Offline-First Global")).toBeDefined();
      expect(screen.getByText("Internacionalización Total (ES / EN)")).toBeDefined();

      // Click dismiss
      const dismissBtn = screen.getByRole("button", { name: /¡Entendido!/i });
      fireEvent.click(dismissBtn);

      expect(localStorage.getItem(STORAGE_KEY)).toBe(CURRENT_VERSION);
      expect(shouldShowReleaseNotes()).toBe(false);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
